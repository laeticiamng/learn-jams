import type { PlanKey, FeatureKey } from "./pricing.types";

// Format availability status per plan
export type FormatAvailability = "included" | "limited" | "locked" | "beta" | "topup_only";

// Plan-format matrix entry
export interface PlanFormatEntry {
  plan_key: PlanKey;
  feature_key: FeatureKey;
  availability: FormatAvailability;
  monthly_quota: number; // -1 = unlimited, 0 = disabled
  overage_allowed: boolean;
  topup_eligible: boolean;
}

// User entitlement snapshot
export interface UserEntitlementSnapshot {
  id: string;
  user_id: string;
  plan_key: PlanKey;
  computed_at: string;
  entitlements: EntitlementEntry[];
  flex_credits_available: Partial<Record<FeatureKey, number>>;
  active_topups: TopupSummary[];
  restrictions: EntitlementRestriction[];
}

export interface EntitlementEntry {
  feature_key: FeatureKey;
  availability: FormatAvailability;
  quota_total: number;      // -1 = unlimited
  quota_used: number;
  quota_remaining: number;  // -1 = unlimited
  flex_bonus: number;       // extra from adaptive credits
  topup_bonus: number;      // extra from purchased top-ups
  effective_remaining: number; // quota_remaining + flex_bonus + topup_bonus
}

export interface TopupSummary {
  feature_key: FeatureKey;
  remaining: number;
  expires_at: string | null;
}

export interface EntitlementRestriction {
  feature_key: FeatureKey;
  reason: "plan_locked" | "quota_exhausted" | "beta_access" | "region_locked";
  upgrade_path?: PlanKey;
  topup_available?: boolean;
  message_key: string;
}

// Paywall context
export type PaywallTrigger = "format_locked" | "quota_exhausted" | "feature_upgrade" | "adaptive_reallocation";

export interface PaywallContext {
  trigger: PaywallTrigger;
  feature_key: FeatureKey;
  current_plan: PlanKey;
  suggested_plan?: PlanKey;
  suggested_topup?: string;
  can_use_flex?: boolean;
  message_key: string;
}

// Legacy migration
export type LegacyPlanId = string;

export interface LegacyPlanMapping {
  legacy_plan_id: LegacyPlanId;
  target_plan_key: PlanKey;
  migration_rules: MigrationRule[];
  grace_period_days: number;
  notification_sent: boolean;
}

export interface MigrationRule {
  feature_key: FeatureKey;
  legacy_quota: number;
  new_quota: number;
  compensation_credits: number; // extra credits if downgraded
}

export interface MigrationAuditEntry {
  id: string;
  user_id: string;
  legacy_plan_id: LegacyPlanId;
  target_plan_key: PlanKey;
  migrated_at: string;
  rules_applied: MigrationRule[];
  compensation_granted: boolean;
  status: "pending" | "completed" | "failed" | "rolled_back";
}
