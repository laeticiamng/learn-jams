import { describe, it, expect } from "vitest";
import {
  getQualityBand,
  getFallbackMode,
  getRoomCount,
  validateConceptTraceability,
  validateIngestionResult,
  shouldIncludeBoss,
  validateQAScore,
  validateCognitiveBudget,
  validateRoomSequence,
  computeCalibrationGap,
  validateWordCount,
  runSemanticSuccessGate,
  runMissionGate,
  normalizeGateConceptInput,
  QA_MIN_SCORE,
  MAX_NEW_ITEMS_PER_SEGMENT,
  MAX_CONCEPTS_STANDARD,
} from "./validators";
import type { SemanticGateConceptInput, SemanticGateSignals } from "./validators";
import { SECOND_PASS_THRESHOLDS } from "./secondPassThresholds";

// ---------- Quality Band ----------

describe("getQualityBand", () => {
  it("returns excellent for scores above 0.85", () => {
    expect(getQualityBand(0.9)).toBe("excellent");
    expect(getQualityBand(1.0)).toBe("excellent");
  });

  it("returns good for scores 0.70-0.85", () => {
    expect(getQualityBand(0.85)).toBe("good");
    expect(getQualityBand(0.70)).toBe("good");
  });

  it("returns medium for scores 0.55-0.69", () => {
    expect(getQualityBand(0.55)).toBe("medium");
    expect(getQualityBand(0.69)).toBe("medium");
  });

  it("returns poor for scores 0.40-0.54", () => {
    expect(getQualityBand(0.40)).toBe("poor");
    expect(getQualityBand(0.54)).toBe("poor");
  });

  it("returns unusable for scores below 0.40", () => {
    expect(getQualityBand(0.39)).toBe("unusable");
    expect(getQualityBand(0)).toBe("unusable");
  });
});

describe("getFallbackMode", () => {
  it("maps each quality band to its fallback mode", () => {
    expect(getFallbackMode("excellent")).toBe("full");
    expect(getFallbackMode("good")).toBe("full_with_alerts");
    expect(getFallbackMode("medium")).toBe("reduced");
    expect(getFallbackMode("poor")).toBe("minimal");
    expect(getFallbackMode("unusable")).toBe("synthesis_only");
  });
});

describe("getRoomCount", () => {
  it("returns 5 rooms for excellent and good", () => {
    expect(getRoomCount("excellent")).toBe(5);
    expect(getRoomCount("good")).toBe(5);
  });

  it("returns 3 rooms for medium", () => {
    expect(getRoomCount("medium")).toBe(3);
  });

  it("returns 2 rooms for poor", () => {
    expect(getRoomCount("poor")).toBe(2);
  });

  it("returns 0 rooms for unusable", () => {
    expect(getRoomCount("unusable")).toBe(0);
  });
});

describe("shouldIncludeBoss", () => {
  it("includes boss for excellent and good", () => {
    expect(shouldIncludeBoss("excellent")).toBe(true);
    expect(shouldIncludeBoss("good")).toBe(true);
  });

  it("excludes boss for medium, poor, unusable", () => {
    expect(shouldIncludeBoss("medium")).toBe(false);
    expect(shouldIncludeBoss("poor")).toBe(false);
    expect(shouldIncludeBoss("unusable")).toBe(false);
  });
});

// ---------- QA Validators ----------

describe("validateQAScore", () => {
  it("does not block when score is high and no violations", () => {
    const result = validateQAScore(90, []);
    expect(result.publish_blocked).toBe(false);
    expect(result.block_reason).toBeUndefined();
  });

  it("blocks when score is below minimum", () => {
    const result = validateQAScore(70, []);
    expect(result.publish_blocked).toBe(true);
    expect(result.block_reason).toContain("Score QA insuffisant");
  });

  it("blocks on hallucination violation regardless of score", () => {
    const result = validateQAScore(95, [
      { severity: "blocking", violation_type: "hallucination" },
    ]);
    expect(result.publish_blocked).toBe(true);
    expect(result.block_reason).toContain("Hallucination");
  });

  it("blocks on any blocking violation", () => {
    const result = validateQAScore(90, [
      { severity: "blocking", violation_type: "overload" },
    ]);
    expect(result.publish_blocked).toBe(true);
    expect(result.block_reason).toContain("Violation bloquante");
  });

  it("prioritizes hallucination over other blocking reasons", () => {
    const result = validateQAScore(50, [
      { severity: "blocking", violation_type: "hallucination" },
      { severity: "blocking", violation_type: "overload" },
    ]);
    expect(result.block_reason).toContain("Hallucination");
  });
});

