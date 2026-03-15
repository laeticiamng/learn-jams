// ============================================================
// Mission Validation Engine — Validates answers for all brick
// types with type-specific logic
// ============================================================

import type { BrickType, MissionItem, BloomLevel } from "@/domain/cognitio/types";

// ---------- Types ----------

export interface ValidationInput {
  item: MissionItem;
  answer: string | string[];
  time_taken_ms: number;
  confidence: number;
  hints_used: number;
}

export interface ValidationResult {
  is_correct: boolean;
  partial_score: number; // 0-1, allows partial credit
  feedback: ValidationFeedback;
  concept_mastery_delta: number; // positive = learned, negative = confused
}

export interface ValidationFeedback {
  title: string;
  message: string;
  correct_answer_display: string;
  explanation: string;
  pedagogical_note: string | null;
  encouragement: string;
}

// ---------- Main Validation ----------

/**
 * Validate an answer for any brick type.
 * Returns detailed result with feedback.
 */
export function validateAnswer(input: ValidationInput): ValidationResult {
  const { item, answer, time_taken_ms, confidence, hints_used } = input;

  // Type-specific validation
  const isCorrect = checkCorrectness(item, answer);
  const partialScore = computePartialScore(item, answer, isCorrect);

  // Compute final score considering hints and time
  const hintPenalty = Math.min(0.5, hints_used * 0.15);
  const timeFactor = computeTimeFactor(time_taken_ms, item.difficulty);
  const adjustedScore = Math.max(0, partialScore - hintPenalty) * timeFactor;

  // Compute mastery delta
  const masteryDelta = computeMasteryDelta(isCorrect, confidence, adjustedScore, item.bloom_level);

  // Generate feedback
  const feedback = generateFeedback(item, answer, isCorrect, confidence);

  return {
    is_correct: isCorrect,
    partial_score: Math.round(adjustedScore * 100) / 100,
    feedback,
    concept_mastery_delta: masteryDelta,
  };
}

// ---------- Correctness Check ----------

function checkCorrectness(item: MissionItem, answer: string | string[]): boolean {
  const correct = item.correct_answer;

  if (Array.isArray(correct) && Array.isArray(answer)) {
    // Multi-answer: order may or may not matter
    if (item.type === "SEQUENCE") {
      // Order matters for sequence
      return JSON.stringify(answer) === JSON.stringify(correct);
    }
    // Order doesn't matter
    return JSON.stringify([...answer].sort()) === JSON.stringify([...correct].sort());
  }

  if (typeof correct === "string" && typeof answer === "string") {
    return answer.trim().toLowerCase() === correct.trim().toLowerCase();
  }

  // Mixed types — try string comparison
  return String(answer) === String(correct);
}

function computePartialScore(item: MissionItem, answer: string | string[], isCorrect: boolean): number {
  if (isCorrect) return 1;

  // Partial credit for sequence: count correct positions
  if (item.type === "SEQUENCE" && Array.isArray(answer) && Array.isArray(item.correct_answer)) {
    let correctPositions = 0;
    const minLen = Math.min(answer.length, item.correct_answer.length);
    for (let i = 0; i < minLen; i++) {
      if (answer[i] === item.correct_answer[i]) correctPositions++;
    }
    return correctPositions / Math.max(1, item.correct_answer.length);
  }

  // Partial credit for TRI: count correctly placed items
  if (item.type === "TRI" && Array.isArray(answer) && Array.isArray(item.correct_answer)) {
    const correctSet = new Set(item.correct_answer);
    let correctCount = 0;
    for (const a of answer) {
      if (correctSet.has(a)) correctCount++;
    }
    return correctCount / Math.max(1, item.correct_answer.length);
  }

  return 0;
}

// ---------- Time Factor ----------

function computeTimeFactor(timeMs: number, difficulty: number): number {
  // Base expected time per difficulty level (in ms)
  const expectedTimeMs = difficulty * 30000; // 30s per difficulty level

  if (timeMs <= expectedTimeMs) return 1;
  if (timeMs <= expectedTimeMs * 2) return 0.9;
  if (timeMs <= expectedTimeMs * 3) return 0.8;
  return 0.7;
}

// ---------- Mastery Delta ----------

