// ============================================================
// Cost Tracker — Records cost events for margin analysis
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { FeatureKey, CostEvent } from "@/domain/billing/pricing.types";
import { ESTIMATED_UNIT_COSTS } from "@/domain/billing/pricing.types";

// ---------- Record a cost event ----------

export async function recordCostEvent(event: CostEvent): Promise<void> {
  await (supabase as any).from("cost_events").insert({
    user_id: event.user_id,
    transformation_id: event.transformation_id,
    feature_key: event.feature_key,
    provider_key: event.provider_key,
    estimated_cost_usd: event.estimated_cost_usd,
    actual_cost_usd: event.actual_cost_usd,
    metadata_json: event.metadata_json,
  });
}

// ---------- Record with estimated cost ----------

export async function recordEstimatedCost(
  userId: string | null,
  feature: FeatureKey,
  transformationId: string | null = null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const unit = ESTIMATED_UNIT_COSTS.find((u) => u.feature_key === feature);
  if (!unit) return;

  await recordCostEvent({
    user_id: userId,
    transformation_id: transformationId,
    feature_key: feature,
    provider_key: unit.provider,
    estimated_cost_usd: unit.estimated_cost_usd,
    actual_cost_usd: null,
    metadata_json: metadata,
  });
}

// ---------- Get cost summary for a period ----------

export async function getCostSummary(
  since: string,
  until?: string,
): Promise<{ feature_key: string; provider_key: string; total_estimated: number; total_actual: number; count: number }[]> {
  let query = (supabase as any)
    .from("cost_events")
    .select("feature_key, provider_key, estimated_cost_usd, actual_cost_usd")
    .gte("created_at", since);

  if (until) {
    query = query.lte("created_at", until);
  }

  const { data } = await query;
  if (!data) return [];

  const map = new Map<string, { feature_key: string; provider_key: string; total_estimated: number; total_actual: number; count: number }>();
  for (const row of data) {
    const key = `${row.feature_key}:${row.provider_key}`;
    const entry = map.get(key) ?? { feature_key: row.feature_key, provider_key: row.provider_key, total_estimated: 0, total_actual: 0, count: 0 };
    entry.total_estimated += row.estimated_cost_usd ?? 0;
    entry.total_actual += row.actual_cost_usd ?? 0;
    entry.count += 1;
    map.set(key, entry);
  }

  return Array.from(map.values());
}

// ---------- Get user cost for anomaly detection ----------

export async function getUserCostForPeriod(
  userId: string,
  since: string,
): Promise<number> {
  const { data } = await supabase
    .from("cost_events")
    .select("estimated_cost_usd, actual_cost_usd")
    .eq("user_id", userId)
    .gte("created_at", since);

  if (!data) return 0;
  return data.reduce((sum, row) => sum + (row.actual_cost_usd ?? row.estimated_cost_usd ?? 0), 0);
}