// ---------- Cognitive Budget ----------

describe("validateCognitiveBudget", () => {
  it("passes with valid budgets", () => {
    const result = validateCognitiveBudget(10, [3, 4, 5, 2]);
    expect(result.valid).toBe(true);
    expect(result.overloaded_segments).toEqual([]);
    expect(result.too_many_concepts).toBe(false);
  });

  it("fails when a segment exceeds max items", () => {
    const result = validateCognitiveBudget(10, [3, 8, 2]);
    expect(result.valid).toBe(false);
    expect(result.overloaded_segments).toEqual([1]);
  });

  it("identifies multiple overloaded segments", () => {
    const result = validateCognitiveBudget(10, [6, 3, 7]);
    expect(result.overloaded_segments).toEqual([0, 2]);
  });

  it("fails when total concepts exceed maximum", () => {
    const result = validateCognitiveBudget(35, [3, 3, 3]);
    expect(result.valid).toBe(false);
    expect(result.too_many_concepts).toBe(true);
  });

  it("fails when both conditions are violated", () => {
    const result = validateCognitiveBudget(35, [8, 3]);
    expect(result.valid).toBe(false);
    expect(result.overloaded_segments).toEqual([0]);
    expect(result.too_many_concepts).toBe(true);
  });
});

// ---------- Room Sequence ----------

describe("validateRoomSequence", () => {
  it("validates a correct sequence", () => {
    const result = validateRoomSequence(["OBSERVATION", "TRI", "SEQUENCE", "ELIMINATION", "DECISION"]);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("rejects consecutive same bricks", () => {
    const result = validateRoomSequence(["OBSERVATION", "TRI", "TRI", "DECISION"]);
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]).toContain("same brick");
  });

  it("warns when OBSERVATION is too late", () => {
    const result = validateRoomSequence(["TRI", "SEQUENCE", "OBSERVATION", "DECISION"]);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes("OBSERVATION"))).toBe(true);
  });

  it("warns when DECISION is too early", () => {
    const result = validateRoomSequence(["DECISION", "TRI", "SEQUENCE", "OBSERVATION"]);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes("DECISION"))).toBe(true);
  });

  it("accepts empty sequence", () => {
    const result = validateRoomSequence([]);
    expect(result.valid).toBe(true);
  });

  it("accepts single room", () => {
    const result = validateRoomSequence(["OBSERVATION"]);
    expect(result.valid).toBe(true);
  });
});

// ---------- Calibration Gap ----------

describe("computeCalibrationGap", () => {
  it("returns 0 for empty results", () => {
    expect(computeCalibrationGap([])).toBe(0);
  });

  it("returns 0 when confidence matches accuracy", () => {
    const results = [
      { confidence: 1.0, is_correct: true },
      { confidence: 0.0, is_correct: false },
    ];
    expect(computeCalibrationGap(results)).toBe(0);
  });

  it("detects overconfidence", () => {
    const results = [
      { confidence: 0.9, is_correct: false },
      { confidence: 0.9, is_correct: false },
    ];
    const gap = computeCalibrationGap(results);
    expect(gap).toBeCloseTo(0.9, 1);
  });

  it("detects underconfidence", () => {
    const results = [
      { confidence: 0.2, is_correct: true },
      { confidence: 0.2, is_correct: true },
    ];
    const gap = computeCalibrationGap(results);
    expect(gap).toBeCloseTo(0.8, 1);
  });

  it("computes correct gap for mixed results", () => {
    const results = [
      { confidence: 0.8, is_correct: true },
      { confidence: 0.8, is_correct: false },
      { confidence: 0.6, is_correct: true },
      { confidence: 0.6, is_correct: true },
    ];
    // avg confidence = 0.7, accuracy = 3/4 = 0.75
    const gap = computeCalibrationGap(results);
    expect(gap).toBeCloseTo(0.05, 2);
  });
});

// ---------- Word Count ----------

