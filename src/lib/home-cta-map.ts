// ============================================================
// Homepage CTA → Route mapping
// ============================================================

export type CTAAction =
  | "create"
  | "signup"
  | "login"
  | "library"
  | "demo"
  | "pricing"
  | "guardian";

interface CTARoute {
  /** Route for authenticated users */
  authed: string;
  /** Route for unauthenticated users */
  guest: string;
}

const CTA_ROUTES: Record<CTAAction, CTARoute> = {
  create: { authed: "/create", guest: "/signup" },
  signup: { authed: "/create", guest: "/signup" },
  login: { authed: "/create", guest: "/login" },
  library: { authed: "/library", guest: "/signup" },
  demo: { authed: "/create", guest: "/signup" },
  pricing: { authed: "/pricing", guest: "/pricing" },
  guardian: { authed: "/guardian-settings", guest: "/signup" },
};

/**
 * Resolve a CTA action to a concrete route.
 * If a seed ID is provided for the "demo" action, it's appended as a query param.
 */
export function resolveCTARoute(
  action: CTAAction,
  isAuthenticated: boolean,
  seedId?: string,
): string {
  const route = CTA_ROUTES[action];
  const base = isAuthenticated ? route.authed : route.guest;

  if (action === "demo" && seedId && isAuthenticated) {
    return `${base}?seed=${seedId}`;
  }

  return base;
}

/**
 * All CTA actions that exist on the homepage, for validation in tests.
 */
export const ALL_CTA_ACTIONS: CTAAction[] = Object.keys(CTA_ROUTES) as CTAAction[];
