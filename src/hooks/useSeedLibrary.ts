// ============================================================
// Hook: useSeedLibrary — Load and manage seed transformations
// ============================================================

import { useState, useCallback, useEffect } from "react";
import type { SeedTransformation, SeedTransformationSummary } from "@/domain/product/seed.types";
import {
  getSeedTransformations,
  getSeedTransformationById,
  getLocalSeedTransformations,
  getLocalSeedById,
} from "@/services/product/seedLibrary.service";

export function useSeedLibrary() {
  const [seeds, setSeeds] = useState<SeedTransformationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSeedTransformations();
      if (data.length > 0) {
        setSeeds(data);
      } else {
        // Fallback to local seeds
        setSeeds(getLocalSeedTransformations());
      }
    } catch {
      setSeeds(getLocalSeedTransformations());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const getById = useCallback(async (id: string): Promise<SeedTransformation | null> => {
    try {
      const remote = await getSeedTransformationById(id);
      if (remote) return remote;
    } catch {
      // Fall through
    }
    return getLocalSeedById(id);
  }, []);

  return { seeds, loading, refresh, getById };
}
