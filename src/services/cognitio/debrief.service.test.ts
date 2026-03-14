import { describe, it, expect } from "vitest";
import { generateDebriefLocally } from "./debrief.service";
import type { M6_DebriefInput } from "@/domain/cognitio/recall.contracts";
import type { RecallAnswer, FragilityNode, ConfusionMapEntry, CompositeScore } from "@/domain/cognitio/recall.types";
import type { AnalyzedConcept } from "@/domain/cognitio/contracts";

function makeConcept(key: string): AnalyzedConcept {
  return {
    stable_key: key,
    label: `Concept ${key}`,
    definition: `Definition of ${key}`,
    criticality: 1,
    uncertain: false,
    source_spans: [],
  } as AnalyzedConcept;
}

function makeAnswer(overrides: Partial<RecallAnswer> = {}): RecallAnswer {
  return {
    item_id: crypto.randomUUID(),
    user_answer: "test",
    is_correct: true,
    confidence: 3,
    concepts_tested: ["c0"],
    time_taken_ms: 1000,
    ...overrides,
  };
}

function makeFragilityNode(key: string, status: FragilityNode["status"]): FragilityNode {
  return {
    concept_key: key,
    label: `Concept ${key}`,
    status,
    correct_count: status === "mastered" ? 2 : 0,
    total_count: 2,
    avg_confidence: 3,
    calibration_gap: 0,
  };
}

function makeInput(overrides: Partial<M6_DebriefInput> = {}): M6_DebriefInput {
  return {
    recall_attempt_id: "attempt-1",
    transformation_id: "trans-1",
    grade_output: {
      attempt_id: "attempt-1",
      raw_score: 0.5,
      confidence_score: 0.5,
      calibration_gap: 0,
      composite_score: { total: 60, raw_weight: 0.6, calibration_weight: 0.2, coverage_weight: 0.2, breakdown: { raw_component: 30, calibration_component: 20, coverage_component: 10 } },
      calibration: { raw_score: 0.5, confidence_score: 0.5, calibration_gap: 0, overconfidence_count: 0, underconfidence_count: 0, well_calibrated_count: 2 },
      fragility_map: [
        makeFragilityNode("c0", "mastered"),
        makeFragilityNode("c1", "failed"),
      ],
      confusion_map: [],
    },
    concepts: [makeConcept("c0"), makeConcept("c1")],
    confusion_pairs: [],
    traps: [],
    answers: [
      makeAnswer({ is_correct: true, concepts_tested: ["c0"] }),
      makeAnswer({ is_correct: false, concepts_tested: ["c1"] }),
    ],
    ...overrides,
  };
}

describe("generateDebriefLocally", () => {
  it("returns all required fields", () => {
    const result = generateDebriefLocally(makeInput());
    expect(result.id).toBeDefined();
    expect(result.transformation_id).toBe("trans-1");
    expect(result.recall_attempt_id).toBe("attempt-1");
    expect(result.composite_score).toBeDefined();
    expect(result.mastered_concepts).toBeDefined();
    expect(result.fragile_concepts).toBeDefined();
    expect(result.failed_concepts).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(result.next_action).toBeDefined();
  });

  it("classifies mastered concepts", () => {
    const result = generateDebriefLocally(makeInput());
    expect(result.mastered_concepts).toContain("c0");
  });

  it("classifies failed concepts", () => {
    const result = generateDebriefLocally(makeInput());
    expect(result.failed_concepts).toContain("c1");
  });

  it("recommends review_sheet for many failures", () => {
    const fragMap = [
      makeFragilityNode("c0", "failed"),
      makeFragilityNode("c1", "failed"),
      makeFragilityNode("c2", "failed"),
    ];
    const result = generateDebriefLocally(makeInput({
      grade_output: {
        ...makeInput().grade_output,
        composite_score: { total: 20, raw_weight: 0.6, calibration_weight: 0.2, coverage_weight: 0.2, breakdown: { raw_component: 10, calibration_component: 5, coverage_component: 5 } },
        fragility_map: fragMap,
      },
    }));
    expect(result.next_action).toBe("review_sheet");
  });

  it("recommends continue for high score", () => {
    const fragMap = [makeFragilityNode("c0", "mastered")];
    const result = generateDebriefLocally(makeInput({
      grade_output: {
        ...makeInput().grade_output,
        composite_score: { total: 90, raw_weight: 0.6, calibration_weight: 0.2, coverage_weight: 0.2, breakdown: { raw_component: 54, calibration_component: 18, coverage_component: 18 } },
        fragility_map: fragMap,
      },
    }));
    expect(result.next_action).toBe("continue");
  });

  it("generates recommendations based on results", () => {
    const result = generateDebriefLocally(makeInput());
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("detects traps missed", () => {
    const result = generateDebriefLocally(makeInput({
      traps: ["c1"],
      answers: [
        makeAnswer({ is_correct: false, concepts_tested: ["c1"] }),
      ],
    }));
    expect(result.traps_missed).toContain("c1");
  });
});
