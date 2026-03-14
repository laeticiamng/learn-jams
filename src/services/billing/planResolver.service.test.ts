import { describe, it, expect } from "vitest";
import {
  getPlanQuota,
  getPlanQuotas,
  getPlanPrice,
  getEffectiveMonthlyPrice,
  getAnnualDiscount,
  isFeatureEnabled,
  isUnlimited,
  suggestUpgrade,
  getVisiblePlans,
} from "./planResolver.service";

describe("planResolver", () => {
  describe("getPlanQuota", () => {
    it("returns 0 for disabled features on free plan", () => {
      expect(getPlanQuota("free", "animated_story_generation")).toBe(0);
      expect(getPlanQuota("free", "escape_game_generation")).toBe(0);
    });

    it("returns positive limit for capped features", () => {
      expect(getPlanQuota("free", "dynamic_sheet_generation")).toBe(3);
      expect(getPlanQuota("free", "music_generation")).toBe(2);
      expect(getPlanQuota("core", "escape_game_generation")).toBe(10);
    });

    it("returns -1 for unlimited features", () => {
      expect(getPlanQuota("core", "dynamic_sheet_generation")).toBe(-1);
      expect(getPlanQuota("core", "animated_story_generation")).toBe(-1);
    });

    it("returns 0 for unknown plan/feature combos", () => {
      expect(getPlanQuota("free" as any, "nonexistent_feature" as any)).toBe(0);
    });
  });

  describe("getPlanQuotas", () => {
    it("returns a copy of all quotas for a plan", () => {
      const quotas = getPlanQuotas("core");
      expect(quotas.dynamic_sheet_generation).toBe(-1);
      expect(quotas.escape_game_generation).toBe(10);
    });
  });

  describe("getPlanPrice", () => {
    it("returns 0 for free plan", () => {
      expect(getPlanPrice("free", "zone_a", "monthly")).toBe(0);
      expect(getPlanPrice("free", "zone_c", "annual")).toBe(0);
    });

    it("returns correct monthly prices for core plan across zones", () => {
      expect(getPlanPrice("core", "zone_a", "monthly")).toBe(34);
      expect(getPlanPrice("core", "zone_b", "monthly")).toBe(26);
      expect(getPlanPrice("core", "zone_c", "monthly")).toBe(19);
    });

    it("returns correct annual prices", () => {
      expect(getPlanPrice("core", "zone_a", "annual")).toBe(348);
      expect(getPlanPrice("plus", "zone_a", "annual")).toBe(708);
    });
  });

  describe("getEffectiveMonthlyPrice", () => {
    it("returns monthly price for monthly interval", () => {
      expect(getEffectiveMonthlyPrice("core", "zone_a", "monthly")).toBe(34);
    });

    it("returns annual/12 for annual interval", () => {
      expect(getEffectiveMonthlyPrice("core", "zone_a", "annual")).toBe(29); // 348/12 = 29
    });
  });

  describe("getAnnualDiscount", () => {
    it("returns 0 for free plan", () => {
      expect(getAnnualDiscount("free", "zone_a")).toBe(0);
    });

    it("returns positive discount for paid plans", () => {
      const discount = getAnnualDiscount("core", "zone_a");
      expect(discount).toBeGreaterThan(0);
      expect(discount).toBeLessThan(50); // sanity check
    });

    it("discount represents percentage savings", () => {
      // core zone_a: monthly=34, annual=348 → 29/mo → (1 - 29/34)*100 ≈ 15%
      const discount = getAnnualDiscount("core", "zone_a");
      expect(discount).toBe(15);
    });
  });

  describe("isFeatureEnabled", () => {
    it("returns false for quota=0 features", () => {
      expect(isFeatureEnabled("free", "escape_game_generation")).toBe(false);
      expect(isFeatureEnabled("free", "animated_story_generation")).toBe(false);
    });

    it("returns true for unlimited features", () => {
      expect(isFeatureEnabled("core", "dynamic_sheet_generation")).toBe(true);
    });

    it("returns true for capped features", () => {
      expect(isFeatureEnabled("core", "escape_game_generation")).toBe(true);
    });
  });

  describe("isUnlimited", () => {
    it("returns true for -1 quotas", () => {
      expect(isUnlimited("core", "dynamic_sheet_generation")).toBe(true);
    });

    it("returns false for capped or disabled features", () => {
      expect(isUnlimited("core", "escape_game_generation")).toBe(false);
      expect(isUnlimited("free", "escape_game_generation")).toBe(false);
    });
  });

  describe("suggestUpgrade", () => {
    it("suggests core for free users wanting escape games", () => {
      expect(suggestUpgrade("free", "escape_game_generation")).toBe("core");
    });

    it("suggests plus for core users wanting premium_export", () => {
      expect(suggestUpgrade("core", "premium_export")).toBe("plus");
    });

    it("returns null when no upgrade available", () => {
      expect(suggestUpgrade("family_plus", "premium_export")).toBe(null);
    });
  });

  describe("getVisiblePlans", () => {
    it("returns the 4 public plans", () => {
      const plans = getVisiblePlans();
      expect(plans).toEqual(["free", "core", "plus", "premium_family"]);
    });
  });
});
