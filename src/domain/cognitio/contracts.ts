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
  CompositeScore,
  DebriefData,
  IngestionWarning,
  DocumentSegment,
} from "./types";

// ---------- M1: Ingestion ----------

export interface IngestInput {
  file?: File;
  pasted_text?: string;
  content_type: ContentType;
  objective: LearningObjective;
  language?: string;
}

export interface IngestOutput {
  document_id: string;
  clean_text: string;
  source_type: SourceType;
  confidence_level: number;
  detected_structure: {
    has_headings: boolean;
    has_lists: boolean;
    has_tables: boolean;
    estimated_word_count: number;
  };
  issues: IngestionWarning[];
  segments: Omit<DocumentSegment, "id" | "document_id" | "created_at">[];
}

// ---------- M2: Analysis ----------

export interface AnalyzeInput {
  document_id: string;
  segments: Omit<DocumentSegment, "id" | "document_id" | "created_at">[];
  clean_text: string;
  objective: LearningObjective;
}

export interface AnalyzeOutput {
  course_profile_id: string;
  concepts: AnalyzedConcept[];
  confusion_pairs: AnalyzedConfusionPair[];
  knowledge_type: KnowledgeType;
  structure_type: "linear" | "hierarchical" | "network";
  source_issues: IngestionWarning[];
  total_concepts: number;
  critical_count: number;
  estimated_complexity: number; // 1-10
  ambiguous_zones: AmbiguousZone[];
}

export interface AnalyzedConcept {
  stable_key: string;
  label: string;
  definition: string;
  criticality: Criticality;
  bloom_target: BloomLevel;
  category: string;
  prerequisites: string[];
  source_confidence: number;
  source_trace: SourceTrace[];
}

export interface AnalyzedConfusionPair {
  concept_a_key: string;
  concept_b_key: string;
  distinction_key: string;
  frequency: number;
}

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
