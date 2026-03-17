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
  music_style?: string;
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
  // Document Understanding Layer output (pre-comprehension)
  document_understanding?: DocumentUnderstanding;
  mission_universe_hint?: MissionUniverseHint;
  // P0: Body extraction diagnostic — tells pipeline hook whether body-only pass was attempted
  _diag_front_matter_detected?: boolean;
  _diag_segment_0_quarantined?: boolean;
  _diag_segment_0_quarantined_retroactive?: boolean; // true if quarantine was applied retroactively (not by isSegment0Noisy)
  _diag_artifact_only_first_pass?: boolean;
  _diag_body_only_second_pass_triggered?: boolean;
  _diag_body_only_second_pass_concepts_count?: number;
  _diag_segment_0_noise_score?: number;
  _diag_front_matter_lines_count?: number;
  _diag_front_matter_chars_count?: number;
  _diag_body_pass_trigger_condition_met?: boolean;
  _diag_body_pass_reason_if_not_triggered?: string;
  // P0: Secondary pass diagnostics
  _diag_secondary_pass_topic?: string;
  _diag_secondary_pass_concepts_count?: number;
  // P0 FIX: Granular body concept validity tracking
  _diag_concepts_from_segment_0_count?: number;
  _diag_concepts_from_body_count?: number;
  _diag_valid_body_concepts_count?: number;
  _diag_uncertain_body_concepts_count?: number;
  _diag_editorial_body_concepts_count?: number;
  _diag_all_concepts_uncertain?: boolean;
  _diag_main_topic_is_editorial_artifact?: boolean;
  _diag_artifact_ratio?: number;
  // P0 FIX: Domain classifier before/after body pass
  _diag_domain_before_body_pass?: DocumentDomain;
  _diag_domain_after_body_pass?: DocumentDomain;
  // P0 FIX: Cleaning metrics
  _diag_front_matter_chars_removed?: number;
  _diag_editorial_lines_removed?: number;
  _diag_header_noise_score_before?: number;
  _diag_header_noise_score_after?: number;
  // P0 FIX: LLM fallback
  _diag_llm_fallback_triggered?: boolean;
  _diag_llm_fallback_concepts_count?: number;
}

// ---------- Document Understanding Layer ----------

export interface DocumentUnderstanding {
  /** True pedagogical topic of the document (3-12 words, never editorial/R2C) */
  true_topic: string;
  /** Normalized display title */
  normalized_title: string;
  /** Real section map — reconstructed chapter hierarchy */
  section_map: DocumentSection[];
  /** Core learning axes (3-8 items) — what the student must truly retain */
  learning_core: string[];
  /** Noise zones detected — front matter, headers, footers, OCR artifacts */
  noise_zones: NoiseZone[];
  /** Critical concepts identified from comprehension (not yet extracted) */
  critical_axes: string[];
  /** Traps or common confusions detected */
  traps_or_confusions: string[];
  /** Domain classification for mission universe selection */
  domain_classification: DocumentDomain;
  /** Reasoning type dominant in the document */
  dominant_reasoning: ReasoningType;
  /** Confidence explanation — why this understanding is reliable or not */
  confidence_explanation: string;
  /** Overall comprehension confidence 0-1 */
  comprehension_confidence: number;
}

export interface DocumentSection {
  title: string;
  level: number;
  content_summary: string;
  is_noise: boolean;
}

export interface NoiseZone {
  type: "front_matter" | "header_repeat" | "footer" | "ocr_artifact" | "branding" | "classification_label" | "date_metadata" | "typographic_fragment";
  location: "top" | "inline" | "bottom";
  description: string;
}

export type DocumentDomain =
  | "medical_clinical"
  | "medical_basic_science"
  | "public_health"
  | "law"
  | "computer_science"
  | "history"
  | "fundamental_science"
  | "engineering"
  | "humanities"
  | "general";

