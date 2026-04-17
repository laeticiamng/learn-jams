// ============================================================
// useFeatureQuota — read & display quota usage for any feature
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface QuotaUsage {
  used: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export function useFeatureQuota(featureKey: string) {
  const { user } = useAuth();
  const [usage, setUsage] = useState<QuotaUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setUsage(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_feature_quota_usage", {
      p_user_id: user.id,
      p_feature_key: featureKey,
    });
    if (!error && data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      setUsage({
        used: typeof d.used === "number" ? d.used : 0,
        periodStart: (d.period_start as string) ?? null,
        periodEnd: (d.period_end as string) ?? null,
      });
    }
    setLoading(false);
  }, [user, featureKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { usage, loading, refresh };
}
