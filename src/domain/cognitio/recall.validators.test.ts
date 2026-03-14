import { describe, it, expect } from "vitest";
import { validateRecallTest } from "./recall.validators";
import type { RecallItem, RecallTestType } from "./recall.types";
import type { M6_GenerateOutput } from "./recall.contracts";

function makeItem(overrides: Partial<RecallItem> = {}): RecallItem {
  return {
    id: crypto.randomUUID(),
    type: "qcu",
    prompt: "Question?",
    choices: ["A", "B", "C", "D"],
    expected_answer: "A",
    concepts_tested: ["c0"],
    bloom_level: 1,
    is_discrimination: false,
    is_transfer: false,
    linked_block_id: null,
    ...overrides,
  };
}

function makeOutput(items: RecallItem[], testType: RecallTestType): M6_GenerateOutput {
  return {
    test_id: crypto.randomUUID(),
    test_type: testType,
    items,
    estimated_duration_sec: items.length * 20,
  };
}

describe("validateRecallTest", () => {
  it("passes valid final test", () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      makeItem({ id: `item-${i}`, bloom_level: (i % 3 + 1) as 1 | 2 | 3, concepts_tested: [`c${i}`] })
    );
    const result = validateRecallTest(makeOutput(items, "final"), ["c0", "c1"]);
    expect(result.valid).toBe(true);
  });

  it("fails final test with too few questions", () => {
    const items = [makeItem()];
    const result = validateRecallTest(makeOutput(items, "final"), ["c0"]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("fails final test with insufficient Bloom diversity", () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeItem({ id: `item-${i}`, bloom_level: 1 })
    );
    const result = validateRecallTest(makeOutput(items, "final"), []);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes("Bloom"))).toBe(true);
  });

  it("passes j1 test with valid count", () => {
    const items = Array.from({ length: 4 }, (_, i) =>
      makeItem({ id: `item-${i}` })
    );
    const result = validateRecallTest(makeOutput(items, "j1"), []);
    expect(result.valid).toBe(true);
  });

  it("fails j7 test without discrimination or transfer", () => {
    const items = Array.from({ length: 4 }, (_, i) =>
      makeItem({ id: `item-${i}`, is_discrimination: false, is_transfer: false })
    );
    const result = validateRecallTest(makeOutput(items, "j7"), []);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes("discrimination") || e.message.includes("transfer") || e.message.includes("distinction"))).toBe(true);
  });

  it("passes j7 test with discrimination item", () => {
    const items = Array.from({ length: 4 }, (_, i) =>
      makeItem({ id: `item-${i}`, is_discrimination: i === 0 })
    );
    const result = validateRecallTest(makeOutput(items, "j7"), []);
    expect(result.valid).toBe(true);
  });

  it("fails for duplicate IDs", () => {
    const items = Array.from({ length: 5 }, () =>
      makeItem({ id: "same-id", bloom_level: 1 })
    );
    items[1].bloom_level = 2;
    items[2].bloom_level = 3;
    const result = validateRecallTest(makeOutput(items, "final"), []);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.toLowerCase().includes("duplicate"))).toBe(true);
  });
});