describe("validateWordCount", () => {
  it("returns fallback_micro for too few words", () => {
    const result = validateWordCount(50);
    expect(result.valid).toBe(false);
    expect(result.action).toBe("fallback_micro");
  });

  it("returns proceed for normal word counts", () => {
    const result = validateWordCount(500);
    expect(result.valid).toBe(true);
    expect(result.action).toBe("proceed");
  });

  it("returns chunk for very long texts", () => {
    const result = validateWordCount(20000);
    expect(result.valid).toBe(true);
    expect(result.action).toBe("chunk");
  });

  it("returns proceed at minimum viable boundary", () => {
    const result = validateWordCount(100);
    expect(result.valid).toBe(true);
    expect(result.action).toBe("proceed");
  });

  it("returns fallback_micro just below minimum", () => {
    const result = validateWordCount(99);
    expect(result.valid).toBe(false);
    expect(result.action).toBe("fallback_micro");
  });
});

// ---------- Concept Traceability ----------

describe("validateConceptTraceability", () => {
  const sourceText = "La photosynthèse est le processus par lequel les plantes convertissent la lumière en énergie. La respiration cellulaire est un processus métabolique.";

  it("validates traceable concepts", () => {
    const concepts = [
      { stable_key: "photosynthese", source_confidence: 0.9, source_trace: [{ excerpt: "La photosynthèse est le processus" }] },
    ];
    const result = validateConceptTraceability(concepts, sourceText);
    expect(result.valid).toBe(true);
    expect(result.untraceable).toEqual([]);
  });

  it("detects untraceable concepts", () => {
    const concepts = [
      { stable_key: "invented_concept", source_confidence: 0.8, source_trace: [] },
    ];
    const result = validateConceptTraceability(concepts, sourceText);
    expect(result.valid).toBe(false);
    expect(result.untraceable).toContain("invented_concept");
  });

  it("marks low-confidence concepts as uncertain", () => {
    const concepts = [
      { stable_key: "respiration", source_confidence: 0.3, source_trace: [{ excerpt: "La respiration cellulaire est" }] },
    ];
    const result = validateConceptTraceability(concepts, sourceText);
    expect(result.uncertain).toContain("respiration");
  });

  it("handles empty concepts array", () => {
    const result = validateConceptTraceability([], sourceText);
    expect(result.valid).toBe(true);
  });
});

// ---------- Ingestion Result Validation ----------

describe("validateIngestionResult", () => {
  it("returns no issues for valid document", () => {
    const result = validateIngestionResult(500, 0.8, "fr");
    expect(result.issues).toEqual([]);
  });

  it("returns blocking for empty document", () => {
    const result = validateIngestionResult(0, 0, "fr");
    expect(result.issues.some(i => i.code === "EMPTY_DOCUMENT")).toBe(true);
    expect(result.issues.some(i => i.severity === "blocking")).toBe(true);
  });

  it("returns warning for short document", () => {
    const result = validateIngestionResult(50, 0.5, "fr");
    expect(result.issues.some(i => i.code === "DOCUMENT_TOO_SHORT")).toBe(true);
  });

  it("returns info for long document", () => {
    const result = validateIngestionResult(20000, 0.8, "fr");
    expect(result.issues.some(i => i.code === "DOCUMENT_TOO_LONG")).toBe(true);
    expect(result.issues.find(i => i.code === "DOCUMENT_TOO_LONG")?.severity).toBe("info");
  });

  it("returns blocking for low confidence", () => {
    const result = validateIngestionResult(500, 0.2, "fr");
    expect(result.issues.some(i => i.code === "LOW_CONFIDENCE_BLOCKING")).toBe(true);
    expect(result.issues.find(i => i.code === "LOW_CONFIDENCE_BLOCKING")?.severity).toBe("blocking");
  });
});

// ---------- Semantic Success Gate: threshold_profile & mode-aware behavior ----------

/** Shared helpers for gate tests */
function makeAcceptScorer() {
  return {
    scoreConceptCandidate: (_l: string, _d: string) => ({
      accepted: true,
      editorial_artifact_score: 0,
      header_noise_score: 0,
    }),
    isEditorialArtifact: (_t: string) => false,
    cleanMainTopic: (t: string) => t,
  };
}

