// ============================================================
// COGNITIO Mappers — DB row → domain & domain → DB row
// ============================================================

import type {
  SourceDocument,
  DocumentSegment,
  CourseProfile,
  Concept,
  ConfusionPair,
  AmbiguousZone,
  SourceTrace,
  IngestionWarning,
} from "./types";
import type {
  M1_Output,
  M2_Output,
  AnalyzedConcept,
  AnalyzedConfusionPair,
  AnalyzedTrap,
  AnalysisConfidence,
  SegmentOutput,
  SourceIssue,
  DetailedSourceType,
  DetectedStructureType,
  ReasoningType,
} from "./contracts";

// ---------- Safe JSON parsing ----------

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

// ---------- DB Row → Domain ----------

export function toSourceDocument(row: Record<string, unknown>): SourceDocument {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    original_filename: (row.original_filename as string) ?? null,
    content_type: row.content_type as SourceDocument["content_type"],
    source_type: (row.source_type as SourceDocument["source_type"]) ?? "unknown",
    source_language: (row.source_language as string) ?? null,
    source_reliability_score: (row.source_reliability_score as number) ?? 0,
    quality_score: (row.quality_score as number) ?? 0,
    ingestion_status: (row.ingestion_status as SourceDocument["ingestion_status"]) ?? "pending",
    warnings_json: parseJson<IngestionWarning[]>(row.warnings_json, []),
    raw_storage_path: (row.raw_storage_path as string) ?? null,
    parsed_text_storage_path: (row.parsed_text_storage_path as string) ?? null,
    created_at: row.created_at as string,
  };
}

export function toDocumentSegment(row: Record<string, unknown>): DocumentSegment {
  return {
    id: row.id as string,
    document_id: row.document_id as string,
    segment_index: (row.segment_index as number) ?? 0,
    title: (row.title as string) ?? null,
    content: (row.content as string) ?? "",
    hierarchy_level: (row.hierarchy_level as number) ?? 0,
    confidence_score: (row.confidence_score as number) ?? 1,
    page_ref: (row.page_ref as number) ?? null,
    created_at: row.created_at as string,
  };
}

export function toCourseProfile(row: Record<string, unknown>): CourseProfile {
  return {
    id: row.id as string,
    document_id: row.document_id as string,
    main_topic: (row.main_topic as string) ?? "",
    learning_objectives_json: parseJson<string[]>(row.learning_objectives_json, []),
    reasoning_type: (row.reasoning_type as CourseProfile["reasoning_type"]) ?? "factual",
    density: (row.density as number) ?? 0,
    recommended_template: (row.recommended_template as CourseProfile["recommended_template"]) ?? "fiche_dynamique",
    concepts_confidence: (row.concepts_confidence as number) ?? 0,
    logic_confidence: (row.logic_confidence as number) ?? 0,
    traps_confidence: (row.traps_confidence as number) ?? 0,
    structure_confidence: (row.structure_confidence as number) ?? 0,
    ambiguous_zones_json: parseJson<AmbiguousZone[]>(row.ambiguous_zones_json, []),
    created_at: row.created_at as string,
  };
}

export function toConcept(row: Record<string, unknown>): Concept {
  return {
    id: row.id as string,
    course_profile_id: row.course_profile_id as string,
    stable_key: (row.stable_key as string) ?? "",
    label: (row.label as string) ?? "",
    definition: (row.definition as string) ?? "",
    criticality: (row.criticality as Concept["criticality"]) ?? 3,
    bloom_target: (row.bloom_target as Concept["bloom_target"]) ?? "remember",
    category: (row.category as string) ?? "",
    prerequisites_json: parseJson<string[]>(row.prerequisites_json, []),
    source_confidence: (row.source_confidence as number) ?? 0,
    source_trace_json: parseJson<SourceTrace[]>(row.source_trace_json, []),
    created_at: row.created_at as string,
  };
}

export function toConfusionPair(row: Record<string, unknown>): ConfusionPair {
  return {
    id: row.id as string,
    course_profile_id: row.course_profile_id as string,
    concept_a_id: (row.concept_a_id as string) ?? "",
    concept_b_id: (row.concept_b_id as string) ?? "",
    distinction_key: (row.distinction_key as string) ?? "",
    frequency: (row.frequency as number) ?? 1,
    created_at: row.created_at as string,
  };
}

// ---------- M1 Output → DB rows ----------

export function m1OutputToDocumentUpdate(output: M1_Output) {
  return {
    ingestion_status: "parsed" as const,
    source_type: output.source_type,
    source_language: output.language,
    quality_score: output.confidence_level,
    warnings_json: output.issues,
  };
}

export function m1OutputToSegmentRows(documentId: string, segments: SegmentOutput[]) {
  return segments.map((s) => ({
    document_id: documentId,
    segment_index: s.segment_index,
    title: s.title,
    content: s.content,
    hierarchy_level: s.hierarchy_level,
    confidence_score: s.confidence_score,
    page_ref: s.page_ref,
  }));
}

// ---------- M2 Output → DB rows ----------

export function m2OutputToCourseProfileRow(documentId: string, output: M2_Output) {
  return {
    document_id: documentId,
    main_topic: output.main_topic,
    learning_objectives_json: output.learning_objectives,
    reasoning_type: output.reasoning_type,
    density: output.density,
    recommended_template: output.recommended_template,
    concepts_confidence: output.confidence.concepts,
    logic_confidence: output.confidence.logic,
    traps_confidence: output.confidence.traps,
    structure_confidence: output.confidence.structure,
    ambiguous_zones_json: output.confidence.ambiguous_zones,
  };
}

export function analyzedConceptToRow(courseProfileId: string, concept: AnalyzedConcept) {
  return {
    course_profile_id: courseProfileId,
    stable_key: concept.stable_key,
    label: concept.label,
    definition: concept.definition,
    criticality: concept.criticality,
    bloom_target: concept.bloom_target,
    category: concept.type,
    prerequisites_json: concept.prerequisites,
    source_confidence: concept.source_confidence,
    source_trace_json: concept.source_trace,
  };
}

export function analyzedConfusionPairToRow(
  courseProfileId: string,
  pair: AnalyzedConfusionPair,
  conceptIdMap: Record<string, string>
) {
  return {
    course_profile_id: courseProfileId,
    concept_a_id: conceptIdMap[pair.concept_a_key] ?? null,
    concept_b_id: conceptIdMap[pair.concept_b_key] ?? null,
    distinction_key: pair.distinction_key,
    frequency: pair.frequency,
  };
}

// ---------- DB → AnalyzedConcept (for downstream pipeline) ----------

export function conceptToAnalyzed(concept: Concept): AnalyzedConcept {
  return {
    stable_key: concept.stable_key,
    label: concept.label,
    definition: concept.definition,
    type: concept.category,
    criticality: concept.criticality,
    criticality_score: concept.criticality === 1 ? 1 : concept.criticality === 2 ? 0.7 : concept.criticality === 3 ? 0.4 : 0.2,
    bloom_target: concept.bloom_target,
    relations: [],
    prerequisites: concept.prerequisites_json,
    source_confidence: concept.source_confidence,
    source_trace: concept.source_trace_json,
    uncertain: concept.source_confidence < 0.5,
  };
}
