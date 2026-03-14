// ============================================================
// Prompt Localization Types — Language-aware AI prompt generation
// ============================================================

import type { LocaleCode } from "@/i18n/localeRegistry";

/** Language context for AI content generation */
export interface GenerationLanguageContext {
  /** Language of the source document */
  sourceLanguage: LocaleCode;
  /** Target language for generated content */
  targetLanguage: LocaleCode;
  /** User's UI language (may differ from generation language) */
  uiLanguage: LocaleCode;
  /** Guardian's preferred language if applicable */
  guardianLanguage?: LocaleCode;
}

/** Language-specific prompt instruction */
export interface PromptLanguageInstruction {
  /** System-level instruction about generation language */
  systemInstruction: string;
  /** Content-level language directive */
  contentDirective: string;
  /** Quality check instruction */
  qualityCheck: string;
}

/** Lyrics-specific language rules */
export interface LyricsLanguageRules {
  locale: LocaleCode;
  /** Whether the language uses tonal systems (affects melody fitting) */
  isTonal: boolean;
  /** Typical syllable density per line */
  syllableDensity: "low" | "medium" | "high";
  /** Whether assonance/rhyme patterns differ fundamentally */
  rhymeStrategy: "end_rhyme" | "internal_rhyme" | "assonance" | "tonal_pattern";
  /** Hook/refrain convention */
  refrainStyle: "repetitive" | "varied" | "call_response";
  /** Script direction (affects subtitle rendering) */
  scriptDirection: "ltr" | "rtl";
  /** Prompt hint for the AI about language-specific song writing */
  promptHint: string;
}

/** Video subtitle language config */
export interface SubtitleLanguageConfig {
  locale: LocaleCode;
  direction: "ltr" | "rtl";
  /** Font family recommendation for video overlay */
  fontFamily: string;
  /** Max characters per subtitle line (varies by script density) */
  maxCharsPerLine: number;
  /** Reading speed in chars per second */
  readingSpeed: number;
}