/** Mission universe mapping based on document domain and reasoning */
export interface MissionUniverseHint {
  domain: DocumentDomain;
  suggested_universe: string;
  reasoning_approach: string;
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
  violation_type: "hallucination" | "overload" | "missing_recall" | "bloom_gap" | "source_mismatch" | "dirty_concept_labels" | "poor_definitions" | "artifact_as_critical" | "dirty_topic" | "editorial_artifact_promoted" | "single_uncertain_concept" | "all_concepts_uncertain" | "no_body_concepts" | "semantic_base_invalid";
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

// ---------- Pipeline Debug Counters ----------

/**
 * P0 debug counters — emitted at every pipeline stage so 0-concept
 * scenarios always have an explicit root-cause trace.
 */
export interface PipelineDebugCounters {
  // M1 — Ingestion
  /** Length of the text BEFORE M1 cleaning (extracted from file or pasted) */
  raw_text_length: number;
  /** Length of M1 clean_text — the canonical_semantic_text for the pipeline */
  cleaned_text_length: number;
  /** Preview of the canonical text (first 200 chars) for debug */
  canonical_text_preview: string;
  detected_sections_count: number;

  // M2 — Analysis
  raw_topic: string;
  cleaned_topic: string;
  /** Text length fed to M2 concept extraction (after semantic cleaning) */
  m2_input_text_length: number;
  extracted_concepts_raw_count: number;
  extracted_concepts_after_filter_count: number;
  rejected_concepts_count: number;
  reject_reasons: { reason: string; count: number }[];
  chapters_detected_count: number;
  sentences_extracted_count: number;

  // M3 — Memory Architecture
  concepts_persisted_count: number;
  concepts_reloaded_count: number;
  memory_segments_generated_count: number;

  // M4 — Format Decision
  final_format_decision: string;
  format_override_applied: boolean;
  format_override_reason?: string;

  // M5 — Generation
  generator_called: string;
  generation_success: boolean;
  generation_error?: string;

  // Validation gate
  final_generation_status: "success" | "empty_generation" | "error" | "pending";
  success_gate_reason?: string;

  // P0: Front matter / header cleaning metrics
  front_matter_lines_detected?: number;
  front_matter_chars_removed?: number;
  header_noise_score_before?: number;
  header_noise_score_after?: number;
  segment_0_noise_score?: number;

  // P0: Segment distribution metrics
  concepts_from_segment_0_count?: number;
  concepts_from_body_count?: number;
  valid_body_concepts_count?: number;
  uncertain_body_concepts_count?: number;
  editorial_body_concepts_count?: number;
  rejected_editorial_artifacts_count?: number;

  // P0: Second pass metrics
  body_first_pass_triggered?: boolean;
  secondary_pass_triggered?: boolean;
  secondary_pass_concepts_count?: number;

  // P0 FIX: Domain classifier before/after body pass
  domain_before_body_pass?: string;
  domain_after_body_pass?: string;

  // P0 FIX: Enhanced cleaning metrics
  editorial_lines_removed?: number;

  // P0 FIX: LLM fallback
  llm_fallback_triggered?: boolean;
  llm_fallback_concepts_count?: number;

  // P0: Body extraction pipeline diagnostic
  front_matter_detected?: boolean;
  segment_0_quarantined?: boolean;
  segment_0_quarantined_retroactive?: boolean;
  artifact_only_first_pass?: boolean;
  body_only_second_pass_triggered?: boolean;
  body_only_second_pass_concepts_count?: number;
  body_pass_trigger_condition_met?: boolean;
  body_pass_reason_if_not_triggered?: string;

  // P0: Secondary pass detailed diagnostics
  secondary_pass_topic?: string;

  // P0: Final topic after cleaning
  final_topic_clean?: string;
  final_concepts_count?: number;

  // P0: Semantic gate signals
  semantic_gate_passed?: boolean;
  semantic_gate_status?: "semantic_success" | "semantic_failure";
  valid_concepts_count?: number;
  uncertain_concepts_count?: number;
  editorial_artifact_ratio?: number;
  main_topic_is_editorial_artifact?: boolean;
  semantic_generation_allowed?: boolean;
  semantic_gate_block_reasons?: string[];

  // P0: Mission gate signals
  mission_gate_passed?: boolean;
  mission_gate_block_reasons?: string[];

  // Pipeline trace — root-cause diagnostic
  pipeline_trace: PipelineTraceEntry[];
}

/** Structured trace entry for each pipeline step */
export interface PipelineTraceEntry {
  step: "A_import" | "B_cleaning" | "B1_front_matter" | "B2_understanding" | "C_topic" | "D_concept_extraction" | "E_concept_filtering" | "E1_segment_distribution" | "E2_secondary_pass" | "F_memory" | "G_generation";
  input_length?: number;
  output_length?: number;
  input_count?: number;
  output_count?: number;
  preview?: string;
  detail?: string;
  warning?: string;
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
