// ============================================================
// ImmersiveDebriefEngine — Generates comprehensive pedagogical
// debriefs after missions, including memory chamber concepts
// and spaced review scheduling.
// ============================================================

import type {
  ImmersiveDebrief,
  ConceptResult,
  ConfusionZoneResult,
  ReviewScheduleItem,
  MasteryLevel,
  UserKnowledgeGraph,
  DependencyGraph,
  ConfusionZone,
} from "@/domain/cognitio/immersiveEngine.types";
import type { BloomLevel } from "@/domain/cognitio/types";

// ---------- Types ----------

interface DebriefInput {
  user_id: string;
  mission_id: string;
  knowledge_graph: UserKnowledgeGraph;
  dependency_graph: DependencyGraph;
  rooms_completed: number;
  rooms_total: number;
  objects_discovered: number;
  objects_total: number;
  inventory_items_collected: number;
  gates_unlocked: number;
  total_time_sec: number;
}

// ---------- Main Function ----------

export function generateImmersiveDebrief(input: DebriefInput): ImmersiveDebrief {
  const { knowledge_graph, dependency_graph } = input;

  const concepts_learned = buildConceptResults(knowledge_graph, ["mastered", "stable"]);
  const concepts_weak = buildConceptResults(knowledge_graph, ["unknown", "exposed", "fragile"]);
  const confusion_zones = evaluateConfusionZones(dependency_graph.confusion_zones, knowledge_graph);

  const puzzles_correct = knowledge_graph.concept_mastery.reduce(
    (sum, cm) => sum + Math.round(cm.accuracy * cm.attempts), 0
  );
  const total_puzzles = knowledge_graph.concept_mastery.reduce(
    (sum, cm) => sum + cm.attempts, 0
  );

  const bloom_coverage = computeBloomCoverage(knowledge_graph, dependency_graph);
  const synthesis_score = computeSynthesisScore(knowledge_graph, dependency_graph);
  const memory_chamber_concepts = selectMemoryChamberConcepts(knowledge_graph);
  const spaced_review_schedule = buildSpacedReviewSchedule(knowledge_graph, dependency_graph);

  return {
    mission_id: input.mission_id,
    user_id: input.user_id,
    timestamp: new Date().toISOString(),
    concepts_learned,
    concepts_weak,
    confusion_zones_encountered: confusion_zones,
    total_puzzles,
    puzzles_correct,
    puzzles_incorrect: total_puzzles - puzzles_correct,
    hints_used: knowledge_graph.concept_mastery.reduce((s, cm) => s + cm.hints_used, 0),
    total_time_sec: input.total_time_sec,
    avg_response_time_ms: knowledge_graph.avg_response_time_ms,
    rooms_completed: input.rooms_completed,
    rooms_total: input.rooms_total,
    objects_discovered: input.objects_discovered,
    objects_total: input.objects_total,
    inventory_items_collected: input.inventory_items_collected,
    gates_unlocked: input.gates_unlocked,
    synthesis_score,
    bloom_coverage,
    memory_chamber_concepts,
    spaced_review_schedule,
    recommended_next: determineNextAction(synthesis_score, concepts_weak.length, concepts_learned.length),
  };
}

// ---------- Helpers ----------

function buildConceptResults(
  kg: UserKnowledgeGraph,
  levels: MasteryLevel[],
): ConceptResult[] {
  return kg.concept_mastery
    .filter(cm => levels.includes(cm.mastery_level))
    .map(cm => ({
      concept_key: cm.concept_key,
      label: cm.concept_key, // label resolved upstream
      mastery_level: cm.mastery_level,
      accuracy: cm.accuracy,
      attempts: cm.attempts,
      hints_used: cm.hints_used,
    }));
}

function evaluateConfusionZones(
  zones: ConfusionZone[],
  kg: UserKnowledgeGraph,
): ConfusionZoneResult[] {
  return zones.map(zone => {
    const masteryA = kg.concept_mastery.find(cm => cm.concept_key === zone.concept_a);
    const masteryB = kg.concept_mastery.find(cm => cm.concept_key === zone.concept_b);
    const confusionErrors = (masteryA?.confusion_errors ?? 0) + (masteryB?.confusion_errors ?? 0);
    const totalAttempts = (masteryA?.attempts ?? 0) + (masteryB?.attempts ?? 0);
    const discriminationAccuracy = totalAttempts > 0
      ? 1 - (confusionErrors / totalAttempts)
      : 0;

    return {
      concept_a: zone.concept_a,
      concept_b: zone.concept_b,
      discrimination_accuracy: Math.max(0, Math.min(1, discriminationAccuracy)),
      needs_review: discriminationAccuracy < 0.7,
    };
  });
}

