// ============================================================
// Locale Registry — Single source of truth for supported locales
// ============================================================

export interface LocaleEntry {
  /** BCP-47 code used as key */
  code: string;
  /** Display label in native script */
  label: string;
  /** Emoji flag */
  flag: string;
  /** Text direction */
  dir: "ltr" | "rtl";
  /** IETF language tag for <html lang> */
  htmlLang: string;
  /** OpenAI TTS voice locale hint */
  ttsLocale: string;
  /** Fallback locale if key missing */
  fallback: string;
}

export const LOCALE_REGISTRY: readonly LocaleEntry[] = [
  { code: "fr", label: "Français", flag: "🇫🇷", dir: "ltr", htmlLang: "fr", ttsLocale: "fr-FR", fallback: "en" },
  { code: "en", label: "English", flag: "🇬🇧", dir: "ltr", htmlLang: "en", ttsLocale: "en-US", fallback: "fr" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", dir: "ltr", htmlLang: "de", ttsLocale: "de-DE", fallback: "en" },
  { code: "es", label: "Español", flag: "🇪🇸", dir: "ltr", htmlLang: "es", ttsLocale: "es-ES", fallback: "en" },
  { code: "ar", label: "العربية", flag: "🇸🇦", dir: "rtl", htmlLang: "ar", ttsLocale: "ar-SA", fallback: "en" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳", dir: "ltr", htmlLang: "hi", ttsLocale: "hi-IN", fallback: "en" },
  { code: "zh", label: "中文", flag: "🇨🇳", dir: "ltr", htmlLang: "zh-Hans", ttsLocale: "zh-CN", fallback: "en" },
] as const;

export type LocaleCode = (typeof LOCALE_REGISTRY)[number]["code"];

export const SUPPORTED_LOCALE_CODES: readonly string[] = LOCALE_REGISTRY.map((l) => l.code);

export const DEFAULT_LOCALE: LocaleCode = "fr";
export const FALLBACK_LOCALE: LocaleCode = "en";

/** Get a locale entry by code. Returns undefined if not found. */
export function getLocaleEntry(code: string): LocaleEntry | undefined {
  return LOCALE_REGISTRY.find((l) => l.code === code);
}

/** Get text direction for a locale code. Defaults to "ltr". */
export function getDirection(code: string): "ltr" | "rtl" {
  return getLocaleEntry(code)?.dir ?? "ltr";
}

/** Check if a locale code is RTL. */
export function isRTL(code: string): boolean {
  return getDirection(code) === "rtl";
}

/** Get the fallback locale for a given locale. */
export function getFallbackLocale(code: string): string {
  return getLocaleEntry(code)?.fallback ?? FALLBACK_LOCALE;
}

/** Check if a locale code is supported. */
export function isSupportedLocale(code: string): code is LocaleCode {
  return SUPPORTED_LOCALE_CODES.includes(code);
}
