// ============================================================
// Prompt Localization Service — Language-aware AI prompt building
// ============================================================

import type { LocaleCode } from "@/i18n/localeRegistry";
import { getLocaleEntry } from "@/i18n/localeRegistry";
import type {
  GenerationLanguageContext,
  PromptLanguageInstruction,
  LyricsLanguageRules,
  SubtitleLanguageConfig,
} from "@/domain/i18n/promptLocalization.types";

// ── Language names in English (for system prompts to OpenAI) ──

const LANGUAGE_NAMES: Record<string, string> = {
  fr: "French",
  en: "English",
  de: "German",
  es: "Spanish",
  ar: "Arabic",
  hi: "Hindi",
  zh: "Simplified Chinese (Mandarin)",
};

/**
 * Build prompt language instructions for AI content generation.
 */
export function buildPromptLanguageInstructions(
  ctx: GenerationLanguageContext,
): PromptLanguageInstruction {
  const targetName = LANGUAGE_NAMES[ctx.targetLanguage] ?? ctx.targetLanguage;
  const sourceName = LANGUAGE_NAMES[ctx.sourceLanguage] ?? ctx.sourceLanguage;

  return {
    systemInstruction: [
      `You MUST generate all content in ${targetName}.`,
      ctx.sourceLanguage !== ctx.targetLanguage
        ? `The source document is in ${sourceName}. Translate concepts accurately while adapting to ${targetName} conventions.`
        : `The source document is already in ${targetName}. Maintain the original terminology.`,
      `Do not mix languages. Every sentence, heading, and label must be in ${targetName}.`,
    ].join(" "),

    contentDirective: `Generate the following content entirely in ${targetName}. Adapt cultural references, examples, and phrasing to be natural for ${targetName} speakers.`,

    qualityCheck: `Verify that ALL generated text is in ${targetName}. Flag any untranslated terms from the source material.`,
  };
}

// ── Lyrics Language Rules ──

const LYRICS_RULES: Record<string, LyricsLanguageRules> = {
  fr: {
    locale: "fr",
    isTonal: false,
    syllableDensity: "medium",
    rhymeStrategy: "assonance",
    refrainStyle: "repetitive",
    scriptDirection: "ltr",
    promptHint:
      "Use French assonance and rich rhyme. Favor alexandrin-like rhythm (12 syllables). Refrains should be catchy and repetitive. Use informal 'tu' for student audience.",
  },
  en: {
    locale: "en",
    isTonal: false,
    syllableDensity: "medium",
    rhymeStrategy: "end_rhyme",
    refrainStyle: "repetitive",
    scriptDirection: "ltr",
    promptHint:
      "Use English end rhyme and near rhyme. Keep lines punchy with natural stress patterns. Refrains should use simple, memorable phrasing.",
  },
  de: {
    locale: "de",
    isTonal: false,
    syllableDensity: "medium",
    rhymeStrategy: "end_rhyme",
    refrainStyle: "repetitive",
    scriptDirection: "ltr",
    promptHint:
      "German compound words are long — keep lines rhythmic despite word length. Use end rhyme. Informal 'du' for student audience.",
  },
  es: {
    locale: "es",
    isTonal: false,
    syllableDensity: "high",
    rhymeStrategy: "assonance",
    refrainStyle: "repetitive",
    scriptDirection: "ltr",
    promptHint:
      "Spanish is naturally rhythmic. Use assonance (matching vowels in final syllables). Keep octosyllabic meter where possible. Informal 'tú' for students.",
  },
  ar: {
    locale: "ar",
    isTonal: false,
    syllableDensity: "medium",
    rhymeStrategy: "end_rhyme",
    refrainStyle: "call_response",
    scriptDirection: "rtl",
    promptHint:
      "Use Modern Standard Arabic. Arabic poetry favors monorhyme (same end rhyme throughout). Use call-and-response structure for refrains. Ensure text reads naturally RTL.",
  },
  hi: {
    locale: "hi",
    isTonal: false,
    syllableDensity: "high",
    rhymeStrategy: "end_rhyme",
    refrainStyle: "repetitive",
    scriptDirection: "ltr",
    promptHint:
      "Hindi lyrics should follow Bollywood-style patterns. Use end rhyme with matching matra patterns. Mix Hindi with common English loanwords if natural for educational context.",
  },
  zh: {
    locale: "zh",
    isTonal: true,
    syllableDensity: "low",
    rhymeStrategy: "tonal_pattern",
    refrainStyle: "varied",
    scriptDirection: "ltr",
    promptHint:
      "Chinese is tonal — melody must respect tone contours. Use end rhyme based on pinyin finals. Keep lines compact (7-10 characters). Simplified Chinese characters only.",
  },
};

/**
 * Get lyrics language rules for a locale.
 * Falls back to English rules if locale is unsupported.
 */
export function getLyricsLanguageRules(locale: string): LyricsLanguageRules {
  return LYRICS_RULES[locale] ?? LYRICS_RULES.en;
}

// ── Subtitle Language Config ──

const SUBTITLE_CONFIGS: Record<string, SubtitleLanguageConfig> = {
  fr: { locale: "fr", direction: "ltr", fontFamily: "Inter, sans-serif", maxCharsPerLine: 42, readingSpeed: 15 },
  en: { locale: "en", direction: "ltr", fontFamily: "Inter, sans-serif", maxCharsPerLine: 42, readingSpeed: 18 },
  de: { locale: "de", direction: "ltr", fontFamily: "Inter, sans-serif", maxCharsPerLine: 40, readingSpeed: 14 },
  es: { locale: "es", direction: "ltr", fontFamily: "Inter, sans-serif", maxCharsPerLine: 42, readingSpeed: 16 },
  ar: { locale: "ar", direction: "rtl", fontFamily: "Noto Sans Arabic, sans-serif", maxCharsPerLine: 38, readingSpeed: 14 },
  hi: { locale: "hi", direction: "ltr", fontFamily: "Noto Sans Devanagari, sans-serif", maxCharsPerLine: 36, readingSpeed: 13 },
  zh: { locale: "zh", direction: "ltr", fontFamily: "Noto Sans SC, sans-serif", maxCharsPerLine: 20, readingSpeed: 8 },
};

/**
 * Get subtitle configuration for a locale.
 */
export function getSubtitleConfig(locale: string): SubtitleLanguageConfig {
  return SUBTITLE_CONFIGS[locale] ?? SUBTITLE_CONFIGS.en;
}

// ── Email/SMS Template Resolution ──

/**
 * Resolve the language for a guardian communication.
 * Priority: guardian preference > minor's guardian language setting > fallback to 'en'.
 */
export function resolveGuardianCommunicationLanguage(
  guardianPreferredLang?: string | null,
  minorGuardianLang?: string | null,
): string {
  if (guardianPreferredLang && getLocaleEntry(guardianPreferredLang)) {
    return guardianPreferredLang;
  }
  if (minorGuardianLang && getLocaleEntry(minorGuardianLang)) {
    return minorGuardianLang;
  }
  return "en";
}

/**
 * Resolve the generation language for content creation.
 * Priority: explicit target > user preference > source language.
 */
export function resolveGenerationLanguage(
  explicitTarget?: string | null,
  userPreference?: string | null,
  sourceLanguage?: string | null,
): string {
  if (explicitTarget && getLocaleEntry(explicitTarget)) return explicitTarget;
  if (userPreference && getLocaleEntry(userPreference)) return userPreference;
  if (sourceLanguage && getLocaleEntry(sourceLanguage)) return sourceLanguage;
  return "fr";
}
