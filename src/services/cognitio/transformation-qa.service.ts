// ============================================================
// COGNITIO Transformation QA Service — M7 Quality Assurance
// Validates M5/M5B outputs before publication
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { M7_Input, M7_Output } from "@/domain/cognitio/qa.contracts";
import type {
  QAReport,
  QACheckResult,
  QAViolation,
  QAStatus,
  QACheckKey,
  PublishDecision,
  PublishDecisionStatus,
  QA_THRESHOLD_PASS,
  QA_THRESHOLD_WARN,
  BLOCKING_VIOLATION_TYPES,
} from "@/domain/cognitio/qa.types";
import { validateM7Input } from "@/domain/cognitio/qa.validators";
import type { AnalyzedConcept } from "@/domain/cognitio/contracts";
import type { ContentBlock } from "@/domain/cognitio/generation.types";
import type { StoryScene } from "@/domain/cognitio/story.types";

// ---------- Edge Function ----------

export async function runTransformationQA(input: M7_Input): Promise<M7_Output> {
  try {
    const { data, error } = await supabase.functions.invoke("cognitio-qa-v2", {
      body: input,
    });
    if (error) throw error;
    return data as M7_Output;
  } catch {
    return runLocalTransformationQA(input);
  }
}

// ---------- Local QA ----------

export function runLocalTransformationQA(input: M7_Input): M7_Output {
  const validation = validateM7Input(input);
  if (!validation.valid) {
    throw new Error(`Invalid M7 input: ${validation.errors.map(e => e.message).join(", ")}`);
  }

  const checklist: QACheckResult[] = [];
  const violations: QAViolation[] = [];

  const concepts = input.m2_output.key_concepts;
  const criticalConcepts = concepts.filter(c => c.criticality === 1);
  const uncertainConcepts = concepts.filter(c => c.uncertain);

  if (input.format === "fiche_dynamique" && input.m5_output) {
    runFicheDynamiqueChecks(input, checklist, violations, criticalConcepts, uncertainConcepts);
  } else if (input.format === "histoire_animee" && input.m5b_output) {
    runHistoireAnimeeChecks(input, checklist, violations, criticalConcepts, uncertainConcepts);
  }

  // Common checks
  runCommonChecks(input, checklist, violations, criticalConcepts, uncertainConcepts);

  // Compute score
  const totalWeight = checklist.reduce((s, c) => s + c.weight, 0);
  const passedWeight = checklist.filter(c => c.status === "pass").reduce((s, c) => s + c.weight, 0);
  const warnWeight = checklist.filter(c => c.status === "warn").reduce((s, c) => s + c.weight * 0.5, 0);
  const qaScore = totalWeight > 0 ? Math.round(((passedWeight + warnWeight) / totalWeight) * 100) : 0;

  // Determine status
  const hasBlockingViolation = violations.some(v => v.severity === "blocking");
  const qaStatus: QAStatus = hasBlockingViolation || qaScore < 65
    ? "block"
    : qaScore < 80
      ? "warn"
      : "pass";

  const publishBlocked = qaStatus === "block";

  const recommendations = buildQARecommendations(checklist, violations);

  const qaReport: QAReport = {
    id: crypto.randomUUID(),
    transformation_id: input.transformation_id,
    qa_score: qaScore,
    qa_status: qaStatus,
    checklist_results: checklist,
    violations,
    recommendations,
    publish_blocked: publishBlocked,
    created_at: new Date().toISOString(),
  };

  const decisionStatus: PublishDecisionStatus = publishBlocked
    ? "blocked"
    : qaStatus === "warn"
      ? "review_needed"
      : "draft";

  const publishDecision: PublishDecision = {
    id: crypto.randomUUID(),
    transformation_id: input.transformation_id,
    qa_report_id: qaReport.id,
    decision_status: decisionStatus,
    reason: publishBlocked
      ? `QA bloquée (score: ${qaScore}, violations: ${violations.filter(v => v.severity === "blocking").length})`
      : qaStatus === "warn"
        ? `Revue requise (score: ${qaScore})`
        : `QA passée (score: ${qaScore})`,
    created_at: new Date().toISOString(),
  };

  return { qa_report: qaReport, publish_decision: publishDecision };
}

