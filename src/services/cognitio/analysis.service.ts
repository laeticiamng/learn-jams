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
import {
  cleanSourceNoise,
  normalizeConceptLabel,
  rejectConceptArtifact,
  compressDefinition,
  mergeDuplicateOrNoisyConcepts,
  extractCleanMainTopic,
  cleanMainTopic,
  reconstructChapterHierarchy,
} from "@/lib/cognitio-semantic-cleaning";

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

  // Apply semantic cleaning before extraction
  const cleanedText = cleanSourceNoise(clean_text);

  // P0 debug counters
  let _dbg_sentences_extracted = 0;

  // === Level 1: Extract clean main topic ===
  const mainTopic = extractCleanMainTopic(segments);

  // === Level 2: Reconstruct chapter hierarchy ===
  const chapters = reconstructChapterHierarchy(segments);

  // === Level 3: Extract concepts per chapter ===
  const rawConcepts: AnalyzedConcept[] = [];
  let globalIdx = 0;

  for (let chapterIdx = 0; chapterIdx < chapters.length; chapterIdx++) {
    const chapter = chapters[chapterIdx];
    const chapterContent = cleanSourceNoise(chapter.content);
    const sentences = chapterContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    _dbg_sentences_extracted += sentences.length;
    const chapterType = chapter.title;

    // Extract concepts from this chapter's content
    const maxPerChapter = Math.max(3, Math.ceil(25 / Math.max(chapters.length, 1)));
    const chapterSentences = sentences.slice(0, maxPerChapter);

    for (let si = 0; si < chapterSentences.length; si++) {
      const sentence = chapterSentences[si].trim();
      const words = sentence.split(/\s+/);
      const excerpt = sentence.slice(0, 120);

      // Build a meaningful label from the sentence
      const rawLabel = buildConceptLabel(sentence, chapter.title);
      const label = normalizeConceptLabel(rawLabel) || rawLabel;
      const definition = compressDefinition(sentence, 250);

      // Criticality: first concepts in early chapters are more critical
      const positionScore = (chapterIdx * maxPerChapter + si) / Math.max(1, chapters.length * maxPerChapter);
      const criticality = (positionScore < 0.15 ? 1 : positionScore < 0.4 ? 2 : positionScore < 0.7 ? 3 : 4) as 1 | 2 | 3 | 4;

      const key = words.slice(0, 3).join("_").toLowerCase().replace(/[^a-z0-9_]/g, "");

      rawConcepts.push({
        stable_key: `concept_${key}_${globalIdx}`,
        label,
        definition,
        type: chapterType,
        criticality,
        criticality_score: criticality === 1 ? 1 : criticality === 2 ? 0.7 : criticality === 3 ? 0.4 : 0.2,
        bloom_target: determineBlooms(sentence),
        relations: [],
        prerequisites: [],
        source_confidence: 0.65,
        source_trace: [{ segment_index: Math.min(chapterIdx, (segments.length || 1) - 1), excerpt }],
        uncertain: false,
      });

      globalIdx++;
    }

    // Also generate a concept for each sub-section title (if meaningful)
    for (const subTitle of chapter.subSections) {
      if (subTitle.length < 5) continue;
      const normalizedSub = normalizeConceptLabel(subTitle);
      if (!normalizedSub) continue;

      rawConcepts.push({
        stable_key: `concept_sub_${subTitle.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, "_")}_${globalIdx}`,
        label: normalizedSub,
        definition: `Sous-partie du chapitre "${chapter.title}" : ${subTitle}`,
        type: chapterType,
        criticality: 3 as 1 | 2 | 3 | 4,
        criticality_score: 0.4,
        bloom_target: "remember",
        relations: [],
        prerequisites: [],
        source_confidence: 0.5,
        source_trace: [{ segment_index: Math.min(chapterIdx, (segments.length || 1) - 1), excerpt: subTitle }],
        uncertain: false,
      });
      globalIdx++;
    }
  }

  // If no chapters detected, fall back to sentence-based extraction
  if (rawConcepts.length === 0) {
    const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 20);
    _dbg_sentences_extracted += sentences.length;
    for (let i = 0; i < Math.min(20, sentences.length); i++) {
      const sentence = sentences[i].trim();
      const words = sentence.split(/\s+/);
      const rawLabel = words.slice(0, 5).join(" ");
      const label = normalizeConceptLabel(rawLabel) || rawLabel;

      rawConcepts.push({
        stable_key: `concept_${words.slice(0, 3).join("_").toLowerCase().replace(/[^a-z0-9_]/g, "")}_${i}`,
        label,
        definition: compressDefinition(sentence),
        type: "general",
        criticality: (i < 3 ? 1 : i < 7 ? 2 : i < 12 ? 3 : 4) as 1 | 2 | 3 | 4,
        criticality_score: i < 3 ? 1 : i < 7 ? 0.7 : 0.4,
        bloom_target: (i < 5 ? "understand" : "remember") as "understand" | "remember",
        relations: [],
        prerequisites: [],
        source_confidence: 0.5,
        source_trace: [{ segment_index: Math.min(i, (segments.length || 1) - 1), excerpt: sentence.slice(0, 120) }],
        uncertain: false,
      });
    }
  }

  // Filter out artifact concepts and deduplicate
  const rejectReasons: Record<string, number> = {};
  const filteredConcepts = rawConcepts.filter(c => {
    const { rejected, reason } = rejectConceptArtifact(c);
    if (rejected && reason) {
      rejectReasons[reason] = (rejectReasons[reason] || 0) + 1;
    }
    return !rejected;
  });
  let concepts = mergeDuplicateOrNoisyConcepts(filteredConcepts);

  // P0 FIX: If all concepts were rejected but we have non-empty text,
  // force-extract minimal concepts so downstream never sees 0 without cause.
  if (concepts.length === 0 && cleanedText.length > 50) {
    console.warn(
      `[COGNITIO][P0] All ${rawConcepts.length} raw concepts rejected! ` +
      `Reasons: ${JSON.stringify(rejectReasons)}. ` +
      `Applying emergency fallback extraction.`
    );

    // Emergency: take first N sentences as concepts, skip rejection filters
    const emergencySentences = cleanedText
      .split(/[.!?\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 30 && /[a-zA-ZÀ-ÿ]/.test(s));

    for (let i = 0; i < Math.min(5, emergencySentences.length); i++) {
      const sentence = emergencySentences[i];
      const words = sentence.split(/\s+/);
      const label = words.slice(0, 6).join(" ");
      concepts.push({
        stable_key: `concept_emergency_${i}`,
        label,
        definition: compressDefinition(sentence, 200),
        type: "general",
        criticality: (i === 0 ? 1 : i < 3 ? 2 : 3) as 1 | 2 | 3 | 4,
        criticality_score: i === 0 ? 1 : i < 3 ? 0.7 : 0.4,
        bloom_target: "remember",
        relations: [],
        prerequisites: [],
        source_confidence: 0.35,
        source_trace: [{ segment_index: 0, excerpt: sentence.slice(0, 120) }],
        uncertain: true,
      });
    }

    console.info(`[COGNITIO][P0] Emergency fallback produced ${concepts.length} concepts.`);
  }

  // P0 debug logging
  console.info(
    `[COGNITIO][DEBUG] M2 extraction: ` +
    `chapters=${chapters.length}, sentences=${_dbg_sentences_extracted}, ` +
    `raw_concepts=${rawConcepts.length}, after_filter=${filteredConcepts.length}, ` +
    `after_dedup=${concepts.length}, rejected=${rawConcepts.length - filteredConcepts.length}, ` +
    `reject_reasons=${JSON.stringify(rejectReasons)}`
  );

  // Detect reasoning type
  const hasSteps = /étape|step|\d+\.\s/i.test(clean_text);
  const hasConditions = /si\s|if\s|lorsque|when|en cas de/i.test(clean_text);
  const hasCausal = /parce que|car|because|donc|therefore|entraîne/i.test(clean_text);

  let reasoningType: M2_Output["reasoning_type"] = "declaratif";
  if (hasSteps) reasoningType = "procedural";
  else if (hasConditions) reasoningType = "conditionnel";
  else if (hasCausal) reasoningType = "causal";

  const density = concepts.length >= 12 ? "high" as const : concepts.length >= 5 ? "medium" as const : "low" as const;

  // Determine structure type from segments
  const hasTableSegments = segments.some(s => s.title === "Tableau" || s.content.includes("Tableau comparatif"));
  const hasHeadingSegments = segments.filter(s => s.hierarchy_level >= 1).length >= 2;
  const structureType = hasTableSegments && hasHeadingSegments ? "table"
    : hasHeadingSegments ? "mixed"
    : input.source_type === "slides" ? "bullets"
    : "prose";

  const confidence: AnalysisConfidence = {
    concepts: Math.min(0.6, confidence_level),
    logic: hasCausal || hasConditions ? 0.5 : 0.3,
    traps: 0.2,
    structure: chapters.length >= 3 ? 0.6 : segments.length >= 3 ? 0.5 : 0.3,
    ambiguous_zones: confidence_level < 0.5
      ? [{ zone_label: "Document entier", reason: "Confiance source faible — analyse heuristique uniquement", segment_refs: [0], severity: "medium" as const }]
      : [],
  };

  const estimatedComplexity = Math.min(10, Math.max(1, Math.ceil(concepts.length / 2)));

  // Build learning objectives from chapters
  const learningObjectives = chapters.length > 0
    ? chapters.slice(0, 5).map(ch => `Comprendre : ${ch.title}`)
    : [`Comprendre les notions clés de : ${mainTopic}`];

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
    learning_objectives: learningObjectives,
    key_concepts: concepts,
    traps: [],
    confusion_pairs: [],
    reasoning_type: reasoningType,
    density,
    recommended_template: density === "high" ? "histoire_animee" : "fiche_dynamique",
    confidence,
    prerequis: [],
    structure_type: structureType as any,
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

// ---------- Concept Label Builder ----------

/**
 * Build a meaningful concept label from a sentence, using the chapter context.
 * Tries to extract a noun phrase or key term instead of raw first-N-words.
 */
function buildConceptLabel(sentence: string, chapterTitle: string): string {
  const trimmed = sentence.trim();

  // If the sentence defines something ("X est/sont..."), extract X
  const defMatch = trimmed.match(/^(.{5,60}?)\s+(?:est|sont|désigne|signifie|correspond|représente|se définit)/i);
  if (defMatch) {
    return defMatch[1].trim();
  }

  // If the sentence lists something ("Les X incluent/comprennent..."), extract X
  const listMatch = trimmed.match(/^(?:Les?\s+|L['']|Un[e]?\s+)(.{3,50}?)\s+(?:incluen|compren|regroup|concern|désign)/i);
  if (listMatch) {
    return listMatch[1].trim();
  }

  // If the sentence uses "on parle de X", "on appelle X"
  const parlMatch = trimmed.match(/(?:on parle de|on appelle|on désigne par)\s+(.{3,60}?)(?:\s+(?:quand|lorsque|pour|en cas)|[.,;])/i);
  if (parlMatch) {
    return parlMatch[1].trim();
  }

  // Default: first 5-7 meaningful words, skipping common articles
  const words = trimmed.split(/\s+/);
  const meaningful = words.filter(w => w.length > 2 || /^[A-ZÀ-Ÿ]/.test(w));
  return meaningful.slice(0, 6).join(" ");
}

/**
 * Determine Bloom's taxonomy level from sentence content.
 */
function determineBlooms(sentence: string): "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create" {
  const s = sentence.toLowerCase();
  if (/(?:évalue|compare|critique|juge|argumente)/.test(s)) return "evaluate";
  if (/(?:analyse|distingue|différencie|classifie|identifie.*cause)/.test(s)) return "analyze";
  if (/(?:applique|utilise|met en œuvre|calcule|réalise|prescri)/.test(s)) return "apply";
  if (/(?:explique|décri[st]|résume|reformule|interprète)/.test(s)) return "understand";
  return "remember";
}

// ---------- Persist M2 Output ----------

export async function persistAnalysis(
  documentId: string,
  output: M2_Output
): Promise<{ courseProfileId: string; conceptIds: Record<string, string> }> {
  const profileRow = m2OutputToCourseProfileRow(documentId, output);

  const { data: profile, error: profileError } = await supabase
    .from("course_profiles")
    .insert([profileRow])
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
