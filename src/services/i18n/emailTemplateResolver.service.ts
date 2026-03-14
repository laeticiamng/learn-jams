// ============================================================
// Email Template Resolver — Localized email content lookup
// ============================================================

import i18n from "@/i18n";
import { isSupportedLocale, FALLBACK_LOCALE } from "@/i18n/localeRegistry";

export type EmailTemplateKey =
  | "guardian_invite"
  | "guardian_welcome"
  | "weekly_summary"
  | "inactivity"
  | "billing_receipt"
  | "password_reset";

interface EmailTemplate {
  subject: string;
  body?: string;
  greeting?: string;
}

/**
 * Resolve a localized email template by key and language.
 * Falls back to English if the requested language is missing.
 */
export function resolveEmailTemplate(
  key: EmailTemplateKey,
  language: string,
  variables?: Record<string, string>,
): EmailTemplate {
  const lang = isSupportedLocale(language) ? language : FALLBACK_LOCALE;

  const t = (tKey: string, fallback: string) => {
    const result = i18n.t(tKey, { lng: lang, ...variables });
    return result === tKey ? fallback : result;
  };

  const templates: Record<EmailTemplateKey, () => EmailTemplate> = {
    guardian_invite: () => ({
      subject: t("emails.guardian_invite_subject", "You've been invited as a guardian on COGNITIO"),
      body: t("emails.guardian_invite_body", `You've been invited to supervise an account on COGNITIO.`),
    }),
    guardian_welcome: () => ({
      subject: t("emails.guardian_welcome_subject", "Welcome as a guardian!"),
    }),
    weekly_summary: () => ({
      subject: t("emails.weekly_summary_subject", "Your weekly summary — COGNITIO"),
      greeting: t("emails.weekly_summary_greeting", `Hi, here's this week's summary:`),
    }),
    inactivity: () => ({
      subject: t("emails.inactivity_subject", "We haven't seen you in a while"),
      body: t("emails.inactivity_body", "Your courses are waiting. Come back and check your missions."),
    }),
    billing_receipt: () => ({
      subject: t("emails.billing_receipt_subject", "Payment receipt — COGNITIO"),
    }),
    password_reset: () => ({
      subject: t("emails.password_reset_subject", "Reset your password"),
    }),
  };

  return templates[key]();
}

/**
 * Log the language used for an email for audit purposes.
 * Returns the metadata to attach to the notification record.
 */
export function buildEmailLanguageMetadata(
  templateKey: EmailTemplateKey,
  resolvedLanguage: string,
  recipientPreferredLanguage?: string,
) {
  return {
    template_key: templateKey,
    language_used: resolvedLanguage,
    language_preferred: recipientPreferredLanguage ?? null,
    language_matched: resolvedLanguage === (recipientPreferredLanguage ?? resolvedLanguage),
  };
}
