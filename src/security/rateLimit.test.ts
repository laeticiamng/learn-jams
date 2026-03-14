import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, clearAllRateLimits, rateLimitHeaders, RATE_LIMITS } from "./rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it("allows requests within limit", () => {
    const result = checkRateLimit("user-1", "generate:song");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS["generate:song"].maxRequests - 1);
  });

  it("blocks requests over limit", () => {
    const limit = RATE_LIMITS["generate:song"].maxRequests;
    for (let i = 0; i < limit; i++) {
      checkRateLimit("user-1", "generate:song");
    }
    const result = checkRateLimit("user-1", "generate:song");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates users", () => {
    const limit = RATE_LIMITS["generate:song"].maxRequests;
    for (let i = 0; i < limit; i++) {
      checkRateLimit("user-1", "generate:song");
    }
    // user-2 should still be allowed
    const result = checkRateLimit("user-2", "generate:song");
    expect(result.allowed).toBe(true);
  });

  it("isolates limit keys", () => {
    const limit = RATE_LIMITS["generate:song"].maxRequests;
    for (let i = 0; i < limit; i++) {
      checkRateLimit("user-1", "generate:song");
    }
    // Different key should still be allowed
    const result = checkRateLimit("user-1", "generate:sheet");
    expect(result.allowed).toBe(true);
  });

  it("allows unknown limit keys", () => {
    const result = checkRateLimit("user-1", "unknown:key");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(-1);
  });

  describe("rateLimitHeaders", () => {
    it("includes limit and remaining", () => {
      const result = checkRateLimit("user-1", "generate:song");
      const headers = rateLimitHeaders(result);
      expect(headers["X-RateLimit-Limit"]).toBeDefined();
      expect(headers["X-RateLimit-Remaining"]).toBeDefined();
    });

    it("includes Retry-After when blocked", () => {
      const limit = RATE_LIMITS["generate:song"].maxRequests;
      for (let i = 0; i <= limit; i++) {
        checkRateLimit("user-1", "generate:song");
      }
      const result = checkRateLimit("user-1", "generate:song");
      const headers = rateLimitHeaders(result);
      expect(headers["Retry-After"]).toBeDefined();
    });
  });
});
