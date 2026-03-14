// ============================================================
// I18n Configuration — Centralized i18next settings
// ============================================================

import { LOCALE_REGISTRY, SUPPORTED_LOCALE_CODES, DEFAULT_LOCALE } from "./localeRegistry";
import { buildFallbackConfig } from "./fallbacks";

/**
 * All translation namespaces used in the application.
 */
export const I18N_NAMESPACES = [
  "common",
  "nav",
  "home",
  "create",
  "library",
  "player",
  "quiz",
  "profile",
  "pricing",
  "guardian",
  "billing",
  "errors",
  "legal",
  "emails",
  "sms",
  "prompts",
  "debrief",
  "qa",
  "review",
] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

/**
 * I18next init options (used in index.ts).
 * Current setup uses a single "translation" namespace with all keys flat.
 * The namespace constants above are for reference and future splitting.
 */
export const I18N_CONFIG = {
  supportedLngs: SUPPORTED_LOCALE_CODES as unknown as string[],
  fallbackLng: buildFallbackConfig(),
  defaultNS: "translation",
  interpolation: { escapeValue: false },
  detection: {
    order: ["localStorage", "navigator"] as string[],
    caches: ["localStorage"] as string[],
  },
} as const;

// Re-export for convenience
export { LOCALE_REGISTRY, SUPPORTED_LOCALE_CODES, DEFAULT_LOCALE };
