// ============================================================
// Cookie consent helper — single source of truth
// Used by CookieConsent banner and any analytics integration.
// ============================================================

const CONSENT_KEY = "sb_cookie_consent";

export type ConsentValue = "accepted" | "declined" | null;

export function getConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(CONSENT_KEY);
  return v === "accepted" || v === "declined" ? v : null;
}

export function setConsent(value: Exclude<ConsentValue, null>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: value }));
}

export function hasAnalyticsConsent(): boolean {
  return getConsent() === "accepted";
}

export function onConsentChange(cb: (value: ConsentValue) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<ConsentValue>).detail);
  window.addEventListener("cookie-consent-change", handler);
  return () => window.removeEventListener("cookie-consent-change", handler);
}
