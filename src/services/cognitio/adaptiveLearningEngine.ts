// ============================================================
// AdaptiveLearningEngine — Tracks user knowledge state and
// dynamically adjusts difficulty, hints, and pacing based
// on performance patterns.
// ============================================================

import type {
  UserKnowledgeGraph,
  ConceptMastery,
  MasteryLevel,
  ErrorPattern,
  ConceptRevisit,
  DifficultyProfile,
} from "@/domain/cognitio/immersiveEngine.types";

import type { BloomLevel } from "@/domain/cognitio/types";

// ==================== Interfaces ====================

export interface PuzzleAttempt {
  concept_keys: string[];
  correct: boolean;
  confidence: number;
  response_time_ms: number;
  hints_used: number;
  confusion_pair_involved?: string;
}

// ==================== Graph Initialization ====================

export function createUserKnowledgeGraph(
  userId: string,
  missionId: string,
  conceptKeys: string[],
): UserKnowledgeGraph {
  const now = new Date().toISOString();

  const concept_mastery: ConceptMastery[] = conceptKeys.map((key) => ({
    concept_key: key,
    mastery_level: "unknown" as MasteryLevel,
    accuracy: 0,
    attempts: 0,
    last_seen: now,
    response_times_ms: [],
    hints_used: 0,
    confusion_errors: 0,
    confidence_calibration: 0,
    next_review: now,
    review_interval_days: 1,
  }));

  return {
    user_id: userId,
    mission_id: missionId,
    mastered_concepts: [],
    weak_concepts: [...conceptKeys],
    exposed_concepts: [],
    error_patterns: [],
    confusion_pairs_missed: [],
    avg_response_time_ms: 0,
    hint_dependency_score: 0,
    confidence_score: 0,
    revisit_priority: [],
    concept_mastery,
    session_count: 0,
    total_time_sec: 0,
    last_updated: now,
  };
}

// ==================== Recording Attempts ====================

export function recordPuzzleAttempt(
  graph: UserKnowledgeGraph,
  attempt: PuzzleAttempt,
): UserKnowledgeGraph {
  const now = new Date().toISOString();

  // Deep-copy concept mastery entries so we stay immutable
  const updatedMastery = graph.concept_mastery.map((cm) => ({ ...cm, response_times_ms: [...cm.response_times_ms] }));

  for (const key of attempt.concept_keys) {
    const idx = updatedMastery.findIndex((cm) => cm.concept_key === key);
    if (idx === -1) continue;

    const cm = { ...updatedMastery[idx], response_times_ms: [...updatedMastery[idx].response_times_ms] };

    const prevTotal = cm.accuracy * cm.attempts;
    cm.attempts += 1;
    cm.accuracy = (prevTotal + (attempt.correct ? 1 : 0)) / cm.attempts;
    cm.last_seen = now;
    cm.response_times_ms.push(attempt.response_time_ms);
    cm.hints_used += attempt.hints_used;

    if (attempt.confusion_pair_involved) {
      cm.confusion_errors += 1;
    }

    // Confidence calibration: how close confidence is to actual accuracy
    cm.confidence_calibration = 1 - Math.abs(attempt.confidence - cm.accuracy);

    // Recompute mastery level
    cm.mastery_level = computeMasteryLevel(cm);

    // Simple spaced repetition: increase interval on success, reset on failure
    if (attempt.correct) {
      cm.review_interval_days = Math.min(cm.review_interval_days * 2, 30);
    } else {
      cm.review_interval_days = 1;
    }
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + cm.review_interval_days);
    cm.next_review = nextReview.toISOString();

    updatedMastery[idx] = cm;
  }

  // Track confusion pair misses
  const confusionPairsMissed = [...graph.confusion_pairs_missed];
  if (attempt.confusion_pair_involved && !attempt.correct) {
    if (!confusionPairsMissed.includes(attempt.confusion_pair_involved)) {
      confusionPairsMissed.push(attempt.confusion_pair_involved);
    }
  }

  // Recompute aggregate metrics
  const allResponseTimes = updatedMastery.flatMap((cm) => cm.response_times_ms);
  const avg_response_time_ms =
    allResponseTimes.length > 0
      ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length
      : 0;

  const totalAttempts = updatedMastery.reduce((sum, cm) => sum + cm.attempts, 0);
  const totalHints = updatedMastery.reduce((sum, cm) => sum + cm.hints_used, 0);
  const hint_dependency_score = totalAttempts > 0 ? Math.min(totalHints / totalAttempts, 1) : 0;

  const activeMastery = updatedMastery.filter((cm) => cm.attempts > 0);
  const confidence_score =
    activeMastery.length > 0
      ? activeMastery.reduce((sum, cm) => sum + cm.confidence_calibration, 0) / activeMastery.length
      : 0;

  // Categorize concepts
  const mastered_concepts: string[] = [];
  const weak_concepts: string[] = [];
  const exposed_concepts: string[] = [];

  for (const cm of updatedMastery) {
    if (cm.mastery_level === "mastered" || cm.mastery_level === "stable") {
      mastered_concepts.push(cm.concept_key);
    } else if (cm.mastery_level === "unknown" || cm.mastery_level === "exposed" || cm.mastery_level === "fragile") {
      weak_concepts.push(cm.concept_key);
    } else {
      exposed_concepts.push(cm.concept_key);
    }
  }

  const updatedGraph: UserKnowledgeGraph = {
    ...graph,
    concept_mastery: updatedMastery,
    mastered_concepts,
    weak_concepts,
    exposed_concepts,
    confusion_pairs_missed: confusionPairsMissed,
    avg_response_time_ms,
    hint_dependency_score,
    confidence_score,
    last_updated: now,
  };

  // Recompute derived data
  updatedGraph.error_patterns = identifyErrorPatterns(updatedGraph);
  updatedGraph.revisit_priority = computeRevisitPriority(updatedGraph);

  return updatedGraph;
}

