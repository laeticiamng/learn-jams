import { describe, it, expect } from "vitest";
import { buildCspHeader, SECURITY_HEADERS, CSP_DIRECTIVES } from "./csp";

describe("csp", () => {
  describe("buildCspHeader", () => {
    it("includes all directives", () => {
      const csp = buildCspHeader();
      expect(csp).toContain("default-src");
      expect(csp).toContain("script-src");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
    });

    it("blocks framing by default", () => {
      const csp = buildCspHeader();
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("includes upgrade-insecure-requests", () => {
      const csp = buildCspHeader();
      expect(csp).toContain("upgrade-insecure-requests");
    });

    it("allows overrides", () => {
      const csp = buildCspHeader({ "script-src": ["'self'", "'unsafe-eval'"] });
      expect(csp).toContain("unsafe-eval");
    });
  });

  describe("SECURITY_HEADERS", () => {
    it("includes X-Content-Type-Options", () => {
      expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    });

    it("includes X-Frame-Options", () => {
      expect(SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
    });

    it("includes Referrer-Policy", () => {
      expect(SECURITY_HEADERS["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    });

    it("includes HSTS", () => {
      expect(SECURITY_HEADERS["Strict-Transport-Security"]).toContain("max-age");
    });

    it("includes Permissions-Policy", () => {
      expect(SECURITY_HEADERS["Permissions-Policy"]).toContain("camera=()");
    });
  });
});
