// ============================================================
// COGNITIO M8 Mastery Engine — Compute mastery status & scheduling
// ============================================================

import type { MasteryStatus } from "@/domain/cognitio/types";
import type { ConceptMemoryNode } from "@/domain/cognitio/longitudinal.types";
import type { ConceptTestResult } from "@/domain/cognitio/longitudinal.contracts";

// ---------- Mastery Score Update ----------

/**
 * Update mastery score using exponential moving average.
 * Correct answers increase score, incorrect decrease it.
 * Recent observations weigh more.
 */
export function updateMasteryScore(
  currentScore: number,
  observationCount: number,
  isCorrect: boolean,
): number {
  // Learning rate decreases as we accumulate more evidence
  const alpha = Math.max(0.05, 0.3 / Math.sqrt(observationCount + 1));
  const observation = isCorrect ? 1 : 0;
  const newScore = currentScore * (1 - alpha) + observation * alpha;
  return Math.max(0, Math.min(1, newScore));
}

// ---------- Mastery Status Classification ----------

/**
 * Classify a concept's mastery status based on its memory node state.
 * Priority order: aging check → score-based → observation-based
 */
export function classifyMasteryStatus(
  score: number,
  observations: number,
  correctCount: number,
  incorrectCount: number,
  confidenceMean: number,
  calibrationGapMean: number,
  confusionHits: number,
  lastSeenAt: string | null,
  lastCorrectAt: string | null,
): MasteryStatus {
  if (observations === 0) return "unknown";

  // Aging: was stable/strong but hasn't been seen in >14 days
  if (lastSeenAt) {
    const daysSinceLastSeen = daysBetween(new Date(lastSeenAt), new Date());
    if (score >= 0.6 && daysSinceLastSeen > 14) return "aging";
  }

  // Strong: consistently correct + well-calibrated + enough observations
  if (score >= 0.85 && observations >= 5 && Math.abs(calibrationGapMean) < 0.2) {
    return "strong";
  }

  // Stable: good score + multiple successes
  if (score >= 0.7 && observations >= 3) {
    return "stable";
  }

  // Fragile: low score OR high confusion OR overconfident
  if (score < 0.4 || confusionHits >= 3 || (calibrationGapMean > 0.3 && incorrectCount > 0)) {
    return "fragile";
  }

  // Emerging: few observations, some success
  if (observations <= 2) {
    return "emerging";
  }

  // Learning: moderate score, building up
  if (score >= 0.4) {
    return "learning";
  }

  return "fragile";
}

// ---------- Next Review Scheduling ----------

/**
 * Compute next review date using a simplified spaced repetition model.
 * Intervals expand with mastery: fragile→1d, learning→3d, stable→7d, strong→14d, aging→1d
 */
export function computeNextReviewDate(status: MasteryStatus): string {
  const now = new Date();
  let intervalDays: number;

  switch (status) {
    case "unknown":
    case "emerging":
      intervalDays = 1;
      break;
    case "fragile":
      intervalDays = 1;
      break;
    case "learning":
      intervalDays = 3;
      break;
    case "stable":
      intervalDays = 7;
      break;
    case "strong":
    case "mastered":
      intervalDays = 14;
      break;
    case "aging":
      intervalDays = 1;
      break;
    default:
      intervalDays = 3;
  }

  return new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
}

// ---------- Confidence Mean Update ----------

/**
 * Update running mean of confidence using online average.
 */
export function updateRunningMean(
  currentMean: number | null,
  currentCount: number,
  newValue: number,
): number {
  if (currentMean === null || currentCount === 0) return newValue;
  return (currentMean * currentCount + newValue) / (currentCount + 1);
}

// ---------- Apply Test Results to Node ----------

export interface MasteryUpdateResult {
  score: number;
  status: MasteryStatus;
  previousStatus: MasteryStatus;
  nextReviewAt: string;
  confidenceMean: number;
  calibrationGapMean: number;
  correctCount: number;
  incorrectCount: number;
  observationsCount: number;
}

export function applyTestResultToNode(
  node: Partial<ConceptMemoryNode> | null,
  result: ConceptTestResult,
): MasteryUpdateResult {
  const currentScore = node?.mastery_score ?? 0;
  const currentObs = node?.observations_count ?? 0;
  const currentCorrect = node?.correct_count ?? 0;
  const currentIncorrect = node?.incorrect_count ?? 0;
  const currentConfMean = node?.confidence_mean ?? null;
  const currentCalGapMean = node?.calibration_gap_mean ?? null;
  const currentConfusionHits = node?.confusion_hits ?? 0;
  const previousStatus = (node?.mastery_status as MasteryStatus) ?? "unknown";

  const newScore = updateMasteryScore(currentScore, currentObs, result.is_correct);
  const newObs = currentObs + 1;
  const newCorrect = result.is_correct ? currentCorrect + 1 : currentCorrect;
  const newIncorrect = result.is_correct ? currentIncorrect : currentIncorrect + 1;
  const newConfMean = updateRunningMean(currentConfMean, currentObs, result.confidence);
  const newCalGapMean = updateRunningMean(currentCalGapMean, currentObs, result.calibration_gap);

  const newStatus = classifyMasteryStatus(
    newScore,
    newObs,
    newCorrect,
    newIncorrect,
    newConfMean,
    newCalGapMean,
    currentConfusionHits,
    node?.last_seen_at ?? null,
    result.is_correct ? new Date().toISOString() : (node?.last_correct_at ?? null),
  );

  const nextReviewAt = computeNextReviewDate(newStatus);

  return {
    score: newScore,
    status: newStatus,
    previousStatus,
    nextReviewAt,
    confidenceMean: newConfMean,
    calibrationGapMean: newCalGapMean,
    correctCount: newCorrect,
    incorrectCount: newIncorrect,
    observationsCount: newObs,
  };
}

// ---------- Helpers ----------

function daysBetween(a: Date, b: Date): number {
  return Math.abs((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}