// ---------- Fiche Dynamique Checks ----------

function runFicheDynamiqueChecks(
  input: M7_Input,
  checklist: QACheckResult[],
  violations: QAViolation[],
  critical: AnalyzedConcept[],
  uncertain: AnalyzedConcept[],
) {
  const output = input.m5_output!;
  const blocks = output.content_blocks;
  const blockTypes = new Set(blocks.map(b => b.type));

  // STRUCTURE_REQUIRED_PRESENT
  const requiredTypes = ["contract", "hook", "pedagogical", "consolidation", "final_test"];
  const missingTypes = requiredTypes.filter(t => !blockTypes.has(t));
  checklist.push({
    key: "STRUCTURE_REQUIRED_PRESENT",
    label: "Structure obligatoire présente",
    status: missingTypes.length === 0 ? "pass" : "fail",
    weight: 15,
    details: missingTypes.length === 0 ? "Tous les blocs obligatoires présents" : `Manquant : ${missingTypes.join(", ")}`,
  });
  if (missingTypes.length > 0) {
    violations.push({ type: "structure_incomplete", severity: "blocking", message: `Blocs manquants : ${missingTypes.join(", ")}` });
  }

  // INLINE_RECALL_PRESENT
  const recallBlocks = blocks.filter(b => b.recall_event !== null);
  checklist.push({
    key: "INLINE_RECALL_PRESENT",
    label: "Rappel actif présent",
    status: recallBlocks.length > 0 ? "pass" : "fail",
    weight: 15,
    details: `${recallBlocks.length} rappel(s) actif(s)`,
  });
  if (recallBlocks.length === 0) {
    violations.push({ type: "missing_inline_recall", severity: "blocking", message: "Aucun rappel actif dans la fiche" });
  }

  // FINAL_TEST_PRESENT
  const hasFinalTest = output.final_test.length >= 3;
  checklist.push({
    key: "FINAL_TEST_PRESENT",
    label: "Test final présent (3+ questions)",
    status: hasFinalTest ? "pass" : "fail",
    weight: 15,
    details: `${output.final_test.length} question(s)`,
  });
  if (!hasFinalTest) {
    violations.push({ type: "missing_final_test", severity: "blocking", message: `Test final insuffisant (${output.final_test.length} questions)` });
  }

  // BLOOM_DISTRIBUTION_VALID
  const bloomLevels = new Set(output.final_test.map(q => q.bloom_level));
  checklist.push({
    key: "BLOOM_DISTRIBUTION_VALID",
    label: "Distribution Bloom valide (3+ niveaux)",
    status: bloomLevels.size >= 3 ? "pass" : bloomLevels.size >= 2 ? "warn" : "fail",
    weight: 10,
    details: `${bloomLevels.size} niveau(x) Bloom`,
  });
  if (bloomLevels.size < 2) {
    violations.push({ type: "bloom_insufficient", severity: "warning", message: `Seulement ${bloomLevels.size} niveau(x) Bloom` });
  }

  // CLARITY_PEAK_PRESENT
  checklist.push({
    key: "CLARITY_PEAK_PRESENT",
    label: "Pic de clarté présent",
    status: blockTypes.has("clarity_peak") ? "pass" : "warn",
    weight: 5,
    details: blockTypes.has("clarity_peak") ? "Présent" : "Absent",
  });

  // CONSOLIDATION_PRESENT
  checklist.push({
    key: "CONSOLIDATION_PRESENT",
    label: "Consolidation présente",
    status: blockTypes.has("consolidation") ? "pass" : "fail",
    weight: 10,
    details: blockTypes.has("consolidation") ? "Présent" : "Absent",
  });

  // CRITICAL_CONCEPTS_COVERED
  const coveredKeys = new Set(blocks.flatMap(b => b.concepts_covered));
  const missingCritical = critical.filter(c => !coveredKeys.has(c.stable_key));
  checklist.push({
    key: "CRITICAL_CONCEPTS_COVERED",
    label: "Concepts critiques couverts",
    status: missingCritical.length === 0 ? "pass" : "fail",
    weight: 15,
    details: missingCritical.length === 0 ? "100% couverts" : `${missingCritical.length} manquant(s)`,
  });
  if (missingCritical.length > 0) {
    for (const c of missingCritical) {
      violations.push({ type: "missing_critical_concept", severity: "blocking", message: `Concept critique manquant : ${c.label}`, concept_key: c.stable_key });
    }
  }

  // NO_CRITICAL_HALLUCINATION
  const allConceptKeys = new Set(input.m2_output.key_concepts.map(c => c.stable_key));
  const blockConceptKeys = new Set(blocks.flatMap(b => b.concepts_covered));
  const hallucinated = [...blockConceptKeys].filter(k => !allConceptKeys.has(k) && k !== "");
  checklist.push({
    key: "NO_CRITICAL_HALLUCINATION",
    label: "Pas d'hallucination conceptuelle",
    status: hallucinated.length === 0 ? "pass" : "fail",
    weight: 20,
    details: hallucinated.length === 0 ? "Aucune" : `${hallucinated.length} concept(s) inventé(s)`,
  });
  if (hallucinated.length > 0) {
    violations.push({ type: "hallucination_critical", severity: "blocking", message: `Concepts hallucines : ${hallucinated.join(", ")}` });
  }
}

