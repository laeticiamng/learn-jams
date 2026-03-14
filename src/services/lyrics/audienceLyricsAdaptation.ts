// ============================================================
// Audience Lyrics Adaptation — Resolve profile to adaptation params
// ============================================================

import type {
  LearnerLyricsProfile,
  EducationStage,
  DeclaredLevel,
  AudienceAdaptation,
  VocabularyLevel,
  DensityLevel,
} from "@/domain/lyrics/learnerProfile.types";

/**
 * Priority: education_stage > declared_level > age_band > fallback
 */
export function resolveAudienceAdaptation(profile: LearnerLyricsProfile): AudienceAdaptation {
  const stage = profile.education_stage;
  const level = profile.declared_level;

  // Determine effective tier from education_stage first
  if (stage !== "unknown") {
    return STAGE_ADAPTATIONS[stage] ?? STAGE_ADAPTATIONS.high_school;
  }

  // Fallback to declared_level
  if (level !== "unknown") {
    return LEVEL_ADAPTATIONS[level] ?? LEVEL_ADAPTATIONS.intermediate;
  }

  // Fallback to age_band
  switch (profile.age_band) {
    case "child":
    case "preteen":
      return STAGE_ADAPTATIONS.middle_school;
    case "teen":
      return STAGE_ADAPTATIONS.high_school;
    case "young_adult":
      return STAGE_ADAPTATIONS.undergrad;
    case "adult":
      return STAGE_ADAPTATIONS.professional;
    default:
      return STAGE_ADAPTATIONS.high_school; // Safe fallback
  }
}

export function resolveVocabularyLevel(profile: LearnerLyricsProfile): VocabularyLevel {
  return resolveAudienceAdaptation(profile).vocabulary_level;
}

export function resolveDensityLevel(profile: LearnerLyricsProfile): DensityLevel {
  return resolveAudienceAdaptation(profile).density_level;
}

// ---------- Stage-based adaptation presets ----------

const STAGE_ADAPTATIONS: Record<EducationStage, AudienceAdaptation> = {
  primary: {
    vocabulary_level: "simple",
    density_level: "light",
    max_concepts_per_verse: 2,
    reformulation_intensity: "high",
    hook_style: "direct_concrete",
    refrain_style: "catchy_simple",
    punchline_style: "accessible",
    analogy_type: "everyday_concrete",
    sentence_length: "short",
  },
  middle_school: {
    vocabulary_level: "simple",
    density_level: "light",
    max_concepts_per_verse: 3,
    reformulation_intensity: "high",
    hook_style: "direct_concrete",
    refrain_style: "catchy_simple",
    punchline_style: "accessible",
    analogy_type: "everyday_concrete",
    sentence_length: "short",
  },
  high_school: {
    vocabulary_level: "intermediate",
    density_level: "moderate",
    max_concepts_per_verse: 4,
    reformulation_intensity: "medium",
    hook_style: "balanced",
    refrain_style: "structured",
    punchline_style: "revision",
    analogy_type: "mixed",
    sentence_length: "medium",
  },
  undergrad: {
    vocabulary_level: "academic",
    density_level: "dense",
    max_concepts_per_verse: 5,
    reformulation_intensity: "low",
    hook_style: "balanced",
    refrain_style: "structured",
    punchline_style: "exam_precision",
    analogy_type: "mixed",
    sentence_length: "medium",
  },
  graduate: {
    vocabulary_level: "technical",
    density_level: "very_dense",
    max_concepts_per_verse: 6,
    reformulation_intensity: "none",
    hook_style: "conceptual_sober",
    refrain_style: "high_level_anchor",
    punchline_style: "technical",
    analogy_type: "abstract_domain",
    sentence_length: "long",
  },
  professional: {
    vocabulary_level: "technical",
    density_level: "very_dense",
    max_concepts_per_verse: 6,
    reformulation_intensity: "none",
    hook_style: "conceptual_sober",
    refrain_style: "high_level_anchor",
    punchline_style: "technical",
    analogy_type: "abstract_domain",
    sentence_length: "long",
  },
  adult_reskilling: {
    vocabulary_level: "intermediate",
    density_level: "moderate",
    max_concepts_per_verse: 4,
    reformulation_intensity: "medium",
    hook_style: "balanced",
    refrain_style: "structured",
    punchline_style: "revision",
    analogy_type: "everyday_concrete",
    sentence_length: "medium",
  },
  unknown: {
    vocabulary_level: "intermediate",
    density_level: "moderate",
    max_concepts_per_verse: 4,
    reformulation_intensity: "medium",
    hook_style: "balanced",
    refrain_style: "structured",
    punchline_style: "revision",
    analogy_type: "mixed",
    sentence_length: "medium",
  },
};

const LEVEL_ADAPTATIONS: Record<DeclaredLevel, AudienceAdaptation> = {
  beginner: STAGE_ADAPTATIONS.middle_school,
  intermediate: STAGE_ADAPTATIONS.high_school,
  advanced: STAGE_ADAPTATIONS.undergrad,
  unknown: STAGE_ADAPTATIONS.high_school,
};
