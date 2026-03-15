// ============================================================
// Semantic Quality Engine — QA scores and debug panel data
// for the entire extraction pipeline
// ============================================================

import type { NormalizationResult, ConceptRejectionReason } from "./conceptNormalizer";
import type { EditorialFilterResult } from "./editorialNoiseFilter";
import type { DocumentHierarchy } from "./sectionHeaderDetector";
import type { TableExtractionResult } from "./tableAwareExtractor";
import type { CleanedTopic } from "./topicCleaner";

// ---------- Debug Panel ----------

export interface SemanticDebugPanel {
  // Text metrics
  raw_text_length: number;
  cleaned_text_length: number;
  noise_removal_ratio: number;

  // Front matter metrics
  front_matter_lines_detected: number;
  front_matter_chars_removed: number;
  header_noise_score_before: number;
  header_noise_score_after: number;
  segment_0_noise_score: number;

  // Structure metrics
  detected_headers_count: number;
  detected_sections_count: number;
  max_hierarchy_depth: number;

  // Concept metrics
  raw_concepts_count: number;
  normalized_concepts_count: number;
  rejected_concepts_count: number;
  rejected_editorial_artifacts_count: number;
  reject_reasons: { reason: ConceptRejectionReason; count: number }[];

  // Table metrics
  detected_tables_count: number;
  extracted_table_blocks_count: number;

  // Topic metrics
  main_topic_raw: string;
  main_topic_clean: string;
  topic_source: string;
  topic_rejected_candidates_count: number;

  // Quality scores
  semantic_confidence: number;
  concept_quality_score: number;
  overall_quality_band: QualityLevel;
}

export type QualityLevel = "excellent" | "good" | "medium" | "poor" | "unusable";

// ---------- QA Scores ----------

export interface SemanticQAScores {
  topic_cleanliness_score: number;        // 0-1: How clean is the main topic
  section_coverage_score: number;         // 0-1: How well are sections detected
  table_extraction_score: number;         // 0-1: How well are tables extracted
  concept_normalization_score: number;    // 0-1: Quality of concept normalization
  semantic_relevance_score: number;       // 0-1: Overall semantic relevance
  pedagogical_compression_score: number;  // 0-1: How well content is compressed for learning
  overall_semantic_score: number;         // 0-1: Weighted composite
}

// ---------- Input Aggregation ----------

export interface SemanticPipelineResults {
  editorial_filter: EditorialFilterResult;
  hierarchy: DocumentHierarchy;
  table_extraction: TableExtractionResult;
  concept_normalization: NormalizationResult;
  topic: CleanedTopic;
  original_text_length: number;
  total_concepts_in_source: number;
  /** Front matter detection metrics */
  front_matter_lines_detected?: number;
  front_matter_chars_removed?: number;
  header_noise_score_before?: number;
  header_noise_score_after?: number;
  segment_0_noise_score?: number;
}

// ---------- Main Functions ----------

/**
 * Build the debug panel from all pipeline stage results.
 */
export function buildDebugPanel(results: SemanticPipelineResults): SemanticDebugPanel {
  const noiseRemovalRatio = results.original_text_length > 0
    ? 1 - (results.editorial_filter.cleaned_text_length / results.original_text_length)
    : 0;

  const semanticConfidence = computeSemanticConfidence(results);

  return {
    raw_text_length: results.original_text_length,
    cleaned_text_length: results.editorial_filter.cleaned_text_length,
    noise_removal_ratio: Math.round(noiseRemovalRatio * 100) / 100,

    front_matter_lines_detected: results.front_matter_lines_detected ?? 0,
    front_matter_chars_removed: results.front_matter_chars_removed ?? 0,
    header_noise_score_before: results.header_noise_score_before ?? 0,
    header_noise_score_after: results.header_noise_score_after ?? 0,
    segment_0_noise_score: results.segment_0_noise_score ?? 0,

    detected_headers_count: results.hierarchy.detected_headers_count,
    detected_sections_count: results.hierarchy.detected_sections_count,
    max_hierarchy_depth: results.hierarchy.max_depth,

    raw_concepts_count: results.concept_normalization.raw_concepts_count,
    normalized_concepts_count: results.concept_normalization.normalized_concepts_count,
    rejected_concepts_count: results.concept_normalization.rejected_concepts_count,
    rejected_editorial_artifacts_count: results.concept_normalization.rejected_editorial_artifacts_count,
    reject_reasons: results.concept_normalization.reject_reasons,

    detected_tables_count: results.table_extraction.detected_tables_count,
    extracted_table_blocks_count: results.table_extraction.extracted_blocks_count,

    main_topic_raw: results.topic.raw_topic,
    main_topic_clean: results.topic.clean_topic,
    topic_source: results.topic.source,
    topic_rejected_candidates_count: results.topic.rejected_candidates.length,

    semantic_confidence: semanticConfidence,
    concept_quality_score: results.concept_normalization.concept_quality_score,
    overall_quality_band: getQualityLevel(semanticConfidence),
  };
}

