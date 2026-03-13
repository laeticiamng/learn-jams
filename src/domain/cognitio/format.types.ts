// ============================================================
// COGNITIO Format Selector Types — M4
// ============================================================

import type { ChosenFormat, ReasoningType, LearningObjective } from "./types";

// ---------- Decision Matrix Cell ----------

export interface FormatMatrixCell {
  reasoning_type: ReasoningType;
  objective: LearningObjective;
  recommended_format: ChosenFormat;
  confidence: number; // 0-1 how strong the recommendation is
}

// ---------- Override Rule ----------

export type OverrideReason =
  | "duration_too_short"       // < 180s → fiche_dynamique
  | "duration_too_long"        // > 600s → needs split
  | "low_quality"              // quality < 0.55 → fiche_dynamique
  | "too_few_concepts"         // < 5 concepts → fiche_dynamique
  | "user_preference"          // explicit user choice
  | "insufficient_structure";  // minimal structure → fiche_dynamique

export interface FormatOverride {
  reason: OverrideReason;
  original_format: ChosenFormat;
  forced_format: ChosenFormat;
  message: string;
}

// ---------- Format Decision Module ----------

export interface FormatDecisionModule {
  module_index: number;
  concept_keys: string[];
  chosen_format: ChosenFormat;
  estimated_duration_sec: number;
  justification: string;
}

// ---------- Cost Level ----------

export type CostLevel = "low" | "medium" | "high";
