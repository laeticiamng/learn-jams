// ============================================================
// Tests — Escape Inventory Engine: collection, examination,
// key items, item usage, and inventory summaries.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  collectItem,
  hasItem,
  hasAllItems,
  getKeyItems,
  getItemsByType,
  getTotalCollectibles,
  getCollectionProgress,
  collectRoomRewards,
  examineItem,
  getItemUsage,
  getInventorySummary,
} from "./escapeInventoryEngine";
import type { InventoryItem, EscapeRoom } from "@/domain/cognitio/escapeEngine.types";

// ---------- Helpers ----------

function makeItem(overrides: Partial<InventoryItem> & { id: string }): InventoryItem {
  return {
    type: "document",
    name: `Item ${overrides.id}`,
    description: `Description for ${overrides.id}`,
    icon: "file",
    source_room_index: 0,
    is_key_item: false,
    collected: false,
    ...overrides,
  };
}

function makeRoom(
  index: number,
  rewards: InventoryItem[] = [],
  lockOverrides?: Partial<EscapeRoom["lock"]>,
): EscapeRoom {
  return {
    room_index: index,
    id: `room-${index}`,
    title: `Room ${index}`,
    room_type: "exploration",
    narrative_context: "Context",
    entry_narrative: "Entry",
    completion_narrative: "Complete",
    lock: {
      type: "none",
      lock_description: "",
      unlock_hint: "",
      ...lockOverrides,
    },
    puzzles: [],
    rewards,
    hints: [],
    discoverables: [],
    target_concepts: [],
    difficulty: 2,
    unlocked: index === 0,
    completed: false,
  };
}

// ==================== COLLECT ITEM ====================

describe("collectItem", () => {
  it("collects an uncollected item from a room", () => {
    const item = makeItem({ id: "item-1" });
    const rooms = [makeRoom(0, [item])];
    const result = collectItem([], "item-1", rooms);
    expect(result).toHaveLength(1);
    expect(result[0].collected).toBe(true);
  });

  it("does not duplicate already-collected items", () => {
    const item = makeItem({ id: "item-1", collected: true });
    const rooms = [makeRoom(0, [item])];
    const result = collectItem([], "item-1", rooms);
    expect(result).toHaveLength(0); // item.collected is true, so not re-collected
  });

  it("returns unchanged inventory if item not found", () => {
    const rooms = [makeRoom(0)];
    const existing = [makeItem({ id: "existing", collected: true })];
    const result = collectItem(existing, "nonexistent", rooms);
    expect(result).toBe(existing); // same reference
  });
});

// ==================== HAS ITEM ====================

describe("hasItem", () => {
  it("returns true if item is collected", () => {
    const inventory = [makeItem({ id: "key-1", collected: true })];
    expect(hasItem(inventory, "key-1")).toBe(true);
  });

  it("returns false if item is not collected", () => {
    const inventory = [makeItem({ id: "key-1", collected: false })];
    expect(hasItem(inventory, "key-1")).toBe(false);
  });

  it("returns false if item is not in inventory", () => {
    expect(hasItem([], "key-1")).toBe(false);
  });
});

// ==================== HAS ALL ITEMS ====================

describe("hasAllItems", () => {
  it("returns true when all required items are present", () => {
    const inventory = [
      makeItem({ id: "a", collected: true }),
      makeItem({ id: "b", collected: true }),
    ];
    expect(hasAllItems(inventory, ["a", "b"])).toBe(true);
  });

  it("returns false when some items are missing", () => {
    const inventory = [makeItem({ id: "a", collected: true })];
    expect(hasAllItems(inventory, ["a", "b"])).toBe(false);
  });

  it("returns true for empty required list", () => {
    expect(hasAllItems([], [])).toBe(true);
  });
});

// ==================== KEY ITEMS ====================

describe("getKeyItems", () => {
  it("returns only key items that are collected", () => {
    const inventory = [
      makeItem({ id: "key-1", is_key_item: true, collected: true }),
      makeItem({ id: "doc-1", is_key_item: false, collected: true }),
      makeItem({ id: "key-2", is_key_item: true, collected: false }),
    ];
    const keys = getKeyItems(inventory);
    expect(keys).toHaveLength(1);
    expect(keys[0].id).toBe("key-1");
  });
});

// ==================== ITEMS BY TYPE ====================

describe("getItemsByType", () => {
  it("groups collected items by type", () => {
    const inventory = [
      makeItem({ id: "d1", type: "document", collected: true }),
      makeItem({ id: "d2", type: "document", collected: true }),
      makeItem({ id: "a1", type: "artifact", collected: true }),
      makeItem({ id: "u1", type: "clue", collected: false }), // not collected
    ];
    const grouped = getItemsByType(inventory);
    expect(grouped.document).toHaveLength(2);
    expect(grouped.artifact).toHaveLength(1);
    expect(grouped.clue).toHaveLength(0);
  });

  it("returns empty arrays for all types with empty inventory", () => {
    const grouped = getItemsByType([]);
    expect(grouped.document).toHaveLength(0);
    expect(grouped.key).toHaveLength(0);
    expect(grouped.badge).toHaveLength(0);
  });
});

// ==================== TOTAL COLLECTIBLES ====================

