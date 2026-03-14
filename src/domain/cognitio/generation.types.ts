// ============================================================
// COGNITIO M5 Generation Types — Dynamic Sheet
// ============================================================

// ---------- Content Block Types ----------

export type ContentBlockType =
  | "contract"
  | "hook"
  | "anchor_map"
  | "pedagogical"
  | "reactivation"
  | "clarity_peak"
  | "consolidation"
  | "final_test"
  | "disclaimer";

/** All 8 mandatory temps in order */
export const MANDATORY_BLOCK_TYPES: ContentBlockType[] = [
  "contract",
  "hook",
  "anchor_map",
  "pedagogical",
  "reactivation",
  "clarity_peak",
  "consolidation",
  "final_test",
];

// ---------- Recall Event ----------

export type RecallEventType =
  | "question"
  | "completion"
  | "prediction"
  | "distinction"
  | "reformulation";

// ---------- Mnemonic ----------

export type BlockMnemonicType = "acronyme" | "phrase" | "pattern" | "image";

// ---------- Final Test ----------

export type FinalTestItemType =
  | "qcm"
  | "qcu"
  | "completion"
  | "short_answer"
  | "distinction"
  | "ordering";

// ---------- Bloom Numeric Level ----------

export type BloomNumeric = 1 | 2 | 3 | 4 | 5 | 6;

// ---------- Published Status ----------

export type TransformationPublishedStatus = "draft" | "published" | "archived";

// ---------- QA Status ----------

export type TransformationQAStatus = "pending" | "passed" | "failed" | "skipped";

// ---------- Quality Flag ----------

export type QualityFlag =
  | "full_critical_coverage"
  | "missing_critical_coverage"
  | "compressed_output"
  | "uncertain_concepts_present"
  | "contradictions_detected"
  | "low_recall_density"
  | "insufficient_bloom_diversity";

// ---------- Content Sub-structures ----------

export interface VisualAnchorInBlock {
  image_desc: string;
  verbal_formula: string;
}

export interface ContrastBox {
  concept_a: string;
  concept_b: string;
  distinction_key: string;
}

export interface BlockMnemonic {
  type: BlockMnemonicType;
  content: string;
}

export interface InlineRecallEvent {
  type: RecallEventType;
  prompt: string;
  expected_concepts: string[];
  bloom_level: BloomNumeric;
}

export interface FinalTestItem {
  id: string;
  type: FinalTestItemType;
  prompt: string;
  choices: string[] | null;
  expected_answer: string | string[];
  concepts_tested: string[];
  bloom_level: BloomNumeric;
}

export interface SourceDisclaimer {
  confidence_level: number;
  uncertain_concepts: string[];
  contradictions: string[];
  ambiguities: string[];
}

export interface CoverageReport {
  critical_total: number;
  critical_covered: number;
  major_total: number;
  major_covered: number;
}

// ---------- Content Block ----------

export interface ContentBlock {
  block_id: string;
  type: ContentBlockType;
  title: string;
  content: string;
  concepts_covered: string[];
  visual_anchor: VisualAnchorInBlock | null;
  contrast_box: ContrastBox | null;
  mnemonic: BlockMnemonic | null;
  recall_event: InlineRecallEvent | null;
  position: number;
}

// ---------- Dynamic Sheet Metadata ----------

export interface DynamicSheetMetadata {
  document_id: string;
  course_profile_id: string;
  memory_architecture_id: string;
  format_decision_id: string;
  estimated_duration_sec: number;
  quality_flags: QualityFlag[];
  coverage: CoverageReport;
}

// ---------- Internal Summary ----------

export interface KnowledgeTypeDistribution {
  dominant: string;
  distribution: {
    declaratif: number;
    procedural: number;
    conditionnel: number;
    causal: number;
    metacognitif: number;
  };
}

export interface InternalSummary {
  learning_objective: string;
  dominant_knowledge_type: KnowledgeTypeDistribution;
  critical_concepts: string[];
  confusions: string[];
  cognitive_structure: string;
  cognitive_budget: {
    segments: number;
    max_new_elements: number;
    total_duration_sec: number;
  };
  pedagogical_format: "fiche_dynamique";
  reactivation_plan: string[];
  active_recall_plan: string[];
  mnemonics: string[];
}
