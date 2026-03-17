// ============================================================
// Quick Analysis Service — Light/fast concept extraction
// Skips full M2 pipeline, produces a rapid overview suitable
// for preview or quick feedback before full pipeline execution.
// ============================================================

import {
  normalizeConceptLabel,
  rejectConceptArtifact,
  scoreConceptCandidate,
  extractCleanMainTopic,
  cleanMainTopic,
  reconstructChapterHierarchy,
} from "@/lib/cognitio-semantic-cleaning";
import { extractAndCleanTopic } from "./topicCleaner";
import type { SegmentOutput } from "@/domain/cognitio/contracts";

export interface QuickAnalysisResult {
  /** Detected main topic */
  main_topic: string;
  /** Quick concept list (label + confidence only) */
  concepts: QuickConcept[];
  /** Estimated document complexity: "simple" | "moderate" | "complex" */
  complexity: "simple" | "moderate" | "complex";
  /** Chapter structure detected */
  chapters: string[];
  /** Word count */
  word_count: number;
  /** Estimated analysis readiness: 0-1 */
  readiness: number;
  /** Processing time in ms */
  duration_ms: number;
}

export interface QuickConcept {
  label: string;
  confidence: number;
  is_artifact: boolean;
}

/**
 * Perform a quick analysis of document segments.
 * This is much faster than the full M2 pipeline:
 * - No LLM calls
 * - No persistence
 * - No confusion pair detection
 * - No document understanding layer
 * - No front matter analysis
 * - Simple heuristic concept extraction
 */
export function runQuickAnalysis(
  cleanText: string,
  segments: SegmentOutput[],
): QuickAnalysisResult {
  const start = performance.now();

  // 1. Topic detection
  const topicResult = extractAndCleanTopic(
    segments.map(s => ({ title: s.title, content: s.content, hierarchy_level: s.hierarchy_level })),
  );
  const mainTopic = topicResult.clean_topic !== "Sujet non identifié"
    ? cleanMainTopic(topicResult.clean_topic)
    : extractFallbackTopic(segments);

  // 2. Chapter detection
  const chapters = reconstructChapterHierarchy(segments.map(s => ({
    title: s.title,
    content: s.content,
    hierarchy_level: s.hierarchy_level,
  }))).map(chapter => chapter.title);

  // 3. Quick concept extraction via heuristics
  const concepts = extractQuickConcepts(cleanText, segments);

  // 4. Complexity estimation
  const wordCount = cleanText.split(/\s+/).length;
  const complexity = estimateComplexity(wordCount, segments.length, concepts.length);

  // 5. Readiness score
  const validConcepts = concepts.filter(c => !c.is_artifact && c.confidence >= 0.5);
  const readiness = Math.min(1, Math.max(0,
    (wordCount >= 100 ? 0.3 : wordCount >= 50 ? 0.1 : 0) +
    (validConcepts.length >= 3 ? 0.3 : validConcepts.length >= 1 ? 0.15 : 0) +
    (mainTopic !== "Sujet non identifié" ? 0.2 : 0) +
    (segments.length >= 2 ? 0.1 : 0) +
    (topicResult.confidence * 0.1),
  ));

  const duration_ms = performance.now() - start;

  return {
    main_topic: mainTopic,
    concepts,
    complexity,
    chapters,
    word_count: wordCount,
    readiness,
    duration_ms,
  };
}

// ---------- Internal helpers ----------

function extractFallbackTopic(segments: SegmentOutput[]): string {
  // Use first segment title as fallback
  for (const seg of segments) {
    if (seg.title && seg.title.length > 3 && seg.title.length < 100) {
      return cleanMainTopic(seg.title);
    }
  }
  return "Sujet non identifié";
}

function extractQuickConcepts(text: string, segments: SegmentOutput[]): QuickConcept[] {
  const candidates = new Set<string>();

  // Strategy 1: Extract from segment titles
  for (const seg of segments) {
    if (seg.title && seg.hierarchy_level >= 2) {
      const label = normalizeConceptLabel(seg.title);
      if (label && label.length >= 3 && label.length <= 60) {
        candidates.add(label);
      }
    }
  }

  // Strategy 2: Extract bold/emphasis patterns from text
  const boldPattern = /\*\*([^*]+)\*\*/g;
  let match;
  while ((match = boldPattern.exec(text)) !== null) {
    const label = normalizeConceptLabel(match[1]);
    if (label && label.length >= 3 && label.length <= 60) {
      candidates.add(label);
    }
  }

  // Strategy 3: Extract capitalized multi-word phrases (potential proper nouns/terms)
  const capitalPattern = /\b([A-Z][a-zéèêëàâîïôûùç]+(?:\s+[A-Z][a-zéèêëàâîïôûùç]+)+)\b/g;
  while ((match = capitalPattern.exec(text)) !== null) {
    const label = normalizeConceptLabel(match[1]);
    if (label && label.length >= 5 && label.length <= 60) {
      candidates.add(label);
    }
  }

  // Score and filter
  const concepts: QuickConcept[] = [];
  for (const label of candidates) {
    if (rejectConceptArtifact({ label, definition: "" }).rejected) continue;

    const scores = scoreConceptCandidate(label, "");
    concepts.push({
      label,
      confidence: scores.accepted ? scores.concept_semantic_validity_score : 0.2,
      is_artifact: scores.editorial_artifact_score >= 0.4 || scores.header_noise_score >= 0.4,
    });
  }

  // Sort by confidence, limit to top 15
  return concepts
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 15);
}

function estimateComplexity(
  wordCount: number,
  segmentCount: number,
  conceptCount: number,
): "simple" | "moderate" | "complex" {
  const score =
    (wordCount >= 2000 ? 2 : wordCount >= 500 ? 1 : 0) +
    (segmentCount >= 8 ? 2 : segmentCount >= 4 ? 1 : 0) +
    (conceptCount >= 10 ? 2 : conceptCount >= 5 ? 1 : 0);

  if (score >= 4) return "complex";
  if (score >= 2) return "moderate";
  return "simple";
}
