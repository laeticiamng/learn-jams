// ============================================================
// COGNITIO Service Contracts — Input/Output for each pipeline step
// ============================================================

import type {
  ContentType,
  SourceType,
  LearningObjective,
  ChosenFormat,
  QualityBand,
  FallbackMode,
  TestType,
  BloomLevel,
  Criticality,
  KnowledgeType,
  AmbiguousZone,
  SourceTrace,
  MissionContent,
  LearningContract,
  VisualAnchor,
  CognitiveSegment,
  RepetitionPlan,
  RecallQuestion,
  IngestionWarning,
  DocumentSegment,
  DetailedSourceType,
  DetectedStructureType,
  ReasoningType,
} from "./types";
import type { LearnerAudienceProfile } from "./learner-profile.types";

// ---------- Shared sub-types ----------

export type { DetailedSourceType, DetectedStructureType, ReasoningType };

export interface AnalysisConfidence {
  concepts: number;  // 0-1
  logic: number;     // 0-1
  traps: number;     // 0-1
  structure: number; // 0-1
  ambiguous_zones: AmbiguousZone[];
}

// ---------- M1: Ingestion ----------

export interface M1_Input {
  raw_content: File | string;
  content_type: ContentType | "paste";
  user_objective?: LearningObjective;
  user_language?: string;
  learner_profile?: LearnerAudienceProfile;
  metadata?: Record<string, unknown>;
}

export interface M1_Output {
  document_id: string;
  clean_text: string;
  word_count: number;
  language: string;
  source_type: DetailedSourceType;
  confidence_level: number;
  detected_structure: DetectedStructureType;
  issues: SourceIssue[];
  segments: SegmentOutput[];
  learner_profile?: LearnerAudienceProfile;
}

export interface SourceIssue {
  code: string;
  message: string;
  severity: "info" | "warning" | "blocking";
  action_required?: boolean;
  page_ref?: number;
}

export interface SegmentOutput {
  segment_index: number;
  title: string | null;
  content: string;
  hierarchy_level: number;
  confidence_score: number;
  page_ref: string | null;
}

// Keep backward compat aliases
export type IngestInput = {
  file?: File;
  pasted_text?: string;
  content_type: ContentType;
  objective: LearningObjective;
  language?: string;
  learner_profile?: LearnerAudienceProfile;
};

export type IngestOutput = M1_Output;

// ---------- M2: Analysis ----------

export interface M2_Input {
  document_id: string;
  clean_text: string;
  segments: SegmentOutput[];
  user_objective?: LearningObjective;
  source_type: DetailedSourceType;
  confidence_level: number;
  learner_profile?: LearnerAudienceProfile;
}

export interface M2_Output {
  course_profile_id: string;
  main_topic: string;
  learning_objectives: string[];
  key_concepts: AnalyzedConcept[];
  traps: AnalyzedTrap[];
  confusion_pairs: AnalyzedConfusionPair[];
  reasoning_type: ReasoningType;
  density: "low" | "medium" | "high";
  recommended_template: ChosenFormat;
  confidence: AnalysisConfidence;
  prerequis: string[];
  structure_type: DetectedStructureType;
  source_issues: SourceIssue[];
  // Computed summaries
  total_concepts: number;
  critical_count: number;
  estimated_complexity: number; // 1-10
  // Audience adaptation (M2 computed)
  document_difficulty_level?: "easy" | "intermediate" | "advanced" | "expert";
  estimated_audience_level?: string;
  audience_mismatch_risk?: number; // 0-1
  audience_mismatch_message?: string;
}

export interface AnalyzedConcept {
  stable_key: string;
  label: string;
  definition: string;
  type: string; // category/domain
  criticality: Criticality;
  criticality_score: number; // 0-1 fine-grained
  bloom_target: BloomLevel;
  relations: ConceptRelation[];
  prerequisites: string[];
  source_confidence: number;
  source_trace: SourceTrace[];
  uncertain: boolean; // true if source_confidence < 0.5
}

export interface ConceptRelation {
  target_key: string;
  relation_type: "prerequisite" | "related" | "part_of" | "contrasts_with";
}

export interface AnalyzedTrap {
  concept_key: string;
  trap_type: "false_friend" | "common_error" | "ambiguity" | "partial_truth";
  description: string;
  source_trace?: SourceTrace;
}

export interface AnalyzedConfusionPair {
  concept_a_key: string;
  concept_b_key: string;
  distinction_key: string;
  frequency: number; // 1-5
}

// Keep backward compat
export type AnalyzeInput = {
  document_id: string;
  segments: Omit<DocumentSegment, "id" | "document_id" | "created_at">[];
  clean_text: string;
  objective: LearningObjective;
};

