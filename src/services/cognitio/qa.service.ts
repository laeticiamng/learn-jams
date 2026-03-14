// ============================================================
// COGNITIO QA Service — Quality assurance for generated content
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { QAInput, QAOutput, QAChecklistItem, QAViolation } from "@/domain/cognitio/contracts";
import type { MissionContent } from "@/domain/cognitio/types";
import { QA_MIN_SCORE, validateQAScore, MAX_NEW_ITEMS_PER_SEGMENT, MIN_RECALL_PER_WORDS } from "@/domain/cognitio/validators";

export async function runQA(input: QAInput): Promise<QAOutput> {
  const { data, error } = await supabase.functions.invoke("cognitio-qa", {
    body: input,
  });

  if (error) throw new Error(`QA failed: ${error.message}`);
  return data as QAOutput;
}

// Client-side QA checks
export function runLocalQA(input: QAInput): QAOutput {
  const checklist: QAChecklistItem[] = [];
  const violations: QAViolation[] = [];

  const mission = input.mission_json;
  const concepts = input.concepts;
  const sourceWords = input.source_text.split(/\s+/).length;

  // Check 1: Has active recall
  const hasRecall = mission.rooms.some(r => r.items.length > 0);
  checklist.push({
    check_id: "has_active_recall",
    label: "Rappel actif présent",
    passed: hasRecall,
    weight: 15,
  });
  if (!hasRecall) {
    violations.push({
      violation_type: "missing_recall",
      severity: "blocking",
      message: "Aucun rappel actif dans la mission",
    });
  }

  // Check 2: No cognitive overload
  const maxItemsPerRoom = Math.max(...mission.rooms.map(r => r.items.length), 0);
  const noOverload = maxItemsPerRoom <= MAX_NEW_ITEMS_PER_SEGMENT + 2;
  checklist.push({
    check_id: "no_cognitive_overload",
    label: "Pas de surcharge cognitive",
    passed: noOverload,
    weight: 10,
  });
  if (!noOverload) {
    violations.push({
      violation_type: "overload",
      severity: "blocking",
      message: `Trop d'items par salle (${maxItemsPerRoom}), maximum recommandé: ${MAX_NEW_ITEMS_PER_SEGMENT + 2}`,
    });
  }

  // Check 3: Bloom diversity
  const bloomLevels = new Set(
    mission.rooms.flatMap(r => r.items.map(i => i.bloom_level))
  );
  const bloomDiversity = bloomLevels.size >= 3;
  checklist.push({
    check_id: "bloom_diversity",
    label: "Diversité Bloom (3+ niveaux)",
    passed: bloomDiversity,
    weight: 10,
    details: `${bloomLevels.size} niveaux utilisés`,
  });
  if (!bloomDiversity) {
    violations.push({
      violation_type: "bloom_gap",
      severity: "warning",
      message: `Seulement ${bloomLevels.size} niveau(x) Bloom utilisé(s), minimum 3 recommandé`,
    });
  }

  // Check 4: Source fidelity (no hallucination check)
  const allConceptKeys = new Set(concepts.map(c => c.stable_key));
  const missionConceptKeys = new Set(
    mission.rooms.flatMap(r => r.items.map(i => i.concept_key))
  );
  const unknownConcepts = [...missionConceptKeys].filter(k => !allConceptKeys.has(k));
  const noHallucination = unknownConcepts.length === 0;
  checklist.push({
    check_id: "no_hallucination",
    label: "Pas de concept inventé",
    passed: noHallucination,
    weight: 20,
  });
  if (!noHallucination) {
    violations.push({
      violation_type: "hallucination",
      severity: "blocking",
      message: `${unknownConcepts.length} concept(s) non trouvé(s) dans la source: ${unknownConcepts.join(", ")}`,
    });
  }

  // Check 5: Critical concepts coverage
  const criticalConcepts = concepts.filter(c => c.criticality === 1);
  const coveredCritical = criticalConcepts.filter(c => missionConceptKeys.has(c.stable_key));
  const criticalCoverage = criticalConcepts.length === 0 || coveredCritical.length / criticalConcepts.length >= 0.8;
  checklist.push({
    check_id: "critical_coverage",
    label: "Concepts critiques couverts (>80%)",
    passed: criticalCoverage,
    weight: 15,
    details: `${coveredCritical.length}/${criticalConcepts.length}`,
  });

  // Check 6: Room sequence valid
  const brickSequence = mission.rooms.map(r => r.brick_type);
  const { valid: seqValid } = brickSequence.length > 0
    ? { valid: !brickSequence.some((b, i) => i > 0 && b === brickSequence[i - 1]) }
    : { valid: true };
  checklist.push({
    check_id: "valid_sequence",
    label: "Séquence de salles valide",
    passed: seqValid,
    weight: 5,
  });

  // Check 7: Has explanations
  const allHaveExplanations = mission.rooms.every(r =>
    r.items.every(i => i.explanation && i.explanation.length > 10)
  );
  checklist.push({
    check_id: "has_explanations",
    label: "Explications présentes",
    passed: allHaveExplanations,
    weight: 10,
  });

  // Check 8: Reasonable duration
  const totalItems = mission.rooms.reduce((s, r) => s + r.items.length, 0) +
    (mission.boss?.items.length ?? 0);
  const estimatedMinutes = totalItems * 0.5;
  const reasonableDuration = estimatedMinutes <= 15;
  checklist.push({
    check_id: "reasonable_duration",
    label: "Durée raisonnable (<15 min)",
    passed: reasonableDuration,
    weight: 5,
  });

  // Check 9: Quality score threshold
  const goodQuality = input.quality_score >= 0.4;
  checklist.push({
    check_id: "quality_threshold",
    label: "Score qualité source suffisant",
    passed: goodQuality,
    weight: 10,
  });

  // Compute total score
  const totalWeight = checklist.reduce((s, c) => s + c.weight, 0);
  const passedWeight = checklist.filter(c => c.passed).reduce((s, c) => s + c.weight, 0);
  const qaScore = Math.round((passedWeight / totalWeight) * 100);

  const { publish_blocked, block_reason } = validateQAScore(qaScore, violations);

  return {
    qa_score: qaScore,
    checklist_results: checklist,
    violations,
    recommendations: buildRecommendations(checklist, violations),
    publish_blocked,
    block_reason,
  };
}

function buildRecommendations(
  checklist: QAChecklistItem[],
  violations: QAViolation[]
): string[] {
  const recs: string[] = [];

  if (!checklist.find(c => c.check_id === "bloom_diversity")?.passed) {
    recs.push("Ajoutez des questions de niveaux Bloom plus élevés (appliquer, analyser)");
  }
  if (!checklist.find(c => c.check_id === "critical_coverage")?.passed) {
    recs.push("Assurez-vous que les concepts critiques sont bien couverts dans la mission");
  }
  if (!checklist.find(c => c.check_id === "has_explanations")?.passed) {
    recs.push("Complétez les explications manquantes pour chaque item");
  }

  return recs;
}
