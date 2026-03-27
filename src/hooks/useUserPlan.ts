// ============================================================
// useUserPlan — Hook for current user plan + quota status
// SECURITY: Admin check uses user_roles table, not user_metadata
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlanKey } from "@/domain/billing/pricing.types";
import { getUserUsageSummary } from "@/services/billing/quotaEngine.service";

interface UserPlanState {
  plan: PlanKey;
  loading: boolean;
  usage: Record<string, { used: number; limit: number; credits: number }> | null;
  refresh: () => Promise<void>;
}

/** Check admin via user_roles table (server-side, not user_metadata). */
async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return !error && !!data;
  } catch {
    return false;
  }
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
      // Check admin via server-side user_roles table
      const isAdmin = await checkAdminRole(userId);

      if (isAdmin) {
        const adminPlan: PlanKey = "school";
        setPlan(adminPlan);
        try {
          const summary = await getUserUsageSummary(userId, adminPlan);
          setUsage(summary);
        } catch {
          setUsage(null);
        }
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

  // Re-check plan on auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
          refresh();
        }
      }
    );
    return () => { subscription.unsubscribe(); };
  }, [refresh]);

  return { plan, loading, usage, refresh };
}
