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
import { filterEditorialNoise } from "./editorialNoiseFilter";

// ---------- Run Analysis (Edge Function) ----------

export async function runAnalysis(input: M2_Input): Promise<M2_Output> {
  // P0: Pre-normalize input text for noisy R2C/academic documents
  const preNormalized = preNormalizeForM2(input);

  // P0 AUDIT: Compare before/after pre-normalization
  const prenormDelta = input.clean_text.length - preNormalized.clean_text.length;
  const prenormRatio = preNormalized.clean_text.length / Math.max(1, input.clean_text.length);
  console.info(
    `[COGNITIO][M2] Starting analysis:\n` +
    `  m2_input_length=${input.clean_text.length}\n` +
    `  m2_input_after_prenorm=${preNormalized.clean_text.length}\n` +
    `  m2_prenorm_delta=${prenormDelta} chars removed (${(100 - prenormRatio * 100).toFixed(1)}%)\n` +
    `  m2_segments=${preNormalized.segments.length}\n` +
    `  m2_input_preview_BEFORE="${input.clean_text.slice(0, 200)}…"\n` +
    `  m2_input_preview_AFTER="${preNormalized.clean_text.slice(0, 200)}…"`
  );

  // P0 AUDIT: Warn if pre-normalization removed too much
  if (prenormRatio < 0.3 && input.clean_text.length > 1000) {
    console.warn(
      `[COGNITIO][M2][ANOMALY] Pre-normalization removed ${(100 - prenormRatio * 100).toFixed(1)}% of text! ` +
      `Original=${input.clean_text.length}, After=${preNormalized.clean_text.length}. ` +
      `This may destroy useful content.`
    );
  }

  try {
    const { data, error } = await supabase.functions.invoke("cognitio-analyze", {
      body: preNormalized,
    });

    if (error) {
      console.warn(
        `[COGNITIO][M2] m2_remote_call_status=ERROR, error=${error}`
      );
      throw error;
    }

    // P0: Validate remote response shape
    if (!data || typeof data !== "object") {
      console.warn(
        `[COGNITIO][M2] m2_remote_call_status=INVALID_SHAPE, ` +
        `m2_raw_response_preview="${JSON.stringify(data).slice(0, 200)}", ` +
        `m2_parse_status=REJECTED (null or non-object)`
      );
      return runLocalAnalysis(preNormalized);
    }

    const result = data as M2_Output;

    // P0: Validate key_concepts exists and is an array
    if (!Array.isArray(result?.key_concepts)) {
      console.warn(
        `[COGNITIO][M2] m2_remote_call_status=OK, m2_parse_status=MALFORMED ` +
        `(key_concepts is ${typeof result?.key_concepts}, not array). ` +
        `m2_raw_response_preview="${JSON.stringify(data).slice(0, 300)}". ` +
        `Falling back to local analysis.`
      );
      return runLocalAnalysis(preNormalized);
    }

    console.info(
      `[COGNITIO][M2] m2_remote_call_status=OK, ` +
      `m2_candidate_concepts_count=${result.key_concepts.length}, ` +
      `m2_final_topic="${result.main_topic}"`
    );

    // P0 FIX: If edge function returned 0 concepts but we have non-empty text,
    // the remote result is suspect — fall back to local extraction which has
    // emergency concept generation. This prevents the silent 0-concept pipeline.
    if (
      result.key_concepts.length === 0 &&
      preNormalized.clean_text.length > 50
    ) {
      console.warn(
        `[COGNITIO][M2] m2_remote_call_status=OK but 0 concepts from ` +
        `${preNormalized.clean_text.length}-char text. ` +
        `m2_fallback_used=yes (local analysis with emergency extraction).`
      );
      return runLocalAnalysis(preNormalized);
    }

    return result;
  } catch (err) {
    console.warn(
      `[COGNITIO][M2] m2_remote_call_status=EXCEPTION, ` +
      `m2_fallback_used=yes, error=`,
      err
    );
    return runLocalAnalysis(preNormalized);
  }
}

