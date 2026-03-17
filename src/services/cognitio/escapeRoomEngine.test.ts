// ============================================================
// Tests — Escape Room Engine: room unlock logic, code unlock,
// unlockable room detection, meta-puzzle creation, and room
// generation pipeline.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  canUnlockRoom,
  attemptCodeUnlock,
  checkUnlockableRooms,
  generateEscapeRooms,
  createMetaPuzzle,
} from "./escapeRoomEngine";
import type {
  EscapeRoom,
  EscapeGameState,
} from "@/domain/cognitio/escapeEngine.types";
import type { NormalizedConcept } from "./conceptNormalizer";

// ---------- Helpers ----------

function makeState(overrides?: Partial<EscapeGameState>): EscapeGameState {
  return {
    current_room_index: 0,
    current_puzzle_index: 0,
    rooms_unlocked: [0],
    rooms_completed: [],
    puzzles_solved: [],
    inventory_collected: [],
    codes_discovered: new Map(),
    hints_used: 0,
    score: 0,
    accuracy: 0,
    total_time_sec: 0,
    events: [],
    phase: "exploring",
    ...overrides,
  };
}

function makeRoom(overrides: Partial<EscapeRoom> & { room_index: number }): EscapeRoom {
  return {
    id: `room-${overrides.room_index}`,
    title: `Room ${overrides.room_index}`,
    room_type: "exploration",
    narrative_context: "Context",
    entry_narrative: "Entry",
    completion_narrative: "Complete",
    lock: { type: "none", lock_description: "", unlock_hint: "" },
    puzzles: [],
    rewards: [],
    hints: [],
    discoverables: [],
    target_concepts: [],
    difficulty: 2,
    unlocked: overrides.room_index === 0,
    completed: false,
    ...overrides,
  };
}

function makeConcept(label: string): NormalizedConcept {
  return {
    normalized_label: label,
    definition: `Definition of ${label}`,
    compressed_definition: `Compressed: ${label}`,
    original_label: label,
    concept_type: "principal",
    quality_score: 1,
    rejection: null,
  };
}

// ==================== CAN UNLOCK ROOM ====================

describe("canUnlockRoom", () => {
  it("returns true for already-unlocked room", () => {
    const room = makeRoom({ room_index: 0, unlocked: true });
    expect(canUnlockRoom(room, makeState())).toBe(true);
  });

  it("returns true for room with no lock", () => {
    const room = makeRoom({
      room_index: 0,
      unlocked: false,
      lock: { type: "none", lock_description: "", unlock_hint: "" },
    });
    expect(canUnlockRoom(room, makeState())).toBe(true);
  });

  it("validates code_lock correctly", () => {
    const room = makeRoom({
      room_index: 1,
      unlocked: false,
      lock: { type: "code_lock", code: "1234", lock_description: "", unlock_hint: "" },
    });

    const codes = new Map<string, string>();
    codes.set("p1", "12");
    codes.set("p2", "34");

    expect(canUnlockRoom(room, makeState({ codes_discovered: codes }))).toBe(true);
  });

  it("rejects wrong code_lock", () => {
    const room = makeRoom({
      room_index: 1,
      unlocked: false,
      lock: { type: "code_lock", code: "1234", lock_description: "", unlock_hint: "" },
    });

    const codes = new Map<string, string>();
    codes.set("p1", "99");

    expect(canUnlockRoom(room, makeState({ codes_discovered: codes }))).toBe(false);
  });

  it("validates key_item lock", () => {
    const room = makeRoom({
      room_index: 1,
      unlocked: false,
      lock: { type: "key_item", required_item_id: "key-1", lock_description: "", unlock_hint: "" },
    });

    expect(canUnlockRoom(room, makeState({ inventory_collected: ["key-1"] }))).toBe(true);
    expect(canUnlockRoom(room, makeState({ inventory_collected: [] }))).toBe(false);
  });

  it("validates multi_key lock", () => {
    const room = makeRoom({
      room_index: 1,
      unlocked: false,
      lock: { type: "multi_key", required_item_ids: ["k1", "k2"], lock_description: "", unlock_hint: "" },
    });

    expect(canUnlockRoom(room, makeState({ inventory_collected: ["k1", "k2"] }))).toBe(true);
    expect(canUnlockRoom(room, makeState({ inventory_collected: ["k1"] }))).toBe(false);
  });

  it("validates puzzle_gate lock", () => {
    const room = makeRoom({
      room_index: 1,
      unlocked: false,
      lock: { type: "puzzle_gate", required_puzzle_ids: ["p1", "p2"], lock_description: "", unlock_hint: "" },
    });

    expect(canUnlockRoom(room, makeState({ puzzles_solved: ["p1", "p2"] }))).toBe(true);
    expect(canUnlockRoom(room, makeState({ puzzles_solved: ["p1"] }))).toBe(false);
  });

  it("validates score_gate lock", () => {
    const room = makeRoom({
      room_index: 1,
      unlocked: false,
      lock: { type: "score_gate", min_score: 0.6, lock_description: "", unlock_hint: "" },
    });

    expect(canUnlockRoom(room, makeState({ accuracy: 0.7 }))).toBe(true);
    expect(canUnlockRoom(room, makeState({ accuracy: 0.4 }))).toBe(false);
  });
});

