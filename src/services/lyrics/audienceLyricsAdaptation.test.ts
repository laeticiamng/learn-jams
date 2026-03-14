// ============================================================
// Tests: Audience Lyrics Adaptation
// ============================================================

import { describe, it, expect } from "vitest";
import { resolveAudienceAdaptation, resolveVocabularyLevel, resolveDensityLevel } from "./audienceLyricsAdaptation";
import { DEFAULT_LEARNER_LYRICS_PROFILE } from "@/domain/lyrics/learnerProfile.types";
import type { LearnerLyricsProfile } from "@/domain/lyrics/learnerProfile.types";

function makeProfile(overrides: Partial<LearnerLyricsProfile>): LearnerLyricsProfile {
  return { ...DEFAULT_LEARNER_LYRICS_PROFILE, ...overrides };
}

describe("resolveAudienceAdaptation", () => {
  it("middle_school: simple vocabulary, light density", () => {
    const adaptation = resolveAudienceAdaptation(makeProfile({ education_stage: "middle_school" }));
    expect(adaptation.vocabulary_level).toBe("simple");
    expect(adaptation.density_level).toBe("light");
    expect(adaptation.max_concepts_per_verse).toBeLessThanOrEqual(3);
    expect(adaptation.reformulation_intensity).toBe("high");
  });

  it("high_school: intermediate vocabulary, moderate density", () => {
    const adaptation = resolveAudienceAdaptation(makeProfile({ education_stage: "high_school" }));
    expect(adaptation.vocabulary_level).toBe("intermediate");
    expect(adaptation.density_level).toBe("moderate");
    expect(adaptation.hook_style).toBe("balanced");
  });

  it("undergrad: academic vocabulary, dense", () => {
    const adaptation = resolveAudienceAdaptation(makeProfile({ education_stage: "undergrad" }));
    expect(adaptation.vocabulary_level).toBe("academic");
    expect(adaptation.density_level).toBe("dense");
    expect(adaptation.punchline_style).toBe("exam_precision");
  });

  it("graduate: technical vocabulary, very dense, NO infantilization", () => {
    const adaptation = resolveAudienceAdaptation(makeProfile({ education_stage: "graduate" }));
    expect(adaptation.vocabulary_level).toBe("technical");
    expect(adaptation.density_level).toBe("very_dense");
    expect(adaptation.reformulation_intensity).toBe("none");
    expect(adaptation.hook_style).toBe("conceptual_sober");
    expect(adaptation.refrain_style).toBe("high_level_anchor");
  });

  it("professional: same as graduate — technical, no simplification", () => {
    const adaptation = resolveAudienceAdaptation(makeProfile({ education_stage: "professional" }));
    expect(adaptation.vocabulary_level).toBe("technical");
    expect(adaptation.reformulation_intensity).toBe("none");
  });

  it("unknown stage falls back to declared_level", () => {
    const adaptation = resolveAudienceAdaptation(makeProfile({
      education_stage: "unknown",
      declared_level: "beginner",
    }));
    expect(adaptation.vocabulary_level).toBe("simple");
  });

  it("unknown stage + unknown level falls back to age_band", () => {
    const adaptation = resolveAudienceAdaptation(makeProfile({
      education_stage: "unknown",
      declared_level: "unknown",
      age_band: "adult",
    }));
    expect(adaptation.vocabulary_level).toBe("technical");
  });

  it("all unknown falls back to high_school (safe default)", () => {
    const adaptation = resolveAudienceAdaptation(DEFAULT_LEARNER_LYRICS_PROFILE);
    expect(adaptation.vocabulary_level).toBe("intermediate");
    expect(adaptation.density_level).toBe("moderate");
  });
});

describe("resolveVocabularyLevel", () => {
  it("returns simple for middle_school", () => {
    expect(resolveVocabularyLevel(makeProfile({ education_stage: "middle_school" }))).toBe("simple");
  });

  it("returns technical for professional", () => {
    expect(resolveVocabularyLevel(makeProfile({ education_stage: "professional" }))).toBe("technical");
  });
});

describe("resolveDensityLevel", () => {
  it("returns light for middle_school", () => {
    expect(resolveDensityLevel(makeProfile({ education_stage: "middle_school" }))).toBe("light");
  });

  it("returns very_dense for graduate", () => {
    expect(resolveDensityLevel(makeProfile({ education_stage: "graduate" }))).toBe("very_dense");
  });
});
