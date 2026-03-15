// ============================================================
// COGNITIO QA Service — Quality assurance for generated content
// Enhanced: semantic QA scoring for concept quality, definition
//           compression, mnemonic quality, learner adaptation
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { QAInput, QAOutput, QAChecklistItem, QAViolation } from "@/domain/cognitio/contracts";
import type { MissionContent } from "@/domain/cognitio/types";
import { QA_MIN_SCORE, validateQAScore, MAX_NEW_ITEMS_PER_SEGMENT, MIN_RECALL_PER_WORDS } from "@/domain/cognitio/validators";
import {
  normalizeConceptLabel,
  rejectConceptArtifact,
  isValidConceptLabel,
  cleanMainTopic,
  isEditorialArtifact,
} from "@/lib/cognitio-semantic-cleaning";

export async function runQA(input: QAInput): Promise<QAOutput> {
  const { data, error } = await supabase.functions.invoke("cognitio-qa", {
    body: input,
  });

  if (error) throw new Error(`QA failed: ${error.message}`);
  return data as QAOutput;
}

// Client-side QA checks with semantic scoring
export function runLocalQA(input: QAInput): QAOutput {
  const checklist: QAChecklistItem[] = [];
  const violations: QAViolation[] = [];

  const mission = input.mission_json;
  const concepts = input.concepts;
  const sourceWords = input.source_text.split(/\s+/).length;

  // ===== STRUCTURAL CHECKS =====

  // Check 1: Has active recall
  const hasRecall = mission.rooms.some(r => r.items.length > 0);
  checklist.push({
    check_id: "has_active_recall",
    label: "Rappel actif présent",
    passed: hasRecall,
    weight: 10,
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
    weight: 7,
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
    weight: 5,
    details: `${bloomLevels.size} niveaux utilisés`,
  });

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
    weight: 15,
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
    weight: 8,
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
    weight: 3,
  });

  // Check 7: Has explanations
  const allHaveExplanations = mission.rooms.every(r =>
    r.items.every(i => i.explanation && i.explanation.length > 10)
  );
  checklist.push({
    check_id: "has_explanations",
    label: "Explications présentes",
    passed: allHaveExplanations,
    weight: 5,
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
    weight: 2,
  });

  // Check 9: Quality score threshold
  const goodQuality = input.quality_score >= 0.4;
  checklist.push({
    check_id: "quality_threshold",
    label: "Score qualité source suffisant",
    passed: goodQuality,
    weight: 5,
  });

  // ===== SEMANTIC CHECKS =====

  // Check 10: Concept label cleanliness
  const labelIssues = assessConceptLabelCleanliness(concepts);
  const labelCleanOk = labelIssues.score >= 0.7;
  checklist.push({
    check_id: "concept_label_cleanliness",
    label: "Propreté labels concepts",
    passed: labelCleanOk,
    weight: 10,
    details: `${Math.round(labelIssues.score * 100)}% — ${labelIssues.issues.length} problème(s)`,
  });
  if (!labelCleanOk && labelIssues.issues.length > 0) {
    violations.push({
      violation_type: "dirty_concept_labels",
      severity: labelIssues.score < 0.4 ? "blocking" : "warning",
      message: `Labels bruités: ${labelIssues.issues.slice(0, 3).join(", ")}`,
    });
  }

  // Check 11: Definition quality
  const defQuality = assessDefinitionQuality(concepts);
  const defQualityOk = defQuality.score >= 0.6;
  checklist.push({
    check_id: "definition_quality",
    label: "Qualité définitions",
    passed: defQualityOk,
    weight: 10,
    details: `${Math.round(defQuality.score * 100)}% — ${defQuality.rawCopyCount} copier-coller, ${defQuality.tooLongCount} trop longues`,
  });
  if (!defQualityOk) {
    violations.push({
      violation_type: "poor_definitions",
      severity: defQuality.score < 0.3 ? "blocking" : "warning",
      message: `Définitions insuffisantes: ${defQuality.rawCopyCount} non reformulées, ${defQuality.tooLongCount} trop longues`,
    });
  }

  // Check 12: Critical concept validity
  const criticalQuality = assessCriticalConceptQuality(concepts);
  const criticalQualityOk = criticalQuality.score >= 0.7;
  checklist.push({
    check_id: "critical_concept_quality",
    label: "Qualité concepts critiques",
    passed: criticalQualityOk,
    weight: 10,
    details: `${Math.round(criticalQuality.score * 100)}% — ${criticalQuality.artifactCriticals.length} artefact(s)`,
  });
  if (criticalQuality.artifactCriticals.length > 0) {
    violations.push({
      violation_type: "artifact_as_critical",
      severity: "blocking",
      message: `Artefacts promus critiques: ${criticalQuality.artifactCriticals.join(", ")}`,
    });
  }

  // Check 13: Topic cleanliness — main topic not polluted by artifacts
  const topicClean = assessTopicCleanliness(mission.title, concepts);
  checklist.push({
    check_id: "topic_cleanliness",
    label: "Sujet principal propre",
    passed: topicClean.score >= 0.7,
    weight: 8,
    details: topicClean.details,
  });
  if (topicClean.score < 0.5) {
    violations.push({
      violation_type: "dirty_topic",
      severity: "warning",
      message: `Sujet principal pollué : ${topicClean.details}`,
    });
  }

  // Check 14: Section coverage — mission covers distinct chapters
  const sectionCoverage = assessSectionCoverage(concepts, mission);
  checklist.push({
    check_id: "section_coverage",
    label: "Couverture des chapitres",
    passed: sectionCoverage.score >= 0.5,
    weight: 7,
    details: `${sectionCoverage.coveredTypes}/${sectionCoverage.totalTypes} types couverts`,
  });

  // Check 15: Concept normalization — labels are properly reformulated
  const normScore = assessConceptNormalization(concepts);
  checklist.push({
    check_id: "concept_normalization",
    label: "Normalisation des concepts",
    passed: normScore.score >= 0.7,
    weight: 8,
    details: `${Math.round(normScore.score * 100)}% — ${normScore.fragmentCount} fragments, ${normScore.tooLiteralCount} trop littéraux`,
  });

  // Check 16: Mission theme coherence — narrative matches subject
  const themeFit = assessThemeCoherence(mission);
  checklist.push({
    check_id: "mission_theme_fit",
    label: "Cohérence thème mission",
    passed: themeFit.score >= 0.6,
    weight: 5,
    details: themeFit.details,
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

// ---------- Semantic Assessment Functions ----------

function assessConceptLabelCleanliness(concepts: { label: string; stable_key: string }[]): {
  score: number;
  issues: string[];
} {
  if (concepts.length === 0) return { score: 1, issues: [] };

  const issues: string[] = [];
  let cleanCount = 0;

  for (const c of concepts) {
    const { rejected, reason } = rejectConceptArtifact({
      label: c.label,
      definition: "placeholder for label check",
      source_trace: [],
    });

    // We only check label validity here, not definition
    if (!isValidConceptLabel(c.label)) {
      issues.push(`"${c.label}"`);
    } else {
      cleanCount++;
    }
  }

  return {
    score: concepts.length > 0 ? cleanCount / concepts.length : 1,
    issues,
  };
}

function assessDefinitionQuality(concepts: { label: string; definition: string }[]): {
  score: number;
  rawCopyCount: number;
  tooLongCount: number;
} {
  if (concepts.length === 0) return { score: 1, rawCopyCount: 0, tooLongCount: 0 };

  let goodCount = 0;
  let rawCopyCount = 0;
  let tooLongCount = 0;

  for (const c of concepts) {
    const def = c.definition.trim();

    if (def.length < 15) continue;

    if (def.length > 400) {
      tooLongCount++;
      const sentenceCount = (def.match(/[.!?]/g) || []).length;
      if (sentenceCount > 5) rawCopyCount++;
      continue;
    }

    const hasInternalRefs = /\([Cc]f\.?\s|voir\s+(page|chapitre|section)/i.test(def);
    const hasRangLabels = /Rang\s+[A-Z]|R2C/i.test(def);
    const hasBulletFragments = /^\s*[-•]\s/m.test(def) && def.split("\n").length > 3;

    if (hasInternalRefs || hasRangLabels || hasBulletFragments) {
      rawCopyCount++;
    } else {
      goodCount++;
    }
  }

  return {
    score: concepts.length > 0 ? goodCount / concepts.length : 1,
    rawCopyCount,
    tooLongCount,
  };
}

function assessCriticalConceptQuality(concepts: { label: string; definition: string; criticality: number }[]): {
  score: number;
  artifactCriticals: string[];
} {
  const criticals = concepts.filter(c => c.criticality === 1);
  if (criticals.length === 0) return { score: 1, artifactCriticals: [] };

  const artifactCriticals: string[] = [];
  let validCount = 0;

  for (const c of criticals) {
    if (!isValidConceptLabel(c.label) || c.definition.trim().length < 15) {
      artifactCriticals.push(c.label);
    } else {
      validCount++;
    }
  }

  return {
    score: criticals.length > 0 ? validCount / criticals.length : 1,
    artifactCriticals,
  };
}

function assessTopicCleanliness(title: string, concepts: { label: string; type: string }[]): {
  score: number;
  details: string;
} {
  const cleaned = cleanMainTopic(title.replace(/^Mission:\s*/i, ""));

  // Check if cleaned topic still contains artifacts
  const hasR2C = /R2C|COM\s|Rang\s/i.test(cleaned);
  const hasEditorial = isEditorialArtifact(cleaned);
  const isTooShort = cleaned.length < 5;
  const isGeneric = /^(Apprentissage|Général|general|Contenu|Sujet)$/i.test(cleaned);

  let score = 1;
  const issues: string[] = [];

  if (hasR2C) { score -= 0.4; issues.push("contient métadonnées R2C"); }
  if (hasEditorial) { score -= 0.3; issues.push("artefact éditorial"); }
  if (isTooShort) { score -= 0.2; issues.push("trop court"); }
  if (isGeneric) { score -= 0.3; issues.push("trop générique"); }

  return {
    score: Math.max(0, score),
    details: issues.length > 0 ? issues.join(", ") : `Sujet propre : "${cleaned}"`,
  };
}

function assessSectionCoverage(
  concepts: { type: string; stable_key: string }[],
  mission: MissionContent
): { score: number; coveredTypes: number; totalTypes: number } {
  // Count distinct concept types (chapters/categories)
  const allTypes = new Set(concepts.map(c => c.type).filter(t => t && t !== "general" && t !== "Général"));
  if (allTypes.size === 0) return { score: 1, coveredTypes: 0, totalTypes: 0 };

  // Check which types are covered by mission items
  const missionConceptKeys = new Set(mission.rooms.flatMap(r => r.items.map(i => i.concept_key)));
  if (mission.boss) {
    for (const item of mission.boss.items) missionConceptKeys.add(item.concept_key);
  }

  const coveredTypes = new Set<string>();
  for (const c of concepts) {
    if (missionConceptKeys.has(c.stable_key) && c.type && c.type !== "general") {
      coveredTypes.add(c.type);
    }
  }

  return {
    score: allTypes.size > 0 ? coveredTypes.size / allTypes.size : 1,
    coveredTypes: coveredTypes.size,
    totalTypes: allTypes.size,
  };
}

function assessConceptNormalization(concepts: { label: string; definition: string }[]): {
  score: number;
  fragmentCount: number;
  tooLiteralCount: number;
} {
  if (concepts.length === 0) return { score: 1, fragmentCount: 0, tooLiteralCount: 0 };

  let normalizedCount = 0;
  let fragmentCount = 0;
  let tooLiteralCount = 0;

  for (const c of concepts) {
    const label = c.label;

    // Fragment detection: starts with lowercase, starts with punctuation, very short
    if (/^[a-zà-ÿ]/.test(label) && label.length < 15) {
      fragmentCount++;
      continue;
    }
    if (/^[\-–—•:;,.\])>]/.test(label)) {
      fragmentCount++;
      continue;
    }

    // Too literal: label is just a copy-paste of the start of definition
    const defStart = c.definition.toLowerCase().slice(0, 40);
    if (defStart.includes(label.toLowerCase()) && label.length > 10) {
      tooLiteralCount++;
      continue;
    }

    normalizedCount++;
  }

  return {
    score: concepts.length > 0 ? normalizedCount / concepts.length : 1,
    fragmentCount,
    tooLiteralCount,
  };
}

function assessThemeCoherence(mission: MissionContent): {
  score: number;
  details: string;
} {
  const intro = mission.narrative_intro.toLowerCase();

  // Check if the narrative is still the old hardcoded hospital theme
  const isGenericHospital = intro.includes("service d'urgence pédagogique");
  if (isGenericHospital) {
    return { score: 0.3, details: "Thème générique hospitalier non adapté au sujet" };
  }

  // Check if the narrative mentions the mission title/topic
  const topicWords = mission.title.replace(/^Mission:\s*/i, "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const topicMentioned = topicWords.some(w => intro.includes(w));

  // Check if rooms have distinct narratives (not all the same)
  const narratives = new Set(mission.rooms.map(r => r.narrative_context));
  const hasVariety = narratives.size >= Math.min(3, mission.rooms.length);

  let score = 0.5;
  if (topicMentioned) score += 0.3;
  if (hasVariety) score += 0.2;

  return {
    score: Math.min(1, score),
    details: topicMentioned
      ? "Thème cohérent avec le sujet"
      : "Le thème pourrait être mieux adapté au sujet",
  };
}

function buildRecommendations(
  checklist: QAChecklistItem[],
  violations: QAViolation[]
): string[] {
  const recs: string[] = [];

  if (!checklist.find(c => c.check_id === "concept_label_cleanliness")?.passed) {
    recs.push("Nettoyez les labels de concepts : supprimez les artefacts éditoriaux (Rang, R2C, fragments typographiques)");
  }
  if (!checklist.find(c => c.check_id === "definition_quality")?.passed) {
    recs.push("Améliorez les définitions : condensez, reformulez, supprimez les copier-coller bruts du polycopié");
  }
  if (!checklist.find(c => c.check_id === "critical_concept_quality")?.passed) {
    recs.push("Vérifiez les concepts critiques : un artefact ou métadonnée ne devrait jamais être critique");
  }
  if (!checklist.find(c => c.check_id === "bloom_diversity")?.passed) {
    recs.push("Ajoutez des questions de niveaux Bloom plus élevés (appliquer, analyser)");
  }
  if (!checklist.find(c => c.check_id === "critical_coverage")?.passed) {
    recs.push("Assurez-vous que les concepts critiques sont bien couverts dans la mission");
  }
  if (!checklist.find(c => c.check_id === "topic_cleanliness")?.passed) {
    recs.push("Le sujet principal est pollué par des artefacts éditoriaux — nettoyez le titre");
  }
  if (!checklist.find(c => c.check_id === "section_coverage")?.passed) {
    recs.push("La mission ne couvre pas assez de chapitres du cours — élargissez la couverture");
  }
  if (!checklist.find(c => c.check_id === "concept_normalization")?.passed) {
    recs.push("Certains concepts sont trop bruts ou fragmentaires — reformulez les labels");
  }
  if (!checklist.find(c => c.check_id === "mission_theme_fit")?.passed) {
    recs.push("Le thème de la mission ne correspond pas au sujet — adaptez l'univers narratif");
  }

  return recs;
}
