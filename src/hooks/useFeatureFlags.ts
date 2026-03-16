// ============================================================
// Hook: useFeatureFlags — Runtime feature flag resolution
// ============================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { resolveFeatureFlags, isFeatureEnabled } from "@/services/product/featureFlags.service";
import { DEFAULT_FLAGS, FEATURE_FLAG_KEYS, type ResolvedFlags, type FeatureFlagKey } from "@/domain/product/featureFlags.types";
import { isAdmin } from "@/security/roles";

/** All flags forced to true — used for admin accounts */
const ALL_FLAGS_ENABLED: ResolvedFlags = Object.fromEntries(
  FEATURE_FLAG_KEYS.map((k) => [k, true]),
) as ResolvedFlags;

export function useFeatureFlags() {
  const { user } = useAuth();
  const userIsAdmin = useMemo(() => isAdmin(user?.user_metadata), [user?.user_metadata]);
  const [flags, setFlags] = useState<ResolvedFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (userIsAdmin) {
      setFlags(ALL_FLAGS_ENABLED);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const resolved = await resolveFeatureFlags(user?.id);
      setFlags(resolved);
    } catch {
      setFlags(DEFAULT_FLAGS);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userIsAdmin]);

  useEffect(() => { refresh(); }, [refresh]);

  const isEnabled = useCallback(
    (key: FeatureFlagKey) => isFeatureEnabled(flags, key),
    [flags],
  );

  return { flags, loading, isEnabled, refresh };
}
