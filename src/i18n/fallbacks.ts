// ============================================================
// Translation Fallback Utilities
// ============================================================

import { FALLBACK_LOCALE, getFallbackLocale, isSupportedLocale } from "./localeRegistry";

/**
 * Build the i18next fallbackLng configuration.
 * Each locale falls back to its configured fallback, then to the global fallback.
 */
export function buildFallbackConfig(): Record<string, string[]> & { default: string[] } {
  return {
    fr: ["en"],
    en: ["fr"],
    de: ["en", "fr"],
    es: ["en", "fr"],
    ar: ["en", "fr"],
    hi: ["en", "fr"],
    zh: ["en", "fr"],
    default: [FALLBACK_LOCALE],
  };
}

/**
 * Resolve a locale code to the best supported locale.
 * Handles browser locale strings like "fr-FR", "zh-Hans-CN", etc.
 */
export function resolveLocale(raw: string): string {
  if (isSupportedLocale(raw)) return raw;

  // Try base language (e.g. "fr-FR" → "fr")
  const base = raw.split("-")[0];
  if (isSupportedLocale(base)) return base;

  // Special case: zh-Hans → zh
  if (raw.startsWith("zh")) return "zh";

  return FALLBACK_LOCALE;
}

/**
 * Get the chain of fallback locales for a given locale.
 */
export function getFallbackChain(locale: string): string[] {
  const chain: string[] = [];
  let current = locale;
  const visited = new Set<string>();

  while (current && !visited.has(current)) {
    visited.add(current);
    const fb = getFallbackLocale(current);
    if (fb && fb !== current) {
      chain.push(fb);
      current = fb;
    } else {
      break;
    }
  }

  return chain;
}
