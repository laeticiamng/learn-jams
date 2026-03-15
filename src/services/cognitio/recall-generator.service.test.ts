import { describe, it, expect } from "vitest";
import { generateRecallTestLocally, generateRecallSuiteLocally } from "./recall-generator.service";
import type { M6_GenerateInput } from "@/domain/cognitio/recall.contracts";
import type { AnalyzedConcept, AnalyzedConfusionPair } from "@/domain/cognitio/contracts";

function makeConcept(key: string, criticality = 1): AnalyzedConcept {
  return {
    stable_key: key,
    label: `Concept ${key}`,
    definition: `Definition of ${key} which is detailed enough`,
    type: "general",
    criticality: criticality as 1 | 2 | 3 | 4,
    criticality_score: 1 - criticality * 0.2,
    bloom_target: "understand",
    relations: [],
    prerequisites: [],
    source_confidence: 0.8,
    source_trace: [{ segment_index: 0, excerpt: `About ${key}` }],
    uncertain: false,
  };
}

function makeInput(overrides: Partial<M6_GenerateInput> = {}): M6_GenerateInput {
  return {
    transformation_id: "trans-1",
    concepts: Array.from({ length: 6 }, (_, i) => makeConcept(`c${i}`, i < 3 ? 1 : 3)),
    confusion_pairs: [
      { concept_a_key: "c0", concept_b_key: "c1", distinction_key: "c0 is X, c1 is Y", frequency: 4 },
    ],
    critical_concept_keys: ["c0", "c1", "c2"],
    test_type: "final",
    user_objective: "discovery",
    word_count: 1000,
    ...overrides,
  };
}

describe("generateRecallTestLocally", () => {
  it("generates a valid test with ID and items", () => {
    const result = generateRecallTestLocally(makeInput());
    expect(result.test_id).toBeDefined();
    expect(result.test_type).toBe("final");
    expect(result.items.length).toBeGreaterThanOrEqual(5);
    expect(result.items.length).toBeLessThanOrEqual(10);
  });

  it("generates unique test IDs", () => {
    const r1 = generateRecallTestLocally(makeInput());
    const r2 = generateRecallTestLocally(makeInput());
    expect(r1.test_id).not.toBe(r2.test_id);
  });

  it("generates items with valid structure", () => {
    const result = generateRecallTestLocally(makeInput());
    for (const item of result.items) {
      expect(item.id).toBeDefined();
      expect(item.prompt).toBeTruthy();
      expect(item.concepts_tested.length).toBeGreaterThan(0);
      expect(item.bloom_level).toBeGreaterThanOrEqual(1);
      expect(item.bloom_level).toBeLessThanOrEqual(6);
    }
  });

  it("respects final test Bloom distribution", () => {
    const result = generateRecallTestLocally(makeInput({ test_type: "final" }));
    const bloomLevels = new Set(result.items.map(i => i.bloom_level));
    expect(bloomLevels.size).toBeGreaterThanOrEqual(2);
  });

  it("generates j1 test focusing on critical concepts", () => {
    const result = generateRecallTestLocally(makeInput({ test_type: "j1" }));
    expect(result.test_type).toBe("j1");
    expect(result.items.length).toBeGreaterThanOrEqual(3);
    expect(result.items.length).toBeLessThanOrEqual(6);
  });

  it("generates j7 test with higher Bloom levels", () => {
    const result = generateRecallTestLocally(makeInput({ test_type: "j7" }));
    expect(result.test_type).toBe("j7");
    // j7 should have at least some items with bloom >= 3
    const highBloom = result.items.filter(i => i.bloom_level >= 3);
    expect(highBloom.length).toBeGreaterThan(0);
  });

  it("includes distinction items when confusion pairs exist", () => {
    const result = generateRecallTestLocally(makeInput({ test_type: "final" }));
    const hasDiscrimination = result.items.some(i => i.is_discrimination);
    expect(hasDiscrimination).toBe(true);
  });

  it("computes estimated duration", () => {
    const result = generateRecallTestLocally(makeInput());
    expect(result.estimated_duration_sec).toBe(result.items.length * 20);
  });
});

describe("generateRecallSuiteLocally", () => {
  it("generates all test types", () => {
    const suite = generateRecallSuiteLocally({
      transformation_id: "trans-1",
      concepts: Array.from({ length: 6 }, (_, i) => makeConcept(`c${i}`)),
      confusion_pairs: [],
      critical_concept_keys: ["c0", "c1"],
      user_objective: "discovery",
      word_count: 1000,
    });
    expect(suite.final_test).toBeDefined();
    expect(suite.j1_test).toBeDefined();
    expect(suite.j7_test).toBeDefined();
    expect(suite.final_test.test_type).toBe("final");
    expect(suite.j1_test.test_type).toBe("j1");
    expect(suite.j7_test.test_type).toBe("j7");
  });

  it("generates unique test IDs across suite", () => {
    const suite = generateRecallSuiteLocally({
      transformation_id: "trans-2",
      concepts: Array.from({ length: 6 }, (_, i) => makeConcept(`c${i}`)),
      confusion_pairs: [],
      critical_concept_keys: [],
      user_objective: "discovery",
      word_count: 1000,
    });
    const ids = new Set([suite.final_test.test_id, suite.j1_test.test_id, suite.j7_test.test_id]);
    expect(ids.size).toBe(3);
  });
});
