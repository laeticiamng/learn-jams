// ============================================================
// Learner Lyrics Profile — Audience adaptation for musical generation
// ============================================================

export type AgeBand = "child" | "preteen" | "teen" | "young_adult" | "adult" | "unknown";

export type EducationStage =
  | "primary"
  | "middle_school"
  | "high_school"
  | "undergrad"
  | "graduate"
  | "professional"
  | "adult_reskilling"
  | "unknown";

export type DeclaredLevel = "beginner" | "intermediate" | "advanced" | "unknown";

export type ExplanationStyle = "guided" | "balanced" | "academic" | "professional";

export type MemorizationGoal = "discover" | "revise" | "exam" | "max_retention";

export type SupportedLanguage = "fr" | "en" | "de" | "es" | "ar" | "zh" | "hi" | "auto";

export interface LearnerLyricsProfile {
  age_band: AgeBand;
  education_stage: EducationStage;
  declared_level: DeclaredLevel;
  language_preference: SupportedLanguage;
  explanation_style: ExplanationStyle;
  memorization_goal: MemorizationGoal;
  confidence: number; // 0-1
}

export const DEFAULT_LEARNER_LYRICS_PROFILE: LearnerLyricsProfile = {
  age_band: "unknown",
  education_stage: "unknown",
  declared_level: "unknown",
  language_preference: "auto",
  explanation_style: "balanced",
  memorization_goal: "revise",
  confidence: 0.5,
};

// Priority-based resolution: education_stage > declared_level > age_band
export type VocabularyLevel = "simple" | "intermediate" | "academic" | "technical";
export type DensityLevel = "light" | "moderate" | "dense" | "very_dense";

export interface AudienceAdaptation {
  vocabulary_level: VocabularyLevel;
  density_level: DensityLevel;
  max_concepts_per_verse: number;
  reformulation_intensity: "high" | "medium" | "low" | "none";
  hook_style: "direct_concrete" | "balanced" | "conceptual_sober";
  refrain_style: "catchy_simple" | "structured" | "high_level_anchor";
  punchline_style: "accessible" | "revision" | "exam_precision" | "technical";
  analogy_type: "everyday_concrete" | "mixed" | "abstract_domain";
  sentence_length: "short" | "medium" | "long";
}
