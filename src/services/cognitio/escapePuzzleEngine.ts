// ============================================================
// Escape Puzzle Engine — Puzzle dependency resolution,
// extended puzzle type validation, and active generation
// answer evaluation.
// ============================================================

import type {
  EscapePuzzle,
  EscapeRoom,
  EscapeGameState,
  ExtendedPuzzleType,
  PuzzleUnlock,
  ConceptResult,
} from "@/domain/cognitio/escapeEngine.types";
import type { BloomLevel } from "@/domain/cognitio/types";

// ---------- Puzzle Dependency Graph ----------

export interface PuzzleDependency {
  puzzle_id: string;
  depends_on: string[];  // Puzzle IDs that must be solved first
  unlocks: string[];     // Puzzle/room IDs unlocked by solving this
  room_index: number;
}

/**
 * Build a dependency graph from rooms and their puzzles.
 */
export function buildPuzzleDependencyGraph(rooms: EscapeRoom[]): PuzzleDependency[] {
  const graph: PuzzleDependency[] = [];

  for (const room of rooms) {
    for (let i = 0; i < room.puzzles.length; i++) {
      const puzzle = room.puzzles[i];
      const depends_on: string[] = [];
      const unlocks: string[] = [];

      // Puzzles in the same room depend on previous puzzles
      if (i > 0) {
        depends_on.push(room.puzzles[i - 1].id);
      }

      // Puzzles with required_items depend on puzzles that grant those items
      if (puzzle.required_items) {
        for (const itemId of puzzle.required_items) {
          const sourcePuzzle = findPuzzleGrantingItem(rooms, itemId);
          if (sourcePuzzle) {
            depends_on.push(sourcePuzzle);
          }
        }
      }

      // Record what this puzzle unlocks
      if (puzzle.unlocks) {
        unlocks.push(puzzle.unlocks.target_id);
      }

      graph.push({
        puzzle_id: puzzle.id,
        depends_on,
        unlocks,
        room_index: room.room_index,
      });
    }
  }

  return graph;
}

/**
 * Check if a puzzle can be attempted based on dependencies.
 */
export function canAttemptPuzzle(
  puzzle: EscapePuzzle,
  graph: PuzzleDependency[],
  state: EscapeGameState
): { canAttempt: boolean; blockedBy: string[] } {
  const dep = graph.find(d => d.puzzle_id === puzzle.id);
  if (!dep) return { canAttempt: true, blockedBy: [] };

  const blockedBy = dep.depends_on.filter(id => !state.puzzles_solved.includes(id));

  // Check required items
  if (puzzle.required_items) {
    const missingItems = puzzle.required_items.filter(id => !state.inventory_collected.includes(id));
    blockedBy.push(...missingItems);
  }

  return {
    canAttempt: blockedBy.length === 0,
    blockedBy,
  };
}

/**
 * Get all puzzles that become available after solving a puzzle.
 */
export function getNewlyAvailablePuzzles(
  solvedPuzzleId: string,
  graph: PuzzleDependency[],
  state: EscapeGameState
): string[] {
  const available: string[] = [];

  for (const dep of graph) {
    if (dep.depends_on.includes(solvedPuzzleId)) {
      // Check if all dependencies are now met
      const allMet = dep.depends_on.every(id =>
        id === solvedPuzzleId || state.puzzles_solved.includes(id)
      );
      if (allMet) {
        available.push(dep.puzzle_id);
      }
    }
  }

  return available;
}

// ---------- Extended Puzzle Validation ----------

export interface PuzzleValidationResult {
  is_correct: boolean;
  partial_score: number;
  feedback_title: string;
  feedback_message: string;
  explanation: string;
  mastery_delta: number;
  code_fragment?: string;
}

/**
 * Validate an answer for any extended puzzle type.
 */
export function validatePuzzleAnswer(
  puzzle: EscapePuzzle,
  answer: string | string[],
  confidence: number,
  timeTakenMs: number,
  hintsUsed: number
): PuzzleValidationResult {
  let isCorrect: boolean;
  let partialScore: number;

  switch (puzzle.puzzle_type) {
    case "active_generation":
    case "synthesis":
      ({ isCorrect, partialScore } = validateFreeTextAnswer(puzzle, answer));
      break;

    case "sequencing":
      ({ isCorrect, partialScore } = validateSequenceAnswer(puzzle, answer));
      break;

    case "association":
    case "pattern_match":
      ({ isCorrect, partialScore } = validateMultiMatchAnswer(puzzle, answer));
      break;

    default:
      ({ isCorrect, partialScore } = validateStandardAnswer(puzzle, answer));
  }

  // Apply penalties
  const hintPenalty = Math.min(0.5, hintsUsed * 0.15);
  const timeFactor = computeTimeFactor(timeTakenMs, puzzle.difficulty);
  const adjustedScore = Math.max(0, partialScore - hintPenalty) * timeFactor;

  // Mastery delta
  const masteryDelta = computeMasteryDelta(isCorrect, confidence, adjustedScore, puzzle.bloom_level);

  // Feedback
  const { title, message } = generatePuzzleFeedback(puzzle, isCorrect, confidence, adjustedScore);

  return {
    is_correct: isCorrect,
    partial_score: Math.round(adjustedScore * 100) / 100,
    feedback_title: title,
    feedback_message: message,
    explanation: puzzle.explanation,
    mastery_delta: masteryDelta,
    code_fragment: isCorrect ? puzzle.code_contribution?.value : undefined,
  };
}