/**
 * Compute all QA scores for the semantic extraction pipeline.
 */
export function computeSemanticQAScores(results: SemanticPipelineResults): SemanticQAScores {
  const topicCleanliness = computeTopicCleanlinessScore(results);
  const sectionCoverage = computeSectionCoverageScore(results);
  const tableExtraction = computeTableExtractionScore(results);
  const conceptNormalization = computeConceptNormalizationScore(results);
  const semanticRelevance = computeSemanticRelevanceScore(results);
  const pedagogicalCompression = computePedagogicalCompressionScore(results);

  // Weighted composite
  const overall =
    topicCleanliness * 0.15 +
    sectionCoverage * 0.20 +
    tableExtraction * 0.10 +
    conceptNormalization * 0.25 +
    semanticRelevance * 0.20 +
    pedagogicalCompression * 0.10;

  return {
    topic_cleanliness_score: round2(topicCleanliness),
    section_coverage_score: round2(sectionCoverage),
    table_extraction_score: round2(tableExtraction),
    concept_normalization_score: round2(conceptNormalization),
    semantic_relevance_score: round2(semanticRelevance),
    pedagogical_compression_score: round2(pedagogicalCompression),
    overall_semantic_score: round2(overall),
  };
}

/**
 * Determine if content passes QA based on semantic scores.
 * No longer validates 100 for structurally complete but semantically weak content.
 */
export function evaluateSemanticQA(scores: SemanticQAScores): {
  passed: boolean;
  blocking_issues: string[];
  warnings: string[];
} {
  const blocking: string[] = [];
  const warnings: string[] = [];

  // Blocking conditions
  if (scores.topic_cleanliness_score < 0.3) {
    blocking.push("Topic extraction failed — main topic is polluted or undetectable");
  }
  if (scores.concept_normalization_score < 0.3) {
    blocking.push("Concept normalization critically low — most concepts are artifacts");
  }
  if (scores.semantic_relevance_score < 0.25) {
    blocking.push("Semantic relevance critically low — content may not be extractable");
  }
  if (scores.overall_semantic_score < 0.35) {
    blocking.push("Overall semantic quality below minimum threshold");
  }

  // Warnings
  if (scores.section_coverage_score < 0.5) {
    warnings.push("Section detection is weak — document structure may be flat");
  }
  if (scores.table_extraction_score < 0.3 && scores.table_extraction_score > 0) {
    warnings.push("Table extraction quality is low — some tables may be poorly converted");
  }
  if (scores.pedagogical_compression_score < 0.5) {
    warnings.push("Pedagogical compression is weak — content may be too verbose for missions");
  }
  if (scores.concept_normalization_score < 0.5) {
    warnings.push("Many concepts have low quality — definitions may need improvement");
  }

  return {
    passed: blocking.length === 0,
    blocking_issues: blocking,
    warnings,
  };
}

// ---------- Score Computation ----------

function computeTopicCleanlinessScore(results: SemanticPipelineResults): number {
  let score = results.topic.confidence;

  if (results.topic.clean_topic.length < 5) score -= 0.3;
  if (results.topic.clean_topic.length > 100) score -= 0.15;
  if (results.topic.rejected_candidates.length > 5) score -= 0.15;
  if (results.topic.source === "fallback") score -= 0.3;
  if (results.topic.source === "heading_level_1") score += 0.05;

  return clamp01(score);
}