// ==================== Mastery Computation ====================

export function computeMasteryLevel(mastery: ConceptMastery): MasteryLevel {
  const { attempts, accuracy, hints_used } = mastery;

  if (attempts === 0) {
    return "unknown";
  }

  const hintRate = attempts > 0 ? hints_used / attempts : 0;

  if (attempts === 1 && accuracy < 0.5) {
    return "exposed";
  }

  if (accuracy > 0.9 && attempts >= 3 && hintRate < 0.3) {
    return "mastered";
  }

  if (accuracy >= 0.75 && attempts >= 3) {
    return "stable";
  }

  if (accuracy >= 0.5 && accuracy < 0.75) {
    return "developing";
  }

  if ((accuracy >= 0.3 && accuracy <= 0.6) || hintRate > 0.5) {
    return "fragile";
  }

  return "exposed";
}

// ==================== Difficulty Profile ====================

export function computeDifficultyProfile(graph: UserKnowledgeGraph): DifficultyProfile {
  const activeMastery = graph.concept_mastery.filter((cm) => cm.attempts > 0);

  if (activeMastery.length === 0) {
    return {
      base_difficulty: 0.3,
      adjusted_difficulty: 0.3,
      hint_frequency: "generous",
      distractor_count: 2,
      time_pressure: "none",
      cognitive_load: "light",
      object_density: "sparse",
      assistance_level: "supported",
    };
  }

  const avgAccuracy =
    activeMastery.reduce((sum, cm) => sum + cm.accuracy, 0) / activeMastery.length;
  const avgAttempts =
    activeMastery.reduce((sum, cm) => sum + cm.attempts, 0) / activeMastery.length;

  // Base difficulty from overall accuracy
  const base_difficulty = Math.min(Math.max(avgAccuracy, 0.1), 0.95);

  // Adjust based on hint dependency
  let adjusted_difficulty = base_difficulty;
  if (graph.hint_dependency_score > 0.5) {
    adjusted_difficulty = Math.max(adjusted_difficulty - 0.15, 0.1);
  } else if (avgAccuracy > 0.85 && avgAttempts >= 3) {
    adjusted_difficulty = Math.min(adjusted_difficulty + 0.1, 0.95);
  }

  // Hint frequency
  let hint_frequency: DifficultyProfile["hint_frequency"];
  if (graph.hint_dependency_score > 0.5 || avgAccuracy < 0.4) {
    hint_frequency = "generous";
  } else if (avgAccuracy > 0.8) {
    hint_frequency = "minimal";
  } else {
    hint_frequency = "moderate";
  }

  // Distractor count scales with difficulty
  const distractor_count = adjusted_difficulty > 0.7 ? 4 : adjusted_difficulty > 0.4 ? 3 : 2;

  // Time pressure based on confidence calibration
  let time_pressure: DifficultyProfile["time_pressure"];
  if (avgAccuracy < 0.4) {
    time_pressure = "none";
  } else if (graph.confidence_score > 0.7) {
    time_pressure = "moderate";
  } else if (avgAccuracy > 0.75) {
    time_pressure = "gentle";
  } else {
    time_pressure = "none";
  }

  // Cognitive load
  let cognitive_load: DifficultyProfile["cognitive_load"];
  if (adjusted_difficulty > 0.7) {
    cognitive_load = "heavy";
  } else if (adjusted_difficulty > 0.4) {
    cognitive_load = "moderate";
  } else {
    cognitive_load = "light";
  }

  // Object density
  let object_density: DifficultyProfile["object_density"];
  if (adjusted_difficulty > 0.7) {
    object_density = "dense";
  } else if (adjusted_difficulty > 0.4) {
    object_density = "normal";
  } else {
    object_density = "sparse";
  }

  // Assistance level
  let assistance_level: DifficultyProfile["assistance_level"];
  if (graph.hint_dependency_score > 0.5 || avgAccuracy < 0.4) {
    assistance_level = "supported";
  } else if (avgAccuracy > 0.75) {
    assistance_level = "autonomous";
  } else {
    assistance_level = "guided";
  }

  return {
    base_difficulty,
    adjusted_difficulty,
    hint_frequency,
    distractor_count,
    time_pressure,
    cognitive_load,
    object_density,
    assistance_level,
  };
}

