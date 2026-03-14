import { describe, it, expect } from "vitest";
import {
  computeAdaptation,
  detectAudienceMismatch,
  getContractPhrasing,
  getHookPhrasing,
  getRecallPromptStyle,
  getSegmentTransition,
  getDefinitionIntro,
  DEFAULT_LEARNER_PROFILE,
} from "./learner-profile.types";
import type { LearnerAudienceProfile } from "./learner-profile.types";

function makeProfile(overrides: Partial<LearnerAudienceProfile> = {}): LearnerAudienceProfile {
  return { ...DEFAULT_LEARNER_PROFILE, ...overrides };
}

// ============================================================
// computeAdaptation
// ============================================================

describe("computeAdaptation", () => {
  it("middle_school → max 3 elements, simple vocabulary, warm_guided tone", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "middle_school" }));
    expect(a.max_new_elements_per_block).toBe(3);
    expect(a.vocabulary_level).toBe("simple");
    expect(a.tone).toBe("warm_guided");
    expect(a.test_question_style).toBe("guided");
    expect(a.test_bloom_ceiling).toBe(4);
  });

  it("middle_school + needs_extra_simplification → max 2 elements", () => {
    const a = computeAdaptation(makeProfile({
      education_stage: "middle_school",
      needs_extra_simplification: true,
    }));
    expect(a.max_new_elements_per_block).toBe(2);
  });

  it("high_school → 4 elements, intermediate vocabulary, neutral tone", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "high_school" }));
    expect(a.max_new_elements_per_block).toBe(4);
    expect(a.vocabulary_level).toBe("intermediate");
    expect(a.tone).toBe("neutral_clear");
    expect(a.test_bloom_ceiling).toBe(5);
  });

  it("undergrad → 5 elements, academic vocabulary", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "undergrad" }));
    expect(a.max_new_elements_per_block).toBe(5);
    expect(a.vocabulary_level).toBe("academic");
    expect(a.test_bloom_floor).toBe(2);
  });

  it("graduate → technical vocabulary, direct_efficient tone", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "graduate" }));
    expect(a.vocabulary_level).toBe("technical");
    expect(a.tone).toBe("direct_efficient");
    expect(a.reformulation_density).toBe("low");
    expect(a.test_bloom_floor).toBe(3);
    expect(a.test_bloom_ceiling).toBe(6);
    expect(a.test_question_style).toBe("challenging");
  });

  it("professional → same as graduate", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "professional" }));
    expect(a.vocabulary_level).toBe("technical");
    expect(a.tone).toBe("direct_efficient");
  });

  it("adult_reskilling → balanced, medium", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "adult_reskilling" }));
    expect(a.tone).toBe("neutral_clear");
    expect(a.max_new_elements_per_block).toBe(3);
  });

  it("adult_reskilling + advanced declared_level → 5 elements", () => {
    const a = computeAdaptation(makeProfile({
      education_stage: "adult_reskilling",
      declared_level: "advanced",
    }));
    expect(a.max_new_elements_per_block).toBe(5);
    expect(a.vocabulary_level).toBe("academic");
  });

  it("unknown → intermediate defaults", () => {
    const a = computeAdaptation(DEFAULT_LEARNER_PROFILE);
    expect(a.max_new_elements_per_block).toBe(4);
    expect(a.vocabulary_level).toBe("intermediate");
    expect(a.tone).toBe("neutral_clear");
  });

  it("age_band inferred when education_stage unknown", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "unknown", age_band: "preteen" }));
    // preteen → middle_school
    expect(a.max_new_elements_per_block).toBe(3);
    expect(a.vocabulary_level).toBe("simple");
  });

  it("education_stage takes priority over age_band", () => {
    const a = computeAdaptation(makeProfile({
      education_stage: "graduate",
      age_band: "preteen",
    }));
    // graduate wins over preteen
    expect(a.vocabulary_level).toBe("technical");
  });

  it("undergrad + guided style → neutral_clear tone override", () => {
    const a = computeAdaptation(makeProfile({
      education_stage: "undergrad",
      explanation_style: "guided",
    }));
    expect(a.tone).toBe("neutral_clear");
  });
});