function computeSectionCoverageScore(results: SemanticPipelineResults): number {
  const { hierarchy } = results;

  if (hierarchy.detected_headers_count === 0) return 0.2; // No structure at all

  let score = 0.5;

  // More headers = better structure
  if (hierarchy.detected_headers_count >= 3) score += 0.15;
  if (hierarchy.detected_headers_count >= 6) score += 0.1;

  // Deeper hierarchy = better
  if (hierarchy.max_depth >= 2) score += 0.1;
  if (hierarchy.max_depth >= 3) score += 0.05;

  // Sections with sub-sections
  const chaptersWithSubs = hierarchy.chapters.filter((c) => c.sub_sections.length > 0).length;
  if (chaptersWithSubs > 0) score += 0.1;

  return clamp01(score);
}

function computeTableExtractionScore(results: SemanticPipelineResults): number {
  if (results.table_extraction.detected_tables_count === 0) return 0.5; // N/A — no tables

  const blocksPerTable = results.table_extraction.extracted_blocks_count /
    Math.max(1, results.table_extraction.detected_tables_count);

  let score = 0.4;
  if (blocksPerTable >= 1) score += 0.2;
  if (blocksPerTable >= 2) score += 0.1;
  score += Math.min(0.3, results.table_extraction.total_pedagogical_value * 0.3);

  return clamp01(score);
}

function computeConceptNormalizationScore(results: SemanticPipelineResults): number {
  const { concept_normalization } = results;

  if (concept_normalization.raw_concepts_count === 0) return 0.1;

  const acceptanceRate = concept_normalization.normalized_concepts_count /
    Math.max(1, concept_normalization.raw_concepts_count);

  let score = 0.3;
  score += acceptanceRate * 0.3;
  score += Math.min(0.3, concept_normalization.concept_quality_score * 0.4);

  // Penalize if too many rejections
  if (concept_normalization.rejected_concepts_count > concept_normalization.normalized_concepts_count) {
    score -= 0.15;
  }

  return clamp01(score);
}

function computeSemanticRelevanceScore(results: SemanticPipelineResults): number {
  let score = 0.4;

  // Topic confidence
  score += results.topic.confidence * 0.2;

  // Concept coverage relative to source
  if (results.total_concepts_in_source > 0) {
    const coverage = results.concept_normalization.normalized_concepts_count /
      Math.max(1, results.total_concepts_in_source);
    score += Math.min(0.25, coverage * 0.25);
  }

  // Noise removal shouldn't be too aggressive
  const noiseRatio = results.original_text_length > 0
    ? 1 - (results.editorial_filter.cleaned_text_length / results.original_text_length)
    : 0;
  if (noiseRatio > 0.5) score -= 0.1; // Lost too much content
  if (noiseRatio < 0.05 && results.original_text_length > 1000) score -= 0.05; // Suspiciously little noise

  // Quality of concepts
  score += results.concept_normalization.concept_quality_score * 0.15;

  return clamp01(score);
}

function computePedagogicalCompressionScore(results: SemanticPipelineResults): number {
  let score = 0.5;

  // Good compression = many concepts from reasonable text
  if (results.editorial_filter.cleaned_text_length > 0) {
    const conceptDensity = results.concept_normalization.normalized_concepts_count /
      (results.editorial_filter.cleaned_text_length / 1000);
    if (conceptDensity >= 2) score += 0.15;
    if (conceptDensity >= 5) score += 0.1;
  }

  // Table blocks add pedagogical value
  if (results.table_extraction.extracted_blocks_count > 0) score += 0.1;

  // Hierarchy helps pedagogical structure
  if (results.hierarchy.max_depth >= 2) score += 0.1;

  return clamp01(score);
}

function computeSemanticConfidence(results: SemanticPipelineResults): number {
  const scores = computeSemanticQAScores(results);
  return scores.overall_semantic_score;
}

// ---------- Helpers ----------

function getQualityLevel(score: number): QualityLevel {
  if (score >= 0.85) return "excellent";
  if (score >= 0.70) return "good";
  if (score >= 0.55) return "medium";
  if (score >= 0.40) return "poor";
  return "unusable";
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
