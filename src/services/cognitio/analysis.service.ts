// ============================================================
// COGNITIO Analysis Service (M2)
// Concept extraction, course profiling, confusion detection
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type {
  M2_Input,
  M2_Output,
  AnalyzedConcept,
  AnalyzedConfusionPair,
  AnalyzedTrap,
  AnalysisConfidence,
  SegmentOutput,
  SourceIssue,
} from "@/domain/cognitio/contracts";
import type { CourseProfile, Concept, ConfusionPair, SourceTrace } from "@/domain/cognitio/types";
import { createCognitioError } from "@/lib/cognitio-errors";
import { toCourseProfile, toConcept, toConfusionPair, conceptToAnalyzed, m2OutputToCourseProfileRow, analyzedConceptToRow, analyzedConfusionPairToRow } from "@/domain/cognitio/mappers";
import { detectAudienceMismatch } from "@/domain/cognitio/learner-profile.types";
import type { LearnerAudienceProfile } from "@/domain/cognitio/learner-profile.types";

// ---------- Run Analysis (Edge Function) ----------

export async function runAnalysis(input: M2_Input): Promise<M2_Output> {
  try {
    const { data, error } = await supabase.functions.invoke("cognitio-analyze", {
      body: input,
    });

    if (error) throw error;
    return data as M2_Output;
  } catch (err) {
    console.warn("Edge function failed, falling back to local analysis:", err);
    return runLocalAnalysis(input);
  }
}

// ---------- Local Analysis Fallback ----------

export function runLocalAnalysis(input: M2_Input): M2_Output {
  const { document_id, clean_text, segments, confidence_level, user_objective } = input;

  const sentences = clean_text.split(/[.!?]+/).filter((s) => s.trim().length > 20);

  // Extract concepts from sentences
  const concepts: AnalyzedConcept[] = sentences.slice(0, 20).map((sentence, i) => {
    const words = sentence.trim().split(/\s+/);
    const key = words.slice(0, 3).join("_").toLowerCase().replace(/[^a-z0-9_]/g, "");
    const excerpt = sentence.trim().slice(0, 120);

    const criticality = (i < 3 ? 1 : i < 7 ? 2 : i < 12 ? 3 : 4) as 1 | 2 | 3 | 4;

    return {
      stable_key: `concept_${key}_${i}`,
      label: words.slice(0, 5).join(" ").trim(),
      definition: sentence.trim(),
      type: "general",
      criticality,
      criticality_score: criticality === 1 ? 1 : criticality === 2 ? 0.7 : criticality === 3 ? 0.4 : 0.2,
      bloom_target: (i < 5 ? "understand" : "remember") as "understand" | "remember",
      relations: [],
      prerequisites: [],
      source_confidence: 0.6,
      source_trace: [{ segment_index: Math.min(i, (segments.length || 1) - 1), excerpt }],
      uncertain: false,
    };
  });

  // Detect reasoning type
  const hasSteps = /étape|step|\d+\.\s/i.test(clean_text);
  const hasConditions = /si\s|if\s|lorsque|when|en cas de/i.test(clean_text);
  const hasCausal = /parce que|car|because|donc|therefore|entraîne/i.test(clean_text);

  let reasoningType: M2_Output["reasoning_type"] = "declaratif";
  if (hasSteps) reasoningType = "procedural";
  else if (hasConditions) reasoningType = "conditionnel";
  else if (hasCausal) reasoningType = "causal";

  const mainTopic = segments.find((s) => s.title)?.title || sentences[0]?.trim().split(/\s+/).slice(0, 8).join(" ") || "Sujet non identifié";
  const density = concepts.length >= 12 ? "high" as const : concepts.length >= 5 ? "medium" as const : "low" as const;

  const confidence: AnalysisConfidence = {
    concepts: Math.min(0.5, confidence_level),
    logic: 0.3,
    traps: 0.2,
    structure: segments.length >= 3 ? 0.5 : 0.3,
    ambiguous_zones: confidence_level < 0.5
      ? [{ zone_label: "Document entier", reason: "Confiance source faible — analyse heuristique uniquement", segment_refs: [0], severity: "medium" as const }]
      : [],
  };

  const estimatedComplexity = Math.min(10, Math.max(1, Math.ceil(concepts.length / 2)));

  // Audience mismatch detection
  const mismatch = input.learner_profile
    ? detectAudienceMismatch(estimatedComplexity, density, input.learner_profile)
    : undefined;

  const docDifficulty = estimatedComplexity <= 3 ? "easy"
    : estimatedComplexity <= 5 ? "intermediate"
    : estimatedComplexity <= 7 ? "advanced"
    : "expert";

  return {
    course_profile_id: "",
    main_topic: mainTopic,
    learning_objectives: [`Comprendre les notions clés de : ${mainTopic}`],
    key_concepts: concepts,
    traps: [],
    confusion_pairs: [],
    reasoning_type: reasoningType,
    density,
    recommended_template: density === "high" ? "histoire_animee" : "fiche_dynamique",
    confidence,
    prerequis: [],
    structure_type: input.source_type === "slides" ? "bullets" : "minimal",
    source_issues: [{ code: "FALLBACK_ANALYSIS", message: "Analyse locale heuristique (LLM non disponible)", severity: "warning" }],
    total_concepts: concepts.length,
    critical_count: concepts.filter((c) => c.criticality === 1).length,
    estimated_complexity: estimatedComplexity,
    document_difficulty_level: docDifficulty as "easy" | "intermediate" | "advanced" | "expert",
    estimated_audience_level: mismatch?.profile_level,
    audience_mismatch_risk: mismatch?.risk_level ?? 0,
    audience_mismatch_message: mismatch?.message,
  };
}