function computeMasteryDelta(
  isCorrect: boolean,
  confidence: number,
  score: number,
  bloomLevel: BloomLevel
): number {
  // Base delta
  let delta = isCorrect ? 0.15 : -0.1;

  // Bloom level weight (higher Bloom = more mastery impact)
  const bloomWeight: Record<BloomLevel, number> = {
    remember: 0.8,
    understand: 0.9,
    apply: 1.0,
    analyze: 1.1,
    evaluate: 1.2,
    create: 1.3,
  };
  delta *= bloomWeight[bloomLevel] ?? 1;

  // Confidence calibration
  if (isCorrect && confidence > 0.7) {
    delta *= 1.1; // Well-calibrated confidence boosts mastery
  }
  if (!isCorrect && confidence > 0.7) {
    delta *= 1.3; // Overconfident error = stronger negative signal
  }
  if (isCorrect && confidence < 0.3) {
    delta *= 0.8; // Lucky guess = less mastery gain
  }

  return Math.round(delta * 100) / 100;
}

// ---------- Feedback Generation ----------

function generateFeedback(
  item: MissionItem,
  answer: string | string[],
  isCorrect: boolean,
  confidence: number
): ValidationFeedback {
  const correctDisplay = Array.isArray(item.correct_answer)
    ? item.correct_answer.join(", ")
    : item.correct_answer;

  if (isCorrect) {
    return {
      title: getCorrectTitle(confidence),
      message: getCorrectMessage(item.type, confidence),
      correct_answer_display: correctDisplay,
      explanation: item.explanation,
      pedagogical_note: confidence > 0.7
        ? "Votre confiance était bien calibrée. Continuez ainsi !"
        : confidence < 0.3
          ? "Vous aviez raison malgré vos doutes. Faites-vous davantage confiance !"
          : null,
      encouragement: getEncouragement(true, confidence),
    };
  }

  return {
    title: getIncorrectTitle(confidence),
    message: getIncorrectMessage(item.type),
    correct_answer_display: correctDisplay,
    explanation: item.explanation,
    pedagogical_note: confidence > 0.7
      ? "Attention à la surconfiance. Prenez le temps de vérifier votre raisonnement."
      : null,
    encouragement: getEncouragement(false, confidence),
  };
}

function getCorrectTitle(confidence: number): string {
  if (confidence > 0.8) return "Excellent !";
  if (confidence > 0.5) return "Correct !";
  return "Bien joué !";
}

function getIncorrectTitle(confidence: number): string {
  if (confidence > 0.8) return "Attention !";
  if (confidence > 0.5) return "Pas tout à fait";
  return "Incorrect";
}

function getCorrectMessage(brickType: BrickType, confidence: number): string {
  switch (brickType) {
    case "OBSERVATION":
      return "Votre observation est juste. Vous avez repéré les éléments clés.";
    case "TRI":
      return "Classement correct ! Votre compréhension des catégories est solide.";
    case "SEQUENCE":
      return "L'ordre est parfait. Vous maîtrisez l'enchaînement logique.";
    case "ELIMINATION":
      return "Bien identifié ! Vous savez distinguer l'intrus des éléments cohérents.";
    case "DECISION":
      return "Bonne décision ! Votre analyse du contexte est pertinente.";
  }
}

function getIncorrectMessage(brickType: BrickType): string {
  switch (brickType) {
    case "OBSERVATION":
      return "Relisez attentivement les éléments présentés. Un détail clé vous a échappé.";
    case "TRI":
      return "Le classement n'est pas correct. Revoyez les critères de distinction.";
    case "SEQUENCE":
      return "L'ordre n'est pas le bon. Réfléchissez aux prérequis de chaque étape.";
    case "ELIMINATION":
      return "Ce n'est pas l'intrus. Cherchez le point commun partagé par les autres éléments.";
    case "DECISION":
      return "Ce n'est pas la meilleure option dans ce contexte. Réévaluez les contraintes.";
  }
}

function getEncouragement(isCorrect: boolean, confidence: number): string {
  if (isCorrect) {
    return confidence > 0.7
      ? "Vous êtes sur la bonne voie. Continuez !"
      : "Ne doutez pas de vous, vos connaissances sont là !";
  }
  return "Chaque erreur est une opportunité d'apprentissage. Retenez bien l'explication.";
}
