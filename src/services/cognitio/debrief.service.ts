// ============================================================
// COGNITIO Debrief Service — Generate Actionable Debrief
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { M6_DebriefInput, M6_DebriefOutput } from "@/domain/cognitio/recall.contracts";
import type { DebriefReport, FragilityNode } from "@/domain/cognitio/recall.types";
import { computeFragilityMap, computeConfusionMap } from "./calibration.service";

// ---------- Edge Function ----------

export async function runDebriefGeneration(input: M6_DebriefInput): Promise<M6_DebriefOutput> {
  try {
    const { data, error } = await supabase.functions.invoke("cognitio-generate-debrief", {
      body: input,
    });
    if (error) throw error;
    return data as M6_DebriefOutput;
  } catch {
    return generateDebriefLocally(input);
  }
}

// ---------- Local Debrief Generator ----------

export function generateDebriefLocally(input: M6_DebriefInput): M6_DebriefOutput {
  const {
    recall_attempt_id,
    transformation_id,
    grade_output,
    concepts,
    confusion_pairs,
    traps,
    answers,
  } = input;

  const fragilityMap = grade_output.fragility_map;
  const confusionMap = grade_output.confusion_map;

  // Classify concepts
  const mastered = fragilityMap.filter(n => n.status === "mastered").map(n => n.concept_key);
  const fragile = fragilityMap.filter(n => n.status === "fragile");
  const failed = fragilityMap.filter(n => n.status === "failed").map(n => n.concept_key);
  const overconfident = fragilityMap.filter(n => n.status === "overconfident");
  const underconfident = fragilityMap.filter(n => n.status === "underconfident");

  // Find missed traps (discrimination items answered wrong)
  const trapsMissed = answers
    .filter(a => !a.is_correct)
    .flatMap(a => a.concepts_tested)
    .filter(key => traps.includes(key));

  // Build recommendations
  const recommendations = buildRecommendations(
    grade_output.composite_score.total,
    fragile,
    failed,
    overconfident,
    confusionMap,
    trapsMissed,
  );

  // Determine next action
  const nextAction = determineNextAction(
    grade_output.composite_score.total,
    fragile.length,
    failed.length,
    overconfident.length,
  );

  return {
    id: crypto.randomUUID(),
    transformation_id,
    recall_attempt_id,
    composite_score: grade_output.composite_score,
    mastered_concepts: mastered,
    fragile_concepts: fragile,
    failed_concepts: failed,
    overconfidence_zones: overconfident,
    underconfidence_zones: underconfident,
    traps_missed: [...new Set(trapsMissed)],
    confusion_map: confusionMap,
    recommendations,
    next_action: nextAction,
    created_at: new Date().toISOString(),
  };
}

// ---------- Recommendations ----------

function buildRecommendations(
  compositeScore: number,
  fragile: FragilityNode[],
  failed: string[],
  overconfident: FragilityNode[],
  confusionMap: { concept_a: string; concept_b: string }[],
  trapsMissed: string[],
): string[] {
  const recs: string[] = [];

  if (compositeScore >= 80) {
    recs.push("Excellent travail ! Vous maîtrisez bien le contenu.");
  } else if (compositeScore >= 60) {
    recs.push("Bon travail, mais quelques notions méritent d'être revues.");
  } else {
    recs.push("Plusieurs notions sont encore fragiles. Une relecture est recommandée.");
  }

  if (failed.length > 0) {
    recs.push(`${failed.length} notion(s) non maîtrisée(s) : relisez les blocs correspondants.`);
  }

  if (fragile.length > 0) {
    recs.push(`${fragile.length} notion(s) fragile(s) : ${fragile.map(f => f.label).join(", ")}.`);
  }

  if (overconfident.length > 0) {
    recs.push(`Attention à la surconfiance sur : ${overconfident.map(o => o.label).join(", ")}. Vous pensez maîtriser ces notions, mais les réponses montrent le contraire.`);
  }

  if (confusionMap.length > 0) {
    recs.push(`Confusions détectées : ${confusionMap.map(c => `${c.concept_a} ↔ ${c.concept_b}`).join(", ")}. Relisez les distinctions clés.`);
  }

  if (trapsMissed.length > 0) {
    recs.push(`${trapsMissed.length} piège(s) raté(s). Portez attention aux faux-amis et erreurs fréquentes.`);
  }

  return recs;
}

function determineNextAction(
  compositeScore: number,
  fragileCount: number,
  failedCount: number,
  overconfidentCount: number,
): DebriefReport["next_action"] {
  if (failedCount >= 3 || compositeScore < 40) return "review_sheet";
  if (fragileCount >= 2 || overconfidentCount >= 2) return "review_fragile";
  if (compositeScore < 70) return "retest";
  return "continue";
}

// ---------- Persistence ----------

export async function persistDebrief(
  debrief: DebriefReport,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("debrief_reports")
    .insert([{
      id: debrief.id,
      user_id: userId,
      transformation_id: debrief.transformation_id,
      recall_attempt_id: debrief.recall_attempt_id,
      report_json: debrief as unknown as Json,
    }])
    .select("id")
    .single();

  if (error) throw new Error(`Debrief save failed: ${error.message}`);
  return data.id;
}