// ==================== Weak Concepts ====================

export function identifyWeakConcepts(graph: UserKnowledgeGraph): string[] {
  const weakLevels: MasteryLevel[] = ["unknown", "exposed", "fragile"];
  return graph.concept_mastery
    .filter((cm) => weakLevels.includes(cm.mastery_level))
    .map((cm) => cm.concept_key);
}

// ==================== Error Pattern Detection ====================

export function identifyErrorPatterns(graph: UserKnowledgeGraph): ErrorPattern[] {
  const patterns: ErrorPattern[] = [];
  const now = new Date().toISOString();

  const repeatedWrongConcepts: string[] = [];
  const confusionSwapConcepts: string[] = [];
  const overconfidentConcepts: string[] = [];
  const timeoutConcepts: string[] = [];
  const hintDependentConcepts: string[] = [];

  for (const cm of graph.concept_mastery) {
    if (cm.attempts === 0) continue;

    const hintRate = cm.hints_used / cm.attempts;
    const avgResponseTime =
      cm.response_times_ms.length > 0
        ? cm.response_times_ms.reduce((a, b) => a + b, 0) / cm.response_times_ms.length
        : 0;

    // Repeated wrong: low accuracy with multiple attempts
    if (cm.attempts >= 2 && cm.accuracy < 0.4) {
      repeatedWrongConcepts.push(cm.concept_key);
    }

    // Confusion swap: has confusion errors
    if (cm.confusion_errors > 0) {
      confusionSwapConcepts.push(cm.concept_key);
    }

    // Overconfident: high confidence calibration gap (confidence >> accuracy)
    if (cm.confidence_calibration < 0.5 && cm.accuracy < 0.5 && cm.attempts >= 2) {
      overconfidentConcepts.push(cm.concept_key);
    }

    // Timeout: slow responses (>30 seconds average)
    if (avgResponseTime > 30000 && cm.attempts >= 1) {
      timeoutConcepts.push(cm.concept_key);
    }

    // Hint dependent: high hint usage rate
    if (hintRate > 0.5 && cm.attempts >= 2) {
      hintDependentConcepts.push(cm.concept_key);
    }
  }

  if (repeatedWrongConcepts.length > 0) {
    patterns.push({
      pattern_type: "repeated_wrong",
      concept_keys: repeatedWrongConcepts,
      frequency: repeatedWrongConcepts.length,
      last_occurrence: now,
    });
  }

  if (confusionSwapConcepts.length > 0) {
    patterns.push({
      pattern_type: "confusion_swap",
      concept_keys: confusionSwapConcepts,
      frequency: confusionSwapConcepts.length,
      last_occurrence: now,
    });
  }

  if (overconfidentConcepts.length > 0) {
    patterns.push({
      pattern_type: "overconfident",
      concept_keys: overconfidentConcepts,
      frequency: overconfidentConcepts.length,
      last_occurrence: now,
    });
  }

  if (timeoutConcepts.length > 0) {
    patterns.push({
      pattern_type: "timeout",
      concept_keys: timeoutConcepts,
      frequency: timeoutConcepts.length,
      last_occurrence: now,
    });
  }

  if (hintDependentConcepts.length > 0) {
    patterns.push({
      pattern_type: "hint_dependent",
      concept_keys: hintDependentConcepts,
      frequency: hintDependentConcepts.length,
      last_occurrence: now,
    });
  }

  return patterns;
}