// ---------- Answer Validators ----------

function validateStandardAnswer(
  puzzle: EscapePuzzle,
  answer: string | string[]
): { isCorrect: boolean; partialScore: number } {
  const correct = puzzle.correct_answer;

  if (Array.isArray(correct) && Array.isArray(answer)) {
    const isCorrect = JSON.stringify([...answer].sort()) === JSON.stringify([...correct].sort());
    return { isCorrect, partialScore: isCorrect ? 1 : 0 };
  }

  if (typeof correct === "string" && typeof answer === "string") {
    const isCorrect = answer.trim().toLowerCase() === correct.trim().toLowerCase();
    return { isCorrect, partialScore: isCorrect ? 1 : 0 };
  }

  return { isCorrect: String(answer) === String(correct), partialScore: 0 };
}

function validateFreeTextAnswer(
  puzzle: EscapePuzzle,
  answer: string | string[]
): { isCorrect: boolean; partialScore: number } {
  const text = typeof answer === "string" ? answer : answer.join(" ");
  const normalized = text.toLowerCase().trim();

  if (!puzzle.validation_keywords || puzzle.validation_keywords.length === 0) {
    // No keywords — accept any non-empty answer as partial credit
    return { isCorrect: normalized.length >= 10, partialScore: normalized.length >= 10 ? 0.6 : 0 };
  }

  // Score based on keyword presence
  const keywordsFound = puzzle.validation_keywords.filter(kw =>
    normalized.includes(kw.toLowerCase())
  );
  const ratio = keywordsFound.length / puzzle.validation_keywords.length;

  return {
    isCorrect: ratio >= 0.6,
    partialScore: Math.round(ratio * 100) / 100,
  };
}

function validateSequenceAnswer(
  puzzle: EscapePuzzle,
  answer: string | string[]
): { isCorrect: boolean; partialScore: number } {
  if (!Array.isArray(answer) || !Array.isArray(puzzle.correct_answer)) {
    return validateStandardAnswer(puzzle, answer);
  }

  const correct = puzzle.correct_answer;
  let correctPositions = 0;
  const minLen = Math.min(answer.length, correct.length);

  for (let i = 0; i < minLen; i++) {
    if (answer[i] === correct[i]) correctPositions++;
  }

  const isCorrect = correctPositions === correct.length && answer.length === correct.length;
  const partialScore = correctPositions / Math.max(1, correct.length);

  return { isCorrect, partialScore };
}

function validateMultiMatchAnswer(
  puzzle: EscapePuzzle,
  answer: string | string[]
): { isCorrect: boolean; partialScore: number } {
  if (!Array.isArray(answer) || !Array.isArray(puzzle.correct_answer)) {
    return validateStandardAnswer(puzzle, answer);
  }

  const correctSet = new Set(puzzle.correct_answer);
  let correctCount = 0;

  for (const a of answer) {
    if (correctSet.has(a)) correctCount++;
  }

  const isCorrect = correctCount === puzzle.correct_answer.length && answer.length === puzzle.correct_answer.length;
  const partialScore = correctCount / Math.max(1, puzzle.correct_answer.length);

  return { isCorrect, partialScore };
}

// ---------- Feedback Generation ----------

function generatePuzzleFeedback(
  puzzle: EscapePuzzle,
  isCorrect: boolean,
  confidence: number,
  score: number
): { title: string; message: string } {
  if (isCorrect) {
    if (score >= 0.9) {
      return {
        title: "Excellent !",
        message: getPuzzleSuccessMessage(puzzle.puzzle_type),
      };
    }
    return {
      title: "Correct !",
      message: "Bien joué. Vous progressez dans la mission.",
    };
  }

  if (confidence > 0.7) {
    return {
      title: "Attention — surconfiance",
      message: "Votre réponse était incorrecte malgré une confiance élevée. Révisez bien l'explication.",
    };
  }

  return {
    title: "Pas tout à fait",
    message: getPuzzleFailureMessage(puzzle.puzzle_type),
  };
}

