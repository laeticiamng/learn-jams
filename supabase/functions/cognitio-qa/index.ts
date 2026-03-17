// ============================================================
// Edge Function: cognitio-qa
// Quality assurance checks before publishing a mission
// Enhanced: semantic QA scoring for concept quality, definition
//           compression, mnemonic quality, learner adaptation
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QA_MIN_SCORE = 80;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mission_id, mission_json, concepts, quality_score, source_text, learner_profile, mnemonics, content_blocks } = await req.json();

    const checklist: { check_id: string; label: string; passed: boolean; weight: number; details?: string }[] = [];
    const violations: { violation_type: string; severity: string; message: string; concept_key?: string }[] = [];

    const rooms = mission_json?.rooms ?? [];
    const allItems = rooms.flatMap((r: { items: unknown[] }) => r.items ?? []);

    // ===== STRUCTURAL CHECKS (existing) =====

    // Check 1: Active recall present
    const hasRecall = allItems.length > 0;
    checklist.push({ check_id: "has_active_recall", label: "Rappel actif présent", passed: hasRecall, weight: 10 });
    if (!hasRecall) {
      violations.push({ violation_type: "missing_recall", severity: "blocking", message: "Aucun rappel actif" });
    }

    // Check 2: No cognitive overload
    const maxItems = Math.max(...rooms.map((r: { items: unknown[] }) => (r.items ?? []).length), 0);
    const noOverload = maxItems <= 7;
    checklist.push({ check_id: "no_cognitive_overload", label: "Pas de surcharge", passed: noOverload, weight: 7 });
    if (!noOverload) {
      violations.push({ violation_type: "overload", severity: "blocking", message: `${maxItems} items max par salle` });
    }

    // Check 3: Bloom diversity
    const blooms = new Set(allItems.map((i: { bloom_level: string }) => i.bloom_level));
    const bloomOk = blooms.size >= 3;
    checklist.push({ check_id: "bloom_diversity", label: "3+ niveaux Bloom", passed: bloomOk, weight: 5 });

    // Check 4: No hallucination
    const conceptKeys = new Set((concepts ?? []).map((c: { stable_key: string }) => c.stable_key));
    const itemKeys = allItems.map((i: { concept_key: string }) => i.concept_key);
    const unknown = itemKeys.filter((k: string) => !conceptKeys.has(k));
    const noHallucination = unknown.length === 0;
    checklist.push({ check_id: "no_hallucination", label: "Pas de hallucination", passed: noHallucination, weight: 15 });
    if (!noHallucination) {
      violations.push({ violation_type: "hallucination", severity: "blocking", message: `${unknown.length} concept(s) hors source` });
    }

    // Check 5: Critical coverage
    const critical = (concepts ?? []).filter((c: { criticality: number }) => c.criticality === 1);
    const covered = critical.filter((c: { stable_key: string }) => itemKeys.includes(c.stable_key));
    const coverageOk = critical.length === 0 || covered.length / critical.length >= 0.8;
    checklist.push({ check_id: "critical_coverage", label: "Couverture critiques >80%", passed: coverageOk, weight: 8 });

    // Check 6: Explanations
    const hasExplanations = allItems.every((i: { explanation: string }) => i.explanation?.length > 10);
    checklist.push({ check_id: "has_explanations", label: "Explications", passed: hasExplanations, weight: 5 });

    // Check 7: Quality threshold
    const qualityOk = (quality_score ?? 0) >= 0.4;
    checklist.push({ check_id: "quality_threshold", label: "Qualité source", passed: qualityOk, weight: 5 });

    // Check 8: Sequence valid
    const bricks = rooms.map((r: { brick_type: string }) => r.brick_type);
    const seqValid = !bricks.some((b: string, i: number) => i > 0 && b === bricks[i - 1]);
    checklist.push({ check_id: "valid_sequence", label: "Séquence valide", passed: seqValid, weight: 3 });

    // Check 9: Duration
    const reasonable = allItems.length * 0.5 <= 15;
    checklist.push({ check_id: "reasonable_duration", label: "Durée <15min", passed: reasonable, weight: 2 });

    // ===== SEMANTIC CHECKS (new) =====

    // Check 10: Concept label cleanliness
    const conceptLabelIssues = assessConceptLabelCleanliness(concepts ?? []);
    const labelCleanlinessOk = conceptLabelIssues.score >= 0.7;
    checklist.push({
      check_id: "concept_label_cleanliness",
      label: "Propreté labels concepts",
      passed: labelCleanlinessOk,
      weight: 10,
      details: `${Math.round(conceptLabelIssues.score * 100)}% — ${conceptLabelIssues.issues.length} problème(s)`,
    });
    if (!labelCleanlinessOk && conceptLabelIssues.issues.length > 0) {
      violations.push({
        violation_type: "dirty_concept_labels",
        severity: conceptLabelIssues.score < 0.4 ? "blocking" : "warning",
        message: `Labels bruités: ${conceptLabelIssues.issues.slice(0, 3).join(", ")}`,
      });
    }

    // Check 11: Definition quality (pedagogical compression)
    const defQuality = assessDefinitionQuality(concepts ?? []);
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
    const criticalQuality = assessCriticalConceptQuality(concepts ?? []);
    const criticalQualityOk = criticalQuality.score >= 0.7;
    checklist.push({
      check_id: "critical_concept_quality",
      label: "Qualité concepts critiques",
      passed: criticalQualityOk,
      weight: 10,
      details: `${Math.round(criticalQuality.score * 100)}% — ${criticalQuality.artifactCriticals.length} artefact(s) critique(s)`,
    });
    if (criticalQuality.artifactCriticals.length > 0) {
      violations.push({
        violation_type: "artifact_as_critical",
        severity: "blocking",
        message: `Artefacts promus critiques: ${criticalQuality.artifactCriticals.join(", ")}`,
      });
    }

    // Check 13: Mnemonic quality
    const mnemonicQuality = assessMnemonicQuality(mnemonics ?? []);
    const mnemonicOk = mnemonicQuality.score >= 0.5;
    checklist.push({
      check_id: "mnemonic_quality",
      label: "Qualité mnémoniques",
      passed: mnemonicOk,
      weight: 5,
      details: `${Math.round(mnemonicQuality.score * 100)}%`,
    });

    // Check 14: Learner adaptation visible
    const adaptationQuality = assessLearnerAdaptation(content_blocks ?? [], learner_profile);
    const adaptationOk = adaptationQuality.score >= 0.5;
    checklist.push({
      check_id: "learner_adaptation",
      label: "Adaptation niveau apprenant",
      passed: adaptationOk,
      weight: 5,
      details: `${Math.round(adaptationQuality.score * 100)}%`,
    });

    // ===== SCORE COMPUTATION =====
    const totalWeight = checklist.reduce((s, c) => s + c.weight, 0);
    const passedWeight = checklist.filter((c) => c.passed).reduce((s, c) => s + c.weight, 0);
    const qaScore = Math.round((passedWeight / totalWeight) * 100);

    const hasBlocking = violations.some((v) => v.severity === "blocking");
    const hasHallucination = violations.some((v) => v.violation_type === "hallucination");
    const publishBlocked = qaScore < QA_MIN_SCORE || hasBlocking || hasHallucination;

    // Semantic sub-scores
    const semantic_scores = {
      concept_label_cleanliness_score: Math.round(conceptLabelIssues.score * 100),
      semantic_relevance_score: Math.round(criticalQuality.score * 100),
      pedagogical_compression_score: Math.round(defQuality.score * 100),
      learner_fit_score: Math.round(adaptationQuality.score * 100),
      mnemonic_quality_score: Math.round(mnemonicQuality.score * 100),
    };

    const result = {
      qa_score: qaScore,
      semantic_scores,
      checklist_results: checklist,
      violations,
      recommendations: buildRecommendations(checklist, violations),
      publish_blocked: publishBlocked,
      block_reason: hasHallucination
        ? "Hallucination conceptuelle — blocage absolu"
        : hasBlocking
          ? "Violation bloquante détectée"
          : qaScore < QA_MIN_SCORE
            ? `Score QA insuffisant (${qaScore}/100)`
            : undefined,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---------- Semantic Assessment Functions ----------

interface ConceptForQA {
  stable_key: string;
  label: string;
  definition: string;
  criticality: number;
  source_confidence?: number;
}

/**
 * Assess cleanliness of concept labels.
 * Flags labels that contain editorial artifacts, noise, or are not intelligible standalone.
 */
function assessConceptLabelCleanliness(concepts: ConceptForQA[]): { score: number; issues: string[] } {
  if (concepts.length === 0) return { score: 1, issues: [] };

  const NOISE_PATTERNS = [
    /^(?:COM\s+)?R2C\s*:/i,
    /Rang\s+[A-Z]/i,
    /^[)(\-–—•:;,.\]}\[{]/,
    /^(?:Item|UE|DFGSM|ECN|EDN)\s+\d/i,
    /^\d+\.\s*$/,
    /^(?:Voir|Cf\.?|Tableau|Figure)\s/i,
    /[)(\]}\[{].*[-–—]/,
  ];

  const issues: string[] = [];
  let cleanCount = 0;

  for (const c of concepts) {
    const label = c.label.trim();
    const hasNoise = NOISE_PATTERNS.some(p => p.test(label));
    const tooShort = label.length < 3;
    const noLetters = !/[a-zA-ZÀ-ÿ]/.test(label);

    if (hasNoise || tooShort || noLetters) {
      issues.push(`"${label}"`);
    } else {
      cleanCount++;
    }
  }

  return {
    score: concepts.length > 0 ? cleanCount / concepts.length : 1,
    issues,
  };
}

/**
 * Assess quality of concept definitions.
 * Flags raw copy-pastes, overly long definitions, and empty/trivial definitions.
 */
function assessDefinitionQuality(concepts: ConceptForQA[]): { score: number; rawCopyCount: number; tooLongCount: number; tooShortCount: number } {
  if (concepts.length === 0) return { score: 1, rawCopyCount: 0, tooLongCount: 0, tooShortCount: 0 };

  let goodCount = 0;
  let rawCopyCount = 0;
  let tooLongCount = 0;
  let tooShortCount = 0;

  for (const c of concepts) {
    const def = c.definition.trim();

    // Too short
    if (def.length < 15) {
      tooShortCount++;
      continue;
    }

    // Too long (likely raw copy-paste from polycopié)
    if (def.length > 400) {
      tooLongCount++;
      // Check if it looks like raw copy-paste (many sentences, references, etc.)
      const sentenceCount = (def.match(/[.!?]/g) || []).length;
      if (sentenceCount > 5) rawCopyCount++;
      continue;
    }

    // Check for signs of raw copy-paste
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
    tooShortCount,
  };
}

/**
 * Assess whether critical concepts are truly pedagogically central
 * and not editorial artifacts promoted to critical status.
 */
function assessCriticalConceptQuality(concepts: ConceptForQA[]): { score: number; artifactCriticals: string[] } {
  const criticals = concepts.filter(c => c.criticality === 1);
  if (criticals.length === 0) return { score: 1, artifactCriticals: [] };

  const ARTIFACT_PATTERNS = [
    /^(?:COM\s+)?R2C/i,
    /Rang\s+[A-Z]/i,
    /^[)(\-–—]/,
    /^(?:Item|UE)\s+\d/i,
    /^(?:Signes?\s+(?:généraux|cliniques?))/i,
    /^(?:Introduction|Conclusion|Résumé)/i,
  ];

  const artifactCriticals: string[] = [];
  let validCount = 0;

  for (const c of criticals) {
    const isArtifact = ARTIFACT_PATTERNS.some(p => p.test(c.label.trim()));
    const hasGoodDef = c.definition.trim().length >= 15;
    const hasLetters = /[a-zA-ZÀ-ÿ]{3,}/.test(c.label);

    if (isArtifact || !hasGoodDef || !hasLetters) {
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

/**
 * Assess quality of mnemonics.
 */
function assessMnemonicQuality(mnemonics: { mnemonic: string; type: string; concept_keys?: string[] }[]): { score: number } {
  if (!mnemonics || mnemonics.length === 0) return { score: 0.5 }; // No mnemonics = neutral

  let goodCount = 0;

  for (const m of mnemonics) {
    const text = m.mnemonic || "";
    // A good mnemonic should be:
    // - Not just 1-2 letters (too short to be useful)
    // - Not just a copy of a definition
    // - Memorable (short, patterns, rhythm)
    const isUseful = text.length >= 3 && text.length <= 100;
    const isNotJustInitials = !(text.length <= 2 && /^[A-Z]+$/.test(text));
    const hasPattern = /[A-Z]{3,}/.test(text) || text.includes("→") || text.includes("↔") || text.length >= 10;

    if (isUseful && isNotJustInitials && hasPattern) {
      goodCount++;
    }
  }

  return { score: mnemonics.length > 0 ? goodCount / mnemonics.length : 0.5 };
}

/**
 * Assess whether learner adaptation is actually visible in the generated content.
 */
function assessLearnerAdaptation(
  contentBlocks: { type: string; content: string }[],
  learnerProfile?: { declared_level?: string; education_stage?: string }
): { score: number } {
  if (!learnerProfile || !contentBlocks || contentBlocks.length === 0) {
    return { score: 0.5 }; // No profile = neutral
  }

  const allContent = contentBlocks.map(b => b.content).join(" ");
  const wordCount = allContent.split(/\s+/).length;

  // Check for signs of adaptation
  let adaptationSignals = 0;
  const totalChecks = 5;

  // 1. Tone markers (tu/vous distinction)
  const useTu = /\btu\b|\bton\b|\btes\b|\bta\b/i.test(allContent);
  const useVous = /\bvous\b|\bvotre\b|\bvos\b/i.test(allContent);
  if (useTu || useVous) adaptationSignals++;

  // 2. Vocabulary level indicators
  const hasSimpleLanguage = /simplement|en d'autres termes|c'est-à-dire/i.test(allContent);
  const hasAcademicLanguage = /formellement|en théorie|du point de vue/i.test(allContent);
  if (hasSimpleLanguage || hasAcademicLanguage) adaptationSignals++;

  // 3. Example style
  const hasExamples = /exemple|par exemple|imagin|comme/i.test(allContent);
  if (hasExamples) adaptationSignals++;

  // 4. Contract block adapted
  const contractBlock = contentBlocks.find(b => b.type === "contract");
  if (contractBlock && contractBlock.content.length > 20) adaptationSignals++;

  // 5. Reasonable definition density for level
  const pedagogicalBlocks = contentBlocks.filter(b => b.type === "pedagogical");
  if (pedagogicalBlocks.length > 0) adaptationSignals++;

  return { score: adaptationSignals / totalChecks };
}

// ---------- Recommendations ----------

function buildRecommendations(
  checklist: { check_id: string; passed: boolean }[],
  violations: { violation_type: string; severity: string; message: string }[]
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
  if (!checklist.find(c => c.check_id === "mnemonic_quality")?.passed) {
    recs.push("Améliorez les mnémoniques : utilisez des acronymes parlants, images mentales ou analogies utiles");
  }
  if (!checklist.find(c => c.check_id === "learner_adaptation")?.passed) {
    recs.push("Adaptez davantage le contenu au niveau de l'apprenant : ton, vocabulaire, exemples");
  }

  return recs;
}
