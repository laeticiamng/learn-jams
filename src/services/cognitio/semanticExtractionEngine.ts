// ============================================================
// Semantic Extraction Engine — Orchestrates the full extraction
// pipeline: noise filter → headers → tables → concepts → topic → QA
// ============================================================

import { filterEditorialNoise, type EditorialFilterResult } from "./editorialNoiseFilter";
import { detectSectionHeaders, buildDocumentHierarchy, type DocumentHierarchy } from "./sectionHeaderDetector";
import { extractTables, type TableExtractionResult } from "./tableAwareExtractor";
import { normalizeConcepts, groupAndDeduplicateConcepts, type NormalizationResult } from "./conceptNormalizer";
import { extractAndCleanTopic, type CleanedTopic } from "./topicCleaner";
import {
  buildDebugPanel,
  computeSemanticQAScores,
  evaluateSemanticQA,
  type SemanticDebugPanel,
  type SemanticQAScores,
  type SemanticPipelineResults,
} from "./semanticQualityEngine";

// ---------- Input/Output Types ----------

export interface SemanticExtractionInput {
  raw_text: string;
  segments: { title: string | null; content: string; hierarchy_level: number }[];
  raw_concepts: { label: string; definition: string; stable_key: string; criticality: number }[];
}

export interface SemanticExtractionOutput {
  // Cleaned data
  cleaned_text: string;
  clean_topic: string;
  hierarchy: DocumentHierarchy;
  table_extraction: TableExtractionResult;
  normalized_concepts: NormalizationResult;
  topic: CleanedTopic;

  // QA
  qa_scores: SemanticQAScores;
  qa_passed: boolean;
  qa_blocking_issues: string[];
  qa_warnings: string[];

  // Debug
  debug_panel: SemanticDebugPanel;

  // Editorial filter details
  editorial_filter: EditorialFilterResult;
}

// ---------- Main Orchestrator ----------

/**
 * Run the full semantic extraction pipeline.
 * This is the single entry point for all extraction work.
 *
 * Pipeline stages:
 * 1. Editorial noise filter (clean raw text)
 * 2. Section header detection (reconstruct hierarchy)
 * 3. Table-aware extraction (detect and transform tables)
 * 4. Concept normalization (clean, validate, group concepts)
 * 5. Topic cleaning (extract clean main topic)
 * 6. Semantic QA (compute scores, generate debug panel)
 */
export function runSemanticExtraction(input: SemanticExtractionInput): SemanticExtractionOutput {
  // Stage 1: Editorial noise filter
  const editorialFilter = filterEditorialNoise(input.raw_text);

  // Stage 2: Section header detection
  const cleanedLines = editorialFilter.cleaned_text.split("\n");
  const detectedHeaders = detectSectionHeaders(cleanedLines);
  const hierarchy = buildDocumentHierarchy(cleanedLines, detectedHeaders);

  // Stage 3: Table-aware extraction
  const tableExtraction = extractTables(cleanedLines);

  // Stage 4: Concept normalization
  const conceptNormalization = normalizeConcepts(input.raw_concepts);
  const { groups: conceptGroups } = groupAndDeduplicateConcepts(conceptNormalization.accepted);

  // Stage 5: Topic cleaning
  const topic = extractAndCleanTopic(input.segments);

  // Override hierarchy main_topic with cleaned topic if better
  if (topic.confidence > 0.5) {
    hierarchy.main_topic = topic.clean_topic;
  }

  // Stage 6: Semantic QA
  const pipelineResults: SemanticPipelineResults = {
    editorial_filter: editorialFilter,
    hierarchy,
    table_extraction: tableExtraction,
    concept_normalization: conceptNormalization,
    topic,
    original_text_length: input.raw_text.length,
    total_concepts_in_source: input.raw_concepts.length,
  };

  const qaScores = computeSemanticQAScores(pipelineResults);
  const qaEval = evaluateSemanticQA(qaScores);
  const debugPanel = buildDebugPanel(pipelineResults);

  return {
    cleaned_text: editorialFilter.cleaned_text,
    clean_topic: topic.clean_topic,
    hierarchy,
    table_extraction: tableExtraction,
    normalized_concepts: conceptNormalization,
    topic,
    qa_scores: qaScores,
    qa_passed: qaEval.passed,
    qa_blocking_issues: qaEval.blocking_issues,
    qa_warnings: qaEval.warnings,
    debug_panel: debugPanel,
    editorial_filter: editorialFilter,
  };
}