// ---------- Histoire Animée Checks ----------

function runHistoireAnimeeChecks(
  input: M7_Input,
  checklist: QACheckResult[],
  violations: QAViolation[],
  critical: AnalyzedConcept[],
  uncertain: AnalyzedConcept[],
) {
  const output = input.m5b_output!;
  const scenes = output.scenes;
  const sceneTypes = new Set(scenes.map(s => s.type));

  // STRUCTURE_REQUIRED_PRESENT
  const requiredTypes = ["contract_hook", "anchoring", "narrative_core", "active_pause", "clarity_peak", "consolidation"];
  const missingTypes = requiredTypes.filter(t => !sceneTypes.has(t));
  checklist.push({
    key: "STRUCTURE_REQUIRED_PRESENT",
    label: "Structure de scènes obligatoire",
    status: missingTypes.length === 0 ? "pass" : "fail",
    weight: 15,
    details: missingTypes.length === 0 ? "Toutes les scènes obligatoires" : `Manquant : ${missingTypes.join(", ")}`,
  });
  if (missingTypes.length > 0) {
    violations.push({ type: "structure_incomplete", severity: "blocking", message: `Scènes manquantes : ${missingTypes.join(", ")}` });
  }

  // INLINE_RECALL_PRESENT (active pauses with choices)
  const activePauses = scenes.filter(s => s.type === "active_pause" && s.choice_widget);
  checklist.push({
    key: "INLINE_RECALL_PRESENT",
    label: "Pauses actives avec choix",
    status: activePauses.length > 0 ? "pass" : "fail",
    weight: 15,
    details: `${activePauses.length} pause(s) interactive(s)`,
  });
  if (activePauses.length === 0) {
    violations.push({ type: "missing_inline_recall", severity: "blocking", message: "Aucune pause active dans l'histoire" });
  }

  // FINAL_TEST_PRESENT — for stories, we check that recall tests were generated
  const hasRecallTests = input.recall_tests && input.recall_tests.some(t => t.test_type === "final");
  checklist.push({
    key: "FINAL_TEST_PRESENT",
    label: "Test final généré",
    status: hasRecallTests ? "pass" : "warn",
    weight: 15,
    details: hasRecallTests ? "Test final présent" : "Test final non encore généré",
  });

  // BLOOM_DISTRIBUTION_VALID — check via recall tests
  if (input.recall_tests) {
    const finalTest = input.recall_tests.find(t => t.test_type === "final");
    if (finalTest) {
      const bloomLevels = new Set(finalTest.items.map(i => i.bloom_level));
      checklist.push({
        key: "BLOOM_DISTRIBUTION_VALID",
        label: "Distribution Bloom valide",
        status: bloomLevels.size >= 3 ? "pass" : "warn",
        weight: 10,
        details: `${bloomLevels.size} niveau(x)`,
      });
    }
  }

  // CLARITY_PEAK_PRESENT
  checklist.push({
    key: "CLARITY_PEAK_PRESENT",
    label: "Pic de clarté présent",
    status: sceneTypes.has("clarity_peak") ? "pass" : "warn",
    weight: 5,
    details: sceneTypes.has("clarity_peak") ? "Présent" : "Absent",
  });

  // CONSOLIDATION_PRESENT
  checklist.push({
    key: "CONSOLIDATION_PRESENT",
    label: "Consolidation présente",
    status: sceneTypes.has("consolidation") ? "pass" : "fail",
    weight: 10,
    details: sceneTypes.has("consolidation") ? "Présent" : "Absent",
  });

  // CRITICAL_CONCEPTS_COVERED
  const coveredKeys = new Set(scenes.flatMap(s => s.concepts_covered));
  const missingCritical = critical.filter(c => !coveredKeys.has(c.stable_key));
  checklist.push({
    key: "CRITICAL_CONCEPTS_COVERED",
    label: "Concepts critiques couverts",
    status: missingCritical.length === 0 ? "pass" : "fail",
    weight: 15,
    details: missingCritical.length === 0 ? "100% couverts" : `${missingCritical.length} manquant(s)`,
  });
  if (missingCritical.length > 0) {
    for (const c of missingCritical) {
      violations.push({ type: "missing_critical_concept", severity: "blocking", message: `Concept critique manquant : ${c.label}`, concept_key: c.stable_key });
    }
  }

  // NO_CRITICAL_HALLUCINATION
  const allConceptKeys = new Set(input.m2_output.key_concepts.map(c => c.stable_key));
  const sceneConceptKeys = new Set(scenes.flatMap(s => s.concepts_covered));
  const hallucinated = [...sceneConceptKeys].filter(k => !allConceptKeys.has(k) && k !== "");
  checklist.push({
    key: "NO_CRITICAL_HALLUCINATION",
    label: "Pas d'hallucination conceptuelle",
    status: hallucinated.length === 0 ? "pass" : "fail",
    weight: 20,
    details: hallucinated.length === 0 ? "Aucune" : `${hallucinated.length} concept(s) inventé(s)`,
  });
  if (hallucinated.length > 0) {
    violations.push({ type: "hallucination_critical", severity: "blocking", message: `Concepts hallucines : ${hallucinated.join(", ")}` });
  }
}

