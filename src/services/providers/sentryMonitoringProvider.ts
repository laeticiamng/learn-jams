// ============================================================
// Sentry Monitoring Provider
// ============================================================

import type { MonitoringProvider, MonitoringTransaction } from "@/domain/providers/providerInterfaces";

/**
 * Sentry provider wraps the Sentry SDK.
 * Uses globalThis to check if Sentry has been loaded externally.
 * No static or dynamic import of @sentry/browser — avoids build errors
 * when the package is not installed.
 */

function getSentry(): any | null {
  try {
    return (globalThis as any).Sentry ?? null;
  } catch {
    return null;
  }
}

export const sentryMonitoringProvider: MonitoringProvider = {
  key: "sentry",

  captureException(error, context) {
    const s = getSentry();
    if (!s) return;
    s.captureException(error, { extra: context });
  },

  captureMessage(message, level = "info") {
    const s = getSentry();
    if (!s) return;
    s.captureMessage(message, level);
  },

  setUser(user) {
    const s = getSentry();
    if (!s) return;
    s.setUser({ id: user.id, email: user.email });
  },

  startTransaction(name, op) {
    const span = { name, op, _finished: false };
    return {
      finish() {
        span._finished = true;
      },
      setStatus(_status: string) {
        // Sentry SDK handles this internally
      },
    } as MonitoringTransaction;
  },
};
