// ============================================================
// Lyrics Validators
// ============================================================

import type { LearnerLyricsProfile, EducationStage, DeclaredLevel, ExplanationStyle, MemorizationGoal } from "./learnerProfile.types";

const VALID_EDUCATION_STAGES: EducationStage[] = [
  "primary", "middle_school", "high_school", "undergrad", "graduate", "professional", "adult_reskilling", "unknown",
];

const VALID_DECLARED_LEVELS: DeclaredLevel[] = ["beginner", "intermediate", "advanced", "unknown"];

const VALID_EXPLANATION_STYLES: ExplanationStyle[] = ["guided", "balanced", "academic", "professional"];

const VALID_MEMORIZATION_GOALS: MemorizationGoal[] = ["discover", "revise", "exam", "max_retention"];

export function validateLearnerLyricsProfile(profile: LearnerLyricsProfile): string[] {
  const errors: string[] = [];

  if (!VALID_EDUCATION_STAGES.includes(profile.education_stage)) {
    errors.push(`Invalid education_stage: ${profile.education_stage}`);
  }
  if (!VALID_DECLARED_LEVELS.includes(profile.declared_level)) {
    errors.push(`Invalid declared_level: ${profile.declared_level}`);
  }
  if (!VALID_EXPLANATION_STYLES.includes(profile.explanation_style)) {
    errors.push(`Invalid explanation_style: ${profile.explanation_style}`);
  }
  if (!VALID_MEMORIZATION_GOALS.includes(profile.memorization_goal)) {
    errors.push(`Invalid memorization_goal: ${profile.memorization_goal}`);
  }
  if (profile.confidence < 0 || profile.confidence > 1) {
    errors.push(`confidence must be between 0 and 1, got ${profile.confidence}`);
  }

  return errors;
}

export function hasMetadataSeparator(content: string): boolean {
  return content.includes("---METADATA---");
}

export function hasValidMetadataSections(metadata: string): boolean {
  return /^A\)/m.test(metadata) && /^B\)/m.test(metadata);
}