function getPuzzleSuccessMessage(type: ExtendedPuzzleType): string {
  const messages: Partial<Record<ExtendedPuzzleType, string>> = {
    observation: "Observation parfaite. Vous avez repéré les éléments essentiels.",
    classification: "Classement impeccable. Votre analyse catégorielle est solide.",
    sequencing: "Séquence parfaite. L'enchaînement logique est maîtrisé.",
    elimination: "Intrus identifié. Votre capacité de discrimination est aiguisée.",
    decision: "Décision judicieuse. Votre raisonnement contextuel est pertinent.",
    active_generation: "Excellente formulation. Votre synthèse intègre les concepts clés.",
    diagnostic: "Diagnostic correct. Votre analyse des données est précise.",
    code_lock: "Code correct ! La porte s'ouvre.",
    synthesis: "Synthèse réussie. Vous maîtrisez l'articulation des concepts.",
    association: "Associations correctes. Les liens entre concepts sont clairs pour vous.",
    reconstruction: "Reconstruction réussie. Le processus est bien compris.",
  };
  return messages[type] ?? "Puzzle résolu avec succès.";
}

function getPuzzleFailureMessage(type: ExtendedPuzzleType): string {
  const messages: Partial<Record<ExtendedPuzzleType, string>> = {
    observation: "Relisez attentivement. Un détail clé vous a échappé.",
    classification: "Le critère de classement n'est pas le bon. Réfléchissez aux propriétés distinctives.",
    sequencing: "L'ordre n'est pas correct. Pensez aux prérequis de chaque étape.",
    elimination: "Ce n'est pas l'intrus. Cherchez le point commun des autres éléments.",
    decision: "Cette option n'est pas optimale dans ce contexte. Réévaluez les contraintes.",
    active_generation: "Votre réponse ne contient pas assez de concepts clés. Enrichissez votre formulation.",
    diagnostic: "Le diagnostic est incorrect. Revérifiez les données.",
    synthesis: "La synthèse est incomplète. Intégrez davantage d'éléments.",
  };
  return messages[type] ?? "Réponse incorrecte. Relisez les indices et réessayez.";
}

// ---------- Helpers ----------

function findPuzzleGrantingItem(rooms: EscapeRoom[], itemId: string): string | null {
  for (const room of rooms) {
    for (const puzzle of room.puzzles) {
      if (puzzle.unlocks?.type === "item" && puzzle.unlocks.target_id === itemId) {
        return puzzle.id;
      }
    }
  }
  return null;
}

function computeTimeFactor(timeMs: number, difficulty: number): number {
  const expectedTimeMs = difficulty * 30000;
  if (timeMs <= expectedTimeMs) return 1;
  if (timeMs <= expectedTimeMs * 2) return 0.9;
  if (timeMs <= expectedTimeMs * 3) return 0.8;
  return 0.7;
}

function computeMasteryDelta(
  isCorrect: boolean,
  confidence: number,
  score: number,
  bloomLevel: BloomLevel
): number {
  let delta = isCorrect ? 0.15 : -0.1;

  const bloomWeight: Record<BloomLevel, number> = {
    remember: 0.8,
    understand: 0.9,
    apply: 1.0,
    analyze: 1.1,
    evaluate: 1.2,
    create: 1.3,
  };

  delta *= bloomWeight[bloomLevel] ?? 1;

  if (isCorrect && confidence > 0.7) delta *= 1.1;
  if (!isCorrect && confidence > 0.7) delta *= 1.3;
  if (isCorrect && confidence < 0.3) delta *= 0.8;

  return Math.round(delta * 100) / 100;
}

/**
 * Build concept results from game state for debrief.
 */
export function buildConceptResults(
  rooms: EscapeRoom[],
  state: EscapeGameState
): ConceptResult[] {
  const results: ConceptResult[] = [];
  const conceptMap = new Map<string, ConceptResult>();

  for (const event of state.events) {
    if (event.type !== "puzzle_attempt") continue;

    const details = event.details as {
      concept_key?: string;
      is_correct?: boolean;
      confidence?: number;
      hints_used?: number;
      bloom_level?: BloomLevel;
      mastery_delta?: number;
    };

    if (!details.concept_key) continue;

    const existing = conceptMap.get(details.concept_key);
    if (existing) {
      // Update with latest attempt
      existing.mastery_delta += details.mastery_delta ?? 0;
      existing.was_correct = details.is_correct ?? false;
      existing.confidence = details.confidence ?? 0.5;
      existing.hints_used += details.hints_used ?? 0;
    } else {
      conceptMap.set(details.concept_key, {
        concept_key: details.concept_key,
        concept_label: details.concept_key,
        mastery_delta: details.mastery_delta ?? 0,
        was_correct: details.is_correct ?? false,
        confidence: details.confidence ?? 0.5,
        hints_used: details.hints_used ?? 0,
        bloom_level: details.bloom_level ?? "understand",
      });
    }
  }

  return Array.from(conceptMap.values());
}
