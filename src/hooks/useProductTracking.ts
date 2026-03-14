// ============================================================
// Hook: useProductTracking — Easy event tracking
// ============================================================

import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/services/product/eventTracker.service";
import type { TrackEventInput } from "@/domain/product/events.types";

export function useProductTracking() {
  const { user } = useAuth();

  const track = useCallback(
    (input: TrackEventInput) => {
      trackEvent(input, user?.id);
    },
    [user?.id],
  );

  return { track };
}
