// ============================================================
// Tests — Escape Puzzle Engine: dependency graph, answer
// validation (all puzzle types), feedback, and concept results.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  buildPuzzleDependencyGraph,
  canAttemptPuzzle,
  getNewlyAvailablePuzzles,
  validatePuzzleAnswer,
  buildConceptResults,
} from "./escapePuzzleEngine";
import type {
  EscapeRoom,
  EscapePuzzle,
  EscapeGameState,
} from "@/domain/cognitio/escapeEngine.types";

// ---------- Helpers ----------

function makePuzzle(overrides: Partial<EscapePuzzle> & { id: string }): EscapePuzzle {
  return {
    puzzle_type: "observation",
    brick_type: "observation",
    prompt: "Test prompt",
    instructions: "Test instructions",
    correct_answer: "answer",
    explanation: "Test explanation",
    concept_key: "concept_1",
    bloom_level: "understand",
    difficulty: 2,
    solved: false,
    attempts: 0,
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

function makeState(overrides?: Partial<EscapeGameState>): EscapeGameState {
  return {
    current_room_index: 0,
    current_puzzle_index: 0,
    rooms_completed: [],
    puzzles_solved: [],
    inventory_collected: [],
    codes_discovered: new Map(),
    hints_used: 0,
    score: 0,
    accuracy: 0,
    time_started: new Date().toISOString(),
    events: [],
    phase: "playing",
    ...overrides,
  };
}

// ==================== DEPENDENCY GRAPH ====================

describe("buildPuzzleDependencyGraph", () => {
  it("creates dependencies for sequential puzzles in same room", () => {
    const p1 = makePuzzle({ id: "p1" });
    const p2 = makePuzzle({ id: "p2" });
    const p3 = makePuzzle({ id: "p3" });
    const rooms = [makeRoom({ room_index: 0, puzzles: [p1, p2, p3] })];

    const graph = buildPuzzleDependencyGraph(rooms);

    expect(graph).toHaveLength(3);
    expect(graph[0].depends_on).toEqual([]);
    expect(graph[1].depends_on).toEqual(["p1"]);
    expect(graph[2].depends_on).toEqual(["p2"]);
  });

  it("tracks unlock targets", () => {
    const p1 = makePuzzle({
      id: "p1",
      unlocks: { type: "room", target_id: "room-1", unlock_message: "Unlocked!" },
    });
    const rooms = [makeRoom({ room_index: 0, puzzles: [p1] })];

    const graph = buildPuzzleDependencyGraph(rooms);
    expect(graph[0].unlocks).toEqual(["room-1"]);
  });

  it("creates cross-room dependencies via required_items", () => {
    const p1 = makePuzzle({
      id: "p1",
      unlocks: { type: "item", target_id: "key-1", unlock_message: "Got key" },
    });
    const p2 = makePuzzle({ id: "p2", required_items: ["key-1"] });

    const rooms = [
      makeRoom({ room_index: 0, puzzles: [p1] }),
      makeRoom({ room_index: 1, puzzles: [p2] }),
    ];

    const graph = buildPuzzleDependencyGraph(rooms);
    const p2Dep = graph.find(d => d.puzzle_id === "p2")!;
    expect(p2Dep.depends_on).toContain("p1");
  });

  it("handles empty rooms", () => {
    const rooms = [makeRoom({ room_index: 0, puzzles: [] })];
    const graph = buildPuzzleDependencyGraph(rooms);
    expect(graph).toHaveLength(0);
  });
});

// ==================== CAN ATTEMPT PUZZLE ====================

describe("canAttemptPuzzle", () => {
  it("allows first puzzle with no dependencies", () => {
    const puzzle = makePuzzle({ id: "p1" });
    const graph = [{ puzzle_id: "p1", depends_on: [], unlocks: [], room_index: 0 }];
    const state = makeState();

    const result = canAttemptPuzzle(puzzle, graph, state);
    expect(result.canAttempt).toBe(true);
    expect(result.blockedBy).toEqual([]);
  });

  it("blocks puzzle with unsolved dependency", () => {
    const puzzle = makePuzzle({ id: "p2" });
    const graph = [{ puzzle_id: "p2", depends_on: ["p1"], unlocks: [], room_index: 0 }];
    const state = makeState();

    const result = canAttemptPuzzle(puzzle, graph, state);
    expect(result.canAttempt).toBe(false);
    expect(result.blockedBy).toContain("p1");
  });

  it("allows puzzle when dependencies are satisfied", () => {
    const puzzle = makePuzzle({ id: "p2" });
    const graph = [{ puzzle_id: "p2", depends_on: ["p1"], unlocks: [], room_index: 0 }];
    const state = makeState({ puzzles_solved: ["p1"] });

    const result = canAttemptPuzzle(puzzle, graph, state);
    expect(result.canAttempt).toBe(true);
  });

  it("blocks puzzle with missing required items", () => {
    const puzzle = makePuzzle({ id: "p1", required_items: ["key-1"] });
    const graph = [{ puzzle_id: "p1", depends_on: [], unlocks: [], room_index: 0 }];
    const state = makeState();

    const result = canAttemptPuzzle(puzzle, graph, state);
    expect(result.canAttempt).toBe(false);
    expect(result.blockedBy).toContain("key-1");
  });

  it("returns canAttempt=true for unknown puzzle id", () => {
    const puzzle = makePuzzle({ id: "unknown" });
    const result = canAttemptPuzzle(puzzle, [], makeState());
    expect(result.canAttempt).toBe(true);
  });
});

// ==================== NEWLY AVAILABLE PUZZLES ====================

describe("getNewlyAvailablePuzzles", () => {
  it("returns puzzles whose dependencies are now met", () => {
    const graph = [
      { puzzle_id: "p1", depends_on: [], unlocks: [], room_index: 0 },
      { puzzle_id: "p2", depends_on: ["p1"], unlocks: [], room_index: 0 },
      { puzzle_id: "p3", depends_on: ["p1", "p2"], unlocks: [], room_index: 0 },
    ];
    const state = makeState({ puzzles_solved: ["p1"] });

    const available = getNewlyAvailablePuzzles("p1", graph, state);
    expect(available).toContain("p2");
    expect(available).not.toContain("p3"); // still needs p2
  });

  it("returns empty array when no puzzles depend on the solved one", () => {
    const graph = [
      { puzzle_id: "p1", depends_on: [], unlocks: [], room_index: 0 },
    ];
    const available = getNewlyAvailablePuzzles("p1", graph, makeState());
    expect(available).toEqual([]);
  });
});

// ==================== ANSWER VALIDATION ====================

describe("validatePuzzleAnswer", () => {
  describe("standard (observation/elimination/decision)", () => {
    it("validates correct string answer", () => {
      const puzzle = makePuzzle({ id: "p1", correct_answer: "Mitosis" });
      const result = validatePuzzleAnswer(puzzle, "mitosis", 0.8, 5000, 0);
      expect(result.is_correct).toBe(true);
      expect(result.partial_score).toBeGreaterThan(0);
    });

    it("rejects incorrect answer", () => {
      const puzzle = makePuzzle({ id: "p1", correct_answer: "Mitosis" });
      const result = validatePuzzleAnswer(puzzle, "meiosis", 0.5, 5000, 0);
      expect(result.is_correct).toBe(false);
    });

    it("validates array answers ignoring order", () => {
      const puzzle = makePuzzle({ id: "p1", correct_answer: ["A", "B", "C"] });
      const result = validatePuzzleAnswer(puzzle, ["C", "A", "B"], 0.8, 5000, 0);
      expect(result.is_correct).toBe(true);
    });
  });

  describe("sequencing", () => {
    it("validates correct sequence", () => {
      const puzzle = makePuzzle({
        id: "p1",
        puzzle_type: "sequencing",
        correct_answer: ["step1", "step2", "step3"],
      });
      const result = validatePuzzleAnswer(puzzle, ["step1", "step2", "step3"], 0.8, 5000, 0);
      expect(result.is_correct).toBe(true);
      expect(result.partial_score).toBeGreaterThan(0.9);
    });

    it("gives partial credit for partially correct sequence", () => {
      const puzzle = makePuzzle({
        id: "p1",
        puzzle_type: "sequencing",
        correct_answer: ["A", "B", "C"],
      });
      const result = validatePuzzleAnswer(puzzle, ["A", "C", "B"], 0.5, 5000, 0);
      expect(result.is_correct).toBe(false);
      expect(result.partial_score).toBeGreaterThan(0);
    });
  });

  describe("free text (active_generation/synthesis)", () => {
    it("validates by keyword presence", () => {
      const puzzle = makePuzzle({
        id: "p1",
        puzzle_type: "active_generation",
        correct_answer: "",
        validation_keywords: ["photosynthesis", "chloroplast", "light", "glucose", "oxygen"],
      });
      const result = validatePuzzleAnswer(
        puzzle,
        "Photosynthesis occurs in the chloroplast, using light energy to produce glucose and oxygen.",
        0.8,
        10000,
        0,
      );
      expect(result.is_correct).toBe(true);
      expect(result.partial_score).toBeGreaterThan(0.8);
    });

    it("rejects text missing too many keywords", () => {
      const puzzle = makePuzzle({
        id: "p1",
        puzzle_type: "active_generation",
        correct_answer: "",
        validation_keywords: ["photosynthesis", "chloroplast", "light", "glucose", "oxygen"],
      });
      const result = validatePuzzleAnswer(puzzle, "Plants are green.", 0.5, 5000, 0);
      expect(result.is_correct).toBe(false);
    });

    it("accepts non-empty text with partial credit when no keywords defined", () => {
      const puzzle = makePuzzle({
        id: "p1",
        puzzle_type: "synthesis",
        correct_answer: "",
        validation_keywords: [],
      });
      const result = validatePuzzleAnswer(
        puzzle,
        "This is a sufficiently long answer with some content.",
        0.5,
        5000,
        0,
      );
      expect(result.is_correct).toBe(true);
      expect(result.partial_score).toBeGreaterThan(0);
    });
  });

  describe("association/pattern_match", () => {
    it("validates correct multi-match answer", () => {
      const puzzle = makePuzzle({
        id: "p1",
        puzzle_type: "association",
        correct_answer: ["A", "B", "C"],
      });
      const result = validatePuzzleAnswer(puzzle, ["A", "B", "C"], 0.8, 5000, 0);
      expect(result.is_correct).toBe(true);
    });

    it("gives partial credit for partially correct matches", () => {
      const puzzle = makePuzzle({
        id: "p1",
        puzzle_type: "pattern_match",
        correct_answer: ["A", "B", "C"],
      });
      const result = validatePuzzleAnswer(puzzle, ["A", "B", "D"], 0.5, 5000, 0);
      expect(result.is_correct).toBe(false);
      expect(result.partial_score).toBeGreaterThan(0);
    });
  });

  describe("penalties and scoring", () => {
    it("applies hint penalty", () => {
      const puzzle = makePuzzle({ id: "p1", correct_answer: "A" });
      const noHints = validatePuzzleAnswer(puzzle, "A", 0.8, 5000, 0);
      const withHints = validatePuzzleAnswer(puzzle, "A", 0.8, 5000, 2);
      expect(withHints.partial_score).toBeLessThan(noHints.partial_score);
    });

    it("applies time penalty for slow answers", () => {
      const puzzle = makePuzzle({ id: "p1", correct_answer: "A", difficulty: 1 });
      const fast = validatePuzzleAnswer(puzzle, "A", 0.8, 5000, 0);
      const slow = validatePuzzleAnswer(puzzle, "A", 0.8, 200000, 0);
      expect(slow.partial_score).toBeLessThan(fast.partial_score);
    });

    it("returns code_fragment on correct answer", () => {
      const puzzle = makePuzzle({
        id: "p1",
        correct_answer: "A",
        code_contribution: { position: 0, value: "42" },
      });
      const result = validatePuzzleAnswer(puzzle, "A", 0.8, 5000, 0);
      expect(result.code_fragment).toBe("42");
    });

    it("omits code_fragment on incorrect answer", () => {
      const puzzle = makePuzzle({
        id: "p1",
        correct_answer: "A",
        code_contribution: { position: 0, value: "42" },
      });
      const result = validatePuzzleAnswer(puzzle, "B", 0.8, 5000, 0);
      expect(result.code_fragment).toBeUndefined();
    });
  });

  describe("feedback generation", () => {
    it("returns overconfidence feedback for wrong answer with high confidence", () => {
      const puzzle = makePuzzle({ id: "p1", correct_answer: "A" });
      const result = validatePuzzleAnswer(puzzle, "B", 0.9, 5000, 0);
      expect(result.feedback_title).toContain("surconfiance");
    });

    it("returns excellent feedback for high-score correct answer", () => {
      const puzzle = makePuzzle({ id: "p1", correct_answer: "A" });
      const result = validatePuzzleAnswer(puzzle, "A", 0.8, 5000, 0);
      expect(result.feedback_title).toContain("Excellent");
    });
  });

  describe("mastery delta", () => {
    it("increases mastery for correct answers", () => {
      const puzzle = makePuzzle({ id: "p1", correct_answer: "A" });
      const result = validatePuzzleAnswer(puzzle, "A", 0.5, 5000, 0);
      expect(result.mastery_delta).toBeGreaterThan(0);
    });

    it("decreases mastery for incorrect answers", () => {
      const puzzle = makePuzzle({ id: "p1", correct_answer: "A" });
      const result = validatePuzzleAnswer(puzzle, "B", 0.5, 5000, 0);
      expect(result.mastery_delta).toBeLessThan(0);
    });

    it("amplifies penalty for overconfident wrong answers", () => {
      const puzzle = makePuzzle({ id: "p1", correct_answer: "A" });
      const lowConf = validatePuzzleAnswer(puzzle, "B", 0.3, 5000, 0);
      const highConf = validatePuzzleAnswer(puzzle, "B", 0.9, 5000, 0);
      expect(highConf.mastery_delta).toBeLessThan(lowConf.mastery_delta);
    });

    it("weights higher bloom levels more", () => {
      const easy = makePuzzle({ id: "p1", correct_answer: "A", bloom_level: "remember" });
      const hard = makePuzzle({ id: "p2", correct_answer: "A", bloom_level: "create" });
      const easyResult = validatePuzzleAnswer(easy, "A", 0.5, 5000, 0);
      const hardResult = validatePuzzleAnswer(hard, "A", 0.5, 5000, 0);
      expect(hardResult.mastery_delta).toBeGreaterThan(easyResult.mastery_delta);
    });
  });
});

// ==================== CONCEPT RESULTS ====================

describe("buildConceptResults", () => {
  it("builds results from puzzle_attempt events", () => {
    const state = makeState({
      events: [
        {
          type: "puzzle_attempt",
          timestamp: new Date().toISOString(),
          room_index: 0,
          details: {
            concept_key: "concept_1",
            is_correct: true,
            confidence: 0.8,
            hints_used: 0,
            bloom_level: "understand",
            mastery_delta: 0.15,
          },
        },
        {
          type: "puzzle_attempt",
          timestamp: new Date().toISOString(),
          room_index: 0,
          details: {
            concept_key: "concept_2",
            is_correct: false,
            confidence: 0.5,
            hints_used: 1,
            bloom_level: "apply",
            mastery_delta: -0.1,
          },
        },
      ],
    });

    const results = buildConceptResults([], state);
    expect(results).toHaveLength(2);

    const c1 = results.find(r => r.concept_key === "concept_1")!;
    expect(c1.was_correct).toBe(true);
    expect(c1.mastery_delta).toBe(0.15);

    const c2 = results.find(r => r.concept_key === "concept_2")!;
    expect(c2.was_correct).toBe(false);
    expect(c2.hints_used).toBe(1);
  });

  it("aggregates multiple attempts for the same concept", () => {
    const state = makeState({
      events: [
        {
          type: "puzzle_attempt",
          timestamp: new Date().toISOString(),
          room_index: 0,
          details: {
            concept_key: "concept_1",
            is_correct: false,
            confidence: 0.3,
            hints_used: 1,
            bloom_level: "understand",
            mastery_delta: -0.1,
          },
        },
        {
          type: "puzzle_attempt",
          timestamp: new Date().toISOString(),
          room_index: 0,
          details: {
            concept_key: "concept_1",
            is_correct: true,
            confidence: 0.8,
            hints_used: 0,
            bloom_level: "understand",
            mastery_delta: 0.15,
          },
        },
      ],
    });

    const results = buildConceptResults([], state);
    expect(results).toHaveLength(1);
    expect(results[0].was_correct).toBe(true); // latest attempt
    expect(results[0].mastery_delta).toBeCloseTo(0.05); // -0.1 + 0.15
    expect(results[0].hints_used).toBe(1); // accumulated
  });

  it("ignores non-puzzle_attempt events", () => {
    const state = makeState({
      events: [
        {
          type: "room_completed",
          timestamp: new Date().toISOString(),
          room_index: 0,
          details: {},
        },
      ],
    });

    const results = buildConceptResults([], state);
    expect(results).toHaveLength(0);
  });

  it("returns empty array for empty event list", () => {
    const results = buildConceptResults([], makeState());
    expect(results).toHaveLength(0);
  });
});