// ---------- Common Checks ----------

function runCommonChecks(
  input: M7_Input,
  checklist: QACheckResult[],
  violations: QAViolation[],
  critical: AnalyzedConcept[],
  uncertain: AnalyzedConcept[],
) {
  // DISCLAIMER_PRESENT_IF_UNCERTAIN
  if (uncertain.length > 0 || input.source_confidence < 0.5) {
    const hasDisclaimer = input.format === "fiche_dynamique"
      ? input.m5_output!.content_blocks.some(b => b.type === "disclaimer")
      : input.m5b_output!.scenes.some(s => s.type === "disclaimer");
    checklist.push({
      key: "DISCLAIMER_PRESENT_IF_UNCERTAIN",
      label: "Disclaimer présent si incertitude",
      status: hasDisclaimer ? "pass" : "fail",
      weight: 10,
      details: hasDisclaimer ? "Disclaimer présent" : "Disclaimer manquant",
    });
    if (!hasDisclaimer) {
      violations.push({ type: "missing_disclaimer", severity: "blocking", message: "Concepts incertains sans disclaimer" });
    }
  }

  // DENSITY_ACCEPTABLE
  const wordCount = input.word_count;
  const conceptCount = input.m2_output.key_concepts.length;
  const density = conceptCount / Math.max(1, wordCount / 100);
  const densityOk = density < 5; // Max ~5 concepts per 100 words
  checklist.push({
    key: "DENSITY_ACCEPTABLE",
    label: "Densité conceptuelle acceptable",
    status: densityOk ? "pass" : "warn",
    weight: 5,
    details: `${density.toFixed(1)} concepts/100 mots`,
  });
  if (!densityOk) {
    violations.push({ type: "density_excessive", severity: "warning", message: `Densité élevée : ${density.toFixed(1)} concepts/100 mots` });
  }

  // FORMAT_CONSISTENT_WITH_M4
  const m4Format = input.m4_output.chosen_format;
  const actualFormat = input.format;
  const formatMatch = m4Format === actualFormat;
  checklist.push({
    key: "FORMAT_CONSISTENT_WITH_M4",
    label: "Format cohérent avec M4",
    status: formatMatch ? "pass" : "fail",
    weight: 10,
    details: formatMatch ? `Format: ${actualFormat}` : `M4: ${m4Format}, Réel: ${actualFormat}`,
  });
  if (!formatMatch) {
    violations.push({ type: "format_inconsistent", severity: "blocking", message: `Format incohérent : M4 a choisi ${m4Format}, généré ${actualFormat}` });
  }
}

