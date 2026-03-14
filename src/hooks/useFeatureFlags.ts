// ============================================================
// Hook: useFeatureFlags — Runtime feature flag resolution
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { resolveFeatureFlags, isFeatureEnabled } from "@/services/product/featureFlags.service";
import { DEFAULT_FLAGS, type ResolvedFlags, type FeatureFlagKey } from "@/domain/product/featureFlags.types";

export function useFeatureFlags() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<ResolvedFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const resolved = await resolveFeatureFlags(user?.id);
      setFlags(resolved);
    } catch {
      setFlags(DEFAULT_FLAGS);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const isEnabled = useCallback(
    (key: FeatureFlagKey) => isFeatureEnabled(flags, key),
    [flags],
  );

  return { flags, loading, isEnabled, refresh };
}
