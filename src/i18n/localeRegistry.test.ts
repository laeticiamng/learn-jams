// ============================================================
// Tests: Locale Registry
// ============================================================

import { describe, it, expect } from "vitest";
import {
  LOCALE_REGISTRY,
  SUPPORTED_LOCALE_CODES,
  getLocaleEntry,
  getDirection,
  isRTL,
  getFallbackLocale,
  isSupportedLocale,
} from "./localeRegistry";

describe("localeRegistry", () => {
  it("has exactly 7 supported locales", () => {
    expect(LOCALE_REGISTRY).toHaveLength(7);
    expect(SUPPORTED_LOCALE_CODES).toHaveLength(7);
  });

  it("includes all required locale codes", () => {
    const codes = SUPPORTED_LOCALE_CODES;
    expect(codes).toContain("fr");
    expect(codes).toContain("en");
    expect(codes).toContain("de");
    expect(codes).toContain("es");
    expect(codes).toContain("ar");
    expect(codes).toContain("hi");
    expect(codes).toContain("zh");
  });

  it("returns correct entry for each locale", () => {
    const fr = getLocaleEntry("fr");
    expect(fr).toBeDefined();
    expect(fr!.label).toBe("Français");
    expect(fr!.dir).toBe("ltr");

    const ar = getLocaleEntry("ar");
    expect(ar).toBeDefined();
    expect(ar!.dir).toBe("rtl");
  });

  it("returns undefined for unknown locales", () => {
    expect(getLocaleEntry("xx")).toBeUndefined();
  });

  it("detects RTL correctly", () => {
    expect(isRTL("ar")).toBe(true);
    expect(isRTL("fr")).toBe(false);
    expect(isRTL("en")).toBe(false);
    expect(isRTL("hi")).toBe(false);
    expect(isRTL("zh")).toBe(false);
    expect(isRTL("unknown")).toBe(false);
  });

  it("returns correct direction", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("fr")).toBe("ltr");
    expect(getDirection("unknown")).toBe("ltr");
  });

  it("returns fallback locales", () => {
    expect(getFallbackLocale("fr")).toBe("en");
    expect(getFallbackLocale("en")).toBe("fr");
    expect(getFallbackLocale("de")).toBe("en");
    expect(getFallbackLocale("ar")).toBe("en");
    expect(getFallbackLocale("unknown")).toBe("en");
  });

  it("validates supported locale codes", () => {
    expect(isSupportedLocale("fr")).toBe(true);
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("xx")).toBe(false);
    expect(isSupportedLocale("")).toBe(false);
  });

  it("each locale has all required fields", () => {
    for (const locale of LOCALE_REGISTRY) {
      expect(locale.code).toBeTruthy();
      expect(locale.label).toBeTruthy();
      expect(locale.flag).toBeTruthy();
      expect(["ltr", "rtl"]).toContain(locale.dir);
      expect(locale.htmlLang).toBeTruthy();
      expect(locale.ttsLocale).toBeTruthy();
      expect(locale.fallback).toBeTruthy();
    }
  });
});