function makeValidConcept(overrides: Partial<SemanticGateConceptInput> = {}): SemanticGateConceptInput {
  return {
    label: overrides.label ?? "concept",
    definition: overrides.definition ?? "A valid definition",
    uncertain: overrides.uncertain ?? false,
    source_confidence: overrides.source_confidence ?? 0.9,
    source_trace: overrides.source_trace ?? [{ segment_index: 1, excerpt: "trace" }],
  };
}

describe("runSemanticSuccessGate — threshold_profile signal", () => {
  it("reports 'full_strict' threshold_profile for full mode", () => {
    const result = runSemanticSuccessGate({
      concepts: [makeValidConcept(), makeValidConcept({ label: "c2" })],
      main_topic: "Biologie cellulaire",
      ...makeAcceptScorer(),
      analysis_mode: "full",
    });
    expect(result.signals.threshold_profile).toBe("full_strict");
    expect(result.signals.analysis_mode).toBe("full");
  });

  it("reports 'body_only_relaxed' threshold_profile for body_only mode", () => {
    const result = runSemanticSuccessGate({
      concepts: [makeValidConcept()],
      main_topic: "Biologie cellulaire",
      ...makeAcceptScorer(),
      analysis_mode: "body_only",
    });
    expect(result.signals.threshold_profile).toBe("body_only_relaxed");
    expect(result.signals.analysis_mode).toBe("body_only");
  });

  it("defaults to full_strict when analysis_mode is omitted", () => {
    const result = runSemanticSuccessGate({
      concepts: [makeValidConcept(), makeValidConcept({ label: "c2" })],
      main_topic: "Biologie cellulaire",
      ...makeAcceptScorer(),
    });
    expect(result.signals.threshold_profile).toBe("full_strict");
    expect(result.signals.analysis_mode).toBe("full");
  });
});

describe("runSemanticSuccessGate — mode-aware thresholds from SECOND_PASS_THRESHOLDS", () => {
  it("full mode requires MIN_VALID_CONCEPTS_FULL valid concepts", () => {
    // Exactly one valid concept should fail under full mode (needs 2)
    const result = runSemanticSuccessGate({
      concepts: [makeValidConcept()],
      main_topic: "Biologie cellulaire",
      ...makeAcceptScorer(),
      analysis_mode: "full",
    });
    expect(result.passed).toBe(false);
    expect(result.signals.valid_concepts_count).toBe(1);
    expect(result.signals.valid_concepts_count).toBeLessThan(SECOND_PASS_THRESHOLDS.MIN_VALID_CONCEPTS_FULL);
  });

  it("body_only mode requires only MIN_VALID_CONCEPTS_BODY_ONLY valid concept", () => {
    // Same single concept should pass under body_only mode (needs 1)
    const result = runSemanticSuccessGate({
      concepts: [makeValidConcept()],
      main_topic: "Biologie cellulaire",
      ...makeAcceptScorer(),
      analysis_mode: "body_only",
    });
    expect(result.passed).toBe(true);
    expect(result.signals.valid_concepts_count).toBeGreaterThanOrEqual(SECOND_PASS_THRESHOLDS.MIN_VALID_CONCEPTS_BODY_ONLY);
  });

  it("full mode blocks when editorial artifact ratio >= MAX_ARTIFACT_RATIO_FULL", () => {
    // All concepts are artifacts except one — ratio = 4/5 = 0.8
    const artifactScorer = {
      scoreConceptCandidate: (label: string, _d: string) => ({
        accepted: label === "valid",
        editorial_artifact_score: label === "valid" ? 0 : 0.9,
        header_noise_score: 0,
      }),
      isEditorialArtifact: (_t: string) => false,
      cleanMainTopic: (t: string) => t,
    };
    const concepts = [
      makeValidConcept({ label: "valid" }),
      makeValidConcept({ label: "artifact1" }),
      makeValidConcept({ label: "artifact2" }),
      makeValidConcept({ label: "artifact3" }),
      makeValidConcept({ label: "artifact4" }),
    ];
    const result = runSemanticSuccessGate({
      concepts,
      main_topic: "Biologie cellulaire",
      ...artifactScorer,
      analysis_mode: "full",
    });
    expect(result.signals.editorial_artifact_ratio).toBeGreaterThanOrEqual(SECOND_PASS_THRESHOLDS.MAX_ARTIFACT_RATIO_FULL);
    expect(result.passed).toBe(false);
  });

  it("body_only mode allows higher artifact ratio up to MAX_ARTIFACT_RATIO_BODY_ONLY", () => {
    // 4/5 = 0.8 ratio — should pass body_only (threshold 0.9) but not full (threshold 0.8)
    const artifactScorer = {
      scoreConceptCandidate: (label: string, _d: string) => ({
        accepted: label === "valid",
        editorial_artifact_score: label === "valid" ? 0 : 0.9,
        header_noise_score: 0,
      }),
      isEditorialArtifact: (_t: string) => false,
      cleanMainTopic: (t: string) => t,
    };
    const concepts = [
      makeValidConcept({ label: "valid" }),
      makeValidConcept({ label: "artifact1" }),
      makeValidConcept({ label: "artifact2" }),
      makeValidConcept({ label: "artifact3" }),
      makeValidConcept({ label: "artifact4" }),
    ];
    const result = runSemanticSuccessGate({
      concepts,
      main_topic: "Biologie cellulaire",
      ...artifactScorer,
      analysis_mode: "body_only",
    });
    expect(result.signals.editorial_artifact_ratio).toBeLessThan(SECOND_PASS_THRESHOLDS.MAX_ARTIFACT_RATIO_BODY_ONLY);
    // body_only needs only 1 valid concept, so this should pass
    expect(result.passed).toBe(true);
  });
});

