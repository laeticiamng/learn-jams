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
  QA_MIN_SCORE,
  MAX_NEW_ITEMS_PER_SEGMENT,
  MAX_CONCEPTS_STANDARD,
} from "./validators";

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
