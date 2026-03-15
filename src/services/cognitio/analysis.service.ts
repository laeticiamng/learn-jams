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
  scoreConceptCandidate,
  computeEditorialArtifactScore,
  computeHeaderNoiseScore,
  type ConceptCandidateScores,
} from "@/lib/cognitio-semantic-cleaning";
import { filterEditorialNoise, detectFrontMatter, computeSegmentNoiseScore } from "./editorialNoiseFilter";

// ---------- Run Analysis (Edge Function) ----------

export async function runAnalysis(input: M2_Input): Promise<M2_Output> {
  // P0: Pre-normalize input text for noisy R2C/academic documents
  const preNormalized = preNormalizeForM2(input);

  // === DIAGNOSTIC TRACE (requested trace format) ===
  const trace: M2DiagnosticTrace = {
    m2_input_length: input.clean_text.length,
    m2_input_preview: input.clean_text.slice(0, 300),
    m2_prompt_version: "m2-analyze-v2.0",
    remote_call_started: false,
    remote_call_status: "not_attempted",
    remote_raw_response_preview: "",
    remote_parse_status: "not_attempted",
    local_fallback_triggered: false,
    local_raw_candidates_count: 0,
    local_filtered_candidates_count: 0,
    local_reject_reasons: {},
    final_topic: "",
    final_concepts_count: 0,
  };

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

  if (prenormRatio < 0.3 && input.clean_text.length > 1000) {
    console.warn(
      `[COGNITIO][M2][ANOMALY] Pre-normalization removed ${(100 - prenormRatio * 100).toFixed(1)}% of text! ` +
      `Original=${input.clean_text.length}, After=${preNormalized.clean_text.length}. ` +
      `This may destroy useful content.`
    );
  }

  try {
    trace.remote_call_started = true;
    const { data, error } = await supabase.functions.invoke("cognitio-analyze", {
      body: preNormalized,
    });

    if (error) {
      trace.remote_call_status = "ERROR";
      console.warn(`[COGNITIO][M2] m2_remote_call_status=ERROR, error=${error}`);
      throw error;
    }

    if (!data || typeof data !== "object") {
      trace.remote_call_status = "INVALID_SHAPE";
      trace.remote_raw_response_preview = JSON.stringify(data).slice(0, 300);
      trace.remote_parse_status = "REJECTED";
      console.warn(
        `[COGNITIO][M2] m2_remote_call_status=INVALID_SHAPE, ` +
        `m2_raw_response_preview="${trace.remote_raw_response_preview}", ` +
        `m2_parse_status=REJECTED (null or non-object)`
      );
      trace.local_fallback_triggered = true;
      const localResult = runLocalAnalysis(preNormalized, input.segments);
      emitDiagnosticTrace(trace, localResult);
      return localResult;
    }

    const result = data as M2_Output;
    trace.remote_raw_response_preview = JSON.stringify(data).slice(0, 300);

    if (!Array.isArray(result?.key_concepts)) {
      trace.remote_call_status = "OK";
      trace.remote_parse_status = "MALFORMED";
      console.warn(
        `[COGNITIO][M2] m2_remote_call_status=OK, m2_parse_status=MALFORMED ` +
        `(key_concepts is ${typeof result?.key_concepts}, not array). ` +
        `Falling back to local analysis.`
      );
      trace.local_fallback_triggered = true;
      const localResult = runLocalAnalysis(preNormalized, input.segments);
      emitDiagnosticTrace(trace, localResult);
      return localResult;
    }

    trace.remote_call_status = "OK";
    trace.remote_parse_status = "OK";

    console.info(
      `[COGNITIO][M2] m2_remote_call_status=OK, ` +
      `m2_candidate_concepts_count=${result.key_concepts.length}, ` +
      `m2_final_topic="${result.main_topic}"`
    );

    // P0 FIX: If edge function returned 0 concepts but we have non-empty text,
    // fall back to local extraction with emergency concept generation.
    if (result.key_concepts.length === 0 && preNormalized.clean_text.length > 50) {
      console.warn(
        `[COGNITIO][M2] m2_remote_call_status=OK but 0 concepts from ` +
        `${preNormalized.clean_text.length}-char text. ` +
        `m2_fallback_used=yes (local analysis with emergency extraction).`
      );
      trace.local_fallback_triggered = true;
      const localResult = runLocalAnalysis(preNormalized, input.segments);
      emitDiagnosticTrace(trace, localResult);
      return localResult;
    }

    trace.final_topic = result.main_topic;
    trace.final_concepts_count = result.key_concepts.length;
    emitDiagnosticTrace(trace, result);
    return result;
  } catch (err) {
    trace.remote_call_status = "EXCEPTION";
    trace.local_fallback_triggered = true;
    console.warn(`[COGNITIO][M2] m2_remote_call_status=EXCEPTION, m2_fallback_used=yes, error=`, err);
    const localResult = runLocalAnalysis(preNormalized, input.segments);
    emitDiagnosticTrace(trace, localResult);
    return localResult;
  }
}

// === Diagnostic Trace Types & Emitter ===

interface M2DiagnosticTrace {
  m2_input_length: number;
  m2_input_preview: string;
  m2_prompt_version: string;
  remote_call_started: boolean;
  remote_call_status: string;
  remote_raw_response_preview: string;
  remote_parse_status: string;
  local_fallback_triggered: boolean;
  local_raw_candidates_count: number;
  local_filtered_candidates_count: number;
  local_reject_reasons: Record<string, number>;
  final_topic: string;
  final_concepts_count: number;
}

