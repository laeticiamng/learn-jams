// ============================================================
// useUserPlan — Hook for current user plan + quota status
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlanKey, FeatureKey } from "@/domain/billing/pricing.types";
import { getUserUsageSummary } from "@/services/billing/quotaEngine.service";

interface UserPlanState {
  plan: PlanKey;
  loading: boolean;
  usage: Record<string, { used: number; limit: number; credits: number }> | null;
  refresh: () => Promise<void>;
}

export function useUserPlan(userId: string | null): UserPlanState {
  const [plan, setPlan] = useState<PlanKey>("free");
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<Record<string, { used: number; limit: number; credits: number }> | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setPlan("free");
      setUsage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get subscription to determine plan
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, stripe_subscription_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      // For now, map subscription presence to plan level
      // In production, the subscription metadata would contain the plan_key
      const currentPlan: PlanKey = sub ? "core" : "free";
      setPlan(currentPlan);

      // Get usage summary
      const summary = await getUserUsageSummary(userId, currentPlan);
      setUsage(summary);
    } catch {
      setPlan("free");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { plan, loading, usage, refresh };
}
