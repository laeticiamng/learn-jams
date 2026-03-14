// ============================================================
// Tests — Adaptive Credits Engine
// ============================================================

import { describe, it, expect } from "vitest";
import {
  getFlexBudget,
  getFlexCaps,
  getConversionRules,
  computeAvailableFlexCredits,
  checkFlexCredit,
  generateReallocationProposal,
} from "./adaptiveCredits.service";
import type { FeatureKey } from "@/domain/billing/pricing.types";

describe("adaptiveCredits", () => {
  // ---------- Policy retrieval ----------

  describe("getFlexBudget", () => {
    it("returns 0 flex units for free plan", () => {
      const budget = getFlexBudget("free");
      expect(budget.total_flex_units).toBe(0);
    });

    it("returns positive flex units for core plan", () => {
      const budget = getFlexBudget("core");
      expect(budget.total_flex_units).toBe(15);
    });

    it("returns increasing flex units for higher plans", () => {
      const core = getFlexBudget("core").total_flex_units;
      const plus = getFlexBudget("plus").total_flex_units;
      const premium = getFlexBudget("premium_family").total_flex_units;
      const family = getFlexBudget("family_plus").total_flex_units;

      expect(plus).toBeGreaterThan(core);
      expect(premium).toBeGreaterThan(plus);
      expect(family).toBeGreaterThan(premium);
    });
  });

  describe("getFlexCaps", () => {
    it("always prevents video AI reallocation", () => {
      expect(getFlexCaps("core").video_ai_never_reallocatable).toBe(true);
      expect(getFlexCaps("plus").video_ai_never_reallocatable).toBe(true);
      expect(getFlexCaps("premium_family").video_ai_never_reallocatable).toBe(true);
      expect(getFlexCaps("family_plus").video_ai_never_reallocatable).toBe(true);
    });

    it("increases reallocation percentage for higher plans", () => {
      const core = getFlexCaps("core").max_reallocation_pct;
      const plus = getFlexCaps("plus").max_reallocation_pct;
      const premium = getFlexCaps("premium_family").max_reallocation_pct;

      expect(plus).toBeGreaterThan(core);
      expect(premium).toBeGreaterThan(plus);
    });
  });

  describe("getConversionRules", () => {
    it("returns empty rules for free plan", () => {
      expect(getConversionRules("free")).toHaveLength(0);
    });

    it("returns rules for paid plans", () => {
      expect(getConversionRules("core").length).toBeGreaterThan(0);
      expect(getConversionRules("plus").length).toBeGreaterThan(0);
    });

    it("never allows 1:1 naive conversion for expensive formats", () => {
      for (const rule of getConversionRules("plus")) {
        if (rule.from === "video_generation_ai_seconds") {
          // Video should convert at higher ratio (>1 unit from = multiple to)
          expect(rule.ratio).toBeGreaterThan(1);
        }
      }
    });
  });

  // ---------- Flex credit computation ----------

  describe("computeAvailableFlexCredits", () => {
    it("returns empty for free plan", () => {
      const result = computeAvailableFlexCredits("free", {});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it("returns credits when video quota is unused", () => {
      const usage: Partial<Record<FeatureKey, number>> = {
        video_template_render: 0,
        music_generation: 25,
      };
      const result = computeAvailableFlexCredits("core", usage);
      // Video template (5 quota, 0 used = 5 unused, 60% convertible = 3, ratio 2 = 6 music credits)
      expect(result.music_generation).toBeGreaterThan(0);
    });

    it("returns no credits when all quotas are fully used", () => {
      const usage: Partial<Record<FeatureKey, number>> = {
        video_template_render: 5,
        video_generation_ai_seconds: 15,
        music_generation: 25,
        escape_game_generation: 10,
      };
      const result = computeAvailableFlexCredits("core", usage);
      // All quotas used, nothing to convert
      expect(result.music_generation ?? 0).toBe(0);
      expect(result.escape_game_generation ?? 0).toBe(0);
    });

    it("respects per-feature caps", () => {
      const usage: Partial<Record<FeatureKey, number>> = {
        video_template_render: 0,
        video_generation_ai_seconds: 0,
      };
      const caps = getFlexCaps("core");
      const result = computeAvailableFlexCredits("core", usage);

      // Should not exceed cap
      const musicCap = caps.per_feature_caps.music_generation ?? Infinity;
      expect(result.music_generation ?? 0).toBeLessThanOrEqual(musicCap);
    });
  });

  // ---------- Flex credit checks ----------

  describe("checkFlexCredit", () => {
    it("blocks video AI from flex credits (always protected)", () => {
      const result = checkFlexCredit("plus", "video_generation_ai_seconds", { video_template_render: 0 }, 1);
      expect(result.available).toBe(false);
    });

    it("allows music flex when video is unused", () => {
      const usage: Partial<Record<FeatureKey, number>> = {
        video_template_render: 0,
        music_generation: 25,
      };
      const result = checkFlexCredit("core", "music_generation", usage, 1);
      expect(result.available).toBe(true);
      expect(result.flexRemaining).toBeGreaterThan(0);
    });

    it("denies flex when no unused quotas available", () => {
      const usage: Partial<Record<FeatureKey, number>> = {
        video_template_render: 5,
        video_generation_ai_seconds: 15,
        music_generation: 25,
        escape_game_generation: 10,
      };
      const result = checkFlexCredit("core", "music_generation", usage, 1);
      expect(result.available).toBe(false);
    });
  });

  // ---------- Reallocation proposals ----------

  describe("generateReallocationProposal", () => {
    it("generates proposal for music-first user", () => {
      const usage: Partial<Record<FeatureKey, number>> = {
        music_generation: 20,
        escape_game_generation: 0,
        video_template_render: 0,
      };
      const proposal = generateReallocationProposal("core", "music_first", usage);

      expect(proposal.dominant_mode).toBe("songs");
      expect(proposal.available_conversions.length).toBeGreaterThan(0);

      // Music-oriented conversions should come first
      const firstConversion = proposal.available_conversions[0];
      expect(firstConversion.to_feature).toBe("music_generation");
    });

    it("generates proposal for mission-first user", () => {
      const usage: Partial<Record<FeatureKey, number>> = {
        music_generation: 0,
        escape_game_generation: 8,
        video_template_render: 0,
      };
      const proposal = generateReallocationProposal("core", "mission_first", usage);

      expect(proposal.dominant_mode).toBe("missions");
      expect(proposal.available_conversions.length).toBeGreaterThan(0);
    });

    it("returns empty conversions for free plan", () => {
      const proposal = generateReallocationProposal("free", "mixed", {});
      expect(proposal.available_conversions).toHaveLength(0);
      expect(proposal.message_key).toBe("adaptive.no_reallocation");
    });
  });
});