function emitDiagnosticTrace(trace: M2DiagnosticTrace, result: M2_Output): void {
  trace.final_topic = result.main_topic;
  trace.final_concepts_count = result.key_concepts?.length ?? 0;

  console.info(
    `[COGNITIO][M2][DIAGNOSTIC_TRACE]\n` +
    JSON.stringify(trace, null, 2)
  );

  // P0 PRODUCT RULE: If clean_text > 5000 and concepts = 0, log critical anomaly
  if (trace.m2_input_length > 5000 && trace.final_concepts_count === 0) {
    console.error(
      `[COGNITIO][M2][PRODUCT_RULE_VIOLATION] ` +
      `clean_text_length=${trace.m2_input_length} > 5000 AND concepts_count=0!\n` +
      `  CAUSE: remote_call_status=${trace.remote_call_status}, ` +
      `remote_parse_status=${trace.remote_parse_status}, ` +
      `local_fallback_triggered=${trace.local_fallback_triggered}, ` +
      `local_raw_candidates=${trace.local_raw_candidates_count}, ` +
      `local_filtered_candidates=${trace.local_filtered_candidates_count}, ` +
      `local_reject_reasons=${JSON.stringify(trace.local_reject_reasons)}\n` +
      `  ACTION: This should NEVER happen. Check scoring thresholds and emergency fallback logic.`
    );
  }
}

// ---------- Pre-Normalization for Noisy Documents ----------

/**
 * Apply editorial noise filtering before M2 processing.
 * This removes R2C classification labels, branding, headers/footers,
 * and other noise that confuses concept extraction.
 */
