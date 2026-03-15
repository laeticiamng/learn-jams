// ============================================================
// Billing Events — Track pricing/billing/usage events
// ============================================================

import type { BillingEvent, BillingEventType } from "@/domain/billing/observability.types";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export async function trackBillingEvent(
  eventType: BillingEventType,
  userId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const event: BillingEvent = {
    event_type: eventType,
    user_id: userId,
    metadata,
    timestamp: new Date().toISOString(),
  };

  // Log to product events table (already exists)
  await supabase.from("product_events").insert({
    event_name: event.event_type,
    user_id: event.user_id,
    metadata_json: {
      ...event.metadata,
      billing_event: true,
    } as unknown as Json,
  }).then(() => {});
}

export async function trackQuotaConsumed(
  userId: string,
  featureKey: string,
  source: "quota" | "flex" | "credit",
  planKey: string,
): Promise<void> {
  await trackBillingEvent("quota_consumed", userId, {
    feature_key: featureKey,
    source,
    plan_key: planKey,
  });
}

export async function trackQuotaExceeded(
  userId: string,
  featureKey: string,
  planKey: string,
): Promise<void> {
  await trackBillingEvent("quota_exceeded", userId, {
    feature_key: featureKey,
    plan_key: planKey,
  });
}

export async function trackAdaptiveCreditUsed(
  userId: string,
  fromFeature: string,
  toFeature: string,
  amount: number,
): Promise<void> {
  await trackBillingEvent("adaptive_credit_used", userId, {
    from_feature: fromFeature,
    to_feature: toFeature,
    amount,
  });
}

export async function trackMissionQAResult(
  userId: string | null,
  missionId: string,
  passed: boolean,
  score: number,
): Promise<void> {
  await trackBillingEvent(passed ? "mission_qa_passed" : "mission_qa_failed", userId, {
    mission_id: missionId,
    score,
  });
}

export async function trackDominantModeSelected(
  userId: string,
  mode: string,
): Promise<void> {
  await trackBillingEvent("dominant_mode_selected", userId, { mode });
}