// ---------- Recommendations ----------

function buildQARecommendations(
  checklist: QACheckResult[],
  violations: QAViolation[],
): string[] {
  const recs: string[] = [];

  const failed = checklist.filter(c => c.status === "fail");
  const warned = checklist.filter(c => c.status === "warn");

  if (failed.length > 0) {
    recs.push(`${failed.length} vérification(s) échouée(s) : ${failed.map(c => c.label).join(", ")}`);
  }
  if (warned.length > 0) {
    recs.push(`${warned.length} avertissement(s) : ${warned.map(c => c.label).join(", ")}`);
  }

  const blockingViolations = violations.filter(v => v.severity === "blocking");
  if (blockingViolations.length > 0) {
    recs.push(`${blockingViolations.length} violation(s) bloquante(s) à corriger avant publication.`);
  }

  if (violations.some(v => v.type === "hallucination_critical")) {
    recs.push("CRITIQUE : des concepts non présents dans la source ont été générés. Vérifiez la fidélité au document source.");
  }

  if (violations.some(v => v.type === "missing_inline_recall")) {
    recs.push("Ajoutez des rappels actifs distribués dans le contenu.");
  }

  return recs;
}

// ---------- Persistence ----------

export async function persistQAReport(
  output: M7_Output,
  userId: string,
): Promise<void> {
  const { qa_report, publish_decision } = output;

  const { error: qaErr } = await supabase
    .from("qa_reports")
    .insert({
      id: qa_report.id,
      user_id: userId,
      transformation_id: qa_report.transformation_id,
      qa_score: qa_report.qa_score,
      qa_status: qa_report.qa_status,
      checklist_results_json: qa_report.checklist_results,
      violations_json: qa_report.violations,
      recommendations_json: qa_report.recommendations,
      publish_blocked: qa_report.publish_blocked,
    });

  if (qaErr) throw new Error(`QA report save failed: ${qaErr.message}`);

  const { error: pdErr } = await supabase
    .from("publish_decisions")
    .insert({
      id: publish_decision.id,
      transformation_id: publish_decision.transformation_id,
      qa_report_id: publish_decision.qa_report_id,
      decision_status: publish_decision.decision_status,
      reason: publish_decision.reason,
    });

  if (pdErr) throw new Error(`Publish decision save failed: ${pdErr.message}`);

  // Update transformation qa_status
  const { error: tErr } = await supabase
    .from("transformations")
    .update({
      qa_status: qa_report.qa_status === "pass" ? "passed" : qa_report.qa_status === "block" ? "failed" : "pending",
      published_status: publish_decision.decision_status === "blocked" ? "draft" : undefined,
    })
    .eq("id", qa_report.transformation_id);

  if (tErr) throw new Error(`Transformation update failed: ${tErr.message}`);
}
