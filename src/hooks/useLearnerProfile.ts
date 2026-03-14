// ============================================================
// Hook: useLearnerProfile — Extended learner profile with memory
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { FormatEffectivenessRecord } from "@/domain/cognitio/longitudinal.types";
import { getFormatEffectiveness } from "@/services/cognitio/format-effectiveness.service";
import { useLongitudinalMemory } from "@/hooks/useLongitudinalMemory";

export function useLearnerProfile() {
  const { user } = useAuth();
  const memory = useLongitudinalMemory();
  const [formatRecords, setFormatRecords] = useState<FormatEffectivenessRecord[]>([]);
  const [formatLoading, setFormatLoading] = useState(true);

  const refreshFormats = useCallback(async () => {
    if (!user) return;
    setFormatLoading(true);
    try {
      const data = await getFormatEffectiveness(user.id);
      setFormatRecords(data);
    } catch {
      // Non-blocking
    } finally {
      setFormatLoading(false);
    }
  }, [user]);

  useEffect(() => { refreshFormats(); }, [refreshFormats]);

  const refresh = useCallback(async () => {
    await Promise.all([memory.refresh(), refreshFormats()]);
  }, [memory.refresh, refreshFormats]);

  return {
    ...memory,
    formatRecords,
    formatLoading,
    refresh,
  };
}