// ---------- Persist M2 Output ----------

export async function persistAnalysis(
  documentId: string,
  output: M2_Output
): Promise<{ courseProfileId: string; conceptIds: Record<string, string> }> {
  const profileRow = m2OutputToCourseProfileRow(documentId, output);

  const { data: profile, error: profileError } = await (supabase as any)
    .from("course_profiles")
    .insert(profileRow)
    .select("id")
    .single();

  if (profileError) throw createCognitioError("DB_WRITE_FAILED", profileError.message);

  const courseProfileId = profile.id;
  const conceptIds: Record<string, string> = {};

  // Insert concepts
  for (const concept of output.key_concepts) {
    const row = analyzedConceptToRow(courseProfileId, concept);
    const { data: conceptRow, error: conceptError } = await supabase
      .from("concepts")
      .insert(row)
      .select("id")
      .single();

    if (!conceptError && conceptRow) {
      conceptIds[concept.stable_key] = conceptRow.id;
    }
  }

  // Insert confusion pairs
  for (const pair of output.confusion_pairs) {
    const row = analyzedConfusionPairToRow(courseProfileId, pair, conceptIds);
    await supabase.from("confusion_pairs").insert(row);
  }

  // Update document status
  await supabase.from("source_documents").update({ ingestion_status: "analyzed" }).eq("id", documentId);

  return { courseProfileId, conceptIds };
}

// ---------- Run Analysis + Persist (combined) ----------

export async function analyzeAndPersist(input: M2_Input): Promise<M2_Output> {
  const output = await runAnalysis(input);

  if (output.course_profile_id === "" || !output.course_profile_id) {
    const { courseProfileId } = await persistAnalysis(input.document_id, output);
    output.course_profile_id = courseProfileId;
  }

  return output;
}

// ---------- Getters ----------

export async function getCourseProfile(documentId: string): Promise<CourseProfile | null> {
  const { data, error } = await supabase
    .from("course_profiles")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return toCourseProfile(data as Record<string, unknown>);
}

export async function getConcepts(courseProfileId: string): Promise<Concept[]> {
  const { data, error } = await supabase
    .from("concepts")
    .select("*")
    .eq("course_profile_id", courseProfileId)
    .order("criticality", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => toConcept(row as Record<string, unknown>));
}

export async function getAnalyzedConcepts(courseProfileId: string): Promise<AnalyzedConcept[]> {
  const concepts = await getConcepts(courseProfileId);
  return concepts.map(conceptToAnalyzed);
}

export async function getConfusionPairs(courseProfileId: string): Promise<ConfusionPair[]> {
  const { data, error } = await supabase
    .from("confusion_pairs")
    .select("*")
    .eq("course_profile_id", courseProfileId);

  if (error || !data) return [];
  return data.map((row) => toConfusionPair(row as Record<string, unknown>));
}