// ==================== ATTEMPT CODE UNLOCK ====================

describe("attemptCodeUnlock", () => {
  it("succeeds with matching code", () => {
    const room = makeRoom({
      room_index: 1,
      lock: { type: "code_lock", code: "ABC123", lock_description: "", unlock_hint: "" },
    });
    expect(attemptCodeUnlock(room, "ABC123")).toBe(true);
  });

  it("fails with wrong code", () => {
    const room = makeRoom({
      room_index: 1,
      lock: { type: "code_lock", code: "ABC123", lock_description: "", unlock_hint: "" },
    });
    expect(attemptCodeUnlock(room, "WRONG")).toBe(false);
  });

  it("returns false for non-code_lock rooms", () => {
    const room = makeRoom({
      room_index: 1,
      lock: { type: "key_item", required_item_id: "k1", lock_description: "", unlock_hint: "" },
    });
    expect(attemptCodeUnlock(room, "anything")).toBe(false);
  });
});

// ==================== CHECK UNLOCKABLE ROOMS ====================

describe("checkUnlockableRooms", () => {
  it("finds newly unlockable rooms", () => {
    const rooms = [
      makeRoom({ room_index: 0, unlocked: true }),
      makeRoom({
        room_index: 1,
        unlocked: false,
        lock: { type: "puzzle_gate", required_puzzle_ids: ["p1"], lock_description: "", unlock_hint: "" },
      }),
      makeRoom({
        room_index: 2,
        unlocked: false,
        lock: { type: "puzzle_gate", required_puzzle_ids: ["p2"], lock_description: "", unlock_hint: "" },
      }),
    ];

    const state = makeState({ puzzles_solved: ["p1"] });
    const result = checkUnlockableRooms(rooms, state);
    expect(result).toContain(1);
    expect(result).not.toContain(2);
  });

  it("returns empty array when no rooms can be unlocked", () => {
    const rooms = [
      makeRoom({ room_index: 0, unlocked: true }),
      makeRoom({
        room_index: 1,
        unlocked: false,
        lock: { type: "key_item", required_item_id: "key-99", lock_description: "", unlock_hint: "" },
      }),
    ];
    expect(checkUnlockableRooms(rooms, makeState())).toEqual([]);
  });

  it("skips already unlocked rooms", () => {
    const rooms = [
      makeRoom({ room_index: 0, unlocked: true }),
      makeRoom({ room_index: 1, unlocked: true }),
    ];
    expect(checkUnlockableRooms(rooms, makeState())).toEqual([]);
  });
});

// ==================== CREATE META PUZZLE ====================

describe("createMetaPuzzle", () => {
  it("creates a final meta puzzle from concepts", () => {
    const concepts = [
      makeConcept("Mitosis"),
      makeConcept("Meiosis"),
      makeConcept("Cell cycle"),
      makeConcept("DNA replication"),
    ];

    const puzzle = createMetaPuzzle(concepts, 5, 3);
    expect(puzzle.puzzle_type).toBe("active_generation");
    expect(puzzle.bloom_level).toBe("create");
    expect(puzzle.difficulty).toBe(5);
    expect(puzzle.prompt).toContain("MÉTA-PUZZLE");
    expect(puzzle.prompt).toContain("Mitosis");
    expect(puzzle.validation_keywords!.length).toBeGreaterThan(0);
    expect(puzzle.required_items!.length).toBeGreaterThan(0);
  });

  it("limits keywords to 10", () => {
    const concepts = Array.from({ length: 10 }, (_, i) =>
      makeConcept(`Concept ${i} with many words in its definition`)
    );
    const puzzle = createMetaPuzzle(concepts, 8, 4);
    expect(puzzle.validation_keywords!.length).toBeLessThanOrEqual(10);
  });
});

