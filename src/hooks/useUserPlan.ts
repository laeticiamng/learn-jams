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
      // Strategy: try getUser() (network-fresh), fall back to getSession() (cached JWT)
      let meta: Record<string, unknown> | undefined;

      const { data: getUserData, error: getUserError } = await supabase.auth.getUser();
      if (!getUserError && getUserData?.user?.user_metadata) {
        meta = getUserData.user.user_metadata as Record<string, unknown>;
      } else {
        // Fallback to cached session if getUser() fails (network issue)
        const { data: sessionData } = await supabase.auth.getSession();
        meta = sessionData?.session?.user?.user_metadata as Record<string, unknown> | undefined;
        if (getUserError) {
          console.warn("[useUserPlan] getUser() failed, using cached session:", getUserError.message);
        }
      }

      if (meta?.is_admin === true || meta?.role === "admin") {
        const adminPlan: PlanKey = (meta.plan_key as PlanKey) ?? "school";
        setPlan(adminPlan);
        try {
          const summary = await getUserUsageSummary(userId, adminPlan);
          setUsage(summary);
        } catch {
          // Usage summary failure should not block admin plan resolution
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

  // Re-check plan on auth state changes (e.g. admin metadata updated without logout)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        // Refresh on any user update or token refresh — catches metadata changes
        if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
          refresh();
        }
      }
    );
    return () => { subscription.unsubscribe(); };
  }, [refresh]);

  return { plan, loading, usage, refresh };
}
