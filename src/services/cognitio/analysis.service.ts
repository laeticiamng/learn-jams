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
import { runDocumentUnderstanding, deriveMissionUniverseHint, classifyDomainFromText } from "./documentUnderstandingLayer";
import { extractAndCleanTopic, validateTopic, cleanTopicString } from "./topicCleaner";

// ---------- Body-Only Topic Extraction Helper ----------

/**
 * P0 FIX: Extract a clean topic from body-only segments.
 * Used after body-only second pass to recompute the main topic.
 */
function extractAndCleanTopicFromSegments(
  segments: { title: string | null; content: string; hierarchy_level: number }[]
): string | null {
  const result = extractAndCleanTopic(segments);
  if (result.confidence >= 0.4 && result.clean_topic !== "Sujet non identifié") {
    return result.clean_topic;
  }
  // Try segment titles directly
  for (const seg of segments) {
    if (!seg.title) continue;
    const cleaned = cleanTopicString(seg.title);
    if (cleaned.length >= 5 && !validateTopic(cleaned)) {
      return cleaned;
    }
  }
  return null;
}

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

  // === Document Understanding Layer (pre-comprehension) ===
  // Runs BEFORE concept extraction to build global semantic understanding.
  // Acts like an expert teacher reading the whole document first.
  const docUnderstanding = runDocumentUnderstanding(clean_text, segments, input.source_type);
  let missionUniverseHint = deriveMissionUniverseHint(docUnderstanding);
  // P0 FIX: Track domain before body pass for before/after comparison
  const domainBeforeBodyPass = docUnderstanding.domain_classification;

  // === Level 1: Extract clean main topic ===
  // Use understanding layer's true topic if it's better than raw extraction
  const rawMainTopic = extractCleanMainTopic(segments);
  // P0 FIX: Use let — mainTopic may be recomputed after body-only second pass
  let mainTopic = docUnderstanding.true_topic !== "Sujet non identifié"
    && docUnderstanding.comprehension_confidence > 0.4
    ? docUnderstanding.true_topic
    : rawMainTopic;
  console.info(`[COGNITIO][M2] m2_final_topic="${mainTopic}" (understanding_topic="${docUnderstanding.true_topic}", raw_topic="${rawMainTopic}")`);

  // === Level 2: Reconstruct chapter hierarchy ===
  const chapters = reconstructChapterHierarchy(segments);
  console.info(`[COGNITIO][M2] m2_chapters_detected=${chapters.length}, titles=[${chapters.map(c => `"${c.title}"`).join(", ")}]`);

  // === SEGMENT 0 QUARANTINE ===
  // Detect if segment 0 is heavily noisy (front matter / branding / R2C headers).
  // If so, quarantine it: exclude from primary concept extraction.
  // P0 FIX: changed from const to let — quarantine can be applied retroactively
  // when front_matter is detected and all concepts come from segment 0.
  // P0 FIX: pass front matter detection result to isSegment0Noisy for proactive quarantine.
  let segment0Quarantined = isSegment0Noisy(segments, localFrontMatter.has_front_matter);
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

  // P0 DEFINITIVE FIX: Track RAW concept segment distribution BEFORE filtering.
  // This is critical because the body-pass trigger must use pre-filter counts,
  // not post-filter counts (which may be 0 after artifact rejection).
  const rawConceptsFromSegment0Count = rawConcepts.filter(c =>
    c.source_trace.some(t => t.segment_index === 0)
  ).length;
  const rawConceptsFromBodyCount = rawConcepts.filter(c =>
    c.source_trace.some(t => t.segment_index > 0)
  ).length;

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

  // Compute POST-filter segment distribution metrics
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
  let _dbg_secondary_pass_raw_concepts_count = 0;
  let _dbg_secondary_pass_filtered_concepts_count = 0;
  let _dbg_secondary_pass_body_concepts_count = 0;

  // P0 AUDIT: Log filter results with rejected label samples
  console.info(
    `[COGNITIO][M2] Filter results:\n` +
    `  m2_raw_concepts=${rawConcepts.length}\n` +
    `  m2_raw_concepts_from_seg0=${rawConceptsFromSegment0Count}\n` +
    `  m2_raw_concepts_from_body=${rawConceptsFromBodyCount}\n` +
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
  // P0 DEFINITIVE FIX: CHECK TOPIC + COMPUTE ARTIFACT DIAGNOSTICS
  // Must happen BEFORE body-pass decision.
  // ============================================================
  const mainTopicIsEditorialArtifact = (() => {
    const cleanedT = cleanMainTopic(mainTopic);
    if (cleanedT.length < 3) return true;
    if (/^R2C\b|^Rang\s+[A-Z]|^COM\s+R2C|^CODEX\b|^S[\s-]*ECN\b|^ITEM\s+\d|^Révision\s+\d/i.test(cleanedT)) return true;
    const artScore = computeEditorialArtifactScore(mainTopic);
    return artScore >= 0.4;
  })();

  const allConceptsAreArtifacts = concepts.length > 0 && concepts.every(c => {
    const scores = scoreConceptCandidate(c.label, c.definition);
    return !scores.accepted || scores.editorial_artifact_score >= 0.4 || scores.header_noise_score >= 0.4;
  });

  const allConceptsAreUncertain = concepts.length > 0 && concepts.every(c =>
    c.uncertain === true || c.source_confidence < 0.4
  );

  const artifactRatio = rawConcepts.length > 0
    ? _dbg_rejected_editorial_artifacts_count / rawConcepts.length
    : (concepts.length === 0 ? 1 : 0);

  // ============================================================
  // P0 FIX: Compute GRANULAR body concept validity metrics.
  // These distinguish "concepts from body" from "VALID concepts from body".
  // A concept from the body that is an artifact or uncertain is NOT valid.
  // ============================================================
  let validBodyConceptsCount = 0;
  let uncertainBodyConceptsCount = 0;
  let editorialBodyConceptsCount = 0;
  let validConceptsCount = 0;

  for (const c of concepts) {
    const fromBody = c.source_trace?.some(t => t.segment_index > 0) ?? false;
    const isUncertain = c.uncertain === true || c.source_confidence < 0.4;
    const scores = scoreConceptCandidate(c.label, c.definition);
    const isArtifact = !scores.accepted || scores.editorial_artifact_score >= 0.4 || scores.header_noise_score >= 0.4;
    const isValid = !isUncertain && !isArtifact;

    if (isValid) validConceptsCount++;

    if (fromBody) {
      if (isValid) validBodyConceptsCount++;
      if (isUncertain) uncertainBodyConceptsCount++;
      if (isArtifact) editorialBodyConceptsCount++;
    }
  }

  console.info(
    `[COGNITIO][M2] Body concept validity:\n` +
    `  concepts_from_body=${conceptsFromBodyCount}\n` +
    `  valid_body_concepts=${validBodyConceptsCount}\n` +
    `  uncertain_body_concepts=${uncertainBodyConceptsCount}\n` +
    `  editorial_body_concepts=${editorialBodyConceptsCount}\n` +
    `  total_valid_concepts=${validConceptsCount}`
  );

  // ============================================================
  // P0 DEFINITIVE FIX: SINGLE SOURCE OF TRUTH FOR BODY-ONLY PASS
  // Use shouldTriggerBodyOnlySecondPass() — the centralized decision.
  // This replaces ALL previous ad-hoc trigger conditions.
  // ============================================================
  const seg0QuarantineBefore = segment0Quarantined;
  const bodyPassDecision = shouldTriggerBodyOnlySecondPass({
    front_matter_detected: localFrontMatter.has_front_matter,
    concepts_from_segment_0: conceptsFromSegment0Count,
    raw_concepts_from_segment_0: rawConceptsFromSegment0Count,
    concepts_from_body: conceptsFromBodyCount,
    valid_body_concepts_count: validBodyConceptsCount,
    valid_concepts_count: validConceptsCount,
    main_topic_is_editorial_artifact: mainTopicIsEditorialArtifact,
    artifact_ratio: artifactRatio,
    all_concepts_uncertain: allConceptsAreUncertain,
    raw_concepts_count: rawConcepts.length,
    filtered_concepts_count: filteredConcepts.length,
    segments_count: segments.length,
    editorial_body_concepts_count: editorialBodyConceptsCount,
  });

  console.info(
    `[COGNITIO][M2] BODY_PASS_DECISION:\n` +
    `  trigger=${bodyPassDecision.trigger}\n` +
    `  reason=${bodyPassDecision.reason}\n` +
    `  front_matter=${localFrontMatter.has_front_matter}\n` +
    `  raw_concepts_from_seg0=${rawConceptsFromSegment0Count}\n` +
    `  filtered_concepts_from_seg0=${conceptsFromSegment0Count}\n` +
    `  concepts_from_body=${conceptsFromBodyCount}\n` +
    `  main_topic_is_editorial_artifact=${mainTopicIsEditorialArtifact}\n` +
    `  artifact_ratio=${artifactRatio.toFixed(2)}\n` +
    `  all_concepts_artifacts=${allConceptsAreArtifacts}\n` +
    `  all_concepts_uncertain=${allConceptsAreUncertain}`
  );

  if (bodyPassDecision.trigger) {
    // STEP E: Quarantine segment 0 (retroactive if not already done)
    if (!segment0Quarantined) {
      segment0Quarantined = true;
      console.warn(
        `[COGNITIO][M2] RETROACTIVE QUARANTINE: seg0_quarantined_before=false → seg0_quarantined_after=true\n` +
        `  reason: ${bodyPassDecision.reason}`
      );
    }

    // Clear segment 0 concepts (unreliable)
    const conceptsBeforeClear = concepts.length;
    concepts = concepts.filter(c =>
      c.source_trace.some(t => t.segment_index > 0)
    );
    if (conceptsBeforeClear > concepts.length) {
      console.info(
        `[COGNITIO][M2] Cleared ${conceptsBeforeClear - concepts.length} seg0-only concepts.`
      );
    }

    _dbg_fallback_level = "secondary_body_pass";
    _dbg_secondary_pass_triggered = true;
    _dbg_artifact_only_first_pass = allConceptsAreArtifacts || artifactRatio >= 0.8;
    _dbg_body_only_second_pass_triggered = true;

    console.warn(
      `[COGNITIO][M2] BODY_ONLY_SECOND_PASS TRIGGERED: reason=${bodyPassDecision.reason}\n` +
      `  Relaunching extraction on body segments only (segments 1-${segments.length - 1}).`
    );

    // STEP F: Body-only extraction
    // Use ORIGINAL input segments (not pre-cleaned) to preserve real content
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
      _dbg_secondary_pass_raw_concepts_count += bodyConcepts.length;
      // Offset segment indices — body segments start at index 1 in the original document
      for (const bc of bodyConcepts) {
        for (const trace of bc.source_trace) {
          if (trace.segment_index === 0) {
            trace.segment_index = 1; // Minimum body segment index
          } else {
            trace.segment_index = Math.min(trace.segment_index + 1, originalSegments.length - 1);
          }
        }
        const { rejected } = rejectConceptArtifact(bc);
        if (!rejected) {
          concepts.push(bc);
          globalIdx++;
          _dbg_secondary_pass_concepts_count++;
          _dbg_body_only_second_pass_concepts_count++;
          _dbg_secondary_pass_filtered_concepts_count++;
          _dbg_secondary_pass_body_concepts_count++;
        }
      }
      console.info(
        `[COGNITIO][M2] Secondary body pass: ${cleanedBodyText.length} chars → ` +
        `${bodyConcepts.length} candidates → ${_dbg_body_only_second_pass_concepts_count} accepted.`
      );
    }

    // Per-segment fallback if joined body extraction failed
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
        _dbg_secondary_pass_raw_concepts_count += segConcepts.length;
        for (const sc of segConcepts) {
          const { rejected } = rejectConceptArtifact(sc);
          if (!rejected) {
            sc.source_trace = [{ segment_index: si, excerpt: sc.source_trace[0]?.excerpt || "" }];
            concepts.push(sc);
            globalIdx++;
            _dbg_body_only_second_pass_concepts_count++;
            _dbg_secondary_pass_filtered_concepts_count++;
            _dbg_secondary_pass_body_concepts_count++;
          }
        }
      }
      console.info(
        `[COGNITIO][M2] Per-segment body extraction: ${_dbg_body_only_second_pass_concepts_count} total concepts extracted.`
      );
    }

    // STEP F (cont): Recompute topic from body-only segments
    if (_dbg_body_only_second_pass_triggered) {
      const bodyOnlySegments = segments.slice(1);
      if (bodyOnlySegments.length > 0) {
        const bodyTopicResult = extractAndCleanTopicFromSegments(bodyOnlySegments);
        if (bodyTopicResult && bodyTopicResult.length >= 5) {
          console.info(
            `[COGNITIO][M2] TOPIC RECOMPUTED from body: "${mainTopic}" → "${bodyTopicResult}"`
          );
          mainTopic = bodyTopicResult;
        } else if (concepts.length > 0) {
          // Derive topic from first body concept
          const firstBodyConcept = concepts.find(c =>
            c.source_trace.some(t => t.segment_index > 0)
          ) || concepts[0];
          if (firstBodyConcept?.label && firstBodyConcept.label.length >= 5) {
            console.info(
              `[COGNITIO][M2] TOPIC DERIVED from first body concept: "${mainTopic}" → "${firstBodyConcept.label}"`
            );
            mainTopic = firstBodyConcept.label;
          }
        }

        // P0 FIX: Recalculate domain classification from body-only text
        // The domain classifier may have been misled by front matter / editorial noise.
        const bodyTextForDomain = bodyOnlySegments.map(s => s.content).join("\n\n");
        const domainAfterBodyPass = classifyDomainFromText(bodyTextForDomain, mainTopic);
        if (domainAfterBodyPass !== domainBeforeBodyPass) {
          console.info(
            `[COGNITIO][M2] DOMAIN RECALCULATED after body pass: "${domainBeforeBodyPass}" → "${domainAfterBodyPass}"`
          );
          docUnderstanding.domain_classification = domainAfterBodyPass;
          missionUniverseHint = deriveMissionUniverseHint(docUnderstanding);
        }
      }
    }
  }

  // P0 GUARD RAIL: MULTI-SEGMENT CONCEPT DIVERSITY CHECK
  // If all accepted concepts come from segment 0 and we have more segments,
  // force extraction from later segments to ensure concept diversity.
  // Only runs if body-only second pass was NOT already triggered.
  if (concepts.length > 0 && segments.length > 1 && !_dbg_body_only_second_pass_triggered) {
    const allFromSeg0 = concepts.every(c =>
      c.source_trace.every(t => t.segment_index === 0)
    );
    if (allFromSeg0) {
      console.warn(
        `[COGNITIO][M2] MULTI_SEGMENT_GUARD: All ${concepts.length} concepts from segment 0. ` +
        `Forcing extraction from body segments for diversity.`
      );
      _dbg_body_first_pass_triggered = true;
      _dbg_body_only_second_pass_triggered = true;
      // Use original input segments for diversity extraction
      const divBodySegments = originalSegments.slice(1);
      const divBodyText = divBodySegments.map(s => s.content).join("\n\n");
      const cleanedDivBodyText = filterEditorialNoise(divBodyText).cleaned_text;

      if (cleanedDivBodyText.length > 50) {
        const diversityConcepts = extractConceptsFromText(cleanedDivBodyText, divBodySegments, globalIdx);
        let diversityAccepted = 0;
        for (const dc of diversityConcepts) {
          for (const trace of dc.source_trace) {
            if (trace.segment_index === 0) {
              trace.segment_index = 1;
            } else {
              trace.segment_index = Math.min(trace.segment_index + 1, originalSegments.length - 1);
            }
          }
          const { rejected } = rejectConceptArtifact(dc);
          if (!rejected) {
            concepts.push(dc);
            globalIdx++;
            diversityAccepted++;
            _dbg_body_only_second_pass_concepts_count++;
            _dbg_secondary_pass_body_concepts_count++;
          }
        }
        console.info(
          `[COGNITIO][M2] Multi-segment diversity: ${diversityConcepts.length} candidates → ` +
          `${diversityAccepted} accepted, ${concepts.length} total concepts.`
        );
      }
    }
  }

  // P0 FIX: If all concepts were rejected but we have non-empty text,
  // force-extract minimal concepts so downstream never sees 0 without cause.
  // P0 DEFINITIVE FIX: Use BODY-ONLY text if segment 0 is quarantined,
  // and assign segment indices based on actual position.
  if (concepts.length === 0 && cleanedText.length > 50) {
    _dbg_fallback_level = "emergency";

    // P0 FIX: Prefer body-only text for emergency extraction when seg0 is quarantined
    const emergencySourceText = (segment0Quarantined && originalSegments.length > 1)
      ? filterEditorialNoise(originalSegments.slice(1).map(s => s.content).join("\n\n")).cleaned_text
      : cleanedText;
    // Minimum segment index for emergency concepts (skip seg0 if quarantined)
    const emergencyMinSegIndex = segment0Quarantined ? 1 : 0;

    console.warn(
      `[COGNITIO][M2] m2_fallback_used=EMERGENCY: All ${rawConcepts.length} raw concepts rejected! ` +
      `m2_reject_reasons=${JSON.stringify(rejectReasons)}. ` +
      `Applying emergency fallback extraction on ${emergencySourceText.length}-char text ` +
      `(source=${segment0Quarantined ? "body_only" : "full_text"}).`
    );

    const continuousText = emergencySourceText.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();

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

      // P0 FIX: Assign segment_index based on actual position, not always 0.
      // Use emergencyMinSegIndex to skip seg0 if quarantined.
      const segIdx = Math.min(
        emergencyMinSegIndex + Math.floor(i * Math.max(1, originalSegments.length - emergencyMinSegIndex) / Math.max(1, emergencySentences.length)),
        Math.max(0, originalSegments.length - 1)
      );

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
        source_trace: [{ segment_index: segIdx, excerpt: sentence.slice(0, 120) }],
        uncertain: true,
      });
    }

    console.info(`[COGNITIO][M2] Emergency fallback produced ${concepts.length} concepts from ${emergencySentences.length} candidate sentences (min_seg_idx=${emergencyMinSegIndex}).`);
  }

  // ============================================================
  // P0 GUARD: HEURISTIC LAST-RESORT FALLBACK
  // If we STILL have 0 concepts from a substantial document,
  // extract from segment titles + headings heuristically.
  // P0 FIX: Use body-only segments if seg0 is quarantined.
  // ============================================================
  if (concepts.length === 0 && clean_text.length > 500) {
    _dbg_fallback_level = "heuristic_secours";
    console.warn(
      `[COGNITIO][M2][ANOMALY] CRITICAL: ${clean_text.length}-char document → 0 concepts after ALL fallbacks!\n` +
      `  m2_chapters=${chapters.length}, m2_raw_concepts=${rawConcepts.length}, m2_reject_reasons=${JSON.stringify(rejectReasons)}\n` +
      `  seg0_quarantined=${segment0Quarantined}\n` +
      `  Activating HEURISTIC LAST-RESORT extraction.`
    );

    // P0 FIX: Use body-only text/segments if seg0 is quarantined
    const heuristicText = (segment0Quarantined && originalSegments.length > 1)
      ? originalSegments.slice(1).map(s => s.content).join("\n\n")
      : clean_text;
    const heuristicSegments = (segment0Quarantined && originalSegments.length > 1)
      ? originalSegments.slice(1)
      : segments;
    const heuristicConcepts = extractHeuristicConcepts(heuristicText, heuristicSegments);
    // P0 FIX: Offset segment indices if using body-only segments
    if (segment0Quarantined && originalSegments.length > 1) {
      for (const hc of heuristicConcepts) {
        for (const trace of hc.source_trace) {
          trace.segment_index = Math.min(trace.segment_index + 1, originalSegments.length - 1);
          if (trace.segment_index === 0) trace.segment_index = 1;
        }
      }
    }
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
  // P0 POST-SCORING BODY-ONLY SECOND PASS
  // After all scoring, re-evaluate using shouldTriggerBodyOnlySecondPass.
  // If body pass was NOT already triggered and conditions now warrant it
  // (e.g., post-scoring killed all good concepts), trigger it with LENIENT scoring.
  // ============================================================
  if (concepts.length > 0 && originalSegments.length > 1 && !_dbg_body_only_second_pass_triggered) {
    const postScoringAllArtifacts = concepts.every(c => {
      const scores = scoreConceptCandidate(c.label, c.definition);
      return !scores.accepted || scores.editorial_artifact_score >= 0.4 || scores.header_noise_score >= 0.4;
    });
    const postScoringAllFromSeg0 = concepts.every(c =>
      c.source_trace.every(t => t.segment_index === 0)
    );
    const postScoringNoBodyConcepts = !concepts.some(c =>
      c.source_trace.some(t => t.segment_index > 0)
    );

    // Re-evaluate using shouldTriggerBodyOnlySecondPass with updated metrics
    const postScoringArtifactRatio = postScoringAllArtifacts ? 1 : artifactRatio;
    // Recompute valid body concepts after scoring
    let postScoringValidBodyConcepts = 0;
    let postScoringEditorialBodyConcepts = 0;
    let postScoringValidConcepts = 0;
    for (const c of concepts) {
      const fromBody = c.source_trace?.some(t => t.segment_index > 0) ?? false;
      const isUncertain = c.uncertain === true || c.source_confidence < 0.4;
      const sc = scoreConceptCandidate(c.label, c.definition);
      const isArtifact = !sc.accepted || sc.editorial_artifact_score >= 0.4 || sc.header_noise_score >= 0.4;
      if (!isUncertain && !isArtifact) postScoringValidConcepts++;
      if (fromBody) {
        if (!isUncertain && !isArtifact) postScoringValidBodyConcepts++;
        if (isArtifact) postScoringEditorialBodyConcepts++;
      }
    }
    const postScoringDecision = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: localFrontMatter.has_front_matter,
      concepts_from_segment_0: postScoringAllFromSeg0 ? concepts.length : conceptsFromSegment0Count,
      raw_concepts_from_segment_0: rawConceptsFromSegment0Count,
      concepts_from_body: postScoringNoBodyConcepts ? 0 : conceptsFromBodyCount,
      valid_body_concepts_count: postScoringValidBodyConcepts,
      valid_concepts_count: postScoringValidConcepts,
      main_topic_is_editorial_artifact: mainTopicIsEditorialArtifact,
      artifact_ratio: postScoringArtifactRatio,
      all_concepts_uncertain: concepts.every(c => c.uncertain || c.source_confidence < 0.4),
      raw_concepts_count: rawConcepts.length,
      filtered_concepts_count: concepts.length,
      segments_count: segments.length,
      editorial_body_concepts_count: postScoringEditorialBodyConcepts,
    });

    if (postScoringDecision.trigger) {
      console.warn(
        `[COGNITIO][M2] POST_SCORING_BODY_PASS: After post-scoring, body pass triggered.\n` +
        `  reason=${postScoringDecision.reason}\n` +
        `  all_artifacts=${postScoringAllArtifacts}, all_from_seg0=${postScoringAllFromSeg0}, ` +
        `no_body_concepts=${postScoringNoBodyConcepts}.`
      );

      _dbg_body_only_second_pass_triggered = true;
      _dbg_artifact_only_first_pass = postScoringAllArtifacts;
      segment0Quarantined = true;

      // Clear artifact-only concepts to make room for body concepts
      if (postScoringAllArtifacts) {
        concepts = [];
      }

      const bodySegmentsForRetry = originalSegments.slice(1);
      const bodyTextRetry = bodySegmentsForRetry.map(s => s.content).join("\n\n");
      const bodyFMRetry = detectFrontMatter(bodyTextRetry);
      const bodyAfterFMRetry = bodyFMRetry.has_front_matter ? bodyFMRetry.body_text : bodyTextRetry;
      const bodyFilterRetry = filterEditorialNoise(bodyAfterFMRetry);
      const cleanedBodyRetry = bodyFilterRetry.cleaned_text;

      console.info(
        `[COGNITIO][M2] POST_SCORING_BODY_PASS: body_text=${bodyTextRetry.length} chars → ` +
        `after_fm=${bodyAfterFMRetry.length} → after_filter=${cleanedBodyRetry.length}`
      );

      if (cleanedBodyRetry.length > 50) {
        const retryConcepts = extractConceptsFromText(cleanedBodyRetry, bodySegmentsForRetry, globalIdx);
        for (const rc of retryConcepts) {
          for (const trace of rc.source_trace) {
            trace.segment_index = Math.min(trace.segment_index + 1, originalSegments.length - 1);
            if (trace.segment_index === 0) trace.segment_index = 1;
          }
          // Use LENIENT scoring to give body concepts the best chance
          const scores = scoreConceptCandidate(rc.label, rc.definition, true);
          if (scores.accepted) {
            concepts.push(rc);
            globalIdx++;
            _dbg_body_only_second_pass_concepts_count++;
          }
        }
        console.info(
          `[COGNITIO][M2] POST_SCORING_BODY_PASS: ${retryConcepts.length} candidates → ` +
          `${_dbg_body_only_second_pass_concepts_count} accepted (lenient scoring).`
        );
      }

      // Per-segment fallback if joined body extraction failed
      if (concepts.length === 0) {
        console.warn(
          `[COGNITIO][M2] POST_SCORING_BODY_PASS: Joined extraction failed. ` +
          `Trying per-segment on ${originalSegments.length - 1} body segments.`
        );
        for (let si = 1; si < originalSegments.length && concepts.length < 15; si++) {
          const seg = originalSegments[si];
          if (seg.content.length < 30) continue;
          const segCleaned = filterEditorialNoise(seg.content).cleaned_text;
          if (segCleaned.length < 20) continue;
          const segConcepts = extractConceptsFromText(segCleaned, [seg], globalIdx);
          for (const sc of segConcepts) {
            sc.source_trace = [{ segment_index: si, excerpt: sc.source_trace[0]?.excerpt || "" }];
            const scores = scoreConceptCandidate(sc.label, sc.definition, true);
            if (scores.accepted) {
              concepts.push(sc);
              globalIdx++;
              _dbg_body_only_second_pass_concepts_count++;
            }
          }
        }
        console.info(
          `[COGNITIO][M2] POST_SCORING_BODY_PASS per-segment: ${_dbg_body_only_second_pass_concepts_count} total concepts.`
        );
      }
    }
  }

  // ============================================================
  // P0 ABSOLUTE LAST RESORT: If we STILL have 0 concepts from a
  // 5000+ char document, force-extract from raw text directly.
  // P0 FIX: Use body-only text if seg0 quarantined, fix segment attribution.
  // ============================================================
  if (concepts.length === 0 && clean_text.length > 5000) {
    _dbg_fallback_level = "absolute_last_resort";

    // P0 FIX: Use body-only text if segment 0 is quarantined
    const absoluteSourceText = (segment0Quarantined && originalSegments.length > 1)
      ? originalSegments.slice(1).map(s => s.content).join("\n\n")
      : clean_text;
    const absoluteMinSegIdx = segment0Quarantined ? 1 : 0;

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
      `  - seg0_quarantined: ${segment0Quarantined}\n` +
      `  - source: ${segment0Quarantined ? "body_only" : "full_text"} (${absoluteSourceText.length} chars)\n` +
      `  Activating ABSOLUTE LAST RESORT: raw text chunking with NO scoring.`
    );

    const substantiveLines = absoluteSourceText
      .split(/\n/)
      .map(l => l.trim())
      .filter(l => l.length > 20 && /[a-zA-ZÀ-ÿ]{3,}/.test(l))
      .filter(l => {
        const words = l.split(/\s+/);
        const editorialWords = words.filter(w =>
          /^(?:R2C|Rang|CODEX|S-ECN|ECN|ITEM|iKB|MAJ|NOIR|BLEU|ROUGE|VERT|GRIS)$/i.test(w)
        ).length;
        return editorialWords / words.length < 0.5;
      });

    for (let i = 0; i < Math.min(10, substantiveLines.length); i++) {
      const line = substantiveLines[i];
      const words = line.split(/\s+/);
      const label = words.slice(0, 7).join(" ");
      // P0 FIX: Assign body segment indices, not segment 0
      const segIdx = Math.min(
        absoluteMinSegIdx + Math.floor(i * Math.max(1, originalSegments.length - absoluteMinSegIdx) / Math.max(1, substantiveLines.length)),
        Math.max(0, originalSegments.length - 1)
      );
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
        source_trace: [{ segment_index: segIdx, excerpt: line.slice(0, 120) }],
        uncertain: true,
      });
    }

    console.info(`[COGNITIO][M2] Absolute last resort produced ${concepts.length} concepts from ${substantiveLines.length} substantive lines (min_seg_idx=${absoluteMinSegIdx}).`);
  }

  // ============================================================
  // P0 FIX: LLM FALLBACK — Document Understanding Concept Extraction
  // If after body-only second pass AND all heuristic fallbacks,
  // we STILL have 0 valid concepts on a substantial document,
  // use the Document Understanding Layer as a structured concept extractor.
  // This produces at least: a true topic, 3-8 clean concepts, 3-6 sections.
  // ============================================================
  let _diag_llm_fallback_triggered = false;
  let _diag_llm_fallback_concepts_count = 0;

  if (concepts.length === 0 && clean_text.length > 200) {
    _diag_llm_fallback_triggered = true;
    console.warn(
      `[COGNITIO][M2][LLM_FALLBACK] 0 concepts from ${clean_text.length}-char document after ALL passes. ` +
      `Activating Document Understanding fallback extraction.`
    );

    // Use the Document Understanding Layer's pre-computed learning core and sections
    // to generate structured concepts as a last resort
    const duFallbackTopic = docUnderstanding.true_topic !== "Sujet non identifié"
      ? docUnderstanding.true_topic
      : mainTopic;

    // Generate concepts from learning core axes
    const coreAxes = docUnderstanding.learning_core.slice(0, 8);
    const criticalAxes = docUnderstanding.critical_axes.slice(0, 6);
    const pedagogicalSections = docUnderstanding.section_map
      .filter(s => !s.is_noise && s.title.length >= 5)
      .slice(0, 6);

    // Priority 1: Critical axes as concepts
    for (let i = 0; i < criticalAxes.length && concepts.length < 8; i++) {
      const axis = criticalAxes[i];
      const matchingSection = pedagogicalSections.find(s =>
        s.title.toLowerCase().includes(axis.toLowerCase()) ||
        axis.toLowerCase().includes(s.title.toLowerCase())
      );
      const definition = matchingSection?.content_summary
        ? `${axis} — ${matchingSection.content_summary}`
        : `Axe d'apprentissage critique du document : ${axis}`;

      concepts.push({
        stable_key: `concept_llm_fallback_${concepts.length}`,
        label: axis,
        definition,
        type: docUnderstanding.domain_classification,
        criticality: (i < 2 ? 1 : i < 4 ? 2 : 3) as 1 | 2 | 3 | 4,
        criticality_score: i < 2 ? 0.9 : i < 4 ? 0.7 : 0.5,
        bloom_target: "understand",
        relations: [],
        prerequisites: [],
        source_confidence: 0.5,
        source_trace: [{
          segment_index: Math.min(i + 1, Math.max(0, segments.length - 1)),
          excerpt: definition.slice(0, 120),
        }],
        uncertain: false,
      });
    }

    // Priority 2: Learning core axes not already covered
    for (let i = 0; i < coreAxes.length && concepts.length < 8; i++) {
      const axis = coreAxes[i];
      const alreadyCovered = concepts.some(c =>
        c.label.toLowerCase() === axis.toLowerCase()
      );
      if (alreadyCovered) continue;

      concepts.push({
        stable_key: `concept_llm_core_${concepts.length}`,
        label: axis,
        definition: `Axe d'apprentissage identifié par compréhension du document : ${axis}`,
        type: docUnderstanding.domain_classification,
        criticality: 2 as 1 | 2 | 3 | 4,
        criticality_score: 0.6,
        bloom_target: "understand",
        relations: [],
        prerequisites: [],
        source_confidence: 0.45,
        source_trace: [{
          segment_index: Math.min(i + 1, Math.max(0, segments.length - 1)),
          excerpt: axis,
        }],
        uncertain: false,
      });
    }

    // Priority 3: Pedagogical section titles as concepts
    for (let i = 0; i < pedagogicalSections.length && concepts.length < 8; i++) {
      const section = pedagogicalSections[i];
      const alreadyCovered = concepts.some(c =>
        c.label.toLowerCase() === section.title.toLowerCase()
      );
      if (alreadyCovered) continue;

      concepts.push({
        stable_key: `concept_llm_section_${concepts.length}`,
        label: section.title,
        definition: section.content_summary || `Section pédagogique : ${section.title}`,
        type: docUnderstanding.domain_classification,
        criticality: 3 as 1 | 2 | 3 | 4,
        criticality_score: 0.4,
        bloom_target: "remember",
        relations: [],
        prerequisites: [],
        source_confidence: 0.4,
        source_trace: [{
          segment_index: Math.min(i + 1, Math.max(0, segments.length - 1)),
          excerpt: section.content_summary?.slice(0, 120) || section.title,
        }],
        uncertain: false,
      });
    }

    _diag_llm_fallback_concepts_count = concepts.length;

    // Override topic if understanding layer found a good one
    if (duFallbackTopic.length >= 5 && duFallbackTopic !== "Sujet non identifié") {
      mainTopic = duFallbackTopic;
    }

    console.info(
      `[COGNITIO][M2][LLM_FALLBACK] Produced ${_diag_llm_fallback_concepts_count} concepts ` +
      `from Document Understanding Layer. Topic: "${mainTopic}". ` +
      `Sources: critical_axes=${criticalAxes.length}, learning_core=${coreAxes.length}, ` +
      `sections=${pedagogicalSections.length}.`
    );
  }

  // P0: If topic is "Sujet non identifié" or editorial artifact but we have concepts, derive from concepts
  let finalTopic = mainTopic;
  const finalTopicIsEditorial = (() => {
    const ct = cleanMainTopic(finalTopic);
    return ct.length < 3 || /^R2C\b|^Rang\s+[A-Z]|^COM\s+R2C|^CODEX\b|^S[\s-]*ECN\b|^ITEM\s+\d|^Révision\s+\d/i.test(ct) ||
      computeEditorialArtifactScore(finalTopic) >= 0.4;
  })();

  if ((finalTopic === "Sujet non identifié" || finalTopic.length < 3 || finalTopicIsEditorial) && concepts.length > 0) {
    // Prefer body concepts for topic derivation
    const bodyConceptForTopic = concepts.find(c =>
      c.source_trace.some(t => t.segment_index > 0) && c.criticality <= 2
    ) || concepts.find(c => c.criticality <= 2) || concepts[0];
    if (bodyConceptForTopic?.label && bodyConceptForTopic.label.length >= 5) {
      console.info(`[COGNITIO][M2] Topic derived from concept: "${finalTopic}" → "${bodyConceptForTopic.label}" (was_editorial=${finalTopicIsEditorial})`);
      finalTopic = bodyConceptForTopic.label;
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

  // P0 DEFINITIVE FIX: Use the centralized decision for trigger condition display.
  // bodyPassDecision was computed above using shouldTriggerBodyOnlySecondPass().
  const bodyPassTriggerConditionMet = bodyPassDecision.trigger;
  const bodyPassTriggerReason = bodyPassDecision.reason;

  console.info(
    `[COGNITIO][M2] FINAL SUMMARY:\n` +
    `  --- IMPORT / CLEANING ---\n` +
    `  raw_text_length=${clean_text.length}\n` +
    `  clean_text_length=${cleanedText.length}\n` +
    `  front_matter_detected=${localFrontMatter.has_front_matter}\n` +
    `  front_matter_score=${localFrontMatter.segment_0_noise_score}\n` +
    `  front_matter_lines_removed=${localFrontMatter.front_matter_lines_detected}\n` +
    `  front_matter_chars_removed=${localFrontMatter.front_matter_chars_removed}\n` +
    `  segment_0_noise_score=${seg0NoiseScore.toFixed(2)}\n` +
    `  --- PRIMARY PASS ---\n` +
    `  primary_topic="${mainTopic}"\n` +
    `  primary_concepts_count=${rawConcepts.length}\n` +
    `  primary_concepts_from_seg0=${rawConceptsFromSegment0Count}\n` +
    `  primary_concepts_from_body=${rawConceptsFromBodyCount}\n` +
    `  primary_filtered_count=${filteredConcepts.length}\n` +
    `  primary_artifact_ratio=${artifactRatio.toFixed(2)}\n` +
    `  main_topic_is_editorial_artifact=${mainTopicIsEditorialArtifact}\n` +
    `  --- BODY-ONLY SECOND PASS ---\n` +
    `  body_pass_trigger_condition_met=${bodyPassTriggerConditionMet}\n` +
    `  body_pass_trigger_reason=${bodyPassTriggerReason}\n` +
    `  body_pass_triggered=${_dbg_body_only_second_pass_triggered}\n` +
    `  seg0_quarantined_before=${seg0QuarantineBefore}\n` +
    `  seg0_quarantined_after=${segment0Quarantined}\n` +
    `  secondary_input_length=${_dbg_body_only_second_pass_triggered ? originalSegments.slice(1).map(s => s.content).join("").length : 0}\n` +
    `  secondary_topic="${_dbg_body_only_second_pass_triggered ? finalTopic : "n/a"}"\n` +
    `  secondary_raw_concepts_count=${_dbg_secondary_pass_raw_concepts_count}\n` +
    `  secondary_filtered_concepts_count=${_dbg_secondary_pass_filtered_concepts_count}\n` +
    `  secondary_body_concepts_count=${_dbg_secondary_pass_body_concepts_count}\n` +
    `  --- FINAL SEMANTIC GATE ---\n` +
    `  valid_concepts_count=${concepts.filter(c => !c.uncertain && c.source_confidence >= 0.4).length}\n` +
    `  uncertain_concepts_count=${concepts.filter(c => c.uncertain || c.source_confidence < 0.4).length}\n` +
    `  artifact_ratio=${artifactRatio.toFixed(2)}\n` +
    `  final_concepts_from_seg0=${finalConceptsFromSeg0}\n` +
    `  final_concepts_from_body=${finalConceptsFromBody}\n` +
    `  final_concepts_count=${concepts.length}\n` +
    `  final_topic="${finalTopic}"\n` +
    `  fallback_level=${_dbg_fallback_level}\n` +
    `  reject_reasons=${JSON.stringify(rejectReasons)}`
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
      ...(concepts.length === 0 && clean_text.length > 50 ? [{ code: "ALL_CONCEPTS_REJECTED" as const, message: `Le moteur d'extraction a épuisé toutes ses méthodes automatiques (front matter, quarantaine seg0, second pass corps, recalcul domaine, fallback compréhension). Diagnostic : front_matter=${segment0Quarantined}, body_pass=${_dbg_body_only_second_pass_triggered}, llm_fallback=${_diag_llm_fallback_triggered}, body_concepts=${_dbg_body_only_second_pass_concepts_count}.`, severity: "blocking" as const }] : []),
      ...(concepts.length === 1 && concepts[0]?.uncertain ? [{ code: "SINGLE_UNCERTAIN_CONCEPT" as const, message: `Un seul concept incertain détecté — qualité insuffisante pour une fiche standard.`, severity: "warning" as const }] : []),
    ],
    total_concepts: concepts.length,
    critical_count: concepts.filter((c) => c.criticality === 1).length,
    estimated_complexity: estimatedComplexity,
    document_difficulty_level: docDifficulty as "easy" | "intermediate" | "advanced" | "expert",
    estimated_audience_level: mismatch?.profile_level,
    audience_mismatch_risk: mismatch?.risk_level ?? 0,
    audience_mismatch_message: mismatch?.message,
    // Document Understanding Layer output
    document_understanding: docUnderstanding,
    mission_universe_hint: missionUniverseHint,
    // P0 DEFINITIVE: Diagnostic metadata for pipeline hook
    _diag_front_matter_detected: localFrontMatter.has_front_matter,
    _diag_segment_0_quarantined: segment0Quarantined,
    _diag_segment_0_quarantined_retroactive: seg0QuarantineBefore === false && segment0Quarantined === true,
    _diag_artifact_only_first_pass: _dbg_artifact_only_first_pass,
    _diag_body_only_second_pass_triggered: _dbg_body_only_second_pass_triggered,
    _diag_body_only_second_pass_concepts_count: _dbg_body_only_second_pass_concepts_count,
    _diag_segment_0_noise_score: seg0NoiseScore,
    _diag_front_matter_lines_count: localFrontMatter.front_matter_lines_detected,
    _diag_front_matter_chars_count: localFrontMatter.front_matter_chars_removed,
    _diag_body_pass_trigger_condition_met: bodyPassTriggerConditionMet,
    _diag_body_pass_reason_if_not_triggered: bodyPassTriggerReason,
    // P0: Secondary pass diagnostics
    _diag_secondary_pass_topic: _dbg_body_only_second_pass_triggered ? finalTopic : undefined,
    _diag_secondary_pass_concepts_count: _dbg_body_only_second_pass_concepts_count,
    // P0 FIX: Granular body concept validity tracking
    _diag_concepts_from_segment_0_count: finalConceptsFromSeg0,
    _diag_concepts_from_body_count: finalConceptsFromBody,
    _diag_valid_body_concepts_count: concepts.filter(c => {
      const fromBody = c.source_trace?.some(t => t.segment_index > 0) ?? false;
      if (!fromBody) return false;
      const isUncertain = c.uncertain === true || c.source_confidence < 0.4;
      const s = scoreConceptCandidate(c.label, c.definition);
      return !isUncertain && s.accepted && s.editorial_artifact_score < 0.4 && s.header_noise_score < 0.4;
    }).length,
    _diag_uncertain_body_concepts_count: concepts.filter(c => {
      const fromBody = c.source_trace?.some(t => t.segment_index > 0) ?? false;
      return fromBody && (c.uncertain === true || c.source_confidence < 0.4);
    }).length,
    _diag_editorial_body_concepts_count: concepts.filter(c => {
      const fromBody = c.source_trace?.some(t => t.segment_index > 0) ?? false;
      if (!fromBody) return false;
      const s = scoreConceptCandidate(c.label, c.definition);
      return !s.accepted || s.editorial_artifact_score >= 0.4 || s.header_noise_score >= 0.4;
    }).length,
    _diag_all_concepts_uncertain: concepts.length > 0 && concepts.every(c => c.uncertain === true || c.source_confidence < 0.4),
    _diag_main_topic_is_editorial_artifact: mainTopicIsEditorialArtifact,
    _diag_artifact_ratio: artifactRatio,
    // P0 FIX: Domain classifier before/after body pass
    _diag_domain_before_body_pass: domainBeforeBodyPass,
    _diag_domain_after_body_pass: docUnderstanding.domain_classification,
    // P0 FIX: Cleaning metrics
    _diag_front_matter_chars_removed: localFrontMatter.front_matter_chars_removed,
    _diag_editorial_lines_removed: localFrontMatter.front_matter_lines_detected,
    _diag_header_noise_score_before: localFrontMatter.header_noise_score_before,
    _diag_header_noise_score_after: localFrontMatter.header_noise_score_after,
    // P0 FIX: LLM fallback
    _diag_llm_fallback_triggered: _diag_llm_fallback_triggered,
    _diag_llm_fallback_concepts_count: _diag_llm_fallback_concepts_count,
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

// ---------- Body-Only Second Pass Trigger — SINGLE SOURCE OF TRUTH ----------

/**
 * P0 DEFINITIVE FIX: Centralized decision function for triggering
 * the body-only second pass. This is the SINGLE source of truth.
 *
 * Returns { trigger: true, reason } if ANY of these conditions hold:
 * A. main topic is an editorial artifact
 * B. artifact ratio >= 0.8
 * C. valid_concepts_count === 0 (no valid concepts at all)
 * D. all concepts uncertain + raw concepts exist
 * E. valid_body_concepts_count === 0 (even if concepts_from_body > 0, they're all invalid)
 * F. front_matter detected + first pass dominated by editorial concepts
 * G. all raw concepts rejected + some existed
 * H. front_matter + concepts from seg0 (raw OR filtered) + none from body
 *
 * CRITICAL: concepts_from_body > 0 does NOT block the second pass.
 * Only VALID body concepts (non-artifact, non-uncertain) can prevent the retry.
 */
/** Input for body-only second-pass trigger evaluation. All numeric fields accept undefined and default to 0. */
export interface BodyOnlySecondPassInput {
  front_matter_detected?: boolean;
  concepts_from_segment_0?: number;       // post-filter count
  raw_concepts_from_segment_0?: number;   // PRE-filter count (before artifact rejection)
  concepts_from_body?: number;
  valid_body_concepts_count?: number;      // body concepts that are valid (non-artifact, non-uncertain)
  valid_concepts_count?: number;           // total valid concepts (all segments)
  main_topic_is_editorial_artifact?: boolean;
  artifact_ratio?: number;
  all_concepts_uncertain?: boolean;
  raw_concepts_count?: number;
  filtered_concepts_count?: number;
  segments_count?: number;
  editorial_body_concepts_count?: number;  // body concepts that are editorial artifacts
  /** Optional: analysis mode tag for observability */
  analysis_mode?: "full" | "body_only" | "quick";
}

export function shouldTriggerBodyOnlySecondPass(
  diag: BodyOnlySecondPassInput,
): { trigger: boolean; reason: string } {
  // Safe defaults: treat undefined/NaN numerics as 0, booleans as false
  const d = {
    front_matter_detected: diag.front_matter_detected ?? false,
    concepts_from_segment_0: Number.isFinite(diag.concepts_from_segment_0) ? diag.concepts_from_segment_0! : 0,
    raw_concepts_from_segment_0: Number.isFinite(diag.raw_concepts_from_segment_0) ? diag.raw_concepts_from_segment_0! : 0,
    concepts_from_body: Number.isFinite(diag.concepts_from_body) ? diag.concepts_from_body! : 0,
    valid_body_concepts_count: Number.isFinite(diag.valid_body_concepts_count) ? diag.valid_body_concepts_count! : 0,
    valid_concepts_count: Number.isFinite(diag.valid_concepts_count) ? diag.valid_concepts_count! : 0,
    main_topic_is_editorial_artifact: diag.main_topic_is_editorial_artifact ?? false,
    artifact_ratio: Number.isFinite(diag.artifact_ratio) ? diag.artifact_ratio! : 0,
    all_concepts_uncertain: diag.all_concepts_uncertain ?? false,
    raw_concepts_count: Number.isFinite(diag.raw_concepts_count) ? diag.raw_concepts_count! : 0,
    filtered_concepts_count: Number.isFinite(diag.filtered_concepts_count) ? diag.filtered_concepts_count! : 0,
    segments_count: Number.isFinite(diag.segments_count) ? diag.segments_count! : 0,
    editorial_body_concepts_count: Number.isFinite(diag.editorial_body_concepts_count) ? diag.editorial_body_concepts_count! : 0,
  };

  // Cannot do body-only pass with a single segment
  if (d.segments_count <= 1) {
    return { trigger: false, reason: "single_segment" };
  }

  // Condition A: main topic is an editorial artifact
  if (d.main_topic_is_editorial_artifact) {
    return { trigger: true, reason: "editorial_artifact_topic" };
  }

  // Condition B: high artifact ratio (>= 80%)
  if (d.artifact_ratio >= SECOND_PASS_THRESHOLDS.HIGH_ARTIFACT_RATIO && d.raw_concepts_count > 0) {
    return { trigger: true, reason: "high_artifact_ratio" };
  }

  // Condition C: no valid concepts at all (but some survived filtering)
  if (d.valid_concepts_count === 0 && d.filtered_concepts_count > 0) {
    return { trigger: true, reason: "zero_valid_concepts" };
  }

  // Condition D: all concepts uncertain + some raw concepts exist
  if (d.all_concepts_uncertain && d.raw_concepts_count > 0) {
    return { trigger: true, reason: "all_concepts_uncertain" };
  }

  // Condition E: body concepts exist but NONE are valid
  if (d.concepts_from_body > 0 && d.valid_body_concepts_count === 0) {
    return { trigger: true, reason: "no_valid_body_concepts" };
  }

  // Condition F: front_matter detected + first pass dominated by editorial concepts
  if (d.front_matter_detected && d.editorial_body_concepts_count > 0 &&
      d.editorial_body_concepts_count >= d.concepts_from_body) {
    return { trigger: true, reason: "front_matter_editorial_dominated" };
  }

  // Condition G: all raw concepts rejected + some existed
  if (d.filtered_concepts_count === 0 && d.raw_concepts_count > 0) {
    return { trigger: true, reason: "all_concepts_rejected" };
  }

  // Condition H: front matter + concepts from seg0 only + none from body
  if (d.front_matter_detected &&
      (d.concepts_from_segment_0 > 0 || d.raw_concepts_from_segment_0 > 0) &&
      d.concepts_from_body === 0) {
    return { trigger: true, reason: "front_matter_with_seg0_only_concepts" };
  }

  return { trigger: false, reason: "conditions_not_met" };
}

// ---------- Second Pass Thresholds ----------
// Centralized constants to avoid magic numbers scattered across conditions

export const SECOND_PASS_THRESHOLDS = {
  /** Artifact ratio above which second pass is triggered */
  HIGH_ARTIFACT_RATIO: 0.8,
  /** Minimum valid concepts for semantic gate (full analysis) */
  MIN_VALID_CONCEPTS_FULL: 2,
  /** Minimum valid concepts for semantic gate (body-only second pass) */
  MIN_VALID_CONCEPTS_BODY_ONLY: 1,
  /** Minimum body concepts for semantic gate (full analysis) */
  MIN_BODY_CONCEPTS_FULL: 1,
  /** Minimum body concepts for semantic gate (body-only second pass) — relaxed since all concepts are from body */
  MIN_BODY_CONCEPTS_BODY_ONLY: 0,
  /** Editorial artifact ratio above which gate blocks (full) */
  MAX_ARTIFACT_RATIO_FULL: 0.8,
  /** Editorial artifact ratio above which gate blocks (body-only) */
  MAX_ARTIFACT_RATIO_BODY_ONLY: 0.9,
  /** Mission gate: minimum valid concepts */
  MISSION_MIN_VALID_CONCEPTS: 2,
  /** Mission gate: max artifact ratio */
  MISSION_MAX_ARTIFACT_RATIO: 0.7,
} as const;

// ---------- Segment 0 Quarantine ----------

/**
 * Detect if segment 0 is heavily polluted with editorial noise.
 * Returns true if segment 0 should be quarantined (excluded from
 * primary concept extraction).
 */
function isSegment0Noisy(segments: SegmentOutput[], frontMatterDetected?: boolean): boolean {
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

  // P0 FIX: Also quarantine if front matter was detected in segment 0.
  // Front matter presence is a strong signal that segment 0 contains editorial noise,
  // even if the heuristic noise ratio is below threshold.
  if (frontMatterDetected) {
    // Check if segment 0 content overlaps with detected front matter
    const seg0FrontMatter = detectFrontMatter(seg0.content);
    if (seg0FrontMatter.has_front_matter) {
      console.info(
        `[COGNITIO][M2] Segment 0 contains front matter ` +
        `(${seg0FrontMatter.front_matter_lines_detected} lines, ` +
        `${seg0FrontMatter.front_matter_chars_removed} chars removed). QUARANTINED.`
      );
      return true;
    }
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
