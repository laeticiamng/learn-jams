// ============================================================
// COGNITIO Adapters — Transform between DB rows and domain objects
// ============================================================

import type {
  SourceDocument,
  DocumentSegment,
  CourseProfile,
  Concept,
  ConfusionPair,
  GeneratedMission,
  MissionRun,
  RecallTest,
  LearnerProfile,
  LearnerKnowledgeNode,
  OpsEvent,
  IngestionWarning,
  AmbiguousZone,
  SourceTrace,
  MissionContent,
  RoomEvent,
  CompositeScore,
  DebriefData,
  RecallQuestion,
  RecallResult,
  CognitiveProfile,
} from "./types";

// Supabase returns JSON columns as unknown — these adapters safely parse them

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value as T;
}

export function toSourceDocument(row: Record<string, unknown>): SourceDocument {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    original_filename: row.original_filename as string | null,
    content_type: row.content_type as SourceDocument["content_type"],
    source_type: row.source_type as SourceDocument["source_type"],
    source_language: row.source_language as string | null,
    source_reliability_score: row.source_reliability_score as number,
    quality_score: row.quality_score as number,
    ingestion_status: row.ingestion_status as SourceDocument["ingestion_status"],
    warnings_json: parseJson<IngestionWarning[]>(row.warnings_json, []),
    raw_storage_path: row.raw_storage_path as string | null,
    parsed_text_storage_path: row.parsed_text_storage_path as string | null,
    created_at: row.created_at as string,
  };
}

export function toDocumentSegment(row: Record<string, unknown>): DocumentSegment {
  return {
    id: row.id as string,
    document_id: row.document_id as string,
    segment_index: row.segment_index as number,
    title: row.title as string | null,
    content: row.content as string,
    hierarchy_level: row.hierarchy_level as number,
    confidence_score: row.confidence_score as number,
    page_ref: row.page_ref as number | null,
    created_at: row.created_at as string,
  };
}

export function toCourseProfile(row: Record<string, unknown>): CourseProfile {
  return {
    id: row.id as string,
    document_id: row.document_id as string,
    main_topic: row.main_topic as string,
    learning_objectives_json: parseJson<string[]>(row.learning_objectives_json, []),
    reasoning_type: row.reasoning_type as CourseProfile["reasoning_type"],
    density: row.density as number,
    recommended_template: row.recommended_template as CourseProfile["recommended_template"],
    concepts_confidence: row.concepts_confidence as number,
    logic_confidence: row.logic_confidence as number,
    traps_confidence: row.traps_confidence as number,
    structure_confidence: row.structure_confidence as number,
    ambiguous_zones_json: parseJson<AmbiguousZone[]>(row.ambiguous_zones_json, []),
    created_at: row.created_at as string,
  };
}

export function toConcept(row: Record<string, unknown>): Concept {
  return {
    id: row.id as string,
    course_profile_id: row.course_profile_id as string,
    stable_key: row.stable_key as string,
    label: row.label as string,
    definition: row.definition as string,
    criticality: row.criticality as Concept["criticality"],
    bloom_target: row.bloom_target as Concept["bloom_target"],
    category: row.category as string,
    prerequisites_json: parseJson<string[]>(row.prerequisites_json, []),
    source_confidence: row.source_confidence as number,
    source_trace_json: parseJson<SourceTrace[]>(row.source_trace_json, []),
    created_at: row.created_at as string,
  };
}

export function toConfusionPair(row: Record<string, unknown>): ConfusionPair {
  return {
    id: row.id as string,
    course_profile_id: row.course_profile_id as string,
    concept_a_id: row.concept_a_id as string,
    concept_b_id: row.concept_b_id as string,
    distinction_key: row.distinction_key as string,
    frequency: row.frequency as number,
    created_at: row.created_at as string,
  };
}

