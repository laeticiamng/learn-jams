// ============================================================
// Tests: Lyrics Prompt Builder
// ============================================================

import { describe, it, expect } from "vitest";
import { buildPromptModules, assembleSystemPrompt, buildUserPrompt } from "./lyricsPromptBuilder";
import { DEFAULT_LEARNER_LYRICS_PROFILE } from "@/domain/lyrics/learnerProfile.types";
import type { LearnerLyricsProfile } from "@/domain/lyrics/learnerProfile.types";

function makeProfile(overrides: Partial<LearnerLyricsProfile>): LearnerLyricsProfile {
  return { ...DEFAULT_LEARNER_LYRICS_PROFILE, ...overrides };
}

describe("buildPromptModules", () => {
  it("returns all 5 modules", () => {
    const modules = buildPromptModules("fr");
    expect(modules.systemCore).toBeTruthy();
    expect(modules.audienceAdaptation).toBeTruthy();
    expect(modules.memoryOptimization).toBeTruthy();
    expect(modules.examPrecision).toBeTruthy();
    expect(modules.outputContract).toBeTruthy();
  });

  it("system core always includes assonance constraint", () => {
    const modules = buildPromptModules("fr");
    expect(modules.systemCore).toContain("ASSONANCES");
  });

  it("system core always includes fidelity rule", () => {
    const modules = buildPromptModules("en");
    expect(modules.systemCore).toContain("FIDELITY");
  });

  it("middle_school profile gets simple vocabulary instruction", () => {
    const modules = buildPromptModules("fr", makeProfile({ education_stage: "middle_school" }));
    expect(modules.audienceAdaptation).toContain("SIMPLE");
  });

  it("graduate profile gets technical vocabulary instruction", () => {
    const modules = buildPromptModules("fr", makeProfile({ education_stage: "graduate" }));
    expect(modules.audienceAdaptation).toContain("TECHNICAL");
  });

  it("professional profile uses technical vocabulary and sober hooks", () => {
    const modules = buildPromptModules("fr", makeProfile({ education_stage: "professional" }));
    const full = assembleSystemPrompt(modules);
    expect(full).toContain("technical");
    // Should contain sober/conceptual hook instruction
    expect(full.toLowerCase()).toContain("sober");
  });

  it("exam goal gets exam-specific instructions", () => {
    const modules = buildPromptModules("fr", makeProfile({ memorization_goal: "exam" }));
    expect(modules.memoryOptimization).toContain("EXAM mode");
  });

  it("max_retention goal gets retention-specific instructions", () => {
    const modules = buildPromptModules("fr", makeProfile({ memorization_goal: "max_retention" }));
    expect(modules.memoryOptimization).toContain("MAXIMUM RETENTION");
  });

  it("output contract includes ---METADATA--- format", () => {
    const modules = buildPromptModules("fr");
    expect(modules.outputContract).toContain("---METADATA---");
  });

  it("output contract includes sections A through E", () => {
    const modules = buildPromptModules("fr");
    expect(modules.outputContract).toContain("A)");
    expect(modules.outputContract).toContain("B)");
    expect(modules.outputContract).toContain("C)");
    expect(modules.outputContract).toContain("D)");
    expect(modules.outputContract).toContain("E)");
  });

  it("assonance constraint present for ALL levels", () => {
    for (const stage of ["middle_school", "high_school", "undergrad", "graduate", "professional"] as const) {
      const modules = buildPromptModules("fr", makeProfile({ education_stage: stage }));
      expect(modules.audienceAdaptation).toContain("Assonances remain MANDATORY");
    }
  });
});

describe("assembleSystemPrompt", () => {
  it("combines all modules into one string", () => {
    const modules = buildPromptModules("fr");
    const full = assembleSystemPrompt(modules);
    expect(full).toContain("IMMUTABLE CORE RULES");
    expect(full).toContain("AUDIENCE ADAPTATION");
    expect(full).toContain("MEMORY OPTIMIZATION");
    expect(full).toContain("EXAM PRECISION");
    expect(full).toContain("OUTPUT FORMAT");
  });
});

describe("buildUserPrompt", () => {
  it("includes style and text", () => {
    const prompt = buildUserPrompt({
      text: "Les cellules eucaryotes possèdent un noyau.",
      style: "rap",
      title: "Bio Rap",
      targetLangName: "français",
    });
    expect(prompt).toContain("rap");
    expect(prompt).toContain("Bio Rap");
    expect(prompt).toContain("cellules eucaryotes");
  });

  it("truncates text to 6000 chars", () => {
    const longText = "x".repeat(10000);
    const prompt = buildUserPrompt({
      text: longText,
      style: "pop",
      targetLangName: "français",
    });
    expect(prompt.length).toBeLessThan(10000);
  });
});