// ==================== Revisit Priority ====================

export function computeRevisitPriority(graph: UserKnowledgeGraph): ConceptRevisit[] {
  const revisits: ConceptRevisit[] = [];
  const now = Date.now();

  for (const cm of graph.concept_mastery) {
    if (cm.mastery_level === "mastered" || cm.mastery_level === "stable") {
      continue;
    }

    let priority = 0;
    let reason: ConceptRevisit["reason"] = "failed";
    let recommended_format = "recognition";

    // Failure recency: more recent failures get higher priority
    const lastSeenAge = now - new Date(cm.last_seen).getTime();
    const recencyFactor = Math.max(0, 1 - lastSeenAge / (7 * 24 * 60 * 60 * 1000)); // decays over a week

    // Mastery level factor
    let masteryFactor = 0;
    switch (cm.mastery_level) {
      case "unknown":
        masteryFactor = 0.9;
        reason = "failed";
        recommended_format = "recognition";
        break;
      case "exposed":
        masteryFactor = 0.7;
        reason = "failed";
        recommended_format = "recall";
        break;
      case "fragile":
        masteryFactor = 0.5;
        reason = "fragile";
        recommended_format = "generation";
        break;
      case "developing":
        masteryFactor = 0.3;
        reason = "low_confidence";
        recommended_format = "contrast";
        break;
    }

    // Confusion involvement boosts priority
    const confusionBoost = cm.confusion_errors > 0 ? 0.2 : 0;
    if (cm.confusion_errors > 0) {
      reason = "confusion";
      recommended_format = "contrast";
    }

    // Low confidence calibration
    if (cm.confidence_calibration < 0.4 && cm.attempts > 0) {
      reason = "low_confidence";
    }

    priority = Math.min(
      masteryFactor * 0.5 + recencyFactor * 0.3 + confusionBoost + (1 - cm.accuracy) * 0.2,
      1,
    );

    if (priority > 0.1) {
      revisits.push({
        concept_key: cm.concept_key,
        priority,
        reason,
        recommended_format,
      });
    }
  }

  // Sort by descending priority
  revisits.sort((a, b) => b.priority - a.priority);

  return revisits;
}

// ==================== Adaptive Difficulty Check ====================

export function shouldAdaptDifficulty(
  graph: UserKnowledgeGraph,
): { adapt: boolean; direction: "easier" | "harder" | "maintain" } {
  // Collect recent attempts across all concepts (last 5 by timestamp)
  const allMasteryWithAttempts = graph.concept_mastery
    .filter((cm) => cm.attempts > 0)
    .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());

  if (allMasteryWithAttempts.length === 0) {
    return { adapt: false, direction: "maintain" };
  }

  // Take the 5 most recently seen concepts as a proxy for recent attempts
  const recentConcepts = allMasteryWithAttempts.slice(0, 5);
  const recentAvgAccuracy =
    recentConcepts.reduce((sum, cm) => sum + cm.accuracy, 0) / recentConcepts.length;

  if (recentAvgAccuracy < 0.4) {
    return { adapt: true, direction: "easier" };
  }

  if (recentAvgAccuracy > 0.85) {
    return { adapt: true, direction: "harder" };
  }

  return { adapt: false, direction: "maintain" };
}

// ==================== Accessors ====================

export function getConceptMastery(
  graph: UserKnowledgeGraph,
  conceptKey: string,
): ConceptMastery | undefined {
  return graph.concept_mastery.find((cm) => cm.concept_key === conceptKey);
}

export function getOverallProgress(
  graph: UserKnowledgeGraph,
): { mastered: number; developing: number; weak: number; total: number } {
  const total = graph.concept_mastery.length;

  let mastered = 0;
  let developing = 0;
  let weak = 0;

  for (const cm of graph.concept_mastery) {
    switch (cm.mastery_level) {
      case "mastered":
      case "stable":
        mastered++;
        break;
      case "developing":
        developing++;
        break;
      case "unknown":
      case "exposed":
      case "fragile":
        weak++;
        break;
    }
  }

  return { mastered, developing, weak, total };
}
