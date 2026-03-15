// ============================================================
// COGNITIO Format Selector Contracts — M4 Input/Output
// ============================================================

import type { ChosenFormat, ReasoningType, LearningObjective, DetectedStructureType } from "./types";
import type { M3_Output, SplitModule } from "./memory.contracts";
import type { FormatOverride, FormatDecisionModule, CostLevel } from "./format.types";
import type { LearnerAudienceProfile } from "./learner-profile.types";

// ---------- M4 Input ----------

export interface M4_Input {
  architecture_id: string;
  course_profile_id: string;
  document_id: string;

  // From M3
  total_concepts: number;
  critical_count: number;
  segment_count: number;
  total_duration_sec: number;
  needs_splitting: boolean;
  split_modules?: SplitModule[];

  // From M2
  reasoning_type: ReasoningType;
  density: "low" | "medium" | "high";
  estimated_complexity: number;       // 1-10
  structure_type: DetectedStructureType;

  // Context
  quality_score: number;              // 0-1
  objective: LearningObjective;
  learner_profile?: LearnerAudienceProfile;

  // User intent — explicit format choice from UI
  user_selected_format?: ChosenFormat;
}

// ---------- M4 Output ----------

export interface M4_Output {
  decision_id: string;
  architecture_id: string;

  // Primary decision
  chosen_format: ChosenFormat;
  justification: string;
  matrix_reasoning: string;          // explains which matrix cell was used

  // Duration & splitting
  estimated_duration_sec: number;
  needs_split: boolean;
  split_count?: number;
  modules?: FormatDecisionModule[];

  // Overrides applied
  overrides_applied: FormatOverride[];

  // Cost
  cost_level: CostLevel;

  // Override transparency
  user_selected_format?: ChosenFormat;
  system_recommended_format: ChosenFormat;
  fallback_candidates: ChosenFormat[];
  override_reason?: string;
  override_requires_confirmation: boolean;

  // Deterministic trace
  decision_trace: {
    reasoning_type: ReasoningType;
    objective: LearningObjective;
    matrix_result: ChosenFormat;
    overrides_checked: string[];
    final_format: ChosenFormat;
    user_intent_respected: boolean;
  };
}