// ---------- Pre-Normalization for Noisy Documents ----------

/**
 * Apply editorial noise filtering before M2 processing.
 * This removes R2C classification labels, branding, headers/footers,
 * and other noise that confuses concept extraction.
 */
function preNormalizeForM2(input: M2_Input): M2_Input {
  const filterResult = filterEditorialNoise(input.clean_text);

  // Also clean segment content
  const cleanedSegments = input.segments.map(seg => ({
    ...seg,
    content: filterEditorialNoise(seg.content).cleaned_text,
    // Clean segment titles too
    title: seg.title ? cleanMainTopic(seg.title) || seg.title : seg.title,
  }));

  const cleanedLength = filterResult.cleaned_text_length;
  const rawLength = filterResult.raw_text_length;
  const retentionRatio = cleanedLength / Math.max(1, rawLength);

  console.info(
    `[COGNITIO][M2] Pre-normalization:\n` +
    `  raw=${rawLength} chars → cleaned=${cleanedLength} chars (${(retentionRatio * 100).toFixed(1)}% retained)\n` +
    `  removed_lines=${filterResult.removed_lines_count}\n` +
    `  removed_types=[${filterResult.removed_patterns.slice(0, 8).map(p => p.type).join(", ")}${filterResult.removed_patterns.length > 8 ? "…" : ""}]`
  );

  // P0 SAFEGUARD: If pre-normalization removed more than 80% of text,
  // it probably destroyed useful content. Use original text instead.
  let finalCleanedText = filterResult.cleaned_text;
  if (!finalCleanedText || (retentionRatio < 0.2 && rawLength > 1000)) {
    console.warn(
      `[COGNITIO][M2][SAFEGUARD] Pre-normalization too aggressive (${(retentionRatio * 100).toFixed(1)}% retained). ` +
      `Reverting to original text to preserve content.`
    );
    finalCleanedText = input.clean_text;
  }

  return {
    ...input,
    clean_text: finalCleanedText,
    segments: cleanedSegments,
  };
}

// ---------- Local Analysis Fallback ----------

