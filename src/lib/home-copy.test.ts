// ============================================================
// Tests: Homepage I18n Keys Integrity
// ============================================================

import { describe, it, expect } from "vitest";
import fr from "@/i18n/locales/fr.json";

const home = fr.home as Record<string, string>;

describe("Homepage i18n keys", () => {
  it("has all hero keys", () => {
    expect(home.hero_badge).toBeTruthy();
    expect(home.hero_title_line1).toBeTruthy();
    expect(home.hero_title_highlight).toBeTruthy();
    expect(home.hero_subtitle).toBeTruthy();
    expect(home.hero_cta_logged_in).toBeTruthy();
    expect(home.hero_cta_logged_out).toBeTruthy();
    expect(home.hero_cta_demo).toBeTruthy();
    expect(home.hero_already_account).toBeTruthy();
  });

  it("has all 6 format item keys", () => {
    const formats = ["mission", "song", "quiz", "video", "sheet", "story"];
    for (const key of formats) {
      expect(home[`format_${key}_title`]).toBeTruthy();
      expect(home[`format_${key}_desc`]).toBeTruthy();
    }
  });

  it("has all 4 audience profile keys", () => {
    const profiles = ["student", "teacher", "pro", "parent"];
    for (const key of profiles) {
      expect(home[`audience_${key}_title`]).toBeTruthy();
      expect(home[`audience_${key}_desc`]).toBeTruthy();
    }
  });

  it("has 4 learning loop steps", () => {
    for (const i of [1, 2, 3, 4]) {
      expect(home[`loop_step${i}_title`]).toBeTruthy();
      expect(home[`loop_step${i}_desc`]).toBeTruthy();
    }
  });

  it("has at least 5 FAQ questions", () => {
    let count = 0;
    for (let i = 1; i <= 10; i++) {
      if (home[`faq${i}_q`] && home[`faq${i}_a`]) count++;
    }
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it("does not contain 'StudyBeats' branding", () => {
    const json = JSON.stringify(home);
    expect(json).not.toContain("StudyBeats");
  });

  it("trust badges include RGPD mention", () => {
    const trustKeys = ["trust_source", "trust_rls", "trust_hallucination", "trust_minor"];
    const labels = trustKeys.map(k => home[k]);
    expect(labels.some(l => l.includes("RGPD"))).toBe(true);
  });

  it("has before/after section keys", () => {
    expect(home.before_after_title).toBeTruthy();
    expect(home.before_label).toBeTruthy();
    expect(home.after_label).toBeTruthy();
    for (const i of [1, 2, 3, 4, 5]) {
      expect(home[`before_${i}`]).toBeTruthy();
    }
    for (const i of [1, 2, 3, 4, 5, 6]) {
      expect(home[`after_${i}`]).toBeTruthy();
    }
  });

  it("has testimonial keys", () => {
    for (const i of [1, 2, 3]) {
      expect(home[`testimonial${i}_name`]).toBeTruthy();
      expect(home[`testimonial${i}_field`]).toBeTruthy();
      expect(home[`testimonial${i}_quote`]).toBeTruthy();
    }
  });
});
