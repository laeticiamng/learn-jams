// ============================================================
// Hook: useConsentHistory — Consent audit trail
// ============================================================

import { useState, useEffect } from "react";
import type { ConsentEvent } from "@/domain/guardian/consent.types";
import { getConsentHistory } from "@/services/guardian/consentLog.service";

export function useConsentHistory(userId: string | null) {
  const [events, setEvents] = useState<ConsentEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getConsentHistory(userId)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [userId]);

  return { events, loading };
}
