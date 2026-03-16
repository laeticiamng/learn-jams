// ============================================================
// Escape Spaced Repetition Engine — Integrates spaced
// repetition into the escape game loop: schedules reviews,
// generates recall challenges, and tracks meta-progression.
// ============================================================

import type {
  SpacedRepetitionItem,
  ConceptResult,
  ExtendedPuzzleType,
  Achievement,
  NextAction,
  EscapeDebrief,
  EscapeGameState,
  EscapeRoom,
} from "@/domain/cognitio/escapeEngine.types";
import type { BloomLevel } from "@/domain/cognitio/types";
import { generateDebriefNarrative } from "./escapeNarrativeEngine";

// ---------- Spaced Repetition Schedule ----------

const INTERVAL_TABLE: Record<number, number> = {
  0: 1,       // First review: 1 day
  1: 3,       // Second: 3 days
  2: 7,       // Third: 7 days
  3: 14,      // Fourth: 14 days
  4: 30,      // Fifth: 30 days
  5: 60,      // Sixth: 60 days
};

/**
 * Schedule spaced repetition items based on concept results.
 */
export function scheduleSpacedRepetition(
  conceptResults: ConceptResult[],
  existingReviews: number // How many previous reviews this concept has had
): SpacedRepetitionItem[] {
  const items: SpacedRepetitionItem[] = [];
  const now = new Date();

  for (const result of conceptResults) {
    // Determine interval based on performance
    let intervalDays: number;
    let reviewType: SpacedRepetitionItem["review_type"];
    let difficultyAdj: number;

    if (!result.was_correct) {
      // Failed: short interval, use recognition
      intervalDays = 1;
      reviewType = "recognition";
      difficultyAdj = -0.5;
    } else if (result.confidence < 0.5) {
      // Correct but uncertain: moderate interval
      intervalDays = Math.max(1, INTERVAL_TABLE[existingReviews] ?? 3);
      reviewType = "recall";
      difficultyAdj = 0;
    } else if (result.hints_used > 0) {
      // Correct with hints: slightly shortened interval
      intervalDays = Math.max(1, (INTERVAL_TABLE[existingReviews] ?? 3) - 1);
      reviewType = "recall";
      difficultyAdj = -0.2;
    } else {
      // Correct and confident: standard or extended interval
      intervalDays = INTERVAL_TABLE[existingReviews] ?? 7;
      reviewType = result.bloom_level === "create" ? "generation" : "recall";
      difficultyAdj = 0.3;
    }

    // For concepts with high confusion, use contrast review
    if (result.hints_used >= 2 && !result.was_correct) {
      reviewType = "contrast";
      intervalDays = 1;
    }

    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + intervalDays);

    // Choose puzzle type for review
    const puzzleType = selectReviewPuzzleType(result, reviewType);

    items.push({
      concept_key: result.concept_key,
      next_review_at: nextReview.toISOString(),
      review_type: reviewType,
      difficulty_adjustment: difficultyAdj,
      recommended_puzzle_type: puzzleType,
    });
  }

  return items;
}

/**
 * Select the best puzzle type for reviewing a concept.
 */
function selectReviewPuzzleType(
  result: ConceptResult,
  reviewType: SpacedRepetitionItem["review_type"]
): ExtendedPuzzleType {
  switch (reviewType) {
    case "recognition":
      return "elimination"; // Easy: just recognize
    case "recall":
      // Vary by bloom level
      if (result.bloom_level === "remember" || result.bloom_level === "understand") {
        return "classification";
      }
      return "decision";
    case "generation":
      return "active_generation";
    case "contrast":
      return "elimination";
    default:
      return "observation";
  }
}

// ---------- Achievement System ----------

/**
 * Compute achievements earned from a game session.
 */