// ============================================================
// detectAudienceMismatch
// ============================================================

describe("detectAudienceMismatch", () => {
  it("no mismatch when document and profile are aligned", () => {
    const result = detectAudienceMismatch(5, "medium", makeProfile({
      education_stage: "high_school",
    }));
    expect(result.detected).toBe(false);
    expect(result.risk_level).toBeLessThan(0.3);
  });

  it("detects mismatch when expert doc + beginner profile", () => {
    const result = detectAudienceMismatch(9, "high", makeProfile({
      education_stage: "middle_school",
    }));
    expect(result.detected).toBe(true);
    expect(result.risk_level).toBeGreaterThanOrEqual(0.5);
    expect(result.document_difficulty).toBe("expert");
    expect(result.profile_level).toBe("beginner");
  });

  it("moderate mismatch for advanced doc + intermediate profile", () => {
    const result = detectAudienceMismatch(7, "medium", makeProfile({
      education_stage: "high_school",
    }));
    expect(result.risk_level).toBeGreaterThanOrEqual(0.3);
    expect(result.detected).toBe(true);
  });

  it("density amplifies mismatch for beginners", () => {
    const low = detectAudienceMismatch(6, "low", makeProfile({ education_stage: "middle_school" }));
    const high = detectAudienceMismatch(6, "high", makeProfile({ education_stage: "middle_school" }));
    expect(high.risk_level).toBeGreaterThan(low.risk_level);
  });

  it("no mismatch for easy doc + advanced profile", () => {
    const result = detectAudienceMismatch(2, "low", makeProfile({
      education_stage: "graduate",
    }));
    expect(result.detected).toBe(false);
  });
});

// ============================================================
// Phrasing helpers
// ============================================================

describe("getContractPhrasing", () => {
  it("warm_guided uses tu/toi", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "middle_school" }));
    const p = getContractPhrasing(a);
    expect(p.objective(5, 2)).toContain("Tu vas");
    expect(p.recall()).toContain("petit test");
  });

  it("formal_precise uses formal language", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "undergrad" }));
    const p = getContractPhrasing(a);
    expect(p.objective(5, 2)).toContain("criticité");
  });

  it("direct_efficient is concise", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "graduate" }));
    const p = getContractPhrasing(a);
    const text = p.objective(5, 2);
    expect(text.length).toBeLessThan(60);
  });
});

describe("getHookPhrasing", () => {
  it("warm_guided adds exclamation and engagement", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "middle_school" }));
    const hook = getHookPhrasing(a, "Math", "Equations");
    expect(hook).toContain("Savais-tu");
  });

  it("direct_efficient is concise", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "graduate" }));
    const hook = getHookPhrasing(a, "Math", "Equations");
    expect(hook).toContain("concept central");
  });
});

describe("getRecallPromptStyle", () => {
  it("guided uses tu", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "middle_school" }));
    const prompts = getRecallPromptStyle(a);
    expect(prompts.question("X")).toContain("Peux-tu");
  });

  it("challenging uses formal and analytical language", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "graduate" }));
    const prompts = getRecallPromptStyle(a);
    expect(prompts.question("X")).toContain("Définissez précisément");
  });
});

describe("getSegmentTransition", () => {
  it("returns empty for first segment", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "high_school" }));
    expect(getSegmentTransition(a, 0)).toBe("");
  });

  it("warm_guided uses encouraging language", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "middle_school" }));
    expect(getSegmentTransition(a, 1)).toContain("Très bien");
  });

  it("direct_efficient is minimal", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "graduate" }));
    expect(getSegmentTransition(a, 1)).toBe("Bloc suivant :");
  });
});

describe("getDefinitionIntro", () => {
  it("simple vocabulary uses plain intro", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "middle_school" }));
    expect(getDefinitionIntro(a)).toContain("En d'autres termes");
  });

  it("technical vocabulary uses formal intro", () => {
    const a = computeAdaptation(makeProfile({ education_stage: "graduate" }));
    expect(getDefinitionIntro(a)).toBe("Formellement,");
  });
});
