// ============================================================
// Billing & Product Observability — Event Types
// ============================================================

export const BILLING_EVENT_TYPES = [
  "pricing_plan_viewed",
  "checkout_started",
  "checkout_completed",
  "topup_purchased",
  "quota_consumed",
  "adaptive_credit_used",
  "adaptive_reallocation_proposed",
  "adaptive_reallocation_applied",
  "quota_exceeded",
  "upgrade_prompt_shown",
  "upgrade_completed",
  "cost_event_recorded",
  "margin_alert_triggered",
  "mission_qa_failed",
  "mission_qa_passed",
  "dominant_mode_selected",
  "usage_profile_detected",
] as const;

export type BillingEventType = (typeof BILLING_EVENT_TYPES)[number];

export interface BillingEvent {
  event_type: BillingEventType;
  user_id: string | null;
  plan_key?: string;
  feature_key?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// ---------- Dashboard Metric Keys ----------

export const DASHBOARD_METRICS = [
  "revenue_by_plan",
  "provider_cost_by_plan",
  "avg_cost_per_user",
  "gross_margin_by_plan",
  "topup_revenue",
  "deficit_users",
  "video_cost_aggregate",
  "music_cost_aggregate",
  "mission_cost_aggregate",
  "mission_usage_by_plan",
  "adaptive_reallocation_by_profile",
  "mission_qa_score_avg",
] as const;

export type DashboardMetric = (typeof DASHBOARD_METRICS)[number];
