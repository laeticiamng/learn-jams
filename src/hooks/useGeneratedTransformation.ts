// ============================================================
// Hook: useGeneratedTransformation
// Load a transformation from DB by ID
// ============================================================

import { useState, useEffect } from "react";
import type { M5_Output } from "@/domain/cognitio/generation.contracts";
import { getTransformation } from "@/services/cognitio/dynamic-sheet.service";

export function useGeneratedTransformation(transformationId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<M5_Output | null>(null);

  useEffect(() => {
    if (!transformationId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await getTransformation(transformationId!);
        if (!cancelled) {
          setData(result);
          if (!result) setError("Fiche non trouvée");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur de chargement");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [transformationId]);

  return { loading, error, data };
}
