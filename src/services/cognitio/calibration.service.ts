// ============================================================
// COGNITIO Calibration Service — Scoring & Confidence Analysis
// ============================================================

import type {
  RecallAnswer,
  CalibrationMetrics,
  CompositeScore,
  FragilityNode,
  ConfusionMapEntry,
  ConfidenceLevel,
} from "@/domain/cognitio/recall.types";
import type { AnalyzedConcept, AnalyzedConfusionPair } from "@/domain/cognitio/contracts";

// ---------- Raw Score ----------

export function computeRawScore(answers: RecallAnswer[]): number {
  if (answers.length === 0) return 0;
  return answers.filter(a => a.is_correct).length / answers.length;
}

// ---------- Confidence Score ----------

/** Normalized average confidence (0-1) */
export function computeConfidenceScore(answers: RecallAnswer[]): number {
  if (answers.length === 0) return 0;
  const avg = answers.reduce((s, a) => s + a.confidence, 0) / answers.length;
  return (avg - 1) / 4; // Map 1-5 to 0-1
}

// ---------- Calibration Gap ----------

/**
 * Calibration gap: positive = overconfident, negative = underconfident
 * Range: -1 to 1
 */
export function computeCalibrationGap(answers: RecallAnswer[]): number {
  if (answers.length === 0) return 0;
  const confScore = computeConfidenceScore(answers);
  const rawScore = computeRawScore(answers);
  return confScore - rawScore;
}

// ---------- Full Calibration Metrics ----------

export function computeCalibrationMetrics(answers: RecallAnswer[]): CalibrationMetrics {
  const rawScore = computeRawScore(answers);
  const confidenceScore = computeConfidenceScore(answers);
  const calibrationGap = confidenceScore - rawScore;

  let overconfidence = 0;
  let underconfidence = 0;
  let wellCalibrated = 0;

  for (const a of answers) {
    const normalizedConf = (a.confidence - 1) / 4;
    const performance = a.is_correct ? 1 : 0;
    const gap = normalizedConf - performance;

    if (gap > 0.3) overconfidence++;
    else if (gap < -0.3) underconfidence++;
    else wellCalibrated++;
  }

  return {
    raw_score: rawScore,
    confidence_score: confidenceScore,
    calibration_gap: calibrationGap,
    overconfidence_count: overconfidence,
    underconfidence_count: underconfidence,
    well_calibrated_count: wellCalibrated,
  };
}

// ---------- Composite Score ----------

/**
 * Composite score: 0-100
 * - 60% raw score
 * - 20% calibration quality (how well calibrated)
 * - 20% critical concept coverage
 */
export function computeCompositeScore(
  answers: RecallAnswer[],
  criticalConceptKeys: string[],
): CompositeScore {
  const rawScore = computeRawScore(answers);
  const calibration = computeCalibrationMetrics(answers);

  // Calibration quality: 1 - |calibrationGap|
  const calibrationQuality = 1 - Math.abs(calibration.calibration_gap);

  // Critical coverage: % of critical concepts that were tested AND correct
  let coverageScore = 1;
  if (criticalConceptKeys.length > 0) {
    const testedCritical = new Set(
      answers
        .filter(a => a.is_correct)
        .flatMap(a => a.concepts_tested)
        .filter(k => criticalConceptKeys.includes(k))
    );
    coverageScore = testedCritical.size / criticalConceptKeys.length;
  }

  const rawComponent = rawScore * 60;
  const calibrationComponent = calibrationQuality * 20;
  const coverageComponent = coverageScore * 20;
  const total = Math.round(rawComponent + calibrationComponent + coverageComponent);

  return {
    total: Math.min(100, Math.max(0, total)),
    raw_weight: 0.6,
    calibration_weight: 0.2,
    coverage_weight: 0.2,
    breakdown: {
      raw_component: Math.round(rawComponent),
      calibration_component: Math.round(calibrationComponent),
      coverage_component: Math.round(coverageComponent),
    },
  };
}

// ---------- Fragility Map ----------

export function computeFragilityMap(
  answers: RecallAnswer[],
  concepts: AnalyzedConcept[],
): FragilityNode[] {
  // Group answers by concept
  const conceptMap = new Map<string, RecallAnswer[]>();
  for (const a of answers) {
    for (const key of a.concepts_tested) {
      if (!conceptMap.has(key)) conceptMap.set(key, []);
      conceptMap.get(key)!.push(a);
    }
  }

  const nodes: FragilityNode[] = [];
  for (const [key, conceptAnswers] of conceptMap) {
    const concept = concepts.find(c => c.stable_key === key);
    const correctCount = conceptAnswers.filter(a => a.is_correct).length;
    const totalCount = conceptAnswers.length;
    const avgConfidence = conceptAnswers.reduce((s, a) => s + a.confidence, 0) / totalCount;
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
    const normalizedConf = (avgConfidence - 1) / 4;
    const gap = normalizedConf - accuracy;

    let status: FragilityNode["status"];
    if (accuracy >= 0.8 && gap <= 0.2) {
      status = "mastered";
    } else if (accuracy < 0.5) {
      status = "failed";
    } else if (gap > 0.3) {
      status = "overconfident";
    } else if (gap < -0.3) {
      status = "underconfident";
    } else {
      status = "fragile";
    }

    nodes.push({
      concept_key: key,
      label: concept?.label ?? key,
      status,
      correct_count: correctCount,
      total_count: totalCount,
      avg_confidence: avgConfidence,
      calibration_gap: gap,
    });
  }

  return nodes;
}

// ---------- Confusion Map ----------

export function computeConfusionMap(
  answers: RecallAnswer[],
  confusionPairs: AnalyzedConfusionPair[],
): ConfusionMapEntry[] {
  const entries: ConfusionMapEntry[] = [];

  for (const pair of confusionPairs) {
    // Count how often answers testing these concepts were wrong
    const relevantAnswers = answers.filter(a =>
      a.concepts_tested.includes(pair.concept_a_key) ||
      a.concepts_tested.includes(pair.concept_b_key)
    );
    const incorrectCount = relevantAnswers.filter(a => !a.is_correct).length;

    if (incorrectCount > 0) {
      entries.push({
        concept_a: pair.concept_a_key,
        concept_b: pair.concept_b_key,
        confusion_count: incorrectCount,
        distinction_key: pair.distinction_key,
      });
    }
  }

  return entries.sort((a, b) => b.confusion_count - a.confusion_count);
}