export function computeAchievements(
  state: EscapeGameState,
  rooms: EscapeRoom[]
): Achievement[] {
  const achievements: Achievement[] = [];

  // Perfect accuracy
  if (state.accuracy >= 1.0 && state.events.length > 0) {
    achievements.push({
      id: "perfect_run",
      name: "Sans faute",
      description: "100% de réponses correctes dans cette mission.",
      icon: "trophy",
      rarity: "epic",
      condition: "accuracy >= 1.0",
    });
  }

  // No hints
  if (state.hints_used === 0 && state.events.length > 0) {
    achievements.push({
      id: "no_hints",
      name: "Autonome",
      description: "Mission complétée sans utiliser d'indice.",
      icon: "brain",
      rarity: "rare",
      condition: "hints_used === 0",
    });
  }

  // All rooms completed
  if (state.rooms_completed.length === rooms.length) {
    achievements.push({
      id: "all_rooms",
      name: "Explorateur complet",
      description: "Toutes les salles ont été complétées.",
      icon: "map",
      rarity: "uncommon",
      condition: "all rooms completed",
    });
  }

  // All items collected
  const totalItems = rooms.reduce((sum, r) => sum + r.rewards.length, 0);
  if (state.inventory_collected.length >= totalItems && totalItems > 0) {
    achievements.push({
      id: "collector",
      name: "Collectionneur",
      description: "Tous les objets de la mission ont été collectés.",
      icon: "archive",
      rarity: "rare",
      condition: "all items collected",
    });
  }

  // Speed run (completed in less than half the expected time)
  const expectedTime = rooms.reduce((sum, r) => sum + (r.time_limit_sec ?? 180), 0);
  if (state.total_time_sec > 0 && state.total_time_sec < expectedTime * 0.5) {
    achievements.push({
      id: "speed_run",
      name: "Éclair",
      description: "Mission complétée en moins de la moitié du temps prévu.",
      icon: "zap",
      rarity: "epic",
      condition: "time < 50% expected",
    });
  }

  // First mission completed
  achievements.push({
    id: "first_mission",
    name: "Première mission",
    description: "Vous avez complété votre première mission escape game.",
    icon: "star",
    rarity: "common",
    condition: "mission completed",
  });

  return achievements;
}

// ---------- Next Actions ----------

/**
 * Generate recommended next actions based on performance.
 */
export function generateNextActions(
  conceptResults: ConceptResult[],
  accuracy: number
): NextAction[] {
  const actions: NextAction[] = [];

  // Find fragile concepts
  const fragile = conceptResults.filter(r => !r.was_correct || r.mastery_delta < 0);
  if (fragile.length > 0) {
    actions.push({
      type: "review",
      label: "Réviser les concepts fragiles",
      description: `${fragile.length} concept${fragile.length > 1 ? "s" : ""} nécessite${fragile.length > 1 ? "nt" : ""} une révision.`,
      priority: "high",
      concept_keys: fragile.map(f => f.concept_key),
    });
  }

  // Suggest practice for medium performance
  if (accuracy >= 0.5 && accuracy < 0.8) {
    actions.push({
      type: "practice",
      label: "Exercice de renforcement",
      description: "Pratiquez avec des puzzles variés pour consolider vos acquis.",
      priority: "medium",
    });
  }

  // Suggest new mission for good performance
  if (accuracy >= 0.7) {
    actions.push({
      type: "new_mission",
      label: "Nouvelle mission",
      description: "Vous êtes prêt pour un nouveau défi. Explorez un contenu différent.",
      priority: accuracy >= 0.9 ? "high" : "medium",
    });
  }

  // Boss challenge for excellent performance
  if (accuracy >= 0.85) {
    actions.push({
      type: "boss_challenge",
      label: "Défi Boss de rappel",
      description: "Testez votre mémoire à long terme avec un défi de synthèse avancé.",
      priority: "low",
    });
  }

  return actions;
}

// ---------- Full Debrief Generation ----------

/**
 * Generate a complete escape game debrief.
 */
export function generateEscapeDebrief(
  state: EscapeGameState,
  rooms: EscapeRoom[],
  conceptResults: ConceptResult[]
): EscapeDebrief {
  const roomsCompleted = state.rooms_completed.length;
  const totalRooms = rooms.length;
  const accuracy = state.accuracy;

  // Spaced repetition
  const spacedRepetitionItems = scheduleSpacedRepetition(conceptResults, 0);

  // Achievements
  const achievements = computeAchievements(state, rooms);

  // Narrative
  const resolutionNarrative = generateDebriefNarrative(
    accuracy,
    roomsCompleted,
    totalRooms,
    state.hints_used,
    state.total_time_sec
  );

  // Next actions
  const nextActions = generateNextActions(conceptResults, accuracy);

  return {
    score: state.score,
    accuracy,
    completion_time_sec: state.total_time_sec,
    rooms_completed: roomsCompleted,
    total_rooms: totalRooms,
    concept_results: conceptResults,
    spaced_repetition_items: spacedRepetitionItems,
    resolution_narrative: resolutionNarrative,
    achievements,
    next_actions: nextActions,
  };
}