export type AnalyzeOutput = M2_Output;

// ---------- M3: Memory Architect ----------

export interface MemoryArchitectInput {
  course_profile_id: string;
  concepts: AnalyzedConcept[];
  confusion_pairs: AnalyzedConfusionPair[];
  objective: LearningObjective;
  knowledge_type: KnowledgeType;
}

export interface MemoryArchitectOutput {
  learning_contract: LearningContract;
  segments: CognitiveSegment[];
  repetition_plan: RepetitionPlan;
  mnemonics: MnemonicSuggestion[];
  visual_anchors: VisualAnchor[];
  cognitive_budget: number;
}

export interface MnemonicSuggestion {
  concept_keys: string[];
  mnemonic: string;
  type: "acronym" | "story" | "association" | "rhyme";
}

// ---------- M4: Format Selector ----------

export interface FormatSelectorInput {
  course_profile_id: string;
  total_concepts: number;
  critical_count: number;
  knowledge_type: KnowledgeType;
  estimated_complexity: number;
  quality_score: number;
  objective: LearningObjective;
}

export interface FormatSelectorOutput {
  chosen_format: ChosenFormat;
  justification: string;
  estimated_duration_sec: number;
  cost_level: "low" | "medium" | "high";
  needs_split: boolean;
  split_count?: number;
}

// ---------- M5: Experience Generator ----------

export interface GenerateExperienceInput {
  document_id: string;
  course_profile_id: string;
  user_id: string;
  chosen_format: ChosenFormat;
  learning_contract: LearningContract;
  concepts: AnalyzedConcept[];
  confusion_pairs: AnalyzedConfusionPair[];
  visual_anchors: VisualAnchor[];
  quality_score: number;
  objective: LearningObjective;
  /** Clean main topic from M2 analysis (e.g. "Infections nosocomiales") */
  main_topic?: string;
  /** Reasoning type from M2 analysis */
  reasoning_type?: ReasoningType;
  /** Estimated audience level from M2 analysis */
  estimated_audience_level?: string;
}

export interface GenerateExperienceOutput {
  mission_id: string;
  mission_json: MissionContent;
  fallback_mode: FallbackMode;
  quality_band: QualityBand;
  room_count: number;
  includes_boss: boolean;
}

// ---------- M6: Recall Generator ----------

export interface GenerateRecallInput {
  mission_id: string;
  concepts: AnalyzedConcept[];
  confusion_pairs: AnalyzedConfusionPair[];
  test_type: TestType;
  word_count: number;
}

export interface GenerateRecallOutput {
  questions: RecallQuestion[];
  estimated_duration_sec: number;
}

// ---------- M7: QA ----------

export interface QAInput {
  mission_id: string;
  mission_json: MissionContent;
  concepts: AnalyzedConcept[];
  quality_score: number;
  source_text: string;
}

export interface QAOutput {
  qa_score: number; // 0-100
  checklist_results: QAChecklistItem[];
  violations: QAViolation[];
  recommendations: string[];
  publish_blocked: boolean;
  block_reason?: string;
}

export interface QAChecklistItem {
  check_id: string;
  label: string;
  passed: boolean;
  weight: number;
  details?: string;
}

export interface QAViolation {
  violation_type: "hallucination" | "overload" | "missing_recall" | "bloom_gap" | "source_mismatch";
  severity: "warning" | "blocking";
  message: string;
  concept_key?: string;
}

// ---------- M8: Memory Update ----------

export interface UpdateMemoryInput {
  user_id: string;
  mission_run_id: string;
  test_type: TestType;
  results: {
    concept_key: string;
    is_correct: boolean;
    confidence: number;
    time_taken_ms: number;
  }[];
}

export interface UpdateMemoryOutput {
  updated_concepts: {
    concept_key: string;
    new_mastery_score: number;
    new_mastery_status: string;
    next_review_at: string | null;
    illusion_detected: boolean;
  }[];
  retention_snapshot: {
    j0: number;
    j1?: number;
    j7?: number;
  };
  format_efficacy: {
    format: ChosenFormat;
    retention_delta: number;
  } | null;
}

// ---------- M9: Ops Metrics ----------

export interface OpsMetricInput {
  event_type: string;
  severity: "info" | "warning" | "error" | "critical";
  mission_id?: string;
  document_id?: string;
  user_id?: string;
  payload: Record<string, unknown>;
}

export interface OpsMetricOutput {
  event_id: string;
  alert_triggered: boolean;
  alert_message?: string;
}
