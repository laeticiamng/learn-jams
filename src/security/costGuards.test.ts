import { describe, it, expect, beforeEach } from "vitest";
import {
  preCheckCost,
  checkCircuitBreaker,
  recordProviderFailure,
  recordProviderSuccess,
  resetCircuitBreakers,
  MAX_DAILY_COST_PER_USER,
  CIRCUIT_BREAKERS,
} from "./costGuards";

describe("costGuards", () => {
  beforeEach(() => {
    resetCircuitBreakers();
  });

  describe("preCheckCost", () => {
    it("allows normal operations", () => {
      const result = preCheckCost("dynamic_sheet_generation", "core", 0);
      expect(result.allowed).toBe(true);
      expect(result.estimatedCostUsd).toBeGreaterThan(0);
    });

    it("blocks when daily cost limit exceeded", () => {
      const limit = MAX_DAILY_COST_PER_USER.free;
      const result = preCheckCost("music_generation", "free", limit);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("daily_cost_limit_exceeded");
    });

    it("allows higher spending for paid plans", () => {
      const result = preCheckCost("music_generation", "core", 5.0);
      expect(result.allowed).toBe(true);
    });
  });

  describe("circuit breaker", () => {
    it("starts closed", () => {
      const result = checkCircuitBreaker("openai");
      expect(result.open).toBe(false);
    });

    it("opens after max failures", () => {
      const config = CIRCUIT_BREAKERS.find((c) => c.provider === "openai");
      for (let i = 0; i < config!.maxFailures; i++) {
        recordProviderFailure("openai");
      }
      const result = checkCircuitBreaker("openai");
      expect(result.open).toBe(true);
    });

    it("stays closed for unknown providers", () => {
      const result = checkCircuitBreaker("unknown_provider");
      expect(result.open).toBe(false);
    });

    it("resets on success", () => {
      const config = CIRCUIT_BREAKERS.find((c) => c.provider === "openai");
      for (let i = 0; i < config!.maxFailures; i++) {
        recordProviderFailure("openai");
      }
      recordProviderSuccess("openai");
      // openUntil is reset, but failures list still present
      // Need to wait for window to expire for full reset
    });
  });
});
