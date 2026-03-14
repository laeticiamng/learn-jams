// ============================================================
// Tests: Fallback Logic
// ============================================================

import { describe, it, expect } from "vitest";
import { buildFallbackConfig, resolveLocale, getFallbackChain } from "./fallbacks";

describe("fallbacks", () => {
  describe("buildFallbackConfig", () => {
    it("returns config with all supported locales plus default", () => {
      const config = buildFallbackConfig();
      expect(config.fr).toEqual(["en"]);
      expect(config.en).toEqual(["fr"]);
      expect(config.de).toEqual(["en", "fr"]);
      expect(config.ar).toEqual(["en", "fr"]);
      expect(config.default).toEqual(["en"]);
    });
  });

  describe("resolveLocale", () => {
    it("resolves exact matches", () => {
      expect(resolveLocale("fr")).toBe("fr");
      expect(resolveLocale("en")).toBe("en");
      expect(resolveLocale("ar")).toBe("ar");
    });

    it("resolves regional codes to base", () => {
      expect(resolveLocale("fr-FR")).toBe("fr");
      expect(resolveLocale("en-US")).toBe("en");
      expect(resolveLocale("de-AT")).toBe("de");
    });

    it("resolves zh variants to zh", () => {
      expect(resolveLocale("zh-Hans")).toBe("zh");
      expect(resolveLocale("zh-Hans-CN")).toBe("zh");
      expect(resolveLocale("zh-CN")).toBe("zh");
    });

    it("falls back to en for unknown locales", () => {
      expect(resolveLocale("ja")).toBe("en");
      expect(resolveLocale("ko")).toBe("en");
      expect(resolveLocale("")).toBe("en");
    });
  });

  describe("getFallbackChain", () => {
    it("returns correct chain for fr", () => {
      const chain = getFallbackChain("fr");
      expect(chain[0]).toBe("en");
    });

    it("returns correct chain for en", () => {
      const chain = getFallbackChain("en");
      expect(chain[0]).toBe("fr");
    });

    it("returns chain for de through en to fr", () => {
      const chain = getFallbackChain("de");
      expect(chain[0]).toBe("en");
    });
  });
});
