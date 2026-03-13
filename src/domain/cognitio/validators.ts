// ============================================================
// COGNITIO Validators — Zod schemas for contract validation
// ============================================================

import { z } from "zod";

// ---------- Quality Band ----------

export function getQualityBand(score: number) {
  if (score > 0.85) return "excellent" as const;
  if (score >= 0.70) return "good" as const;
  if (score >= 0.55) return "medium" as const;
  if (score >= 0.40) return "poor" as const;
  return "unusable" as const;
}

export function getFallbackMode(qualityBand: ReturnType<typeof getQualityBand>) {
  switch (qualityBand) {
    case "excellent": return "full" as const;
    case "good": return "full_with_alerts" as const;
    case "medium": return "reduced" as const;
    case "poor": return "minimal" as const;
    case "unusable": return "synthesis_only" as const;
  }
}

export function getRoomCount(qualityBand: ReturnType<typeof getQualityBand>) {
  switch (qualityBand) {
    case "excellent": return 5;
    case "good": return 5;
    case "medium": return 3;
    case "poor": return 2;
    case "unusable": return 0;
  }
}

export function shouldIncludeBoss(qualityBand: ReturnType<typeof getQualityBand>) {
  return qualityBand === "excellent" || qualityBand === "good";
}

// ---------- Ingestion Validators ----------

export const ingestInputSchema = z.object({
  file: z.instanceof(File).optional(),
  pasted_text: z.string().optional(),
  content_type: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ]),
  objective: z.enum(["discovery", "revision", "exam", "consolidation"]),
  language: z.string().optional(),
}).refine(
  (data) => data.file || data.pasted_text,
  { message: "Either file or pasted_text must be provided" }
);

// ---------- QA Validators ----------

export const QA_MIN_SCORE = 80;
export const QA_BLOCKING_CHECKS = [
  "has_active_recall",
  "no_cognitive_overload",
  "no_hallucination",
] as const;

export function validateQAScore(score: number, violations: { severity: string; violation_type: string }[]) {
  const hasBlockingViolation = violations.some(v => v.severity === "blocking");
  const hasHallucination = violations.some(v => v.violation_type === "hallucination");

  return {
    publish_blocked: score < QA_MIN_SCORE || hasBlockingViolation || hasHallucination,
    block_reason: hasHallucination
      ? "Hallucination conceptuelle détectée — blocage absolu"
      : hasBlockingViolation
        ? "Violation bloquante détectée"
        : score < QA_MIN_SCORE
          ? `Score QA insuffisant (${score}/100, minimum ${QA_MIN_SCORE})`
          : undefined,
  };
}

// ---------- Cognitive Budget ----------

export const MAX_NEW_ITEMS_PER_SEGMENT = 5;
export const MIN_CRITICAL_APPEARANCES = 3;
export const MIN_RECALL_PER_WORDS = 500; // 1 recall every 500 words
export const MAX_CONCEPTS_STANDARD = 30;

export function validateCognitiveBudget(
  totalConcepts: number,
  segmentNewItems: number[]
) {
  const overloaded = segmentNewItems.some(n => n > MAX_NEW_ITEMS_PER_SEGMENT);
  const tooManyConcepts = totalConcepts > MAX_CONCEPTS_STANDARD;

  return {
    valid: !overloaded && !tooManyConcepts,
    overloaded_segments: segmentNewItems
      .map((n, i) => (n > MAX_NEW_ITEMS_PER_SEGMENT ? i : -1))
      .filter(i => i >= 0),
    too_many_concepts: tooManyConcepts,
  };
}

// ---------- Mission Sequence Validator ----------

export function validateRoomSequence(brickTypes: string[]) {
  const violations: string[] = [];

  // No consecutive same bricks
  for (let i = 1; i < brickTypes.length; i++) {
    if (brickTypes[i] === brickTypes[i - 1]) {
      violations.push(`Rooms ${i} and ${i + 1} use the same brick: ${brickTypes[i]}`);
    }
  }

  // OBSERVATION should be early
  const obsIndex = brickTypes.indexOf("OBSERVATION");
  if (obsIndex > 1) {
    violations.push("OBSERVATION should be in the first two rooms");
  }

  // DECISION should increase in intensity (later rooms)
  const decIndex = brickTypes.indexOf("DECISION");
  if (decIndex >= 0 && decIndex < Math.floor(brickTypes.length / 2)) {
    violations.push("DECISION should be in the later rooms");
  }

  return { valid: violations.length === 0, violations };
}

// ---------- Confidence Calibration ----------

export function computeCalibrationGap(
  results: { confidence: number; is_correct: boolean }[]
) {
  if (results.length === 0) return 0;

  const avgConfidence = results.reduce((s, r) => s + r.confidence, 0) / results.length;
  const accuracy = results.filter(r => r.is_correct).length / results.length;

  return Math.abs(avgConfidence - accuracy);
}

// ---------- Word Count Thresholds ----------

export const WORD_COUNT_THRESHOLDS = {
  MIN_VIABLE: 100,
  CHUNKING_THRESHOLD: 15000,
  CONFIDENCE_BLOCKING: 0.4,
} as const;

export function validateWordCount(wordCount: number) {
  if (wordCount < WORD_COUNT_THRESHOLDS.MIN_VIABLE) {
    return { valid: false, action: "fallback_micro" as const };
  }
  if (wordCount > WORD_COUNT_THRESHOLDS.CHUNKING_THRESHOLD) {
    return { valid: true, action: "chunk" as const };
  }
  return { valid: true, action: "proceed" as const };
}