describe("runSemanticSuccessGate — partial/undefined concept inputs", () => {
  it("handles concepts with undefined uncertain field", () => {
    const concept: SemanticGateConceptInput = {
      label: "test",
      definition: "a definition",
      // uncertain is omitted
      source_confidence: 0.9,
      source_trace: [{ segment_index: 1, excerpt: "trace" }],
    };
    const result = runSemanticSuccessGate({
      concepts: [concept, { ...concept, label: "c2" }],
      main_topic: "Topic",
      ...makeAcceptScorer(),
    });
    expect(result.passed).toBe(true);
    expect(result.signals.uncertain_concepts_count).toBe(0);
  });

  it("handles concepts with undefined source_confidence (defaults to 0.5 via normalizer)", () => {
    const concept: SemanticGateConceptInput = {
      label: "test",
      definition: "a definition",
      uncertain: false,
      // source_confidence is omitted
      source_trace: [{ segment_index: 1, excerpt: "trace" }],
    };
    const result = runSemanticSuccessGate({
      concepts: [concept, { ...concept, label: "c2" }],
      main_topic: "Topic",
      ...makeAcceptScorer(),
    });
    // source_confidence defaults to 0.5, which is >= 0.4, so not uncertain
    expect(result.passed).toBe(true);
    expect(result.signals.uncertain_concepts_count).toBe(0);
  });

  it("handles concepts with undefined source_trace (defaults to empty array)", () => {
    const concept: SemanticGateConceptInput = {
      label: "test",
      definition: "a definition",
      uncertain: false,
      source_confidence: 0.9,
      // source_trace is omitted
    };
    const result = runSemanticSuccessGate({
      concepts: [concept, { ...concept, label: "c2" }],
      main_topic: "Topic",
      ...makeAcceptScorer(),
      analysis_mode: "full",
    });
    // With empty source_trace in full mode, no body concepts detected
    expect(result.signals.body_concepts_count).toBe(0);
  });

  it("handles empty concepts array", () => {
    const result = runSemanticSuccessGate({
      concepts: [],
      main_topic: "Topic",
      ...makeAcceptScorer(),
    });
    expect(result.passed).toBe(false);
    expect(result.signals.valid_concepts_count).toBe(0);
  });
});

// ---------- normalizeGateConceptInput edge cases ----------