export function toGeneratedMission(row: Record<string, unknown>): GeneratedMission {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    document_id: row.document_id as string,
    course_profile_id: row.course_profile_id as string,
    generation_mode: row.generation_mode as GeneratedMission["generation_mode"],
    chosen_format: row.chosen_format as GeneratedMission["chosen_format"],
    narrative_template: row.narrative_template as string,
    room_count: row.room_count as number,
    includes_boss: row.includes_boss as boolean,
    fallback_mode: row.fallback_mode as GeneratedMission["fallback_mode"],
    quality_band: row.quality_band as GeneratedMission["quality_band"],
    qa_score: row.qa_score as number,
    mission_json: parseJson<MissionContent>(row.mission_json, {
      title: "",
      narrative_intro: "",
      rooms: [],
      learning_contract: { total_concepts: 0, critical_concepts: 0, estimated_duration_sec: 0, cognitive_budget: 0, segments: [], repetition_plan: { inline_recall_count: 0, final_test_questions: 0, j1_questions: 0, j7_questions: 0 } },
      visual_anchors: [],
    }),
    published_status: row.published_status as GeneratedMission["published_status"],
    created_at: row.created_at as string,
  };
}

export function toMissionRun(row: Record<string, unknown>): MissionRun {
  return {
    id: row.id as string,
    mission_id: row.mission_id as string,
    user_id: row.user_id as string,
    started_at: row.started_at as string,
    completed_at: row.completed_at as string | null,
    completion_status: row.completion_status as MissionRun["completion_status"],
    room_events_json: parseJson<RoomEvent[]>(row.room_events_json, []),
    difficulty_snapshot_json: parseJson<Record<string, number>>(row.difficulty_snapshot_json, {}),
    score_composite_json: parseJson<CompositeScore>(row.score_composite_json, {
      accuracy: 0, confidence_calibration: 0, bloom_coverage: 0,
      trap_detection: 0, completion_rate: 0, total: 0,
    }),
    debrief_json: parseJson<DebriefData | null>(row.debrief_json, null),
  };
}

export function toRecallTest(row: Record<string, unknown>): RecallTest {
  return {
    id: row.id as string,
    mission_run_id: row.mission_run_id as string,
    test_type: row.test_type as RecallTest["test_type"],
    questions_json: parseJson<RecallQuestion[]>(row.questions_json, []),
    raw_score: row.raw_score as number,
    confidence_score: row.confidence_score as number,
    calibration_gap: row.calibration_gap as number,
    results_json: parseJson<RecallResult[]>(row.results_json, []),
    created_at: row.created_at as string,
  };
}

export function toLearnerProfile(row: Record<string, unknown>): LearnerProfile {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    profile_status: row.profile_status as LearnerProfile["profile_status"],
    level_declared: row.level_declared as string | null,
    cognitive_profile_json: parseJson<CognitiveProfile>(row.cognitive_profile_json, {
      preferred_format: null,
      avg_confidence_calibration: 0,
      strength_areas: [],
      weakness_areas: [],
      avg_session_duration_sec: 0,
    }),
    session_count: row.session_count as number,
    calibration_sessions_count: row.calibration_sessions_count as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function toLearnerKnowledgeNode(row: Record<string, unknown>): LearnerKnowledgeNode {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    concept_stable_key: row.concept_stable_key as string,
    mastery_score: row.mastery_score as number,
    mastery_status: row.mastery_status as LearnerKnowledgeNode["mastery_status"],
    last_seen_at: row.last_seen_at as string,
    next_review_at: row.next_review_at as string | null,
    observations_count: row.observations_count as number,
    confusion_hits: row.confusion_hits as number,
    archived: row.archived as boolean,
    metadata_json: parseJson<Record<string, unknown>>(row.metadata_json, {}),
    updated_at: row.updated_at as string,
  };
}

export function toOpsEvent(row: Record<string, unknown>): OpsEvent {
  return {
    id: row.id as string,
    event_type: row.event_type as string,
    severity: row.severity as OpsEvent["severity"],
    mission_id: row.mission_id as string | null,
    document_id: row.document_id as string | null,
    user_id: row.user_id as string | null,
    payload_json: parseJson<Record<string, unknown>>(row.payload_json, {}),
    created_at: row.created_at as string,
  };
}
