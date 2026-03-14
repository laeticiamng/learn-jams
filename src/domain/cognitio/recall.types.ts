// ============================================================
// COGNITIO M6 Recall Types — Tests / Confidence / Scoring
// ============================================================

// ---------- Test Types ----------

export type RecallTestType = "inline" | "final" | "j1" | "j7";

export type RecallItemType =
  | "qcm"
  | "qcu"
  | "completion"
  | "short_answer"
  | "distinction"
  | "ordering"
  | "reformulation"
  | "transfer";

export type BloomNumeric = 1 | 2 | 3 | 4 | 5 | 6;

export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  1: "Très incertain",
  2: "Plutôt incertain",
  3: "Moyen",
  4: "Plutôt sûr",
  5: "Très sûr",
};

// ---------- Recall Item ----------

export interface RecallItem {
  id: string;
  type: RecallItemType;
  prompt: string;
  choices: string[] | null;
  expected_answer: string | string[];
  concepts_tested: string[];
  bloom_level: BloomNumeric;
  is_discrimination: boolean;
  is_transfer: boolean;
  linked_block_id: string | null; // for inline recall
}

// ---------- Recall Test ----------

export interface RecallTest {
  id: string;
  transformation_id: string;
  user_id: string;
  test_type: RecallTestType;
  items: RecallItem[];
  generated_from_version: number;
  created_at: string;
}

// ---------- Answer ----------

export interface RecallAnswer {
  item_id: string;
  answer: string | string[];
  is_correct: boolean;
  confidence: ConfidenceLevel;
  time_taken_ms: number;
  concepts_tested: string[];
}

// ---------- Recall Attempt ----------

export interface RecallAttempt {
  id: string;
  recall_test_id: string;
  user_id: string;
  answers: RecallAnswer[];
  raw_score: number;
  confidence_score: number;
  calibration_gap: number;
  composite_score: number;
  created_at: string;
}

// ---------- Calibration ----------

export interface CalibrationMetrics {
  raw_score: number;             // 0-1: % correct
  confidence_score: number;      // 0-1: normalized average confidence
  calibration_gap: number;       // -1 to 1: positive = overconfident
  overconfidence_count: number;
  underconfidence_count: number;
  well_calibrated_count: number;
}

// ---------- Composite Score ----------

export interface CompositeScore {
  total: number;                 // 0-100
  raw_weight: number;            // contribution of raw_score (60%)
  calibration_weight: number;    // contribution of calibration quality (20%)
  coverage_weight: number;       // contribution of critical concept coverage (20%)
  breakdown: {
    raw_component: number;
    calibration_component: number;
    coverage_component: number;
  };
}

// ---------- Fragility ----------

export interface FragilityNode {
  concept_key: string;
  label: string;
  status: "mastered" | "fragile" | "failed" | "overconfident" | "underconfident";
  correct_count: number;
  total_count: number;
  avg_confidence: number;
  calibration_gap: number;
}

// ---------- Confusion Map ----------

export interface ConfusionMapEntry {
  concept_a: string;
  concept_b: string;
  confusion_count: number;
  distinction_key: string;
}

// ---------- Debrief ----------

export interface DebriefReport {
  id: string;
  transformation_id: string;
  recall_attempt_id: string;
  composite_score: CompositeScore;
  mastered_concepts: string[];
  fragile_concepts: FragilityNode[];
  failed_concepts: string[];
  overconfidence_zones: FragilityNode[];
  underconfidence_zones: FragilityNode[];
  traps_missed: string[];
  confusion_map: ConfusionMapEntry[];
  recommendations: string[];
  next_action: "review_sheet" | "retest" | "review_fragile" | "continue";
  created_at: string;
}
