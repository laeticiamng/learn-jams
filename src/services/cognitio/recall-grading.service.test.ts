import { describe, it, expect } from "vitest";
import { gradeRecallLocally } from "./recall-grading.service";
import type { M6_GradeInput } from "@/domain/cognitio/recall.contracts";
import type { RecallAnswer } from "@/domain/cognitio/recall.types";
import type { AnalyzedConcept, AnalyzedConfusionPair } from "@/domain/cognitio/contracts";

function makeAnswer(overrides: Partial<RecallAnswer> = {}): RecallAnswer {
  return {
    item_id: crypto.randomUUID(),
    answer: "test",
    is_correct: true,
    confidence: 3,
    concepts_tested: ["c0"],
    time_taken_ms: 1000,
    ...overrides,
  };
}

function makeConcept(key: string): AnalyzedConcept {
  return {
    stable_key: key,
    label: `Concept ${key}`,
    definition: `Definition of ${key}`,
    type: "general",
    criticality: 1,
    criticality_score: 0.8,
    bloom_target: "understand",
    relations: [],
    prerequisites: [],
    source_confidence: 0.8,
    source_trace: [{ segment_index: 0, excerpt: `About ${key}` }],
    uncertain: false,
  };
}

function makeInput(overrides: Partial<M6_GradeInput> = {}): M6_GradeInput {
  return {
    recall_test_id: "test-1",
    answers: [
      makeAnswer({ is_correct: true, confidence: 4, concepts_tested: ["c0"] }),
      makeAnswer({ is_correct: false, confidence: 2, concepts_tested: ["c1"] }),
    ],
    concepts: [makeConcept("c0"), makeConcept("c1")],
    critical_concept_keys: ["c0"],
    confusion_pairs: [],
    ...overrides,
  };
}

describe("gradeRecallLocally", () => {
  it("returns a valid grade output with all fields", () => {
    const result = gradeRecallLocally(makeInput());
    expect(result.attempt_id).toBeDefined();
    expect(typeof result.raw_score).toBe("number");
    expect(typeof result.confidence_score).toBe("number");
    expect(typeof result.calibration_gap).toBe("number");
    expect(result.composite_score).toBeDefined();
    expect(result.composite_score.total).toBeGreaterThanOrEqual(0);
    expect(result.composite_score.total).toBeLessThanOrEqual(100);
    expect(result.calibration).toBeDefined();
    expect(result.fragility_map).toBeDefined();
    expect(result.confusion_map).toBeDefined();
  });

  it("computes raw score correctly", () => {
    const result = gradeRecallLocally(makeInput({
      answers: [
        makeAnswer({ is_correct: true }),
        makeAnswer({ is_correct: true }),
        makeAnswer({ is_correct: false }),
      ],
    }));
    expect(result.raw_score).toBeCloseTo(2 / 3);
  });

  it("generates fragility map for each concept", () => {
    const result = gradeRecallLocally(makeInput());
    expect(result.fragility_map.length).toBeGreaterThanOrEqual(1);
  });

  it("generates confusion map when pairs are wrong", () => {
    const result = gradeRecallLocally(makeInput({
      answers: [
        makeAnswer({ is_correct: false, concepts_tested: ["c0"] }),
      ],
      confusion_pairs: [
        { concept_a_key: "c0", concept_b_key: "c1", distinction_key: "test", frequency: 4 },
      ],
    }));
    expect(result.confusion_map.length).toBeGreaterThanOrEqual(1);
  });

  it("generates unique attempt IDs", () => {
    const r1 = gradeRecallLocally(makeInput());
    const r2 = gradeRecallLocally(makeInput());
    expect(r1.attempt_id).not.toBe(r2.attempt_id);
  });
});
