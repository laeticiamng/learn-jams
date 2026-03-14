// ============================================================
// COGNITIO Memory Architect Contracts — M3 Input/Output
// ============================================================

import type { LearningObjective, ReasoningType, ChosenFormat } from "./types";
import type { AnalyzedConcept, AnalyzedConfusionPair, AnalyzedTrap } from "./contracts";
import type { LearnerAudienceProfile } from "./learner-profile.types";
import type {
  M3_Segment,
  RepetitionPlanItem,
  MnemonicItem,
  M3_VisualAnchor,
  CognitiveBudget,
  PedagogicalContract,
} from "./memory.types";

// ---------- M3 Input ----------

export interface M3_Input {
  course_profile_id: string;
  document_id: string;
  concepts: AnalyzedConcept[];
  confusion_pairs: AnalyzedConfusionPair[];
  traps: AnalyzedTrap[];
  reasoning_type: ReasoningType;
  objective: LearningObjective;
  density: "low" | "medium" | "high";
  estimated_complexity: number;       // 1-10
  total_duration_budget_sec?: number; // optional max duration
  learner_profile?: LearnerAudienceProfile;
}

// ---------- M3 Output ----------

export interface M3_Output {
  architecture_id: string;
  document_id: string;
  course_profile_id: string;

  // Core architecture
  segments: M3_Segment[];
  concept_order: string[];            // ordered stable_keys (learning sequence)
  repetition_plan: RepetitionPlanItem[];
  mnemonics: MnemonicItem[];
  visual_anchors: M3_VisualAnchor[];

  // Budget & contract
  cognitive_budget: CognitiveBudget;
  pedagogical_contract: PedagogicalContract;

  // Duration
  total_duration_sec: number;
  needs_splitting: boolean;
  split_modules?: SplitModule[];

  // Metadata
  reasoning_type: ReasoningType;
  objective: LearningObjective;
}

// ---------- Split Module ----------

export interface SplitModule {
  module_index: number;
  segment_indices: number[];
  concept_keys: string[];
  estimated_duration_sec: number;
  title_suggestion: string;
}