export function runLocalAnalysis(input: M2_Input): M2_Output {
  const { document_id, clean_text, segments, confidence_level, user_objective } = input;

  // Apply semantic cleaning before extraction
  const cleanedText = cleanSourceNoise(clean_text);

  // P0 AUDIT: Detect if cleanSourceNoise destroyed too much content
  const cleanDelta = clean_text.length - cleanedText.length;
  const cleanRatio = cleanedText.length / Math.max(1, clean_text.length);

  // P0 debug counters
  let _dbg_sentences_extracted = 0;
  let _dbg_fallback_level = "none";
  let _dbg_sentences_too_short = 0;
  let _dbg_chapters_with_no_sentences = 0;

  console.info(
    `[COGNITIO][M2] runLocalAnalysis:\n` +
    `  m2_input_length=${clean_text.length}\n` +
    `  m2_cleaned_length=${cleanedText.length}\n` +
    `  m2_clean_delta=${cleanDelta} chars removed (${(100 - cleanRatio * 100).toFixed(1)}%)\n` +
    `  m2_segments_count=${segments.length}\n` +
    `  m2_input_preview_raw="${clean_text.slice(0, 200)}…"\n` +
    `  m2_input_preview_cleaned="${cleanedText.slice(0, 200)}…"`
  );

  if (cleanRatio < 0.3 && clean_text.length > 1000) {
    console.warn(
      `[COGNITIO][M2][ANOMALY] cleanSourceNoise removed ${(100 - cleanRatio * 100).toFixed(1)}% of text! ` +
      `This is the second cleaning pass (after preNormalize). Combined effect may be destructive.`
    );
  }

  // === Level 1: Extract clean main topic ===
  const mainTopic = extractCleanMainTopic(segments);
  console.info(`[COGNITIO][M2] m2_final_topic="${mainTopic}"`);

  // === Level 2: Reconstruct chapter hierarchy ===
  const chapters = reconstructChapterHierarchy(segments);
  console.info(`[COGNITIO][M2] m2_chapters_detected=${chapters.length}, titles=[${chapters.map(c => `"${c.title}"`).join(", ")}]`);

  // === Level 3: Extract concepts per chapter ===
  const rawConcepts: AnalyzedConcept[] = [];
  let globalIdx = 0;

  for (let chapterIdx = 0; chapterIdx < chapters.length; chapterIdx++) {
    const chapter = chapters[chapterIdx];
    const chapterContent = cleanSourceNoise(chapter.content);

    // P0 AUDIT FIX: Multi-strategy sentence splitting for bullet-point medical text
    // Strategy 1: Standard sentence boundary split
    const joinedContent = chapterContent.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
    let sentences = joinedContent
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 15); // lowered from 20 to 15

    // Strategy 2: If sentence split yields too few, try line-based extraction
    // (medical polycopiés are often structured as bullet lines without terminal punctuation)
    if (sentences.length < 2 && chapterContent.length > 50) {
      const lineSentences = chapterContent
        .split(/\n/)
        .map(l => l.trim())
        .filter(l => l.length > 10 && /[a-zA-ZÀ-ÿ]/.test(l));
      if (lineSentences.length > sentences.length) {
        sentences = lineSentences;
        console.info(`[COGNITIO][M2] Chapter "${chapter.title}": sentence split failed (${joinedContent.length} chars joined → only ${sentences.length} sentences). Using line-based split: ${lineSentences.length} lines.`);
      }
    }

    // Strategy 3: If still nothing, try splitting on colons/semicolons
    if (sentences.length === 0 && chapterContent.length > 30) {
      sentences = chapterContent
        .split(/[;:]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10 && /[a-zA-ZÀ-ÿ]/.test(s));
    }

    const tooShortCount = chapterContent.split(/\n/).filter(l => l.trim().length > 0 && l.trim().length <= 15).length;
    _dbg_sentences_too_short += tooShortCount;
    if (sentences.length === 0) _dbg_chapters_with_no_sentences++;

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
    _dbg_fallback_level = "sentence_based";
    console.info(
      `[COGNITIO][M2] No concepts from chapter extraction (${chapters.length} chapters, ${_dbg_chapters_with_no_sentences} with no sentences, ${_dbg_sentences_too_short} lines too short). ` +
      `Falling back to sentence-based extraction on ${cleanedText.length}-char text.`
    );

    // P0 FIX: Multi-strategy sentence extraction (same as chapter-level)
    // Strategy 1: Standard sentence boundary
    const joinedText = cleanedText.replace(/\n+/g, " ").replace(/\s{2,}/g, " ");
    let effectiveSentences = joinedText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 15);

    // Strategy 2: Line-based (for bullet-point text)
    if (effectiveSentences.length < 3 && cleanedText.length > 100) {
      const lineSentences = cleanedText
        .split(/\n/)
        .map(l => l.trim())
        .filter(l => l.length > 10 && /[a-zA-ZÀ-ÿ]/.test(l));
      if (lineSentences.length > effectiveSentences.length) {
        effectiveSentences = lineSentences;
        console.info(`[COGNITIO][M2] Sentence split insufficient. Using line-based: ${lineSentences.length} lines.`);
      }
    }

    // Strategy 3: Paragraph split
    if (effectiveSentences.length < 3 && cleanedText.length > 100) {
      const paragraphs = cleanedText.split(/\n\s*\n/).flatMap(p => {
        const trimmed = p.trim();
        return trimmed.length > 10 ? [trimmed] : [];
      });
      if (paragraphs.length > effectiveSentences.length) {
        effectiveSentences = paragraphs;
        console.info(`[COGNITIO][M2] Line split insufficient. Using paragraph-based: ${paragraphs.length} paragraphs.`);
      }
    }

    _dbg_sentences_extracted += effectiveSentences.length;

    for (let i = 0; i < Math.min(20, effectiveSentences.length); i++) {
      const sentence = effectiveSentences[i].trim();
      const words = sentence.split(/\s+/);
      const rawLabel = buildConceptLabel(sentence, "");
      const label = normalizeConceptLabel(rawLabel) || words.slice(0, 5).join(" ");

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

    console.info(`[COGNITIO][M2] Sentence-based fallback: ${effectiveSentences.length} sentences → ${rawConcepts.length} raw concepts`);
  }

  // Filter out artifact concepts and deduplicate
  const rejectReasons: Record<string, number> = {};
  const rejectedLabels: string[] = [];
  const filteredConcepts = rawConcepts.filter(c => {
    const { rejected, reason } = rejectConceptArtifact(c);
    if (rejected && reason) {
      rejectReasons[reason] = (rejectReasons[reason] || 0) + 1;
      if (rejectedLabels.length < 10) rejectedLabels.push(`"${c.label}" (${reason})`);
    }
    return !rejected;
  });
  let concepts = mergeDuplicateOrNoisyConcepts(filteredConcepts);

  // P0 AUDIT: Log filter results with rejected label samples
  console.info(
    `[COGNITIO][M2] Filter results:\n` +
    `  m2_raw_concepts=${rawConcepts.length}\n` +
    `  m2_after_filter=${filteredConcepts.length}\n` +
    `  m2_after_dedup=${concepts.length}\n` +
    `  m2_rejected=${rawConcepts.length - filteredConcepts.length}\n` +
    `  m2_reject_reasons=${JSON.stringify(rejectReasons)}\n` +
    `  m2_rejected_samples=[${rejectedLabels.join(", ")}]`
  );

  // P0 FIX: If all concepts were rejected but we have non-empty text,
  // force-extract minimal concepts so downstream never sees 0 without cause.
  if (concepts.length === 0 && cleanedText.length > 50) {
    _dbg_fallback_level = "emergency";
    console.warn(
      `[COGNITIO][M2] m2_fallback_used=EMERGENCY: All ${rawConcepts.length} raw concepts rejected! ` +
      `m2_reject_reasons=${JSON.stringify(rejectReasons)}. ` +
      `Applying emergency fallback extraction on ${cleanedText.length}-char text.`
    );

    // P0 FIX: Emergency extraction — multi-strategy, same as above
    const continuousText = cleanedText.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();

    // Strategy 1: sentence boundary
    let emergencySentences = continuousText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && /[a-zA-ZÀ-ÿ]/.test(s));

    // Strategy 2: line-based (bullet-point text)
    if (emergencySentences.length < 3 && cleanedText.length > 50) {
      const lineSentences = cleanedText
        .split(/\n/)
        .map(l => l.trim())
        .filter(l => l.length > 8 && /[a-zA-ZÀ-ÿ]/.test(l));
      if (lineSentences.length > emergencySentences.length) {
        emergencySentences = lineSentences;
      }
    }

    // Strategy 3: comma/semicolon split
    if (emergencySentences.length < 3 && continuousText.length > 30) {
      const clauseSentences = continuousText
        .split(/[,;:]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10 && /[a-zA-ZÀ-ÿ]/.test(s));
      if (clauseSentences.length > emergencySentences.length) {
        emergencySentences = clauseSentences;
      }
    }

    // Strategy 4: word chunks as absolute last resort
    if (emergencySentences.length === 0 && continuousText.length > 30) {
      const words = continuousText.split(/\s+/);
      for (let i = 0; i < words.length; i += 10) {
        const chunk = words.slice(i, i + 15).join(" ");
        if (chunk.length > 15) {
          emergencySentences.push(chunk);
        }
        if (emergencySentences.length >= 10) break;
      }
    }

    for (let i = 0; i < Math.min(10, emergencySentences.length); i++) {
      const sentence = emergencySentences[i];
      const words = sentence.split(/\s+/);
      // Use buildConceptLabel for better label extraction even in emergency mode
      const label = buildConceptLabel(sentence, "") || words.slice(0, 6).join(" ");
      const definition = compressDefinition(sentence, 200);
      // Skip if definition would be too short (but don't reject — emergency mode)
      const effectiveDef = definition.length >= 10 ? definition : sentence.slice(0, 200);

      concepts.push({
        stable_key: `concept_emergency_${i}`,
        label,
        definition: effectiveDef,
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

    console.info(`[COGNITIO][M2] Emergency fallback produced ${concepts.length} concepts from ${emergencySentences.length} candidate sentences.`);
  }

  // ============================================================
  // P0 GUARD: HEURISTIC LAST-RESORT FALLBACK
  // If we STILL have 0 concepts from a substantial document,
  // extract from segment titles + headings heuristically.
  // This should NEVER let 18k chars produce 0 concepts.
  // ============================================================
  if (concepts.length === 0 && clean_text.length > 500) {
    _dbg_fallback_level = "heuristic_secours";
    console.warn(
      `[COGNITIO][M2][ANOMALY] CRITICAL: ${clean_text.length}-char document → 0 concepts after ALL fallbacks!\n` +
      `  m2_chapters=${chapters.length}, m2_raw_concepts=${rawConcepts.length}, m2_reject_reasons=${JSON.stringify(rejectReasons)}\n` +
      `  Activating HEURISTIC LAST-RESORT extraction.`
    );

    const heuristicConcepts = extractHeuristicConcepts(clean_text, segments);
    concepts.push(...heuristicConcepts);

    console.info(
      `[COGNITIO][M2] Heuristic last-resort produced ${heuristicConcepts.length} concepts.`
    );
  }

  // P0 ANOMALY GUARD: Final check — log detailed anomaly if still 0
  if (concepts.length === 0 && clean_text.length > 5000) {
    console.error(
      `[COGNITIO][M2][CRITICAL_ANOMALY] ${clean_text.length}-char document produced 0 concepts!\n` +
      `  DIAGNOSTIC DUMP:\n` +
      `  - Original text length: ${clean_text.length}\n` +
      `  - After cleanSourceNoise: ${cleanedText.length}\n` +
      `  - Chapters detected: ${chapters.length}\n` +
      `  - Sentences extracted: ${_dbg_sentences_extracted}\n` +
      `  - Sentences too short (<=15 chars): ${_dbg_sentences_too_short}\n` +
      `  - Chapters with 0 sentences: ${_dbg_chapters_with_no_sentences}\n` +
      `  - Raw concepts before filter: ${rawConcepts.length}\n` +
      `  - Rejection breakdown: ${JSON.stringify(rejectReasons)}\n` +
      `  - Rejected samples: [${rejectedLabels.join(", ")}]\n` +
      `  - Fallback level reached: ${_dbg_fallback_level}\n` +
      `  - Text first 500 chars: "${clean_text.slice(0, 500)}"\n` +
      `  - Text last 500 chars: "${clean_text.slice(-500)}"`
    );
  }

  // P0: If topic is "Sujet non identifié" but we have concepts, try to derive topic from first concept
  let finalTopic = mainTopic;
  if ((mainTopic === "Sujet non identifié" || mainTopic.length < 3) && concepts.length > 0) {
    const firstCritical = concepts.find(c => c.criticality <= 2) || concepts[0];
    if (firstCritical?.label && firstCritical.label.length >= 5) {
      finalTopic = firstCritical.label;
      console.info(`[COGNITIO][M2] Topic derived from first concept: "${finalTopic}"`);
    }
  }

  // P0 comprehensive debug logging
  console.info(
    `[COGNITIO][M2] FINAL SUMMARY:\n` +
    `  m2_input_length=${clean_text.length}\n` +
    `  m2_cleaned_length=${cleanedText.length}\n` +
    `  m2_chapters_detected=${chapters.length}\n` +
    `  m2_sentences_extracted=${_dbg_sentences_extracted}\n` +
    `  m2_sentences_too_short=${_dbg_sentences_too_short}\n` +
    `  m2_chapters_with_no_sentences=${_dbg_chapters_with_no_sentences}\n` +
    `  m2_candidate_concepts_count=${rawConcepts.length}\n` +
    `  m2_filtered_concepts_count=${filteredConcepts.length}\n` +
    `  m2_final_concepts_count=${concepts.length}\n` +
    `  m2_rejected_count=${rawConcepts.length - filteredConcepts.length}\n` +
    `  m2_reject_reasons=${JSON.stringify(rejectReasons)}\n` +
    `  m2_fallback_level=${_dbg_fallback_level}\n` +
    `  m2_final_topic="${finalTopic}"`
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
    : [`Comprendre les notions clés de : ${finalTopic}`];

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
    main_topic: finalTopic,
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
    source_issues: [
      { code: "FALLBACK_ANALYSIS", message: "Analyse locale heuristique (LLM non disponible)", severity: "warning" },
      ...(_dbg_fallback_level === "emergency" ? [{ code: "EMERGENCY_EXTRACTION" as const, message: `Extraction de secours utilisée — ${Object.entries(rejectReasons).map(([r, c]) => `${r}:${c}`).join(", ")}`, severity: "warning" as const }] : []),
      ...(_dbg_fallback_level === "heuristic_secours" ? [{ code: "HEURISTIC_LAST_RESORT" as const, message: `Mode secours heuristique activé — toutes les méthodes standard ont échoué sur ${clean_text.length} caractères`, severity: "error" as const }] : []),
    ],
    total_concepts: concepts.length,
    critical_count: concepts.filter((c) => c.criticality === 1).length,
    estimated_complexity: estimatedComplexity,
    document_difficulty_level: docDifficulty as "easy" | "intermediate" | "advanced" | "expert",
    estimated_audience_level: mismatch?.profile_level,
    audience_mismatch_risk: mismatch?.risk_level ?? 0,
    audience_mismatch_message: mismatch?.message,
  };
}

// ---------- Heuristic Last-Resort Extraction ----------

/**
 * P0 GUARD: Heuristic last-resort concept extraction.
 * When ALL other methods fail (chapter, sentence, emergency), this function
 * extracts concepts from:
 * 1. Segment titles and headings (probable chapter/section names)
 * 2. Salient lines (lines that look like definitions, key terms, or bullet headers)
 * 3. Frequent noun-phrase patterns
 *
 * This guarantees a minimum of 3-10 concepts for any document > 500 chars.
 */
function extractHeuristicConcepts(
  rawText: string,
  segments: SegmentOutput[],
): AnalyzedConcept[] {
  const concepts: AnalyzedConcept[] = [];
  const seenLabels = new Set<string>();

  function addConcept(label: string, definition: string, criticality: 1 | 2 | 3 | 4, source: string) {
    const cleanLabel = label.trim().replace(/\s{2,}/g, " ");
    if (cleanLabel.length < 3) return;
    const key = cleanLabel.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, "");
    if (seenLabels.has(key)) return;
    seenLabels.add(key);

    const effectiveDef = definition.trim().length >= 10
      ? definition.trim().slice(0, 250)
      : `Concept extrait du document : ${cleanLabel}`;

    concepts.push({
      stable_key: `concept_heuristic_${concepts.length}`,
      label: cleanLabel,
      definition: effectiveDef,
      type: "general",
      criticality,
      criticality_score: criticality === 1 ? 1 : criticality === 2 ? 0.7 : criticality === 3 ? 0.4 : 0.2,
      bloom_target: "remember",
      relations: [],
      prerequisites: [],
      source_confidence: 0.25,
      source_trace: [{ segment_index: 0, excerpt: `[heuristic:${source}] ${cleanLabel}` }],
      uncertain: true,
    });
  }

  // === Strategy 1: Extract from segment titles ===
  for (const seg of segments) {
    if (!seg.title || seg.title.trim().length < 3) continue;
    const cleaned = cleanMainTopic(seg.title);
    if (cleaned.length >= 3 && !/^(?:Introduction|Conclusion|Résumé|Bibliographie)\s*$/i.test(cleaned)) {
      // Use first sentence of content as definition
      const firstSentence = seg.content
        .split(/[.!?\n]/)
        .map(s => s.trim())
        .find(s => s.length > 15) || seg.content.slice(0, 200);
      addConcept(cleaned, firstSentence, concepts.length < 3 ? 1 : 2, "segment_title");
    }
    if (concepts.length >= 10) break;
  }

  // === Strategy 2: Extract salient lines from raw text ===
  // Lines that look like headings, definitions, or key terms
  if (concepts.length < 5) {
    const lines = rawText.split(/\n/).map(l => l.trim()).filter(l => l.length > 5);

    for (const line of lines) {
      if (concepts.length >= 10) break;

      // Detect heading-like lines (short, capitalized, no trailing punctuation)
      const isHeading = line.length >= 5 && line.length <= 100
        && /^[A-ZÀ-Ÿ]/.test(line)
        && !/[.!?;,]$/.test(line)
        && !isEditorialArtifactForHeuristic(line);

      // Detect definition-like lines ("X est/sont/désigne...")
      const isDefinition = /^.{3,60}\s+(?:est|sont|désigne|signifie|correspond|se définit)\s/i.test(line);

      // Detect bold/emphasized patterns (often key terms in PDFs)
      const isKeyTerm = /^[A-ZÀ-Ÿ][A-ZÀ-Ÿa-zà-ÿ\s\-–—]{2,50}\s*:/.test(line);

      if (isHeading || isDefinition || isKeyTerm) {
        const label = isDefinition
          ? (line.match(/^(.{3,60}?)\s+(?:est|sont|désigne|signifie|correspond|se définit)/i)?.[1] || line.slice(0, 60))
          : isKeyTerm
            ? (line.match(/^([^:]{3,50})/)?.[1]?.trim() || line.slice(0, 60))
            : line.slice(0, 80);
        const definition = isDefinition || isKeyTerm ? line : `Section ou concept clé identifié : ${line.slice(0, 150)}`;
        addConcept(label, definition, concepts.length < 3 ? 2 : 3, isDefinition ? "definition_line" : isKeyTerm ? "key_term" : "heading_line");
      }
    }
  }

  // === Strategy 3: Force-extract from first N substantive lines ===
  if (concepts.length < 3) {
    const substantiveLines = rawText
      .split(/\n/)
      .map(l => l.trim())
      .filter(l => l.length > 15 && /[a-zA-ZÀ-ÿ]{3,}/.test(l) && !isEditorialArtifactForHeuristic(l));

    for (let i = 0; i < Math.min(10, substantiveLines.length) && concepts.length < 5; i++) {
      const line = substantiveLines[i];
      const words = line.split(/\s+/);
      const label = words.slice(0, 6).join(" ");
      addConcept(label, line.slice(0, 250), concepts.length < 2 ? 2 : 3, "substantive_line");
    }
  }

  console.info(
    `[COGNITIO][M2] Heuristic extraction detail:\n` +
    `  from_segment_titles=${[...seenLabels].length}\n` +
    `  total_heuristic_concepts=${concepts.length}\n` +
    `  labels=[${concepts.map(c => `"${c.label}"`).join(", ")}]`
  );

  return concepts;
}

/**
 * Quick editorial artifact check for heuristic extraction.
 * Less aggressive than the main filter — we want to keep as much as possible.
 */
function isEditorialArtifactForHeuristic(line: string): boolean {
  return /^(?:COM\s+)?R2C\s*:/i.test(line)
    || /^(?:Rang|Item|UE|DFGSM|ECN|EDN)\s+\d/i.test(line)
    || /^(?:Page|Version)\s+\d/i.test(line)
    || /^(?:Université|Faculté|Institut|École)\s/i.test(line)
    || /^en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*$/i.test(line)
    || /^©\s/.test(line)
    || /^\d+\s*[\/\-–]\s*\d+\s*$/.test(line);
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