function preNormalizeForM2(input: M2_Input): M2_Input {
  // Step 0: Detect and strip front matter (branding, R2C headers, revision metadata)
  const frontMatter = detectFrontMatter(input.clean_text);
  const textAfterFrontMatter = frontMatter.has_front_matter ? frontMatter.body_text : input.clean_text;

  // Always log front matter detection results (including when none found)
  console.info(
    `[COGNITIO][M2] Front matter detection:\n` +
    `  has_front_matter=${frontMatter.has_front_matter}\n` +
    `  front_matter_lines_detected=${frontMatter.front_matter_lines_detected}\n` +
    `  front_matter_chars_removed=${frontMatter.front_matter_chars_removed}\n` +
    `  header_noise_score_before=${frontMatter.header_noise_score_before}\n` +
    `  header_noise_score_after=${frontMatter.header_noise_score_after}\n` +
    `  segment_0_noise_score=${frontMatter.segment_0_noise_score}\n` +
    `  body_start_line=${frontMatter.body_start_line}\n` +
    `  front_matter_samples=[${frontMatter.front_matter_lines.slice(0, 5).map(l => `"${l.original.slice(0, 60)}"`).join(", ")}]\n` +
    `  text_before=${input.clean_text.length} → text_after=${textAfterFrontMatter.length}`
  );

  // Step 1: Apply deep R2C/revision-specific cleaning AFTER front matter strip
  const r2cCleaned = cleanR2CRevisionArtifacts(textAfterFrontMatter);

  // Step 2: Apply generic editorial noise filter
  const filterResult = filterEditorialNoise(r2cCleaned);

  // Also clean segment content — with front matter awareness
  const cleanedSegments = input.segments.map((seg, idx) => {
    // For segment 0, apply front matter detection to strip polluted headers
    const segText = idx === 0 && frontMatter.has_front_matter
      ? detectFrontMatter(seg.content).body_text
      : seg.content;
    return {
      ...seg,
      content: filterEditorialNoise(cleanR2CRevisionArtifacts(segText)).cleaned_text,
      title: seg.title ? cleanMainTopic(seg.title) || seg.title : seg.title,
    };
  });

  const cleanedLength = filterResult.cleaned_text_length;
  const rawLength = input.clean_text.length; // Use original length for ratio
  const retentionRatio = cleanedLength / Math.max(1, rawLength);

  console.info(
    `[COGNITIO][M2] Pre-normalization:\n` +
    `  raw=${rawLength} chars → after_frontmatter=${textAfterFrontMatter.length} → after_r2c=${r2cCleaned.length} → cleaned=${cleanedLength} chars (${(retentionRatio * 100).toFixed(1)}% retained)\n` +
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

// ---------- R2C Revision Document Deep Cleaning ----------

/**
 * P0: Deep pre-normalization specifically for R2C polycopiés de révision.
 * Removes/deprioritizes:
 * - R2C classification labels (inline and standalone)
 * - Rang A/B/C annotations
 * - CODEX, S-ECN, MED-LINE branding
 * - Révision/ITEM/en-têtes markers
 * - Editorial dates and version metadata
 * Preserves:
 * - Real section titles (detected by structure, not just capitalization)
 * - Medical content and definitions
 * - Clinical data and procedures
 */
function cleanR2CRevisionArtifacts(text: string): string {
  const lines = text.split("\n");
  const cleaned: string[] = [];

  // Patterns for full-line removal (standalone editorial lines)
  const STANDALONE_R2C_PATTERNS: RegExp[] = [
    // R2C / Rang standalone lines
    /^\s*(?:COM\s+)?R2C\s*:\s*/i,
    /^\s*Rang\s+[A-Z]\s*(?:[-–—:]\s*)?$/i,
    /^\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*$/i,
    /^\s*(?:Rang\s+[A-Z]\s*[-–—]\s*)+\s*$/i,
    // Branding standalone lines
    /^\s*CODEX\s*[.:;,]?\s*$/i,
    /^\s*S[\s-]*ECN(?:\.COM)?\s*$/i,
    /^\s*MED[\s-]*LINE\s*$/i,
    /^\s*iKB\s*$/i,
    /^\s*PREP['']?ECN\s*$/i,
    /^\s*ELLIPSES\s*$/i,
    /^\s*VERNAZOBRES[\s-]*GREGO?\s*$/i,
    // Revision / version lines
    /^\s*Révision\s+\d/i,
    /^\s*ITEM\s+\d+\s*[-–—:]?\s*$/i,
    /^\s*(?:Dernière\s+)?(?:mise\s+à\s+jour|MAJ)\s*[:—–\-]/i,
    // Date-only lines
    /^\s*\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\s*$/,
    // Composite branding headers
    /^\s*CODEX\b.*\bS[\s-]*ECN\b/i,
    /^\s*KB\s*[\/|]\s*iKB\b/i,
    // Item + Rang composite
    /^\s*ITEM\s+\d+.*Rang\s+[A-Z]/i,
    // En-têtes with multiple R2C annotations
    /^.*(?:Rang\s+[A-Z].*){2,}/i,
  ];

  // Inline patterns to strip (preserve line, clean content)
  const INLINE_R2C_PATTERNS: { pattern: RegExp; replacement: string }[] = [
    // Rang annotations inline
    { pattern: /\s*\(?\s*Rang\s+[A-Z]\s*\)?\s*/gi, replacement: " " },
    { pattern: /\s*[-–—]\s*Rang\s+[A-Z]\s*/gi, replacement: " " },
    { pattern: /\s*\(?\s*R2C\s*:\s*Rang\s+[A-Z]\s*\)?\s*/gi, replacement: " " },
    // Color annotations inline
    { pattern: /\s*\(?\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*\)?\s*/gi, replacement: " " },
    { pattern: /\s*[-–—]\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*/gi, replacement: " " },
    // Branding inline
    { pattern: /\bCODEX\b[.:;,]?\s*/gi, replacement: "" },
    { pattern: /\bS[\s-]*ECN(?:\.COM)?\b[.:;,]?\s*/gi, replacement: "" },
    { pattern: /\bMED[\s-]*LINE\b\s*/gi, replacement: "" },
    { pattern: /\biKB\b\s*/gi, replacement: "" },
    { pattern: /\bPREP['']?ECN\b\s*/gi, replacement: "" },
    // ITEM numbers inline
    { pattern: /\bITEM\s+\d+\s*[-–—:]?\s*/gi, replacement: "" },
    // R2C revision markers inline
    { pattern: /\bR2C\s+Révision\s+\d[\d\/]*\b\s*/gi, replacement: "" },
    // Trailing COM R2C
    { pattern: /\s*COM\s+R2C\s*:\s*/gi, replacement: " " },
  ];

  for (const line of lines) {
    const trimmed = line.trim();

    // Preserve blank lines for structure
    if (trimmed.length === 0) {
      cleaned.push("");
      continue;
    }

    // Check standalone removal patterns
    if (STANDALONE_R2C_PATTERNS.some(p => p.test(trimmed))) {
      continue; // Drop the line entirely
    }

    // Apply inline cleaning
    let cleanedLine = trimmed;
    for (const { pattern, replacement } of INLINE_R2C_PATTERNS) {
      cleanedLine = cleanedLine.replace(pattern, replacement);
    }
    cleanedLine = cleanedLine.replace(/\s{2,}/g, " ").trim();

    // Skip if cleaning left nothing meaningful
    if (cleanedLine.length < 3) continue;

    cleaned.push(cleanedLine);
  }

  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ---------- Local Analysis Fallback ----------

export function runLocalAnalysis(input: M2_Input, rawSegments?: SegmentOutput[]): M2_Output {
  const { document_id, clean_text, segments, confidence_level, user_objective } = input;
  // rawSegments: original segments before pre-normalization, for body-only second pass
  const originalSegments = rawSegments || segments;

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

  // === Level 0: Front matter detection on original text for diagnostics ===
  const localFrontMatter = detectFrontMatter(clean_text);
  console.info(
    `[COGNITIO][M2] Front matter (local analysis):\n` +
    `  front_matter_detected=${localFrontMatter.has_front_matter}\n` +
    `  front_matter_lines_count=${localFrontMatter.front_matter_lines_detected}\n` +
    `  front_matter_chars_count=${localFrontMatter.front_matter_chars_removed}\n` +
    `  front_matter_score=${localFrontMatter.segment_0_noise_score}\n` +
    `  body_start_line=${localFrontMatter.body_start_line}`
  );

  // === Level 1: Extract clean main topic ===
  const mainTopic = extractCleanMainTopic(segments);
  console.info(`[COGNITIO][M2] m2_final_topic="${mainTopic}"`);

  // === Level 2: Reconstruct chapter hierarchy ===
  const chapters = reconstructChapterHierarchy(segments);
  console.info(`[COGNITIO][M2] m2_chapters_detected=${chapters.length}, titles=[${chapters.map(c => `"${c.title}"`).join(", ")}]`);

  // === SEGMENT 0 QUARANTINE ===
  // Detect if segment 0 is heavily noisy (front matter / branding / R2C headers).
  // If so, quarantine it: exclude from primary concept extraction.
  const segment0Quarantined = isSegment0Noisy(segments);
  if (segment0Quarantined) {
    console.info(
      `[COGNITIO][M2] SEGMENT_0_QUARANTINE: Segment 0 is heavily noisy. ` +
      `Excluding from primary concept extraction. Will extract from body segments only.`
    );
  }

  // === Level 3: Extract concepts per chapter ===
  const rawConcepts: AnalyzedConcept[] = [];
  let globalIdx = 0;

  for (let chapterIdx = 0; chapterIdx < chapters.length; chapterIdx++) {
    const chapter = chapters[chapterIdx];

    // SEGMENT 0 QUARANTINE: Skip chapter 0 if quarantined
    if (chapterIdx === 0 && segment0Quarantined) {
      console.info(`[COGNITIO][M2] Skipping quarantined chapter 0 ("${chapter.title}") for concept extraction.`);
      continue;
    }

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
  let _dbg_rejected_editorial_artifacts_count = 0;
  const filteredConcepts = rawConcepts.filter(c => {
    const { rejected, reason } = rejectConceptArtifact(c);
    if (rejected && reason) {
      rejectReasons[reason] = (rejectReasons[reason] || 0) + 1;
      if (rejectedLabels.length < 10) rejectedLabels.push(`"${c.label}" (${reason})`);
      // Track editorial artifact rejections
      if (reason.includes("artifact") || reason.includes("editorial") ||
          reason.includes("classification") || reason.includes("noise") ||
          reason.includes("color") || reason.includes("branding")) {
        _dbg_rejected_editorial_artifacts_count++;
      }
    }
    return !rejected;
  });
  let concepts = mergeDuplicateOrNoisyConcepts(filteredConcepts);

  // P0: Compute segment distribution metrics
  const conceptsFromSegment0Count = concepts.filter(c =>
    c.source_trace.some(t => t.segment_index === 0)
  ).length;
  const conceptsFromBodyCount = concepts.filter(c =>
    c.source_trace.some(t => t.segment_index > 0)
  ).length;
  let _dbg_secondary_pass_triggered = false;
  let _dbg_secondary_pass_concepts_count = 0;
  let _dbg_body_first_pass_triggered = false;
  let _dbg_artifact_only_first_pass = false;
  let _dbg_body_only_second_pass_triggered = false;
  let _dbg_body_only_second_pass_concepts_count = 0;

  // P0 AUDIT: Log filter results with rejected label samples
  console.info(
    `[COGNITIO][M2] Filter results:\n` +
    `  m2_raw_concepts=${rawConcepts.length}\n` +
    `  m2_after_filter=${filteredConcepts.length}\n` +
    `  m2_after_dedup=${concepts.length}\n` +
    `  m2_rejected=${rawConcepts.length - filteredConcepts.length}\n` +
    `  m2_rejected_editorial_artifacts=${_dbg_rejected_editorial_artifacts_count}\n` +
    `  m2_concepts_from_segment_0=${conceptsFromSegment0Count}\n` +
    `  m2_concepts_from_body=${conceptsFromBodyCount}\n` +
    `  m2_reject_reasons=${JSON.stringify(rejectReasons)}\n` +
    `  m2_rejected_samples=[${rejectedLabels.join(", ")}]`
  );

  // ============================================================
  // P0 GUARD RAIL: ARTIFACT-ONLY FIRST PASS → BODY-ONLY SECOND PASS
  // If ALL concepts from first pass are editorial artifacts OR
  // all concepts come from segment 0, trigger a body-only second pass.
  // Logic: artifact_only_first_pass → body_only_second_pass → final_decision
  // ============================================================
  const allConceptsAreArtifacts = concepts.length > 0 && concepts.every(c => {
    const scores = scoreConceptCandidate(c.label, c.definition);
    return !scores.accepted || scores.editorial_artifact_score >= 0.4 || scores.header_noise_score >= 0.4;
  });

  if ((concepts.length === 0 && rawConcepts.length > 0 && segments.length > 1) ||
      (allConceptsAreArtifacts && segments.length > 1)) {
    _dbg_fallback_level = "secondary_body_pass";
    _dbg_secondary_pass_triggered = true;
    _dbg_artifact_only_first_pass = true;
    _dbg_body_only_second_pass_triggered = true;

    if (allConceptsAreArtifacts && concepts.length > 0) {
      console.warn(
        `[COGNITIO][M2] ARTIFACT_ONLY_FIRST_PASS: All ${concepts.length} concepts are editorial artifacts. ` +
        `Clearing and relaunching body-only second pass (segments 1-${segments.length - 1}).`
      );
      concepts = []; // Clear artifact concepts
    } else {
      console.warn(
        `[COGNITIO][M2] SECONDARY_BODY_PASS: All ${rawConcepts.length} concepts rejected as artifacts. ` +
        `Relaunching extraction on body segments only (segments 1-${segments.length - 1}).`
      );
    }

    // KEY FIX: Use ORIGINAL input segments (not the pre-cleaned ones which may
    // have been stripped too aggressively). Apply only light cleaning (front matter
    // strip + editorial noise filter) to preserve real pedagogical content.
    const bodySegmentsOriginal = originalSegments.slice(1);
    const bodyText = bodySegmentsOriginal.map(s => s.content).join("\n\n");
    const bodyFrontMatter = detectFrontMatter(bodyText);
    const bodyAfterFM = bodyFrontMatter.has_front_matter ? bodyFrontMatter.body_text : bodyText;
    const bodyFilterResult = filterEditorialNoise(bodyAfterFM);
    const cleanedBodyText = bodyFilterResult.cleaned_text;

    console.info(
      `[COGNITIO][M2] BODY_ONLY_SECOND_PASS: body_text=${bodyText.length} chars → ` +
      `after_fm_strip=${bodyAfterFM.length} → after_noise_filter=${cleanedBodyText.length}`
    );

    if (cleanedBodyText.length > 50) {
      _dbg_body_first_pass_triggered = true;
      const bodyConcepts = extractConceptsFromText(cleanedBodyText, bodySegmentsOriginal, globalIdx);
      for (const bc of bodyConcepts) {
        const { rejected } = rejectConceptArtifact(bc);
        if (!rejected) {
          concepts.push(bc);
          globalIdx++;
          _dbg_secondary_pass_concepts_count++;
          _dbg_body_only_second_pass_concepts_count++;
        }
      }
      console.info(
        `[COGNITIO][M2] Secondary body pass: ${cleanedBodyText.length} chars → ` +
        `${bodyConcepts.length} candidates → ${_dbg_body_only_second_pass_concepts_count} accepted.`
      );
    }

    // If body-only second pass STILL produced 0 concepts, try per-segment extraction
    // on original segments to maximize chances of finding real content.
    if (concepts.length === 0 && originalSegments.length > 1) {
      console.warn(
        `[COGNITIO][M2] BODY_ONLY_SECOND_PASS: Joined body extraction failed. ` +
        `Trying per-segment extraction on ${originalSegments.length - 1} body segments.`
      );
      for (let si = 1; si < originalSegments.length && concepts.length < 15; si++) {
        const seg = originalSegments[si];
        if (seg.content.length < 30) continue;
        const segCleaned = filterEditorialNoise(seg.content).cleaned_text;
        if (segCleaned.length < 20) continue;
        const segConcepts = extractConceptsFromText(segCleaned, [seg], globalIdx);
        for (const sc of segConcepts) {
          const { rejected } = rejectConceptArtifact(sc);
          if (!rejected) {
            // Fix source_trace to reflect actual segment index
            sc.source_trace = [{ segment_index: si, excerpt: sc.source_trace[0]?.excerpt || "" }];
            concepts.push(sc);
            globalIdx++;
            _dbg_body_only_second_pass_concepts_count++;
          }
        }
      }
      console.info(
        `[COGNITIO][M2] Per-segment body extraction: ${_dbg_body_only_second_pass_concepts_count} total concepts extracted.`
      );
    }
  }

  // P0 GUARD RAIL: MULTI-SEGMENT CONCEPT DIVERSITY CHECK
  // If all accepted concepts come from segment 0 and we have more segments,
  // force extraction from later segments to ensure concept diversity.
  if (concepts.length > 0 && segments.length > 1 && !_dbg_secondary_pass_triggered) {
    const allFromSeg0 = concepts.every(c =>
      c.source_trace.every(t => t.segment_index === 0)
    );
    if (allFromSeg0) {
      console.warn(
        `[COGNITIO][M2] MULTI_SEGMENT_GUARD: All ${concepts.length} concepts from segment 0. ` +
        `Forcing extraction from body segments for diversity.`
      );
      _dbg_body_first_pass_triggered = true;
      // Use original input segments for diversity extraction
      const divBodySegments = originalSegments.slice(1);
      const divBodyText = divBodySegments.map(s => s.content).join("\n\n");
      const cleanedDivBodyText = filterEditorialNoise(divBodyText).cleaned_text;

      if (cleanedDivBodyText.length > 50) {
        const diversityConcepts = extractConceptsFromText(cleanedDivBodyText, divBodySegments, globalIdx);
        for (const dc of diversityConcepts) {
          const { rejected } = rejectConceptArtifact(dc);
          if (!rejected) {
            concepts.push(dc);
            globalIdx++;
          }
        }
        console.info(
          `[COGNITIO][M2] Multi-segment diversity: added ${concepts.length} total concepts.`
        );
      }
    }
  }

  // P0 FIX: If all concepts were rejected but we have non-empty text,
  // force-extract minimal concepts so downstream never sees 0 without cause.
  if (concepts.length === 0 && cleanedText.length > 50) {
    _dbg_fallback_level = "emergency";
    console.warn(
      `[COGNITIO][M2] m2_fallback_used=EMERGENCY: All ${rawConcepts.length} raw concepts rejected! ` +
      `m2_reject_reasons=${JSON.stringify(rejectReasons)}. ` +
      `Applying emergency fallback extraction on ${cleanedText.length}-char text.`
    );

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
      const label = buildConceptLabel(sentence, "") || words.slice(0, 6).join(" ");
      const definition = compressDefinition(sentence, 200);
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

  // P0 FIX: Post-heuristic scoring — use LENIENT mode for emergency/heuristic concepts
  // to prevent total concept destruction. Only reject the most obvious artifacts.
  const isEmergencyMode = _dbg_fallback_level === "emergency" || _dbg_fallback_level === "heuristic_secours";
  if (concepts.length > 0) {
    const conceptCountBeforeScoring = concepts.length;
    const scoredConcepts = concepts.filter(c => {
      // Use lenient scoring for emergency/heuristic concepts
      const scores = scoreConceptCandidate(c.label, c.definition, isEmergencyMode);
      if (!scores.accepted) {
        console.warn(
          `[COGNITIO][M2][POST_SCORE] Rejecting concept "${c.label}" after scoring (lenient=${isEmergencyMode}):\n` +
          `  editorial=${scores.editorial_artifact_score}, header=${scores.header_noise_score}, ` +
          `validity=${scores.concept_semantic_validity_score}, reason="${scores.reject_reason}"`
        );
        return false;
      }
      return true;
    });

    if (scoredConcepts.length < concepts.length) {
      console.info(
        `[COGNITIO][M2][POST_SCORE] Removed ${concepts.length - scoredConcepts.length} noisy concepts after scoring. ` +
        `${scoredConcepts.length} remain.`
      );
    }

    // P0 CRITICAL FIX: NEVER let post-scoring reduce to 0 on a substantial document.
    // If scoring would eliminate ALL concepts, keep the top N by semantic validity.
    if (scoredConcepts.length === 0 && clean_text.length > 500 && conceptCountBeforeScoring > 0) {
      console.warn(
        `[COGNITIO][M2][SAFEGUARD] Post-scoring would eliminate ALL ${conceptCountBeforeScoring} concepts! ` +
        `Keeping top ${Math.min(5, conceptCountBeforeScoring)} by semantic validity to prevent total destruction.`
      );
      // Sort by semantic validity (descending) and keep at least 3
      const rankedConcepts = concepts
        .map(c => ({ concept: c, validity: scoreConceptCandidate(c.label, c.definition, true).concept_semantic_validity_score }))
        .sort((a, b) => b.validity - a.validity);
      concepts = rankedConcepts.slice(0, Math.max(3, Math.min(5, conceptCountBeforeScoring))).map(r => ({
        ...r.concept,
        uncertain: true, // Mark as uncertain since they failed scoring
        source_confidence: Math.min(r.concept.source_confidence, 0.3),
      }));
      console.info(`[COGNITIO][M2][SAFEGUARD] Preserved ${concepts.length} concepts from destruction.`);
    } else {
      concepts = scoredConcepts;
    }
  }

  // ============================================================
  // P0 ABSOLUTE LAST RESORT: If we STILL have 0 concepts from a
  // 5000+ char document, force-extract from raw text directly.
  // This is the final safety net — never let a real document through
  // with 0 concepts without exhausting every option.
  // ============================================================
  if (concepts.length === 0 && clean_text.length > 5000) {
    _dbg_fallback_level = "absolute_last_resort";
    console.error(
      `[COGNITIO][M2][CRITICAL_ANOMALY] ${clean_text.length}-char document produced 0 concepts after ALL filters!\n` +
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
      `  - Text last 500 chars: "${clean_text.slice(-500)}"\n` +
      `  Activating ABSOLUTE LAST RESORT: raw text chunking with NO scoring.`
    );

    // Extract directly from raw text — NO scoring, NO filtering
    // Just grab substantive lines and force them into concepts
    const substantiveLines = clean_text
      .split(/\n/)
      .map(l => l.trim())
      .filter(l => l.length > 20 && /[a-zA-ZÀ-ÿ]{3,}/.test(l))
      // Quick filter: skip lines that are ONLY editorial (>90% noise tokens)
      .filter(l => {
        const words = l.split(/\s+/);
        const editorialWords = words.filter(w =>
          /^(?:R2C|Rang|CODEX|S-ECN|ECN|ITEM|iKB|MAJ|NOIR|BLEU|ROUGE|VERT|GRIS)$/i.test(w)
        ).length;
        return editorialWords / words.length < 0.5; // Allow lines with <50% editorial words
      });

    for (let i = 0; i < Math.min(10, substantiveLines.length); i++) {
      const line = substantiveLines[i];
      const words = line.split(/\s+/);
      const label = words.slice(0, 7).join(" ");
      concepts.push({
        stable_key: `concept_absolute_${i}`,
        label,
        definition: line.slice(0, 250),
        type: "general",
        criticality: (i < 2 ? 1 : i < 5 ? 2 : 3) as 1 | 2 | 3 | 4,
        criticality_score: i < 2 ? 0.8 : i < 5 ? 0.5 : 0.3,
        bloom_target: "remember",
        relations: [],
        prerequisites: [],
        source_confidence: 0.2,
        source_trace: [{ segment_index: 0, excerpt: line.slice(0, 120) }],
        uncertain: true,
      });
    }

    console.info(`[COGNITIO][M2] Absolute last resort produced ${concepts.length} concepts from ${substantiveLines.length} substantive lines.`);
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

  // P0: Recompute final segment distribution
  const finalConceptsFromSeg0 = concepts.filter(c =>
    c.source_trace.some(t => t.segment_index === 0)
  ).length;
  const finalConceptsFromBody = concepts.filter(c =>
    c.source_trace.some(t => t.segment_index > 0)
  ).length;

  // Compute segment 0 noise score for logging
  const seg0NoiseScore = segments.length > 0
    ? computeSegmentNoiseScore(segments[0].content)
    : 0;

  // P0 comprehensive debug logging with ALL requested metrics
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
    `  m2_rejected_editorial_artifacts_count=${_dbg_rejected_editorial_artifacts_count}\n` +
    `  m2_segment_0_noise_score=${seg0NoiseScore.toFixed(2)}\n` +
    `  m2_segment_0_quarantined=${segment0Quarantined}\n` +
    `  m2_concepts_from_segment_0_count=${finalConceptsFromSeg0}\n` +
    `  m2_concepts_from_body_count=${finalConceptsFromBody}\n` +
    `  m2_body_first_pass_triggered=${_dbg_body_first_pass_triggered}\n` +
    `  m2_secondary_pass_triggered=${_dbg_secondary_pass_triggered}\n` +
    `  m2_secondary_pass_concepts_count=${_dbg_secondary_pass_concepts_count}\n` +
    `  m2_artifact_only_first_pass=${_dbg_artifact_only_first_pass}\n` +
    `  m2_body_only_second_pass_triggered=${_dbg_body_only_second_pass_triggered}\n` +
    `  m2_body_only_second_pass_concepts_count=${_dbg_body_only_second_pass_concepts_count}\n` +
    `  m2_reject_reasons=${JSON.stringify(rejectReasons)}\n` +
    `  m2_fallback_level=${_dbg_fallback_level}\n` +
    `  m2_final_topic="${finalTopic}"\n` +
    `  m2_final_concepts_count=${concepts.length}`
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
      ...(_dbg_fallback_level === "absolute_last_resort" ? [{ code: "ABSOLUTE_LAST_RESORT" as const, message: `Mode secours absolu activé — extraction brute sans scoring sur ${clean_text.length} caractères. Vérifier la qualité des concepts.`, severity: "error" as const }] : []),
      ...(concepts.length === 0 && clean_text.length > 50 ? [{ code: "ALL_CONCEPTS_REJECTED" as const, message: `Le moteur d'extraction n'a pas réussi à identifier de concepts pédagogiques après ${_dbg_body_only_second_pass_triggered ? "un second pass sur le corps du document" : "analyse complète"}. Diagnostic : front_matter=${segment0Quarantined}, body_pass=${_dbg_body_only_second_pass_triggered}, body_concepts=${_dbg_body_only_second_pass_concepts_count}.`, severity: "blocking" as const }] : []),
      ...(concepts.length === 1 && concepts[0]?.uncertain ? [{ code: "SINGLE_UNCERTAIN_CONCEPT" as const, message: `Un seul concept incertain détecté — qualité insuffisante pour une fiche standard.`, severity: "warning" as const }] : []),
    ],
    total_concepts: concepts.length,
    critical_count: concepts.filter((c) => c.criticality === 1).length,
    estimated_complexity: estimatedComplexity,
    document_difficulty_level: docDifficulty as "easy" | "intermediate" | "advanced" | "expert",
    estimated_audience_level: mismatch?.profile_level,
    audience_mismatch_risk: mismatch?.risk_level ?? 0,
    audience_mismatch_message: mismatch?.message,
    // P0: Diagnostic metadata for pipeline hook
    _diag_front_matter_detected: localFrontMatter.has_front_matter,
    _diag_segment_0_quarantined: segment0Quarantined,
    _diag_artifact_only_first_pass: _dbg_artifact_only_first_pass,
    _diag_body_only_second_pass_triggered: _dbg_body_only_second_pass_triggered,
    _diag_body_only_second_pass_concepts_count: _dbg_body_only_second_pass_concepts_count,
    _diag_segment_0_noise_score: seg0NoiseScore,
    _diag_front_matter_lines_count: localFrontMatter.front_matter_lines_detected,
    _diag_front_matter_chars_count: localFrontMatter.front_matter_chars_removed,
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

  const debugEntries: { label: string; scores: ConceptCandidateScores; accepted: boolean; reject_reason: string | null }[] = [];

  function addConcept(label: string, definition: string, criticality: 1 | 2 | 3 | 4, source: string) {
    const cleanLabel = label.trim().replace(/\s{2,}/g, " ");
    if (cleanLabel.length < 3) return;
    const key = cleanLabel.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, "");
    if (seenLabels.has(key)) return;

    // P0 FIX: Use LENIENT scoring in heuristic mode — this is a last-resort
    // extraction, so we must not apply the same strict thresholds that
    // already rejected everything in the normal pipeline.
    const scores = scoreConceptCandidate(cleanLabel, definition, true);
    debugEntries.push({
      label: cleanLabel,
      scores,
      accepted: scores.accepted,
      reject_reason: scores.reject_reason,
    });

    if (!scores.accepted) {
      console.info(
        `[COGNITIO][M2][HEURISTIC] REJECTED concept candidate (lenient mode): "${cleanLabel}"\n` +
        `  editorial_artifact_score=${scores.editorial_artifact_score}\n` +
        `  header_noise_score=${scores.header_noise_score}\n` +
        `  concept_semantic_validity_score=${scores.concept_semantic_validity_score}\n` +
        `  reject_reason="${scores.reject_reason}"\n` +
        `  source=${source}`
      );
      return;
    }

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
    `  labels=[${concepts.map(c => `"${c.label}"`).join(", ")}]\n` +
    `  debug_per_candidate=[\n${debugEntries.map(d =>
      `    { label: "${d.label}", accepted: ${d.accepted}, ` +
      `editorial=${d.scores.editorial_artifact_score}, header=${d.scores.header_noise_score}, ` +
      `validity=${d.scores.concept_semantic_validity_score}` +
      `${d.reject_reason ? `, reject: "${d.reject_reason}"` : ""} }`
    ).join(",\n")}\n  ]`
  );

  return concepts;
}

/**
 * P0 HARDENED: Editorial artifact check for heuristic extraction.
 * Now catches composite headers, branding, R2C labels, and noisy editorial tokens.
 */
function isEditorialArtifactForHeuristic(line: string): boolean {
  const trimmed = line.trim();

  // Basic structural noise
  if (/^(?:COM\s+)?R2C\s*:/i.test(trimmed)) return true;
  if (/^(?:Rang|Item|UE|DFGSM|ECN|EDN)\s+\d/i.test(trimmed)) return true;
  if (/^(?:Page|Version)\s+\d/i.test(trimmed)) return true;
  if (/^(?:Université|Faculté|Institut|École)\s/i.test(trimmed)) return true;
  if (/^en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*$/i.test(trimmed)) return true;
  if (/^©\s/.test(trimmed)) return true;
  if (/^\d+\s*[\/\-–]\s*\d+\s*$/.test(trimmed)) return true;

  // P0: Platform branding — catch CODEX, S-ECN, ECN.COM, MED-LINE, iKB, etc.
  if (/\bCODEX\b/i.test(trimmed)) return true;
  if (/\bS[\s-]*ECN\b/i.test(trimmed)) return true;
  if (/\bECN\.COM\b/i.test(trimmed)) return true;
  if (/\bMED-LINE\b/i.test(trimmed)) return true;
  if (/\bVERNAZOBRES/i.test(trimmed)) return true;
  if (/\biKB\b/.test(trimmed)) return true;
  if (/\bPREP['']?ECN\b/i.test(trimmed)) return true;
  if (/\bELLIPSES\b/i.test(trimmed)) return true;

  // P0: Rang classification anywhere in line
  if (/\bRang\s+[A-Z]\b/i.test(trimmed)) return true;
  if (/\bR2C\b/i.test(trimmed)) return true;

  // P0: Revision/version metadata
  if (/\bRévision\s+\d/i.test(trimmed)) return true;
  if (/\bMAJ\s*[:—–\-]/i.test(trimmed)) return true;
  if (/\bMise\s+à\s+jour\b/i.test(trimmed)) return true;

  // P0: Item numbers
  if (/\bITEM\s+\d+/i.test(trimmed)) return true;

  // P0: Composite header detection using scoring
  const headerScore = computeHeaderNoiseScore(trimmed);
  if (headerScore >= 0.5) return true;

  // P0: High editorial token ratio
  const editorialScore = computeEditorialArtifactScore(trimmed);
  if (editorialScore >= 0.5) return true;

  return false;
}

// ---------- Concept Label Builder ----------

// ---------- Segment 0 Quarantine ----------

/**
 * Detect if segment 0 is heavily polluted with editorial noise.
 * Returns true if segment 0 should be quarantined (excluded from
 * primary concept extraction).
 */
function isSegment0Noisy(segments: SegmentOutput[]): boolean {
  if (segments.length < 2) return false; // Can't quarantine if there's only one segment

  const seg0 = segments[0];
  if (!seg0 || seg0.content.length < 10) return false;

  // Use the editorial noise filter's scoring for comprehensive detection
  const noiseScore = computeSegmentNoiseScore(seg0.content);

  const lines = seg0.content.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return false;

  // Count how many lines are editorial noise
  let noiseLines = 0;
  for (const line of lines) {
    if (isEditorialArtifactForHeuristic(line)) {
      noiseLines++;
    }
  }

  const noiseRatio = noiseLines / lines.length;

  // P0: Lowered threshold from 0.6 to 0.4 — be more aggressive about quarantining
  if (noiseRatio > 0.4 || noiseScore > 0.4) {
    console.info(
      `[COGNITIO][M2] Segment 0 noise analysis: ${noiseLines}/${lines.length} lines are noise ` +
      `(heuristic_ratio=${(noiseRatio * 100).toFixed(0)}%, filter_score=${(noiseScore * 100).toFixed(0)}%). QUARANTINED.`
    );
    return true;
  }

  // Also quarantine if segment 0 title itself is a branding/classification header
  if (seg0.title) {
    const titleScore = computeEditorialArtifactScore(seg0.title);
    const titleHeaderScore = computeHeaderNoiseScore(seg0.title);
    if (titleScore >= 0.4 || titleHeaderScore >= 0.4) {
      console.info(
        `[COGNITIO][M2] Segment 0 title "${seg0.title}" is editorial noise ` +
        `(editorial=${titleScore.toFixed(2)}, header=${titleHeaderScore.toFixed(2)}). QUARANTINED.`
      );
      return true;
    }
  }

  return false;
}

// ---------- Multi-Segment Concept Extraction ----------

/**
 * Extract concepts from a text block using multi-strategy sentence splitting.
 * Used for secondary body-only passes and multi-segment diversity enforcement.
 */
function extractConceptsFromText(
  text: string,
  sourceSegments: SegmentOutput[],
  startIdx: number,
): AnalyzedConcept[] {
  const concepts: AnalyzedConcept[] = [];

  // Multi-strategy sentence extraction
  const joinedText = text.replace(/\n+/g, " ").replace(/\s{2,}/g, " ");

  // Strategy 1: Standard sentence boundary
  let sentences = joinedText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 15);

  // Strategy 2: Line-based (for bullet-point text)
  if (sentences.length < 3 && text.length > 100) {
    const lineSentences = text
      .split(/\n/)
      .map(l => l.trim())
      .filter(l => l.length > 10 && /[a-zA-ZÀ-ÿ]/.test(l));
    if (lineSentences.length > sentences.length) {
      sentences = lineSentences;
    }
  }

  // Strategy 3: Paragraph split
  if (sentences.length < 3 && text.length > 100) {
    const paragraphs = text.split(/\n\s*\n/).flatMap(p => {
      const trimmed = p.trim();
      return trimmed.length > 10 ? [trimmed] : [];
    });
    if (paragraphs.length > sentences.length) {
      sentences = paragraphs;
    }
  }

  for (let i = 0; i < Math.min(15, sentences.length); i++) {
    const sentence = sentences[i].trim();
    if (sentence.length < 10) continue;

    // Skip lines that are editorial noise
    if (isEditorialArtifactForHeuristic(sentence)) continue;

    const words = sentence.split(/\s+/);
    const rawLabel = buildConceptLabel(sentence, "");
    const label = normalizeConceptLabel(rawLabel) || words.slice(0, 5).join(" ");
    const definition = compressDefinition(sentence, 250);

    if (label.length < 3 || definition.length < 10) continue;

    const segIndex = Math.min(i + 1, Math.max(0, (sourceSegments.length || 1) - 1));

    concepts.push({
      stable_key: `concept_body_${startIdx + i}`,
      label,
      definition,
      type: "general",
      criticality: (i < 3 ? 1 : i < 7 ? 2 : 3) as 1 | 2 | 3 | 4,
      criticality_score: i < 3 ? 0.9 : i < 7 ? 0.6 : 0.4,
      bloom_target: determineBlooms(sentence),
      relations: [],
      prerequisites: [],
      source_confidence: 0.55,
      source_trace: [{ segment_index: segIndex, excerpt: sentence.slice(0, 120) }],
      uncertain: false,
    });
  }

  return concepts;
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
