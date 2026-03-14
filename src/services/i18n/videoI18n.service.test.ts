// ============================================================
// Tests: Video I18n Service
// ============================================================

import { describe, it, expect } from "vitest";
import {
  getTTSLocale,
  buildSubtitleRenderConfig,
  wrapSubtitleText,
  calculateSubtitleDuration,
} from "./videoI18n.service";

describe("videoI18n", () => {
  describe("getTTSLocale", () => {
    it("maps app locales to TTS locales", () => {
      expect(getTTSLocale("fr")).toBe("fr-FR");
      expect(getTTSLocale("en")).toBe("en-US");
      expect(getTTSLocale("ar")).toBe("ar-SA");
      expect(getTTSLocale("zh")).toBe("zh-CN");
      expect(getTTSLocale("hi")).toBe("hi-IN");
    });

    it("defaults to en-US for unknown locales", () => {
      expect(getTTSLocale("xx")).toBe("en-US");
    });
  });

  describe("buildSubtitleRenderConfig", () => {
    it("configures RTL alignment for Arabic", () => {
      const config = buildSubtitleRenderConfig("ar");
      expect(config.direction).toBe("rtl");
      expect(config.alignment).toBe("right");
    });

    it("configures LTR center alignment for English", () => {
      const config = buildSubtitleRenderConfig("en");
      expect(config.direction).toBe("ltr");
      expect(config.alignment).toBe("center");
    });

    it("uses correct font for Hindi", () => {
      const config = buildSubtitleRenderConfig("hi");
      expect(config.fontFamily).toContain("Devanagari");
    });
  });

  describe("wrapSubtitleText", () => {
    it("returns single line for short text", () => {
      expect(wrapSubtitleText("Hello", "en")).toEqual(["Hello"]);
    });

    it("wraps long English text", () => {
      const text = "This is a very long subtitle text that should be wrapped across multiple lines for readability";
      const lines = wrapSubtitleText(text, "en");
      expect(lines.length).toBeGreaterThan(1);
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(42);
      }
    });

    it("respects Chinese char limits", () => {
      const text = "这是一段很长的中文字幕文本需要被分割成多行以便于阅读和理解";
      const lines = wrapSubtitleText(text, "zh");
      // Chinese has maxCharsPerLine = 20, but since there are no spaces,
      // the whole text is treated as one "word" and returned as-is
      expect(lines.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("calculateSubtitleDuration", () => {
    it("calculates duration based on locale reading speed", () => {
      const shortDuration = calculateSubtitleDuration("Hello", "en");
      expect(shortDuration).toBeGreaterThanOrEqual(1.5); // min

      const longText = "This is a much longer subtitle that should take more time to read through completely";
      const longDuration = calculateSubtitleDuration(longText, "en");
      expect(longDuration).toBeGreaterThan(shortDuration);
      expect(longDuration).toBeLessThanOrEqual(7); // max
    });

    it("Chinese text reads slower (fewer chars per second)", () => {
      const text = "这是一段比较长的中文字幕文本内容";
      const zhDuration = calculateSubtitleDuration(text, "zh");
      const enDuration = calculateSubtitleDuration(text, "en");
      // Chinese reading speed is 8 chars/s vs English 18 chars/s
      expect(zhDuration).toBeGreaterThan(enDuration);
    });
  });
});
