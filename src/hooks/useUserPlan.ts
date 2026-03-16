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
      // Check if user is admin (admins get school plan)
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata;
      if (meta?.is_admin === true || meta?.role === "admin") {
        const adminPlan: PlanKey = (meta.plan_key as PlanKey) ?? "school";
        setPlan(adminPlan);
        const summary = await getUserUsageSummary(userId, adminPlan);
        setUsage(summary);
        setLoading(false);
        return;
      }

      // Get subscription to determine plan
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, stripe_subscription_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      // Map subscription presence to plan level
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
