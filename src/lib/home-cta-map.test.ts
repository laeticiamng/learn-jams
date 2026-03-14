// ============================================================
// Tests: CTA Route Mapping
// ============================================================

import { describe, it, expect } from "vitest";
import { resolveCTARoute, ALL_CTA_ACTIONS } from "./home-cta-map";

describe("resolveCTARoute", () => {
  it("routes authed users to /create for 'create' action", () => {
    expect(resolveCTARoute("create", true)).toBe("/create");
  });

  it("routes guests to /signup for 'create' action", () => {
    expect(resolveCTARoute("create", false)).toBe("/signup");
  });

  it("routes guests to /login for 'login' action", () => {
    expect(resolveCTARoute("login", false)).toBe("/login");
  });

  it("appends seed query param for authed demo action", () => {
    expect(resolveCTARoute("demo", true, "seed-123")).toBe("/create?seed=seed-123");
  });

  it("ignores seed for guest demo action", () => {
    expect(resolveCTARoute("demo", false, "seed-123")).toBe("/signup");
  });

  it("routes to /pricing for both authed and guest", () => {
    expect(resolveCTARoute("pricing", true)).toBe("/pricing");
    expect(resolveCTARoute("pricing", false)).toBe("/pricing");
  });

  it("routes guardian action correctly", () => {
    expect(resolveCTARoute("guardian", true)).toBe("/guardian-settings");
    expect(resolveCTARoute("guardian", false)).toBe("/signup");
  });

  it("has all CTA actions defined", () => {
    expect(ALL_CTA_ACTIONS.length).toBeGreaterThanOrEqual(6);
    for (const action of ALL_CTA_ACTIONS) {
      expect(() => resolveCTARoute(action, true)).not.toThrow();
      expect(() => resolveCTARoute(action, false)).not.toThrow();
    }
  });
});
