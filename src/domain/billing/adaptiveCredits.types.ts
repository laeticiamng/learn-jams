// ============================================================
// Adaptive Credits / Flex Credits — Domain Types
// ============================================================

import type { FeatureKey, PlanKey } from "./pricing.types";

// ---------- Usage Profiles ----------

export const USAGE_PROFILES = [
  "music_first",
  "mission_first",
  "sheet_first",
  "mixed",
  "video_light",
  "video_heavy",
  "family_guardian",
  "exam_intensive",
] as const;

export type UsageProfile = (typeof USAGE_PROFILES)[number];

// ---------- Dominant Mode ----------

export const DOMINANT_MODES = [
  "songs",
  "missions",
  "sheets",
  "video",
  "mixed",
] as const;

export type DominantMode = (typeof DOMINANT_MODES)[number];

// ---------- Adaptive Credit Policy ----------

export interface AdaptiveCreditPolicy {
  id: string;
  policy_key: string;
  plan_key: PlanKey;
  conversion_rules_json: ConversionRuleSet;
  monthly_flex_budget_json: FlexBudget;
  caps_json: FlexCaps;
  created_at: string;
  updated_at: string;
}

export interface ConversionRule {
  from: FeatureKey;
  to: FeatureKey;
  ratio: number; // e.g. 1 video sec -> 3 songs = ratio 3
  max_convertible_pct: number; // max % of unused 'from' quota convertible (0-100)
}

export type ConversionRuleSet = ConversionRule[];

export interface FlexBudget {
  total_flex_units: number;
  allocatable_to: Partial<Record<FeatureKey, number>>; // max units allocatable per feature
}

export interface FlexCaps {
  max_reallocation_pct: number; // global cap on flex reallocation (0-100)
  video_ai_never_reallocatable: boolean;
  per_feature_caps: Partial<Record<FeatureKey, number>>; // absolute max extra via flex
}

// ---------- Adaptive Credit Balance ----------

export interface AdaptiveCreditBalance {
  id: string;
  user_id: string;
  billing_period_start: string;
  billing_period_end: string;
  available_flex_credits_json: Partial<Record<FeatureKey, number>>;
  consumed_flex_credits_json: Partial<Record<FeatureKey, number>>;
  reallocation_log_json: ReallocationEntry[];
  created_at: string;
  updated_at: string;
}

export interface ReallocationEntry {
  from_feature: FeatureKey;
  to_feature: FeatureKey;
  units_converted: number;
  ratio_applied: number;
  timestamp: string;
}

// ---------- User Usage Profile ----------

export interface UserUsageProfile {
  id: string;
  user_id: string;
  dominant_usage_profile: UsageProfile;
  rolling_30d_usage_json: Partial<Record<FeatureKey, number>>;
  last_detected_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Reallocation Proposal ----------

export interface ReallocationProposal {
  profile: UsageProfile;
  dominant_mode: DominantMode;
  available_conversions: ProposedConversion[];
  message_key: string;
}

export interface ProposedConversion {
  from_feature: FeatureKey;
  to_feature: FeatureKey;
  from_unused: number;
  to_gained: number;
  ratio: number;
}
