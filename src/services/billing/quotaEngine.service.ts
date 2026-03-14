// ============================================================
// Quota Engine — Consumption, top-up fallback, enforcement
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { FeatureKey, PlanKey, ConsumeResult } from "@/domain/billing/pricing.types";
import { getPlanQuota, isFeatureEnabled, suggestUpgrade } from "./planResolver.service";

// ---------- Check if user can consume ----------

export async function checkQuota(
  userId: string,
  plan: PlanKey,
  feature: FeatureKey,
  amount: number = 1,
): Promise<ConsumeResult> {
  // Feature completely disabled for this plan
  if (!isFeatureEnabled(plan, feature)) {
    return { allowed: false, reason: "feature_disabled", upgrade_to: suggestUpgrade(plan, feature) ?? undefined };
  }

  const limit = getPlanQuota(plan, feature);

  // Unlimited (-1)
  if (limit === -1) {
    return { allowed: true, source: "quota", remaining: -1 };
  }

  // Get current usage
  const used = await getCurrentUsage(userId, feature);
  const remaining = limit - used;

  if (remaining >= amount) {
    return { allowed: true, source: "quota", remaining: remaining - amount };
  }

  // Check top-up credits
  const credits = await getCreditBalance(userId, feature);
  if (credits >= amount) {
    return { allowed: true, source: "credit", remaining: credits - amount };
  }

  return { allowed: false, reason: "quota_exceeded", upgrade_to: suggestUpgrade(plan, feature) ?? undefined };
}

// ---------- Consume quota ----------

export async function consumeQuota(
  userId: string,
  plan: PlanKey,
  feature: FeatureKey,
  amount: number = 1,
): Promise<ConsumeResult> {
  const check = await checkQuota(userId, plan, feature, amount);
  if (!check.allowed) return check;

  if (check.source === "quota") {
    await incrementUsage(userId, feature, amount);
  } else {
    await decrementCredits(userId, feature, amount);
  }

  return check;
}

// ---------- Get current usage for billing period ----------

async function getCurrentUsage(userId: string, feature: FeatureKey): Promise<number> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("usage_quotas_v2")
    .select("counters_json")
    .eq("user_id", userId)
    .lte("billing_period_start", now)
    .gte("billing_period_end", now)
    .order("billing_period_start", { ascending: false })
    .limit(1)
    .single();

  if (!data) return 0;
  const counters = data.counters_json as Record<string, number>;
  return counters[feature] ?? 0;
}

// ---------- Increment usage ----------

async function incrementUsage(userId: string, feature: FeatureKey, amount: number): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Upsert current period
  const { data: existing } = await supabase
    .from("usage_quotas_v2")
    .select("id, counters_json")
    .eq("user_id", userId)
    .eq("billing_period_start", periodStart)
    .single();

  if (existing) {
    const counters = existing.counters_json as Record<string, number>;
    counters[feature] = (counters[feature] ?? 0) + amount;
    await supabase
      .from("usage_quotas_v2")
      .update({ counters_json: counters, updated_at: now.toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("usage_quotas_v2").insert({
      user_id: userId,
      billing_period_start: periodStart,
      billing_period_end: periodEnd,
      counters_json: { [feature]: amount },
      plan_snapshot_json: {},
    });
  }
}

// ---------- Credit balance ----------

async function getCreditBalance(userId: string, feature: FeatureKey): Promise<number> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("user_credit_balances")
    .select("remaining")
    .eq("user_id", userId)
    .eq("credit_type", feature)
    .gt("remaining", 0)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: true });

  if (!data) return 0;
  return data.reduce((sum, row) => sum + row.remaining, 0);
}

async function decrementCredits(userId: string, feature: FeatureKey, amount: number): Promise<void> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("user_credit_balances")
    .select("id, remaining")
    .eq("user_id", userId)
    .eq("credit_type", feature)
    .gt("remaining", 0)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: true });

  if (!data) return;

  let toConsume = amount;
  for (const row of data) {
    if (toConsume <= 0) break;
    const consume = Math.min(toConsume, row.remaining);
    await supabase
      .from("user_credit_balances")
      .update({ remaining: row.remaining - consume, updated_at: now })
      .eq("id", row.id);
    toConsume -= consume;
  }
}

// ---------- Get all usage for current period ----------

export async function getUserUsageSummary(
  userId: string,
  plan: PlanKey,
): Promise<Record<FeatureKey, { used: number; limit: number; credits: number }>> {
  const now = new Date().toISOString();
  const { data: quotaData } = await supabase
    .from("usage_quotas_v2")
    .select("counters_json")
    .eq("user_id", userId)
    .lte("billing_period_start", now)
    .gte("billing_period_end", now)
    .order("billing_period_start", { ascending: false })
    .limit(1)
    .single();

  const counters = (quotaData?.counters_json as Record<string, number>) ?? {};

  const { data: creditData } = await supabase
    .from("user_credit_balances")
    .select("credit_type, remaining")
    .eq("user_id", userId)
    .gt("remaining", 0)
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  const creditMap: Record<string, number> = {};
  if (creditData) {
    for (const row of creditData) {
      creditMap[row.credit_type] = (creditMap[row.credit_type] ?? 0) + row.remaining;
    }
  }

  const features: FeatureKey[] = [
    "dynamic_sheet_generation", "animated_story_generation", "escape_game_generation",
    "music_generation", "video_generation_ai_seconds", "video_template_render",
    "guardian_sms", "guardian_email", "premium_export",
  ];

  const summary: Record<string, { used: number; limit: number; credits: number }> = {};
  for (const feature of features) {
    summary[feature] = {
      used: counters[feature] ?? 0,
      limit: getPlanQuota(plan, feature),
      credits: creditMap[feature] ?? 0,
    };
  }

  return summary as Record<FeatureKey, { used: number; limit: number; credits: number }>;
}
