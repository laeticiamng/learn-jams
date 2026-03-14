// ============================================================
// Pricing & Billing Domain Types
// ============================================================

// ---------- Feature Keys ----------

export const FEATURE_KEYS = [
  "dynamic_sheet_generation",
  "animated_story_generation",
  "escape_game_generation",
  "music_generation",
  "video_generation_ai_seconds",
  "video_template_render",
  "guardian_sms",
  "guardian_email",
  "premium_export",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

// ---------- Plan Keys ----------

export const PLAN_KEYS = ["free", "core", "plus", "premium_family", "family_plus", "school"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLAN_ORDER: Record<PlanKey, number> = {
  free: 0,
  core: 1,
  plus: 2,
  premium_family: 3,
  family_plus: 4,
  school: 5,
};

// ---------- Zone Keys ----------

export const ZONE_KEYS = ["zone_a", "zone_b", "zone_c"] as const;
export type ZoneKey = (typeof ZONE_KEYS)[number];

// ---------- Segment ----------

export type PlanSegment = "b2c" | "family" | "b2b";

// ---------- Plan ----------

export interface PricingPlan {
  id: string;
  plan_key: PlanKey;
  name: string;
  segment: PlanSegment;
  active: boolean;
  features_json: Record<string, boolean | string>;
  quotas_json: Record<FeatureKey, number>; // -1 = unlimited (reasonable use)
  created_at: string;
  updated_at: string;
}

// ---------- Zone ----------

export interface PricingZone {
  id: string;
  zone_key: ZoneKey;
  label: string;
  countries_json: string[];
  multiplier: number;
  created_at: string;
  updated_at: string;
}

// ---------- Plan Price ----------

export interface PricingPlanPrice {
  id: string;
  plan_id: string;
  zone_id: string;
  currency: string;
  monthly_price: number;
  annual_price: number;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Billing Period ----------

export type BillingInterval = "monthly" | "annual";

// ---------- Usage Quotas ----------

export interface UsageQuota {
  id: string;
  user_id: string;
  billing_period_start: string;
  billing_period_end: string;
  counters_json: Record<string, number>;
  plan_snapshot_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ---------- Credit Pack ----------

export interface CreditPack {
  id: string;
  pack_key: string;
  label: string;
  price: number;
  currency: string;
  credits_json: Partial<Record<FeatureKey, number>>;
  stripe_price_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------- User Credit Balance ----------

export interface UserCreditBalance {
  id: string;
  user_id: string;
  credit_type: FeatureKey;
  remaining: number;
  expires_at: string | null;
  purchase_id: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Cost Event ----------

export interface CostEvent {
  id?: string;
  user_id: string | null;
  transformation_id: string | null;
  feature_key: FeatureKey;
  provider_key: string;
  estimated_cost_usd: number | null;
  actual_cost_usd: number | null;
  metadata_json: Record<string, unknown>;
  created_at?: string;
}

// ---------- Margin Report ----------

export interface MarginReport {
  id: string;
  period_key: string;
  plan_key: string;
  revenue_total_usd: number;
  provider_cost_total_usd: number;
  gross_margin_usd: number;
  gross_margin_pct: number;
  created_at: string;
}

// ---------- Unit Cost Snapshot ----------

export interface UnitCostSnapshot {
  feature_key: FeatureKey;
  provider: string;
  estimated_cost_usd: number;
  actual_cost_usd: number | null;
  currency: "USD";
  source: "pricing_table" | "provider_report" | "estimated_formula";
}

// ---------- Consumption Result ----------

export type ConsumeResult =
  | { allowed: true; source: "quota" | "flex" | "credit"; remaining: number }
  | { allowed: false; reason: "quota_exceeded" | "feature_disabled"; upgrade_to?: PlanKey };

// ---------- Margin Targets ----------

export const MARGIN_TARGETS: Record<PlanKey, number> = {
  free: 0,
  core: 0.70,
  plus: 0.75,
  premium_family: 0.75,
  family_plus: 0.80,
  school: 0.60,
};

// ---------- Estimated Unit Costs (USD) ----------

export const ESTIMATED_UNIT_COSTS: UnitCostSnapshot[] = [
  { feature_key: "dynamic_sheet_generation", provider: "openai", estimated_cost_usd: 0.08, actual_cost_usd: null, currency: "USD", source: "estimated_formula" },
  { feature_key: "animated_story_generation", provider: "openai", estimated_cost_usd: 0.15, actual_cost_usd: null, currency: "USD", source: "estimated_formula" },
  { feature_key: "escape_game_generation", provider: "openai", estimated_cost_usd: 0.25, actual_cost_usd: null, currency: "USD", source: "estimated_formula" },
  { feature_key: "music_generation", provider: "suno", estimated_cost_usd: 0.50, actual_cost_usd: null, currency: "USD", source: "estimated_formula" },
  { feature_key: "video_generation_ai_seconds", provider: "runway_replicate", estimated_cost_usd: 0.15, actual_cost_usd: null, currency: "USD", source: "estimated_formula" },
  { feature_key: "video_template_render", provider: "internal", estimated_cost_usd: 0.02, actual_cost_usd: null, currency: "USD", source: "estimated_formula" },
  { feature_key: "guardian_sms", provider: "twilio", estimated_cost_usd: 0.08, actual_cost_usd: null, currency: "USD", source: "estimated_formula" },
  { feature_key: "guardian_email", provider: "resend", estimated_cost_usd: 0.001, actual_cost_usd: null, currency: "USD", source: "estimated_formula" },
  { feature_key: "premium_export", provider: "internal", estimated_cost_usd: 0.01, actual_cost_usd: null, currency: "USD", source: "estimated_formula" },
];
