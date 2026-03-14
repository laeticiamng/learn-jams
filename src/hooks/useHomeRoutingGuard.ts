// ============================================================
// Homepage Routing Guard Hook
// ============================================================

import { useAuth } from "@/hooks/useAuth";
import { resolveCTARoute, type CTAAction } from "@/lib/home-cta-map";

/**
 * Provides route resolution for homepage CTAs.
 * Returns a function that resolves any CTA action to its appropriate route.
 */
export function useHomeRoutingGuard() {
  const { user } = useAuth();
  const isAuthed = !!user;

  return {
    resolveRoute: (action: CTAAction, seedId?: string) =>
      resolveCTARoute(action, isAuthed, seedId),
    isAuthed,
  };
}
