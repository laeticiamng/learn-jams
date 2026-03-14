// ============================================================
// Tests: Homepage Copy Integrity
// ============================================================

import { describe, it, expect } from "vitest";
import { HOME_COPY } from "./home-copy";

describe("HOME_COPY", () => {
  it("has all required top-level sections", () => {
    expect(HOME_COPY.hero).toBeDefined();
    expect(HOME_COPY.formats).toBeDefined();
    expect(HOME_COPY.audience).toBeDefined();
    expect(HOME_COPY.loop).toBeDefined();
    expect(HOME_COPY.useCases).toBeDefined();
    expect(HOME_COPY.trust).toBeDefined();
    expect(HOME_COPY.science).toBeDefined();
    expect(HOME_COPY.cta).toBeDefined();
    expect(HOME_COPY.faq).toBeDefined();
  });

  it("formats section has 6 items", () => {
    expect(HOME_COPY.formats.items).toHaveLength(6);
    for (const item of HOME_COPY.formats.items) {
      expect(item.key).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.desc).toBeTruthy();
      expect(item.icon).toBeTruthy();
    }
  });

  it("audience section has 4 profiles", () => {
    expect(HOME_COPY.audience.profiles).toHaveLength(4);
  });

  it("learning loop has 4 steps", () => {
    expect(HOME_COPY.loop.steps).toHaveLength(4);
  });

  it("FAQ has at least 5 questions", () => {
    expect(HOME_COPY.faq.length).toBeGreaterThanOrEqual(5);
    for (const faq of HOME_COPY.faq) {
      expect(faq.q).toBeTruthy();
      expect(faq.a).toBeTruthy();
    }
  });

  it("does not contain 'StudyBeats' branding", () => {
    const json = JSON.stringify(HOME_COPY);
    expect(json).not.toContain("StudyBeats");
  });

  it("trust badges include RGPD mention", () => {
    const labels = HOME_COPY.trust.badges.map(b => b.label);
    expect(labels.some(l => l.includes("RGPD"))).toBe(true);
  });
});
