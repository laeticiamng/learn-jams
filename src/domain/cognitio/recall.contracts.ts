// ============================================================
// COGNITIO M6 Recall Contracts — Input/Output
// ============================================================

import type { M2_Output, AnalyzedConcept, AnalyzedConfusionPair } from "./contracts";
import type { M3_Output } from "./memory.contracts";
import type { LearnerAudienceProfile } from "./learner-profile.types";
import type { LearningObjective } from "./types";
import type {
  RecallItem,
  RecallTestType,
  RecallAnswer,
  CalibrationMetrics,
  CompositeScore,
  FragilityNode,
  ConfusionMapEntry,
  DebriefReport,
} from "./recall.types";

// ---------- Recall Generation Input ----------

export interface M6_GenerateInput {
  transformation_id: string;
  concepts: AnalyzedConcept[];
  confusion_pairs: AnalyzedConfusionPair[];
  critical_concept_keys: string[];
  test_type: RecallTestType;
  user_objective: LearningObjective;
  word_count: number;
  existing_inline_items?: RecallItem[];  // from M5 content blocks
  learner_profile?: LearnerAudienceProfile;
}

// ---------- Recall Generation Output ----------

export interface M6_GenerateOutput {
  test_id: string;
  test_type: RecallTestType;
  items: RecallItem[];
  estimated_duration_sec: number;
}

// ---------- Grading Input ----------

export interface M6_GradeInput {
  recall_test_id: string;
  answers: RecallAnswer[];
  concepts: AnalyzedConcept[];
  critical_concept_keys: string[];
  confusion_pairs: AnalyzedConfusionPair[];
}

// ---------- Grading Output ----------

export interface M6_GradeOutput {
  attempt_id: string;
  raw_score: number;
  confidence_score: number;
  calibration_gap: number;
  composite_score: CompositeScore;
  calibration: CalibrationMetrics;
  fragility_map: FragilityNode[];
  confusion_map: ConfusionMapEntry[];
}

// ---------- Debrief Input ----------

export interface M6_DebriefInput {
  recall_attempt_id: string;
  transformation_id: string;
  grade_output: M6_GradeOutput;
  concepts: AnalyzedConcept[];
  confusion_pairs: AnalyzedConfusionPair[];
  traps: string[];
  answers: RecallAnswer[];
}

// ---------- Debrief Output ----------

export type M6_DebriefOutput = DebriefReport;

// ---------- Full Recall Suite (all 4 test types) ----------

export interface M6_RecallSuite {
  inline_items: RecallItem[];
  final_test: M6_GenerateOutput;
  j1_test: M6_GenerateOutput;
  j7_test: M6_GenerateOutput;
}