describe("getTotalCollectibles", () => {
  it("counts all rewards across rooms", () => {
    const rooms = [
      makeRoom(0, [makeItem({ id: "a" }), makeItem({ id: "b" })]),
      makeRoom(1, [makeItem({ id: "c" })]),
    ];
    expect(getTotalCollectibles(rooms)).toBe(3);
  });

  it("returns 0 for rooms with no rewards", () => {
    const rooms = [makeRoom(0), makeRoom(1)];
    expect(getTotalCollectibles(rooms)).toBe(0);
  });
});

// ==================== COLLECTION PROGRESS ====================

describe("getCollectionProgress", () => {
  it("calculates percentage correctly", () => {
    const rooms = [
      makeRoom(0, [makeItem({ id: "a" }), makeItem({ id: "b" })]),
    ];
    const inventory = [makeItem({ id: "a", collected: true })];
    expect(getCollectionProgress(inventory, rooms)).toBe(50);
  });

  it("returns 100 when all items collected", () => {
    const rooms = [makeRoom(0, [makeItem({ id: "a" })])];
    const inventory = [makeItem({ id: "a", collected: true })];
    expect(getCollectionProgress(inventory, rooms)).toBe(100);
  });

  it("returns 100 when no items exist", () => {
    expect(getCollectionProgress([], [makeRoom(0)])).toBe(100);
  });
});

// ==================== COLLECT ROOM REWARDS ====================

describe("collectRoomRewards", () => {
  it("collects all new rewards from a room", () => {
    const room = makeRoom(0, [
      makeItem({ id: "a" }),
      makeItem({ id: "b" }),
    ]);
    const result = collectRoomRewards(room, []);
    expect(result).toHaveLength(2);
    expect(result.every(i => i.collected)).toBe(true);
  });

  it("skips already-collected items", () => {
    const room = makeRoom(0, [
      makeItem({ id: "a" }),
      makeItem({ id: "b" }),
    ]);
    const existing = [makeItem({ id: "a", collected: true })];
    const result = collectRoomRewards(room, existing);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });
});

// ==================== EXAMINE ITEM ====================

describe("examineItem", () => {
  it("returns examine_text when available", () => {
    const item = makeItem({ id: "x", examine_text: "Secret info" });
    expect(examineItem(item)).toBe("Secret info");
  });

  it("falls back to name + description", () => {
    const item = makeItem({ id: "x", name: "Dossier", description: "Confidential" });
    expect(examineItem(item)).toBe("Dossier: Confidential");
  });
});

// ==================== ITEM USAGE ====================

describe("getItemUsage", () => {
  it("identifies rooms that need a key item", () => {
    const item = makeItem({ id: "key-1", is_key_item: true });
    const rooms = [
      makeRoom(0),
      makeRoom(1, [], { type: "key_item", required_item_id: "key-1", lock_description: "", unlock_hint: "" }),
    ];
    const usage = getItemUsage(item, rooms);
    expect(usage.needed_for).toContain("Room 1");
  });

  it("detects multi_key usage", () => {
    const item = makeItem({ id: "key-2" });
    const rooms = [
      makeRoom(0),
      makeRoom(1, [], { type: "multi_key", required_item_ids: ["key-1", "key-2"], lock_description: "", unlock_hint: "" }),
    ];
    const usage = getItemUsage(item, rooms);
    expect(usage.needed_for).toContain("Room 1");
  });

  it("marks used=true when target room is unlocked", () => {
    const item = makeItem({ id: "key-1" });
    const rooms = [
      makeRoom(0),
      { ...makeRoom(1, [], { type: "key_item", required_item_id: "key-1", lock_description: "", unlock_hint: "" }), unlocked: true },
    ];
    const usage = getItemUsage(item, rooms);
    expect(usage.used).toBe(true);
  });

  it("returns empty needed_for for items not used as keys", () => {
    const item = makeItem({ id: "doc-1" });
    const rooms = [makeRoom(0)];
    const usage = getItemUsage(item, rooms);
    expect(usage.needed_for).toEqual([]);
  });
});

// ==================== INVENTORY SUMMARY ====================

describe("getInventorySummary", () => {
  it("computes full summary", () => {
    const rooms = [
      makeRoom(0, [
        makeItem({ id: "k1", is_key_item: true, type: "key" }),
        makeItem({ id: "d1", type: "document" }),
        makeItem({ id: "b1", type: "badge" }),
      ]),
    ];
    const inventory = [
      makeItem({ id: "k1", is_key_item: true, type: "key", collected: true }),
      makeItem({ id: "d1", type: "document", collected: true }),
    ];

    const summary = getInventorySummary(inventory, rooms);
    expect(summary.total_items).toBe(3);
    expect(summary.collected_items).toBe(2);
    expect(summary.key_items_collected).toBe(1);
    expect(summary.key_items_total).toBe(1);
    expect(summary.badges_earned).toBe(0);
    expect(summary.collection_percentage).toBe(67);
    expect(summary.items_by_type.key).toBe(1);
    expect(summary.items_by_type.document).toBe(1);
  });

  it("handles empty inventory", () => {
    const summary = getInventorySummary([], [makeRoom(0)]);
    expect(summary.collected_items).toBe(0);
    expect(summary.collection_percentage).toBe(100); // 0 total
  });
});
