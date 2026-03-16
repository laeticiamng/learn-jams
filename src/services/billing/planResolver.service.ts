// ============================================================
// Plan Resolver — Plan lookup, pricing, annual discount
// ============================================================

import type {
  PlanKey,
  ZoneKey,
  BillingInterval,
  FeatureKey,
} from "@/domain/billing/pricing.types";
import { PLAN_ORDER } from "@/domain/billing/pricing.types";

// ---------- Static Plan Quotas ----------

const PLAN_QUOTAS: Record<PlanKey, Record<FeatureKey, number>> = {
  free: {
    dynamic_sheet_generation: 3,
    animated_story_generation: 0,
    escape_game_generation: 0,
    music_generation: 2,
    video_generation_ai_seconds: 0,
    video_template_render: 0,
    guardian_sms: 0,
    guardian_email: 0,
    premium_export: 0,
  },
  core: {
    dynamic_sheet_generation: -1,
    animated_story_generation: -1,
    escape_game_generation: 10,
    music_generation: 25,
    video_generation_ai_seconds: 15,
    video_template_render: 5,
    guardian_sms: 0,
    guardian_email: 0,
    premium_export: 0,
  },
  plus: {
    dynamic_sheet_generation: -1,
    animated_story_generation: -1,
    escape_game_generation: 30,
    music_generation: 60,
    video_generation_ai_seconds: 60,
    video_template_render: 15,
    guardian_sms: 0,
    guardian_email: 10,
    premium_export: -1,
  },
  premium_family: {
    dynamic_sheet_generation: -1,
    animated_story_generation: -1,
    escape_game_generation: 80,
    music_generation: 100,
    video_generation_ai_seconds: 120,
    video_template_render: 30,
    guardian_sms: 10,
    guardian_email: 30,
    premium_export: -1,
  },
  family_plus: {
    dynamic_sheet_generation: -1,
    animated_story_generation: -1,
    escape_game_generation: 200,
    music_generation: 250,
    video_generation_ai_seconds: 300,
    video_template_render: 80,
    guardian_sms: 30,
    guardian_email: 100,
    premium_export: -1,
  },
  school: {
    dynamic_sheet_generation: -1,
    animated_story_generation: -1,
    escape_game_generation: -1,
    music_generation: -1,
    video_generation_ai_seconds: -1,
    video_template_render: -1,
    guardian_sms: -1,
    guardian_email: -1,
    premium_export: -1,
  },
};

// ---------- Static Zone Prices ----------

interface ZonePrices {
  monthly: number;
  annual: number;
}

const PLAN_PRICES: Record<PlanKey, Record<ZoneKey, ZonePrices>> = {
  free: {
    zone_a: { monthly: 0, annual: 0 },
    zone_b: { monthly: 0, annual: 0 },
    zone_c: { monthly: 0, annual: 0 },
  },
  core: {
    zone_a: { monthly: 34, annual: 348 },
    zone_b: { monthly: 26, annual: 264 },
    zone_c: { monthly: 19, annual: 192 },
  },
  plus: {
    zone_a: { monthly: 69, annual: 708 },
    zone_b: { monthly: 52, annual: 528 },
    zone_c: { monthly: 39, annual: 396 },
  },
  premium_family: {
    zone_a: { monthly: 99, annual: 1008 },
    zone_b: { monthly: 74, annual: 756 },
    zone_c: { monthly: 54, annual: 552 },
  },
  family_plus: {
    zone_a: { monthly: 229, annual: 2388 },
    zone_b: { monthly: 169, annual: 1788 },
    zone_c: { monthly: 119, annual: 1188 },
  },
  school: {
    zone_a: { monthly: 299, annual: 2988 },
    zone_b: { monthly: 229, annual: 2388 },
    zone_c: { monthly: 169, annual: 1788 },
  },
};

// ---------- Public API ----------

export function getPlanQuota(plan: PlanKey, feature: FeatureKey): number {
  return PLAN_QUOTAS[plan]?.[feature] ?? 0;
}

export function getPlanQuotas(plan: PlanKey): Record<FeatureKey, number> {
  return { ...PLAN_QUOTAS[plan] };
}

export function getPlanPrice(plan: PlanKey, zone: ZoneKey, interval: BillingInterval): number {
  const prices = PLAN_PRICES[plan]?.[zone];
  if (!prices) return 0;
  return interval === "monthly" ? prices.monthly : prices.annual;
}

export function getEffectiveMonthlyPrice(plan: PlanKey, zone: ZoneKey, interval: BillingInterval): number {
  if (interval === "monthly") return getPlanPrice(plan, zone, "monthly");
  return Math.round(getPlanPrice(plan, zone, "annual") / 12);
}

export function getAnnualDiscount(plan: PlanKey, zone: ZoneKey): number {
  const monthly = getPlanPrice(plan, zone, "monthly");
  if (monthly === 0) return 0;
  const annualMonthly = getEffectiveMonthlyPrice(plan, zone, "annual");
  return Math.round((1 - annualMonthly / monthly) * 100);
}

export function isFeatureEnabled(plan: PlanKey, feature: FeatureKey): boolean {
  const quota = getPlanQuota(plan, feature);
  return quota !== 0; // 0 = disabled, -1 = unlimited, >0 = limited
}

export function isUnlimited(plan: PlanKey, feature: FeatureKey): boolean {
  return getPlanQuota(plan, feature) === -1;
}

export function suggestUpgrade(currentPlan: PlanKey, feature: FeatureKey): PlanKey | null {
  const currentOrder = PLAN_ORDER[currentPlan];
  const plans: PlanKey[] = ["core", "plus", "premium_family", "family_plus"];
  for (const plan of plans) {
    if (PLAN_ORDER[plan] > currentOrder && isFeatureEnabled(plan, feature)) {
      return plan;
    }
  }
  return null;
}

export function getVisiblePlans(): PlanKey[] {
  return ["free", "core", "plus", "premium_family"];
}
