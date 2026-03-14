// ============================================================
// PostHog Analytics Provider
// ============================================================

import type { AnalyticsProvider } from "@/domain/providers/providerInterfaces";

/**
 * PostHog provider wraps the PostHog JS SDK.
 * Uses globalThis to check if PostHog has been loaded externally.
 * No static or dynamic import — avoids build errors when not installed.
 */

function getPostHog(): any | null {
  try {
    return (globalThis as any).posthog ?? null;
  } catch {
    return null;
  }
}

export const posthogAnalyticsProvider: AnalyticsProvider = {
  key: "posthog",

  identify(userId, properties) {
    const ph = getPostHog();
    if (!ph) return;
    ph.identify(userId, properties);
  },

  track(event, properties) {
    const ph = getPostHog();
    if (!ph) return;
    ph.capture(event, properties);
  },

  getFeatureFlag(flagKey, defaultValue = false) {
    const ph = getPostHog();
    if (!ph) return defaultValue;
    try {
      const val = ph.getFeatureFlag(flagKey);
      return typeof val === "boolean" ? val : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  isFeatureEnabled(flagKey) {
    const ph = getPostHog();
    if (!ph) return false;
    try {
      return !!ph.isFeatureEnabled(flagKey);
    } catch {
      return false;
    }
  },
};
