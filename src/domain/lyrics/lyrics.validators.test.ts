// ============================================================
// Tests: Lyrics Validators
// ============================================================

import { describe, it, expect } from "vitest";
import { validateLearnerLyricsProfile, hasMetadataSeparator, hasValidMetadataSections } from "./lyrics.validators";
import { DEFAULT_LEARNER_LYRICS_PROFILE } from "./learnerProfile.types";

describe("validateLearnerLyricsProfile", () => {
  it("accepts default profile with no errors", () => {
    const errors = validateLearnerLyricsProfile(DEFAULT_LEARNER_LYRICS_PROFILE);
    expect(errors).toHaveLength(0);
  });

  it("rejects invalid education_stage", () => {
    const errors = validateLearnerLyricsProfile({
      ...DEFAULT_LEARNER_LYRICS_PROFILE,
      education_stage: "fake_stage" as any,
    });
    expect(errors.some(e => e.includes("education_stage"))).toBe(true);
  });

  it("rejects invalid declared_level", () => {
    const errors = validateLearnerLyricsProfile({
      ...DEFAULT_LEARNER_LYRICS_PROFILE,
      declared_level: "expert" as any,
    });
    expect(errors.some(e => e.includes("declared_level"))).toBe(true);
  });

  it("rejects confidence out of range", () => {
    const errors = validateLearnerLyricsProfile({
      ...DEFAULT_LEARNER_LYRICS_PROFILE,
      confidence: 1.5,
    });
    expect(errors.some(e => e.includes("confidence"))).toBe(true);
  });

  it("rejects negative confidence", () => {
    const errors = validateLearnerLyricsProfile({
      ...DEFAULT_LEARNER_LYRICS_PROFILE,
      confidence: -0.1,
    });
    expect(errors.some(e => e.includes("confidence"))).toBe(true);
  });

  it("accepts valid non-default profile", () => {
    const errors = validateLearnerLyricsProfile({
      age_band: "teen",
      education_stage: "high_school",
      declared_level: "intermediate",
      language_preference: "fr",
      explanation_style: "academic",
      memorization_goal: "exam",
      confidence: 0.8,
    });
    expect(errors).toHaveLength(0);
  });
});

describe("hasMetadataSeparator", () => {
  it("returns true when separator present", () => {
    expect(hasMetadataSeparator("lyrics\n---METADATA---\nnotes")).toBe(true);
  });

  it("returns false when no separator", () => {
    expect(hasMetadataSeparator("lyrics only")).toBe(false);
  });
});

describe("hasValidMetadataSections", () => {
  it("returns true for valid A) B) sections", () => {
    expect(hasValidMetadataSections("A) Notions\nstuff\nB) Punchlines\nstuff")).toBe(true);
  });

  it("returns false for missing sections", () => {
    expect(hasValidMetadataSections("Just text")).toBe(false);
  });
});