// ==================== ROOM GENERATION ====================

describe("generateEscapeRooms", () => {
  it("generates the correct number of rooms", () => {
    const concepts = [
      makeConcept("Alpha"),
      makeConcept("Beta"),
      makeConcept("Gamma"),
      makeConcept("Delta"),
    ];
    const rooms = generateEscapeRooms({
      concepts,
      roomCount: 3,
      difficulty_base: 2,
      includeCodeLocks: false,
      narrative_contexts: {},
    });
    expect(rooms).toHaveLength(3);
  });

  it("first room is unlocked, others are not", () => {
    const concepts = [makeConcept("A"), makeConcept("B"), makeConcept("C")];
    const rooms = generateEscapeRooms({
      concepts,
      roomCount: 3,
      difficulty_base: 2,
      includeCodeLocks: false,
      narrative_contexts: {},
    });
    expect(rooms[0].unlocked).toBe(true);
    expect(rooms[1].unlocked).toBe(false);
    expect(rooms[2].unlocked).toBe(false);
  });

  it("assigns correct room types — briefing start, final end", () => {
    const concepts = [makeConcept("A"), makeConcept("B"), makeConcept("C"), makeConcept("D")];
    const rooms = generateEscapeRooms({
      concepts,
      roomCount: 4,
      difficulty_base: 1,
      includeCodeLocks: false,
      narrative_contexts: {},
    });
    expect(rooms[0].room_type).toBe("briefing");
    expect(rooms[rooms.length - 1].room_type).toBe("final");
  });

  it("generates puzzles for each room", () => {
    const concepts = [makeConcept("A"), makeConcept("B"), makeConcept("C")];
    const rooms = generateEscapeRooms({
      concepts,
      roomCount: 2,
      difficulty_base: 2,
      includeCodeLocks: false,
      narrative_contexts: {},
    });
    for (const room of rooms) {
      expect(room.puzzles.length).toBeGreaterThan(0);
    }
  });

  it("generates rewards for each room", () => {
    const concepts = [makeConcept("A"), makeConcept("B")];
    const rooms = generateEscapeRooms({
      concepts,
      roomCount: 2,
      difficulty_base: 2,
      includeCodeLocks: false,
      narrative_contexts: {},
    });
    for (const room of rooms) {
      expect(room.rewards.length).toBeGreaterThan(0);
    }
  });

  it("generates 4-level hints", () => {
    const concepts = [makeConcept("A"), makeConcept("B")];
    const rooms = generateEscapeRooms({
      concepts,
      roomCount: 2,
      difficulty_base: 2,
      includeCodeLocks: false,
      narrative_contexts: {},
    });
    for (const room of rooms) {
      expect(room.hints).toHaveLength(4);
      expect(room.hints.map(h => h.level)).toEqual([1, 2, 3, 4]);
    }
  });

  it("injects meta-puzzle in final room with enough concepts", () => {
    const concepts = [makeConcept("A"), makeConcept("B"), makeConcept("C"), makeConcept("D")];
    const rooms = generateEscapeRooms({
      concepts,
      roomCount: 3,
      difficulty_base: 2,
      includeCodeLocks: false,
      narrative_contexts: {},
    });
    const finalRoom = rooms[rooms.length - 1];
    const metaPuzzle = finalRoom.puzzles.find(p => p.puzzle_type === "active_generation" && p.prompt.includes("MÉTA-PUZZLE"));
    expect(metaPuzzle).toBeDefined();
  });

  it("generates discoverables for each room", () => {
    const concepts = [makeConcept("A"), makeConcept("B"), makeConcept("C")];
    const rooms = generateEscapeRooms({
      concepts,
      roomCount: 2,
      difficulty_base: 2,
      includeCodeLocks: false,
      narrative_contexts: {},
    });
    for (const room of rooms) {
      expect(room.discoverables.length).toBeGreaterThan(0);
    }
  });

  it("difficulty increases through rooms", () => {
    const concepts = Array.from({ length: 8 }, (_, i) => makeConcept(`C${i}`));
    const rooms = generateEscapeRooms({
      concepts,
      roomCount: 5,
      difficulty_base: 1,
      includeCodeLocks: false,
      narrative_contexts: {},
    });
    for (let i = 1; i < rooms.length; i++) {
      expect(rooms[i].difficulty).toBeGreaterThanOrEqual(rooms[i - 1].difficulty);
    }
  });
});
