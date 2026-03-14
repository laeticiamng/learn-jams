// ============================================================
// Hook: useGuardians — List and manage guardian links
// ============================================================

import { useState, useEffect, useCallback } from "react";
import type { GuardianWithLink } from "@/domain/guardian/guardian.types";
import { getGuardiansForUser, revokeGuardianLink } from "@/services/guardian/guardianManagement.service";

export function useGuardians(userId: string | null) {
  const [guardians, setGuardians] = useState<GuardianWithLink[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getGuardiansForUser(userId);
      setGuardians(data);
    } catch {
      setGuardians([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const revoke = useCallback(
    async (guardianId: string) => {
      if (!userId) return;
      await revokeGuardianLink(userId, guardianId);
      setGuardians(prev =>
        prev.map(g =>
          g.id === guardianId ? { ...g, link: { ...g.link, status: "revoked" as const } } : g,
        ),
      );
    },
    [userId],
  );

  return { guardians, loading, refresh, revoke };
}
