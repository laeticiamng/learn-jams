// ============================================================
// Hook: useExperimentAssignment — Experiment group management
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { ExperimentAssignment, ExperimentVariant } from "@/domain/product/experiments.types";
import { assignExperiment, getAssignment, assignVariantLocally } from "@/services/product/experiments.service";

export function useExperimentAssignment(experimentKey: string) {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<ExperimentAssignment | null>(null);
  const [variant, setVariant] = useState<ExperimentVariant | null>(null);
  const [loading, setLoading] = useState(true);

  const resolve = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        // Try remote assignment
        const existing = await getAssignment(experimentKey, user.id);
        if (existing) {
          setAssignment(existing);
          setVariant(existing.variant as ExperimentVariant);
        } else {
          const newAssignment = await assignExperiment({
            experiment_key: experimentKey,
            user_id: user.id,
          });
          setAssignment(newAssignment);
          setVariant(newAssignment.variant as ExperimentVariant);
        }
      } else {
        // Local deterministic fallback
        const localVariant = assignVariantLocally(experimentKey, "anonymous");
        setVariant(localVariant);
      }
    } catch {
      // Fallback: local assignment
      const fallback = assignVariantLocally(experimentKey, user?.id ?? "anonymous");
      setVariant(fallback);
    } finally {
      setLoading(false);
    }
  }, [user, experimentKey]);

  useEffect(() => { resolve(); }, [resolve]);

  return { assignment, variant, loading };
}
