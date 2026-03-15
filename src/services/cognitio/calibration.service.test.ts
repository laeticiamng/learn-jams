import { describe, it, expect } from "vitest";
import {
  computeRawScore,
  computeConfidenceScore,
  computeCalibrationGap,
  computeCalibrationMetrics,
  computeCompositeScore,
  computeFragilityMap,
  computeConfusionMap,
} from "./calibration.service";
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

function makeConcept(key: string, label?: string): AnalyzedConcept {
  return {
    stable_key: key,
    label: label ?? `Concept ${key}`,
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

// ---------- computeRawScore ----------

describe("computeRawScore", () => {
  it("returns 0 for empty answers", () => {
    expect(computeRawScore([])).toBe(0);
  });

  it("returns 1 for all correct", () => {
    const answers = [makeAnswer({ is_correct: true }), makeAnswer({ is_correct: true })];
    expect(computeRawScore(answers)).toBe(1);
  });

  it("returns 0.5 for half correct", () => {
    const answers = [makeAnswer({ is_correct: true }), makeAnswer({ is_correct: false })];
    expect(computeRawScore(answers)).toBe(0.5);
  });

  it("returns 0 for none correct", () => {
    const answers = [makeAnswer({ is_correct: false }), makeAnswer({ is_correct: false })];
    expect(computeRawScore(answers)).toBe(0);
  });
});

// ---------- computeConfidenceScore ----------

describe("computeConfidenceScore", () => {
  it("returns 0 for empty answers", () => {
    expect(computeConfidenceScore([])).toBe(0);
  });

  it("returns 0 for confidence 1 (normalized)", () => {
    const answers = [makeAnswer({ confidence: 1 })];
    expect(computeConfidenceScore(answers)).toBe(0);
  });

  it("returns 1 for confidence 5 (normalized)", () => {
    const answers = [makeAnswer({ confidence: 5 })];
    expect(computeConfidenceScore(answers)).toBe(1);
  });

  it("returns 0.5 for confidence 3", () => {
    const answers = [makeAnswer({ confidence: 3 })];
    expect(computeConfidenceScore(answers)).toBe(0.5);
  });
});

// ---------- computeCalibrationGap ----------

describe("computeCalibrationGap", () => {
  it("returns 0 for empty answers", () => {
    expect(computeCalibrationGap([])).toBe(0);
  });

  it("positive gap = overconfident (high confidence, low accuracy)", () => {
    const answers = [makeAnswer({ confidence: 5, is_correct: false })];
    const gap = computeCalibrationGap(answers);
    expect(gap).toBeGreaterThan(0);
  });

  it("negative gap = underconfident (low confidence, high accuracy)", () => {
    const answers = [makeAnswer({ confidence: 1, is_correct: true })];
    const gap = computeCalibrationGap(answers);
    expect(gap).toBeLessThan(0);
  });

  it("near zero for well-calibrated", () => {
    // confidence 3 = 0.5, all correct = 1.0 → gap = -0.5
    // confidence 5 = 1.0, all correct = 1.0 → gap = 0
    const answers = [makeAnswer({ confidence: 5, is_correct: true })];
    const gap = computeCalibrationGap(answers);
    expect(gap).toBe(0);
  });
});

// ---------- computeCalibrationMetrics ----------

describe("computeCalibrationMetrics", () => {
  it("detects overconfidence", () => {
    const answers = [
      makeAnswer({ confidence: 5, is_correct: false }),
      makeAnswer({ confidence: 5, is_correct: false }),
    ];
    const metrics = computeCalibrationMetrics(answers);
    expect(metrics.overconfidence_count).toBe(2);
    expect(metrics.underconfidence_count).toBe(0);
  });

  it("detects underconfidence", () => {
    const answers = [
      makeAnswer({ confidence: 1, is_correct: true }),
      makeAnswer({ confidence: 1, is_correct: true }),
    ];
    const metrics = computeCalibrationMetrics(answers);
    expect(metrics.underconfidence_count).toBe(2);
    expect(metrics.overconfidence_count).toBe(0);
  });

  it("detects well-calibrated answers", () => {
    const answers = [
      makeAnswer({ confidence: 5, is_correct: true }),
      makeAnswer({ confidence: 1, is_correct: false }),
    ];
    const metrics = computeCalibrationMetrics(answers);
    expect(metrics.well_calibrated_count).toBe(2);
  });
});

// ---------- computeCompositeScore ----------

describe("computeCompositeScore", () => {
  it("returns 0-100 range", () => {
    const answers = [makeAnswer({ is_correct: true, confidence: 5 })];
    const score = computeCompositeScore(answers, []);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it("perfect score for all correct, well-calibrated, all critical covered", () => {
    const answers = [
      makeAnswer({ is_correct: true, confidence: 5, concepts_tested: ["c0"] }),
      makeAnswer({ is_correct: true, confidence: 5, concepts_tested: ["c1"] }),
    ];
    const score = computeCompositeScore(answers, ["c0", "c1"]);
    expect(score.total).toBe(100);
  });

  it("low score for all wrong", () => {
    const answers = [
      makeAnswer({ is_correct: false, confidence: 5, concepts_tested: ["c0"] }),
    ];
    const score = computeCompositeScore(answers, ["c0"]);
    expect(score.total).toBeLessThan(40);
  });

  it("breakdown sums to total", () => {
    const answers = [makeAnswer({ is_correct: true, confidence: 3 })];
    const score = computeCompositeScore(answers, []);
    const sumBreakdown = score.breakdown.raw_component + score.breakdown.calibration_component + score.breakdown.coverage_component;
    expect(Math.abs(score.total - sumBreakdown)).toBeLessThanOrEqual(1); // Rounding tolerance
  });
});

// ---------- computeFragilityMap ----------

describe("computeFragilityMap", () => {
  it("returns empty for no answers", () => {
    expect(computeFragilityMap([], [])).toEqual([]);
  });

  it("classifies mastered concept (high accuracy, well-calibrated)", () => {
    const answers = [
      makeAnswer({ is_correct: true, confidence: 5, concepts_tested: ["c0"] }),
      makeAnswer({ is_correct: true, confidence: 5, concepts_tested: ["c0"] }),
    ];
    const concepts = [makeConcept("c0")];
    const map = computeFragilityMap(answers, concepts);
    expect(map).toHaveLength(1);
    expect(map[0].status).toBe("mastered");
  });

  it("classifies failed concept (low accuracy)", () => {
    const answers = [
      makeAnswer({ is_correct: false, confidence: 1, concepts_tested: ["c0"] }),
      makeAnswer({ is_correct: false, confidence: 1, concepts_tested: ["c0"] }),
    ];
    const concepts = [makeConcept("c0")];
    const map = computeFragilityMap(answers, concepts);
    expect(map[0].status).toBe("failed");
  });

  it("classifies overconfident (high confidence, low accuracy)", () => {
    const answers = [
      makeAnswer({ is_correct: false, confidence: 5, concepts_tested: ["c0"] }),
      makeAnswer({ is_correct: true, confidence: 5, concepts_tested: ["c0"] }),
    ];
    const concepts = [makeConcept("c0")];
    const map = computeFragilityMap(answers, concepts);
    // accuracy=0.5, conf=(5-1)/4=1.0, gap=0.5 > 0.3 → overconfident
    expect(map[0].status).toBe("overconfident");
  });

  it("classifies underconfident (low confidence, medium accuracy)", () => {
    // Need accuracy between 0.5 and 0.8 so it doesn't hit "mastered" or "failed"
    // and gap < -0.3
    const answers = [
      makeAnswer({ is_correct: true, confidence: 1, concepts_tested: ["c0"] }),
      makeAnswer({ is_correct: true, confidence: 1, concepts_tested: ["c0"] }),
      makeAnswer({ is_correct: false, confidence: 1, concepts_tested: ["c0"] }),
    ];
    const concepts = [makeConcept("c0")];
    const map = computeFragilityMap(answers, concepts);
    // accuracy=2/3≈0.67, conf=(1-1)/4=0, gap=0-0.67=-0.67 < -0.3 → underconfident
    expect(map[0].status).toBe("underconfident");
  });

  it("tracks multiple concepts independently", () => {
    const answers = [
      makeAnswer({ is_correct: true, confidence: 5, concepts_tested: ["c0"] }),
      makeAnswer({ is_correct: false, confidence: 1, concepts_tested: ["c1"] }),
    ];
    const concepts = [makeConcept("c0"), makeConcept("c1")];
    const map = computeFragilityMap(answers, concepts);
    expect(map).toHaveLength(2);
    const c0 = map.find(n => n.concept_key === "c0");
    const c1 = map.find(n => n.concept_key === "c1");
    expect(c0?.status).toBe("mastered");
    expect(c1?.status).toBe("failed");
  });
});

// ---------- computeConfusionMap ----------

describe("computeConfusionMap", () => {
  it("returns empty when no confusion pairs", () => {
    const answers = [makeAnswer({ is_correct: false })];
    expect(computeConfusionMap(answers, [])).toEqual([]);
  });

  it("detects confusion when related answers are wrong", () => {
    const answers = [
      makeAnswer({ is_correct: false, concepts_tested: ["c0"] }),
    ];
    const pairs: AnalyzedConfusionPair[] = [
      {
        concept_a_key: "c0",
        concept_b_key: "c1",
        distinction_key: "c0 vs c1",
        frequency: 4,
      },
    ];
    const map = computeConfusionMap(answers, pairs);
    expect(map).toHaveLength(1);
    expect(map[0].confusion_count).toBe(1);
  });

  it("does not flag correct answers as confusion", () => {
    const answers = [
      makeAnswer({ is_correct: true, concepts_tested: ["c0"] }),
    ];
    const pairs: AnalyzedConfusionPair[] = [
      {
        concept_a_key: "c0",
        concept_b_key: "c1",
        distinction_key: "c0 vs c1",
        frequency: 4,
      },
    ];
    const map = computeConfusionMap(answers, pairs);
    expect(map).toHaveLength(0);
  });

  it("sorts by confusion count descending", () => {
    const answers = [
      makeAnswer({ is_correct: false, concepts_tested: ["c0"] }),
      makeAnswer({ is_correct: false, concepts_tested: ["c0"] }),
      makeAnswer({ is_correct: false, concepts_tested: ["c2"] }),
    ];
    const pairs: AnalyzedConfusionPair[] = [
      { concept_a_key: "c0", concept_b_key: "c1", distinction_key: "d1", frequency: 1 } as AnalyzedConfusionPair,
      { concept_a_key: "c2", concept_b_key: "c3", distinction_key: "d2", frequency: 2 },
    ];
    const map = computeConfusionMap(answers, pairs);
    expect(map[0].confusion_count).toBeGreaterThanOrEqual(map[1].confusion_count);
  });
});
