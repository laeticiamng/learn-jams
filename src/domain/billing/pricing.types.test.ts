import { describe, it, expect } from "vitest";
import {
  FEATURE_KEYS,
  PLAN_KEYS,
  PLAN_ORDER,
  ZONE_KEYS,
  MARGIN_TARGETS,
  ESTIMATED_UNIT_COSTS,
} from "./pricing.types";

describe("pricing.types", () => {
  describe("FEATURE_KEYS", () => {
    it("has 9 feature keys", () => {
      expect(FEATURE_KEYS).toHaveLength(9);
    });

    it("includes escape_game_generation", () => {
      expect(FEATURE_KEYS).toContain("escape_game_generation");
    });
  });

  describe("PLAN_KEYS", () => {
    it("has 6 plan keys", () => {
      expect(PLAN_KEYS).toHaveLength(6);
    });

    it("plan order is ascending", () => {
      expect(PLAN_ORDER.free).toBeLessThan(PLAN_ORDER.core);
      expect(PLAN_ORDER.core).toBeLessThan(PLAN_ORDER.plus);
      expect(PLAN_ORDER.plus).toBeLessThan(PLAN_ORDER.premium_family);
    });
  });

  describe("ZONE_KEYS", () => {
    it("has 3 zones", () => {
      expect(ZONE_KEYS).toHaveLength(3);
    });
  });

  describe("MARGIN_TARGETS", () => {
    it("free plan has 0 margin target", () => {
      expect(MARGIN_TARGETS.free).toBe(0);
    });

    it("paid plans have positive targets", () => {
      expect(MARGIN_TARGETS.core).toBeGreaterThan(0);
      expect(MARGIN_TARGETS.plus).toBeGreaterThan(0);
    });
  });

  describe("ESTIMATED_UNIT_COSTS", () => {
    it("has a cost entry for each feature", () => {
      expect(ESTIMATED_UNIT_COSTS).toHaveLength(FEATURE_KEYS.length);
    });

    it("all costs are positive", () => {
      expect(ESTIMATED_UNIT_COSTS.every((u) => u.estimated_cost_usd > 0)).toBe(true);
    });

    it("all use USD", () => {
      expect(ESTIMATED_UNIT_COSTS.every((u) => u.currency === "USD")).toBe(true);
    });
  });
});
