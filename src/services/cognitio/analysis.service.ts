// ============================================================
// COGNITIO Analysis Service — Concept extraction & course profiling
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { AnalyzeInput, AnalyzeOutput } from "@/domain/cognitio/contracts";
import { updateIngestionStatus } from "./ingestion.service";

export async function runAnalysis(input: AnalyzeInput): Promise<AnalyzeOutput> {
  await updateIngestionStatus(input.document_id, "analyzing");

  try {
    const { data, error } = await supabase.functions.invoke("cognitio-analyze", {
      body: input,
    });

    if (error) throw new Error(`Analysis failed: ${error.message}`);

    const result = data as AnalyzeOutput;

    // Save course profile
    const { data: profile, error: profileError } = await supabase
      .from("course_profiles")
      .insert({
        document_id: input.document_id,
        main_topic: result.concepts[0]?.category ?? "Unknown",
        learning_objectives_json: [],
        reasoning_type: result.knowledge_type,
        density: result.estimated_complexity / 10,
        recommended_template: result.total_concepts > 15 ? "histoire_animee" : "fiche_dynamique",
        concepts_confidence: avgConfidence(result.concepts.map(c => c.source_confidence)),
        logic_confidence: 0.7,
        traps_confidence: result.confusion_pairs.length > 0 ? 0.8 : 0.5,
        structure_confidence: 0.75,
        ambiguous_zones_json: result.ambiguous_zones,
      })
      .select("id")
      .single();

    if (profileError) throw new Error(`Profile save failed: ${profileError.message}`);

    result.course_profile_id = profile.id;

    // Save concepts
    if (result.concepts.length > 0) {
      const conceptRows = result.concepts.map((c) => ({
        course_profile_id: profile.id,
        stable_key: c.stable_key,
        label: c.label,
        definition: c.definition,
        criticality: c.criticality,
        bloom_target: c.bloom_target,
        category: c.category,
        prerequisites_json: c.prerequisites,
        source_confidence: c.source_confidence,
        source_trace_json: c.source_trace,
      }));

      const { data: savedConcepts, error: conceptError } = await supabase
        .from("concepts")
        .insert(conceptRows)
        .select("id, stable_key");

      if (conceptError) throw new Error(`Concepts save failed: ${conceptError.message}`);

      // Save confusion pairs
      if (result.confusion_pairs.length > 0 && savedConcepts) {
        const keyToId = new Map(savedConcepts.map((c: { id: string; stable_key: string }) => [c.stable_key, c.id]));
        const pairRows = result.confusion_pairs
          .filter((p) => keyToId.has(p.concept_a_key) && keyToId.has(p.concept_b_key))
          .map((p) => ({
            course_profile_id: profile.id,
            concept_a_id: keyToId.get(p.concept_a_key)!,
            concept_b_id: keyToId.get(p.concept_b_key)!,
            distinction_key: p.distinction_key,
            frequency: p.frequency,
          }));

        if (pairRows.length > 0) {
          const { error: pairError } = await supabase
            .from("confusion_pairs")
            .insert(pairRows);

          if (pairError) console.error("Confusion pairs save failed:", pairError.message);
        }
      }
    }

    await updateIngestionStatus(input.document_id, "analyzed");
    return result;
  } catch (err) {
    await updateIngestionStatus(input.document_id, "error");
    throw err;
  }
}

export async function getCourseProfile(documentId: string) {
  const { data, error } = await supabase
    .from("course_profiles")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) throw new Error(`Profile fetch failed: ${error.message}`);
  return data;
}

export async function getConcepts(courseProfileId: string) {
  const { data, error } = await supabase
    .from("concepts")
    .select("*")
    .eq("course_profile_id", courseProfileId)
    .order("criticality", { ascending: true });

  if (error) throw new Error(`Concepts fetch failed: ${error.message}`);
  return data ?? [];
}

export async function getConfusionPairs(courseProfileId: string) {
  const { data, error } = await supabase
    .from("confusion_pairs")
    .select("*")
    .eq("course_profile_id", courseProfileId);

  if (error) throw new Error(`Confusion pairs fetch failed: ${error.message}`);
  return data ?? [];
}

function avgConfidence(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