describe("normalizeGateConceptInput — edge cases", () => {
  it("defaults source_confidence to 0.5 when undefined", () => {
    const input: SemanticGateConceptInput = {
      label: "test",
      definition: "def",
    };
    const normalized = normalizeGateConceptInput(input);
    expect(normalized.source_confidence).toBe(0.5);
  });

  it("defaults source_confidence to 0.5 when null-ish (NaN)", () => {
    const input: SemanticGateConceptInput = {
      label: "test",
      definition: "def",
      source_confidence: NaN,
    };
    const normalized = normalizeGateConceptInput(input);
    expect(normalized.source_confidence).toBe(0.5);
  });

  it("defaults source_confidence to 0.5 when Infinity", () => {
    const input: SemanticGateConceptInput = {
      label: "test",
      definition: "def",
      source_confidence: Infinity,
    };
    const normalized = normalizeGateConceptInput(input);
    expect(normalized.source_confidence).toBe(0.5);
  });

  it("preserves valid source_confidence of 0", () => {
    const input: SemanticGateConceptInput = {
      label: "test",
      definition: "def",
      source_confidence: 0,
    };
    const normalized = normalizeGateConceptInput(input);
    expect(normalized.source_confidence).toBe(0);
  });

  it("defaults source_trace to empty array when undefined", () => {
    const input: SemanticGateConceptInput = {
      label: "test",
      definition: "def",
    };
    const normalized = normalizeGateConceptInput(input);
    expect(normalized.source_trace).toEqual([]);
  });

  it("defaults source_trace to empty array when not an array", () => {
    const input = {
      label: "test",
      definition: "def",
      source_trace: "not_an_array" as unknown as { segment_index: number; excerpt: string }[],
    };
    const normalized = normalizeGateConceptInput(input as SemanticGateConceptInput);
    expect(normalized.source_trace).toEqual([]);
  });

  it("defaults uncertain to false when undefined", () => {
    const input: SemanticGateConceptInput = {
      label: "test",
      definition: "def",
    };
    const normalized = normalizeGateConceptInput(input);
    expect(normalized.uncertain).toBe(false);
  });

  it("preserves all fields when fully specified", () => {
    const input: SemanticGateConceptInput = {
      label: "concept",
      definition: "a definition",
      uncertain: true,
      source_confidence: 0.7,
      source_trace: [{ segment_index: 2, excerpt: "text" }],
    };
    const normalized = normalizeGateConceptInput(input);
    expect(normalized.label).toBe("concept");
    expect(normalized.definition).toBe("a definition");
    expect(normalized.uncertain).toBe(true);
    expect(normalized.source_confidence).toBe(0.7);
    expect(normalized.source_trace).toEqual([{ segment_index: 2, excerpt: "text" }]);
  });
});

// ---------- Mission Gate with SECOND_PASS_THRESHOLDS ----------

describe("runMissionGate — uses SECOND_PASS_THRESHOLDS", () => {
  function makeSignals(overrides: Partial<SemanticGateSignals> = {}): SemanticGateSignals {
    return {
      valid_concepts_count: 5,
      uncertain_concepts_count: 0,
      body_concepts_count: 3,
      segment_0_concepts_count: 0,
      editorial_artifact_ratio: 0,
      main_topic_is_editorial_artifact: false,
      semantic_generation_allowed: true,
      gate_block_reasons: [],
      ...overrides,
    };
  }

  it("blocks when valid_concepts_count < MISSION_MIN_VALID_CONCEPTS", () => {
    const signals = makeSignals({
      valid_concepts_count: SECOND_PASS_THRESHOLDS.MISSION_MIN_VALID_CONCEPTS - 1,
    });
    const result = runMissionGate(signals, "Topic");
    expect(result.passed).toBe(false);
    expect(result.block_reasons.some(r => r.includes("concepts valides requis"))).toBe(true);
  });

  it("passes when valid_concepts_count == MISSION_MIN_VALID_CONCEPTS", () => {
    const signals = makeSignals({
      valid_concepts_count: SECOND_PASS_THRESHOLDS.MISSION_MIN_VALID_CONCEPTS,
    });
    const result = runMissionGate(signals, "Topic");
    expect(result.passed).toBe(true);
  });

  it("blocks when editorial_artifact_ratio >= MISSION_MAX_ARTIFACT_RATIO", () => {
    const signals = makeSignals({
      editorial_artifact_ratio: SECOND_PASS_THRESHOLDS.MISSION_MAX_ARTIFACT_RATIO,
    });
    const result = runMissionGate(signals, "Topic");
    expect(result.passed).toBe(false);
    expect(result.block_reasons.some(r => r.includes("artefacts éditoriaux"))).toBe(true);
  });

  it("passes when editorial_artifact_ratio just below MISSION_MAX_ARTIFACT_RATIO", () => {
    const signals = makeSignals({
      editorial_artifact_ratio: SECOND_PASS_THRESHOLDS.MISSION_MAX_ARTIFACT_RATIO - 0.01,
    });
    const result = runMissionGate(signals, "Topic");
    expect(result.passed).toBe(true);
  });
});
