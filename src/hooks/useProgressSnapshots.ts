// ============================================================
// Hook: useProgressSnapshots — Load progress history
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { ProgressSnapshot } from "@/domain/cognitio/longitudinal.types";
import { getProgressSnapshots } from "@/services/cognitio/learner-profile-refresh.service";

export function useProgressSnapshots(limit = 30) {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<ProgressSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getProgressSnapshots(user.id, limit);
      setSnapshots(data);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => { refresh(); }, [refresh]);

  return { snapshots, loading, refresh };
}
