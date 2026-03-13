// ============================================================
// COGNITIO Domain Types — MVP V1
// ============================================================

// ---------- Enums / Literals ----------

export type IngestionStatus =
  | "pending"
  | "parsing"
  | "parsed"
  | "analyzing"
  | "analyzed"
  | "generating"
  | "generated"
  | "qa_passed"
  | "qa_failed"
  | "error";

export type SourceType =
  | "pdf_text"
  | "docx"
  | "pasted_text"
  | "unknown";

// Detailed source typing for M1 analysis
export type DetailedSourceType =
  | "institutional"
  | "polycopie"
  | "slides"
  | "personal_notes"
  | "unknown";

// Detected structure from document parsing
export type DetectedStructureType =
  | "prose"
  | "bullets"
  | "table"
  | "mixed"
  | "minimal";

// Reasoning / knowledge type (M2 analysis)
export type ReasoningType =
  | "declaratif"
  | "procedural"
  | "conditionnel"
  | "causal"
  | "metacognitif";

export type ContentType = "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "text/plain";

export type Criticality = 1 | 2 | 3 | 4; // 1=critical, 2=major, 3=secondary, 4=accessory

export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

export type KnowledgeType =
  | "factual"
  | "conceptual"
  | "procedural"
  | "metacognitive";

export type ChosenFormat = "fiche_dynamique" | "histoire_animee";

export type BrickType =
  | "TRI"
  | "SEQUENCE"
  | "ELIMINATION"
  | "OBSERVATION"
  | "DECISION";

export type QualityBand =
  | "excellent"   // > 0.85
  | "good"        // 0.70–0.85
  | "medium"      // 0.55–0.70
  | "poor"        // 0.40–0.55
  | "unusable";   // < 0.40

export type FallbackMode =
  | "full"              // 5 rooms + boss
  | "full_with_alerts"  // 5 rooms + boss + warnings
  | "reduced"           // 3 rooms, no boss
  | "minimal"           // 2 rooms, basic bricks
  | "synthesis_only";   // no mission, summary sheet only

export type TestType = "inline" | "final" | "j1" | "j7";

export type LearnerProfileStatus = "estimated" | "calibrated" | "stable";

export type MasteryStatus =
  | "unknown"
  | "fragile"
  | "learning"
  | "mastered"
  | "aging";

export type PublishedStatus = "draft" | "published" | "archived" | "blocked";

export type LearningObjective =
  | "discovery"
  | "revision"
  | "exam"
  | "consolidation";

export type OpsEventSeverity = "info" | "warning" | "error" | "critical";

// ---------- Core Domain Objects ----------

export interface SourceDocument {
  id: string;
  user_id: string;
  original_filename: string | null;
  content_type: ContentType;
  source_type: SourceType;
  source_language: string | null;
  source_reliability_score: number;
  quality_score: number;
  ingestion_status: IngestionStatus;
  warnings_json: IngestionWarning[];
  raw_storage_path: string | null;
  parsed_text_storage_path: string | null;
  created_at: string;
}

export interface IngestionWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  page_ref?: number;
}

export interface DocumentSegment {
  id: string;
  document_id: string;
  segment_index: number;
  title: string | null;
  content: string;
  hierarchy_level: number;
  confidence_score: number;
  page_ref: number | null;
  created_at: string;
}

export interface CourseProfile {
  id: string;
  document_id: string;
  main_topic: string;
  learning_objectives_json: string[];
  reasoning_type: KnowledgeType;
  density: number;
  recommended_template: ChosenFormat;
  concepts_confidence: number;
  logic_confidence: number;
  traps_confidence: number;
  structure_confidence: number;
  ambiguous_zones_json: AmbiguousZone[];
  created_at: string;
}

export interface AmbiguousZone {
  zone_label: string;
  reason: string;
  segment_refs: number[];
  severity: "low" | "medium" | "high";
}

export interface Concept {
  id: string;
  course_profile_id: string;
  stable_key: string;
  label: string;
  definition: string;
  criticality: Criticality;
  bloom_target: BloomLevel;
  category: string;
  prerequisites_json: string[];
  source_confidence: number;
  source_trace_json: SourceTrace[];
  created_at: string;
}

export interface SourceTrace {
  segment_index: number;
  excerpt: string;
  page_ref?: number;
}

export interface ConfusionPair {
  id: string;
  course_profile_id: string;
  concept_a_id: string;
  concept_b_id: string;
  distinction_key: string;
  frequency: number;
  created_at: string;
}

// ---------- Mission / Experience ----------

export interface GeneratedMission {
  id: string;
  user_id: string;
  document_id: string;
  course_profile_id: string;
  generation_mode: LearningObjective;
  chosen_format: ChosenFormat;
  narrative_template: string;
  room_count: number;
  includes_boss: boolean;
  fallback_mode: FallbackMode;
  quality_band: QualityBand;
  qa_score: number;
  mission_json: MissionContent;
  published_status: PublishedStatus;
  created_at: string;
}

export interface MissionContent {
  title: string;
  narrative_intro: string;
  rooms: MissionRoom[];
  boss?: MissionBossRoom;
  learning_contract: LearningContract;
  visual_anchors: VisualAnchor[];
}

export interface MissionRoom {
  room_index: number;
  title: string;
  narrative_context: string;
  brick_type: BrickType;
  items: MissionItem[];
  hints: string[];
  target_concepts: string[]; // stable_keys
  time_limit_sec?: number;
}

