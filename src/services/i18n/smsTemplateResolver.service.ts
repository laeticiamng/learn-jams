// ============================================================
// SMS Template Resolver — Localized SMS content lookup
// ============================================================

import i18n from "@/i18n";
import { isSupportedLocale, FALLBACK_LOCALE } from "@/i18n/localeRegistry";

export type SMSTemplateKey =
  | "guardian_invite"
  | "validation_reminder"
  | "weekly_alert";

/**
 * Resolve a localized SMS template by key and language.
 * Falls back to English if the requested language is missing.
 */
export function resolveSMSTemplate(
  key: SMSTemplateKey,
  language: string,
  variables?: Record<string, string>,
): string {
  const lang = isSupportedLocale(language) ? language : FALLBACK_LOCALE;

  const result = i18n.t(`sms.${key}`, { lng: lang, ...variables });
  // If the translation key was returned as-is, use English fallback
  if (result === `sms.${key}`) {
    return i18n.t(`sms.${key}`, { lng: "en", ...variables });
  }
  return result;
}