function computeBloomCoverage(
  kg: UserKnowledgeGraph,
  dg: DependencyGraph,
): Record<BloomLevel, number> {
  const coverage: Record<BloomLevel, number> = {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0,
  };

  const bloomCounts: Record<BloomLevel, { total: number; mastered: number }> = {
    remember: { total: 0, mastered: 0 },
    understand: { total: 0, mastered: 0 },
    apply: { total: 0, mastered: 0 },
    analyze: { total: 0, mastered: 0 },
    evaluate: { total: 0, mastered: 0 },
    create: { total: 0, mastered: 0 },
  };

  for (const node of dg.nodes) {
    const bloom = node.bloom_target;
    if (bloom in bloomCounts) {
      bloomCounts[bloom].total++;
      const mastery = kg.concept_mastery.find(cm => cm.concept_key === node.concept_key);
      if (mastery && mastery.accuracy >= 0.7) {
        bloomCounts[bloom].mastered++;
      }
    }
  }

  for (const [level, counts] of Object.entries(bloomCounts)) {
    coverage[level as BloomLevel] = counts.total > 0
      ? counts.mastered / counts.total
      : 0;
  }

  return coverage;
}

function computeSynthesisScore(
  kg: UserKnowledgeGraph,
  dg: DependencyGraph,
): number {
  if (dg.synthesis_targets.length === 0) return 0;

  const synthesisMasteries = dg.synthesis_targets
    .map(targetId => {
      const node = dg.nodes.find(n => n.id === targetId);
      if (!node) return 0;
      const mastery = kg.concept_mastery.find(cm => cm.concept_key === node.concept_key);
      return mastery?.accuracy ?? 0;
    });

  return synthesisMasteries.reduce((a, b) => a + b, 0) / synthesisMasteries.length;
}

function selectMemoryChamberConcepts(kg: UserKnowledgeGraph): string[] {
  // Select concepts that need reinforcement: fragile, exposed, or recently failed
  return kg.concept_mastery
    .filter(cm =>
      cm.mastery_level === "fragile" ||
      cm.mastery_level === "exposed" ||
      (cm.mastery_level === "developing" && cm.confusion_errors > 0)
    )
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 8)
    .map(cm => cm.concept_key);
}

function buildSpacedReviewSchedule(
  kg: UserKnowledgeGraph,
  dg: DependencyGraph,
): ReviewScheduleItem[] {
  const now = new Date();
  const schedule: ReviewScheduleItem[] = [];

  for (const cm of kg.concept_mastery) {
    if (cm.attempts === 0) continue;

    const node = dg.nodes.find(n => n.concept_key === cm.concept_key);
    const roomId = node?.room_cluster_id ?? "unknown";

    // Determine review intervals based on mastery
    const intervals = getReviewIntervals(cm.mastery_level, cm.accuracy);

    for (const { days, type } of intervals) {
      const reviewDate = new Date(now);
      reviewDate.setDate(reviewDate.getDate() + days);

      schedule.push({
        concept_key: cm.concept_key,
        review_date: reviewDate.toISOString(),
        review_type: type,
        interval_days: days,
        source_room: roomId,
      });
    }
  }

  return schedule.sort((a, b) => a.review_date.localeCompare(b.review_date));
}

function getReviewIntervals(
  mastery: MasteryLevel,
  accuracy: number,
): { days: number; type: ReviewScheduleItem["review_type"] }[] {
  switch (mastery) {
    case "unknown":
    case "exposed":
      return [
        { days: 1, type: "recognition" },
        { days: 3, type: "recall" },
        { days: 7, type: "generation" },
      ];
    case "fragile":
      return [
        { days: 1, type: "recall" },
        { days: 3, type: "contrast" },
        { days: 7, type: "generation" },
        { days: 14, type: "transfer" },
      ];
    case "developing":
      return [
        { days: 3, type: "recall" },
        { days: 7, type: "generation" },
        { days: 21, type: "transfer" },
      ];
    case "stable":
      return [
        { days: 7, type: "generation" },
        { days: 30, type: "transfer" },
      ];
    case "mastered":
      return [
        { days: 30, type: "transfer" },
      ];
    default:
      return [
        { days: 1, type: "recognition" },
      ];
  }
}

function determineNextAction(
  synthesisScore: number,
  weakCount: number,
  learnedCount: number,
): ImmersiveDebrief["recommended_next"] {
  if (weakCount > learnedCount) return "replay_weak";
  if (synthesisScore < 0.5) return "memory_chamber";
  if (synthesisScore < 0.7) return "review";
  return "advance";
}
