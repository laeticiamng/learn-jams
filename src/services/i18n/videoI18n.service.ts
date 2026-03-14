// ============================================================
// Video I18n Service — Language-aware video generation helpers
// ============================================================

import { getLocaleEntry } from "@/i18n/localeRegistry";
import { getSubtitleConfig } from "./promptLocalization.service";

/**
 * Get the TTS locale code for a given app locale.
 * Maps our locale codes to the voice API locale format.
 */
export function getTTSLocale(locale: string): string {
  return getLocaleEntry(locale)?.ttsLocale ?? "en-US";
}

/**
 * Build subtitle rendering config for video generation.
 */
export function buildSubtitleRenderConfig(locale: string) {
  const config = getSubtitleConfig(locale);
  return {
    ...config,
    // Video-specific overrides
    fontSize: config.direction === "rtl" ? 28 : 24,
    lineSpacing: 1.4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    textColor: "#FFFFFF",
    position: "bottom" as const,
    alignment: config.direction === "rtl" ? ("right" as const) : ("center" as const),
  };
}

/**
 * Wrap text for subtitle display, respecting language-specific line lengths.
 */
export function wrapSubtitleText(text: string, locale: string): string[] {
  const config = getSubtitleConfig(locale);
  const maxChars = config.maxCharsPerLine;

  if (text.length <= maxChars) return [text];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxChars) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Calculate subtitle display duration based on text length and locale reading speed.
 */
export function calculateSubtitleDuration(text: string, locale: string): number {
  const config = getSubtitleConfig(locale);
  const minDuration = 1.5; // seconds
  const maxDuration = 7; // seconds
  const duration = text.length / config.readingSpeed;
  return Math.min(maxDuration, Math.max(minDuration, duration));
}