export interface MissionBossRoom {
  title: string;
  narrative_context: string;
  brick_types: BrickType[]; // minimum 3
  items: MissionItem[];
  hints: string[];
  target_concepts: string[];
  time_limit_sec?: number;
}

export interface MissionItem {
  id: string;
  type: BrickType;
  prompt: string;
  options?: string[];
  correct_answer: string | string[];
  explanation: string;
  concept_key: string;
  bloom_level: BloomLevel;
  difficulty: number; // 1-5
}

export interface LearningContract {
  total_concepts: number;
  critical_concepts: number;
  estimated_duration_sec: number;
  cognitive_budget: number;
  segments: CognitiveSegment[];
  repetition_plan: RepetitionPlan;
}

export interface CognitiveSegment {
  segment_index: number;
  concept_keys: string[];
  max_new_items: number;
  reinforcement_items: string[];
}

export interface RepetitionPlan {
  inline_recall_count: number;
  final_test_questions: number;
  j1_questions: number;
  j7_questions: number;
}

export interface VisualAnchor {
  concept_key: string;
  anchor_type: "metaphor" | "comparison" | "mnemonic" | "image_desc";
  content: string;
}

// ---------- Mission Runs ----------

export interface MissionRun {
  id: string;
  mission_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  completion_status: "in_progress" | "completed" | "abandoned";
  room_events_json: RoomEvent[];
  difficulty_snapshot_json: Record<string, number>;
  score_composite_json: CompositeScore;
  debrief_json: DebriefData | null;
}

export interface RoomEvent {
  room_index: number;
  item_id: string;
  answer_given: string | string[];
  is_correct: boolean;
  time_taken_ms: number;
  confidence: number;
  hint_used: boolean;
}

export interface CompositeScore {
  accuracy: number;
  confidence_calibration: number;
  bloom_coverage: number;
  trap_detection: number;
  completion_rate: number;
  total: number;
}

export interface DebriefData {
  score: CompositeScore;
  error_tree: ErrorNode[];
  fragile_concepts: string[];
  missed_traps: string[];
  overconfidence_zones: OverconfidenceZone[];
  revision_plan: RevisionAction[];
}

export interface ErrorNode {
  concept_key: string;
  concept_label: string;
  error_type: "wrong_answer" | "overconfident" | "slow" | "hint_needed";
  room_index: number;
  bloom_level: BloomLevel;
}

export interface OverconfidenceZone {
  concept_key: string;
  declared_confidence: number;
  actual_accuracy: number;
  gap: number;
}

export interface RevisionAction {
  concept_key: string;
  action: "review" | "practice" | "retest";
  priority: "high" | "medium" | "low";
}

// ---------- Recall Tests ----------

export interface RecallTest {
  id: string;
  mission_run_id: string;
  test_type: TestType;
  questions_json: RecallQuestion[];
  raw_score: number;
  confidence_score: number;
  calibration_gap: number;
  results_json: RecallResult[];
  created_at: string;
}

export interface RecallQuestion {
  id: string;
  concept_key: string;
  question: string;
  options?: string[];
  correct_answer: string | string[];
  bloom_level: BloomLevel;
  is_discrimination: boolean;
}

export interface RecallResult {
  question_id: string;
  answer_given: string | string[];
  is_correct: boolean;
  confidence: number;
  time_taken_ms: number;
}

// ---------- Learner Profile ----------

export interface LearnerProfile {
  id: string;
  user_id: string;
  profile_status: LearnerProfileStatus;
  level_declared: string | null;
  cognitive_profile_json: CognitiveProfile;
  session_count: number;
  calibration_sessions_count: number;
  created_at: string;
  updated_at: string;
}

export interface CognitiveProfile {
  preferred_format: ChosenFormat | null;
  avg_confidence_calibration: number;
  strength_areas: string[];
  weakness_areas: string[];
  avg_session_duration_sec: number;
}

export interface LearnerKnowledgeNode {
  id: string;
  user_id: string;
  concept_stable_key: string;
  mastery_score: number;
  mastery_status: MasteryStatus;
  last_seen_at: string;
  next_review_at: string | null;
  observations_count: number;
  confusion_hits: number;
  archived: boolean;
  metadata_json: Record<string, unknown>;
  updated_at: string;
}

// ---------- Ops ----------

export interface OpsEvent {
  id: string;
  event_type: string;
  severity: OpsEventSeverity;
  mission_id: string | null;
  document_id: string | null;
  user_id: string | null;
  payload_json: Record<string, unknown>;
  created_at: string;
}

export interface PromptVersion {
  id: string;
  prompt_name: string;
  semantic_version: string;
  changelog: string;
  active: boolean;
  created_at: string;
}

export interface GoldenDatasetRun {
  id: string;
  prompt_version_id: string;
  dataset_name: string;
  pass: boolean;
  metrics_json: Record<string, number>;
  created_at: string;
}

// ---------- Pipeline Step Status (UX d'attente) ----------

export type PipelineStepName =
  | "upload"
  | "ingestion"
  | "analysis"
  | "memory_architecture"
  | "format_selection"
  | "generation"
  | "qa";

export type PipelineStepStatus = "pending" | "running" | "completed" | "error";

export interface PipelineStep {
  name: PipelineStepName;
  status: PipelineStepStatus;
  progress?: number; // 0-100
  message?: string;
  started_at?: string;
  completed_at?: string;
}

// ---------- Feature Flags ----------

export interface FeatureFlags {
  cognitio_enabled: boolean;
  league_visible: boolean;
  studio_visible: boolean;
  export_visible: boolean;
  calibration_required: boolean;
  experiment_groups_enabled: boolean;
}
