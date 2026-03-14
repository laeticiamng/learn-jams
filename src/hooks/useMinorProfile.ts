// ============================================================
// Hook: useMinorProfile — Manage minor profile state
// ============================================================

import { useState, useEffect, useCallback } from "react";
import type { UserMinorProfile } from "@/domain/guardian/minorProfile.types";
import { getMinorProfile, upsertMinorProfile } from "@/services/guardian/guardianManagement.service";

export function useMinorProfile(userId: string | null) {
  const [profile, setProfile] = useState<UserMinorProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getMinorProfile(userId)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [userId]);

  const updateProfile = useCallback(
    async (updates: Partial<Omit<UserMinorProfile, "id" | "user_id" | "created_at" | "updated_at">>) => {
      if (!userId) return;
      const updated = await upsertMinorProfile(userId, updates);
      setProfile(updated);
      return updated;
    },
    [userId],
  );

  return { profile, loading, updateProfile };
}
