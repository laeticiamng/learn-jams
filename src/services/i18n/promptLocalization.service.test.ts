// ============================================================
// Tests: Prompt Localization Service
// ============================================================

import { describe, it, expect } from "vitest";
import {
  buildPromptLanguageInstructions,
  getLyricsLanguageRules,
  getSubtitleConfig,
  resolveGuardianCommunicationLanguage,
  resolveGenerationLanguage,
} from "./promptLocalization.service";

describe("promptLocalization", () => {
  describe("buildPromptLanguageInstructions", () => {
    it("generates French instructions for same-language context", () => {
      const result = buildPromptLanguageInstructions({
        sourceLanguage: "fr",
        targetLanguage: "fr",
        uiLanguage: "fr",
      });
      expect(result.systemInstruction).toContain("French");
      expect(result.systemInstruction).toContain("already in French");
      expect(result.contentDirective).toContain("French");
    });

    it("generates cross-language instructions", () => {
      const result = buildPromptLanguageInstructions({
        sourceLanguage: "fr",
        targetLanguage: "en",
        uiLanguage: "en",
      });
      expect(result.systemInstruction).toContain("English");
      expect(result.systemInstruction).toContain("French");
      expect(result.systemInstruction).toContain("Translate concepts");
    });

    it("generates Arabic instructions", () => {
      const result = buildPromptLanguageInstructions({
        sourceLanguage: "en",
        targetLanguage: "ar",
        uiLanguage: "ar",
      });
      expect(result.systemInstruction).toContain("Arabic");
    });

    it("generates Chinese instructions", () => {
      const result = buildPromptLanguageInstructions({
        sourceLanguage: "en",
        targetLanguage: "zh",
        uiLanguage: "zh",
      });
      expect(result.systemInstruction).toContain("Simplified Chinese");
    });
  });

  describe("getLyricsLanguageRules", () => {
    it("returns rules for all 7 supported locales", () => {
      for (const locale of ["fr", "en", "de", "es", "ar", "hi", "zh"]) {
        const rules = getLyricsLanguageRules(locale);
        expect(rules.locale).toBe(locale);
        expect(rules.promptHint).toBeTruthy();
      }
    });

    it("Arabic rules specify RTL and call_response", () => {
      const ar = getLyricsLanguageRules("ar");
      expect(ar.scriptDirection).toBe("rtl");
      expect(ar.refrainStyle).toBe("call_response");
    });

    it("Chinese rules flag tonal language", () => {
      const zh = getLyricsLanguageRules("zh");
      expect(zh.isTonal).toBe(true);
      expect(zh.rhymeStrategy).toBe("tonal_pattern");
    });

    it("falls back to English for unknown locales", () => {
      const rules = getLyricsLanguageRules("ja");
      expect(rules.locale).toBe("en");
    });
  });

  describe("getSubtitleConfig", () => {
    it("returns correct config for each locale", () => {
      expect(getSubtitleConfig("ar").direction).toBe("rtl");
      expect(getSubtitleConfig("zh").maxCharsPerLine).toBe(20);
      expect(getSubtitleConfig("fr").fontFamily).toContain("Inter");
      expect(getSubtitleConfig("hi").fontFamily).toContain("Devanagari");
    });

    it("falls back to English for unknown locales", () => {
      const config = getSubtitleConfig("ja");
      expect(config.locale).toBe("en");
    });
  });

  describe("resolveGuardianCommunicationLanguage", () => {
    it("prefers guardian preference", () => {
      expect(resolveGuardianCommunicationLanguage("de", "fr")).toBe("de");
    });

    it("falls back to minor guardian language", () => {
      expect(resolveGuardianCommunicationLanguage(null, "es")).toBe("es");
    });

    it("defaults to en", () => {
      expect(resolveGuardianCommunicationLanguage(null, null)).toBe("en");
    });

    it("ignores unsupported locales", () => {
      expect(resolveGuardianCommunicationLanguage("xx", null)).toBe("en");
    });
  });

  describe("resolveGenerationLanguage", () => {
    it("prefers explicit target", () => {
      expect(resolveGenerationLanguage("de", "fr", "en")).toBe("de");
    });

    it("falls back to user preference", () => {
      expect(resolveGenerationLanguage(null, "es", "en")).toBe("es");
    });

    it("falls back to source language", () => {
      expect(resolveGenerationLanguage(null, null, "ar")).toBe("ar");
    });

    it("defaults to fr", () => {
      expect(resolveGenerationLanguage(null, null, null)).toBe("fr");
    });
  });
});
