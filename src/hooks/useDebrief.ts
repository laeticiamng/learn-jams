// ============================================================
// Hook: useDebrief — Fetch or compute debrief for a recall attempt
// ============================================================

import { useState, useCallback } from "react";
import type { DebriefReport } from "@/domain/cognitio/recall.types";
import type { M6_DebriefInput } from "@/domain/cognitio/recall.contracts";
import { generateDebriefLocally } from "@/services/cognitio/debrief.service";

export function useDebrief() {
  const [debrief, setDebrief] = useState<DebriefReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeDebrief = useCallback((input: M6_DebriefInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = generateDebriefLocally(input);
      setDebrief(result);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur debrief";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setDebrief(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return { debrief, isLoading, error, computeDebrief, reset };
}
