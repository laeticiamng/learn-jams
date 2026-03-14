// ============================================================
// COGNITIO Learner Audience Profile — Types & Adaptation Engine
// ============================================================

// ---------- Profile Enums ----------

export type AgeBand =
  | "child"        // < 11
  | "preteen"      // 11-13
  | "teen"         // 14-17
  | "young_adult"  // 18-25
  | "adult"        // 26+
  | "unknown";

export type EducationStage =
  | "primary"           // école primaire
  | "middle_school"     // collège
  | "high_school"       // lycée
  | "undergrad"         // licence
  | "graduate"          // master / doctorat
  | "professional"      // formation professionnelle
  | "adult_reskilling"  // reprise d'études
  | "unknown";

export type DeclaredLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "unknown";

export type ExplanationStyle =
  | "guided"       // très guidé, pas à pas
  | "balanced"     // équilibré
  | "academic"     // académique, formel
  | "professional"; // direct, orienté maîtrise

// ---------- Learner Audience Profile ----------

export interface LearnerAudienceProfile {
  age_band: AgeBand;
  education_stage: EducationStage;
  declared_level: DeclaredLevel;
  language_preference: string;          // "fr" | "en" | "de" | "auto"
  explanation_style: ExplanationStyle;
  needs_extra_simplification: boolean;
  confidence: number;                   // 0-1, how confident we are in this profile
}

// ---------- Audience Adaptation Parameters ----------

/** Computed adaptation parameters derived from the profile */
export interface AudienceAdaptation {
  // Cognitive load
  max_new_elements_per_block: number;   // 2-5
  recommended_segment_duration_sec: number;

  // Language
  vocabulary_level: "simple" | "intermediate" | "academic" | "technical";
  max_sentence_length: "short" | "medium" | "long";
  abstraction_level: "concrete" | "moderate" | "abstract";

  // Pedagogy
  analogy_style: "everyday" | "school" | "academic" | "professional";
  tone: "warm_guided" | "neutral_clear" | "formal_precise" | "direct_efficient";
  reformulation_density: "high" | "medium" | "low";

  // Content
  example_style: "familiar_concrete" | "school_context" | "academic_reference" | "professional_case";
  visual_anchor_style: "playful" | "illustrative" | "schematic" | "minimal";

  // Test difficulty
  test_bloom_floor: 1 | 2 | 3;         // minimum Bloom level in final test
  test_bloom_ceiling: 4 | 5 | 6;       // maximum Bloom level in final test
  test_question_style: "guided" | "standard" | "challenging";
}

// ---------- Audience Mismatch ----------

export interface AudienceMismatch {
  detected: boolean;
  risk_level: number;                   // 0-1
  document_difficulty: "easy" | "intermediate" | "advanced" | "expert";
  profile_level: "beginner" | "intermediate" | "advanced";
  message: string;
}

// ---------- Default Profile ----------

export const DEFAULT_LEARNER_PROFILE: LearnerAudienceProfile = {
  age_band: "unknown",
  education_stage: "unknown",
  declared_level: "unknown",
  language_preference: "fr",
  explanation_style: "balanced",
  needs_extra_simplification: false,
  confidence: 0.5,
};

// ============================================================
// Adaptation Engine
// ============================================================

/**
 * Compute adaptation parameters from a learner audience profile.
 * education_stage takes priority over age_band.
 * declared_level can partially override.
 */
export function computeAdaptation(profile: LearnerAudienceProfile): AudienceAdaptation {
  const stage = resolveEffectiveStage(profile);

  switch (stage) {
    case "primary":
    case "middle_school":
      return {
        max_new_elements_per_block: profile.needs_extra_simplification ? 2 : 3,
        recommended_segment_duration_sec: 60,
        vocabulary_level: "simple",
        max_sentence_length: "short",
        abstraction_level: "concrete",
        analogy_style: "everyday",
        tone: "warm_guided",
        reformulation_density: "high",
        example_style: "familiar_concrete",
        visual_anchor_style: "playful",
        test_bloom_floor: 1,
        test_bloom_ceiling: 4,
        test_question_style: "guided",
      };

    case "high_school":
      return {
        max_new_elements_per_block: 4,
        recommended_segment_duration_sec: 90,
        vocabulary_level: "intermediate",
        max_sentence_length: "medium",
        abstraction_level: "moderate",
        analogy_style: "school",
        tone: "neutral_clear",
        reformulation_density: "medium",
        example_style: "school_context",
        visual_anchor_style: "illustrative",
        test_bloom_floor: 1,
        test_bloom_ceiling: 5,
        test_question_style: "standard",
      };

    case "undergrad":
      return {
        max_new_elements_per_block: 5,
        recommended_segment_duration_sec: 120,
        vocabulary_level: "academic",
        max_sentence_length: "long",
        abstraction_level: "moderate",
        analogy_style: "academic",
        tone: profile.explanation_style === "guided" ? "neutral_clear" : "formal_precise",
        reformulation_density: "medium",
        example_style: "academic_reference",
        visual_anchor_style: "schematic",
        test_bloom_floor: 2,
        test_bloom_ceiling: 6,
        test_question_style: "standard",
      };

    case "graduate":
    case "professional":
      return {
        max_new_elements_per_block: 5,
        recommended_segment_duration_sec: 150,
        vocabulary_level: "technical",
        max_sentence_length: "long",
        abstraction_level: "abstract",
        analogy_style: "professional",
        tone: "direct_efficient",
        reformulation_density: "low",
        example_style: "professional_case",
        visual_anchor_style: "minimal",
        test_bloom_floor: 3,
        test_bloom_ceiling: 6,
        test_question_style: "challenging",
      };

    case "adult_reskilling":
      return {
        max_new_elements_per_block: profile.declared_level === "advanced" ? 5 : 3,
        recommended_segment_duration_sec: 90,
        vocabulary_level: profile.declared_level === "advanced" ? "academic" : "intermediate",
        max_sentence_length: "medium",
        abstraction_level: "moderate",
        analogy_style: "professional",
        tone: "neutral_clear",
        reformulation_density: "medium",
        example_style: "professional_case",
        visual_anchor_style: "illustrative",
        test_bloom_floor: 1,
        test_bloom_ceiling: 5,
        test_question_style: "standard",
      };

    default: // "unknown"
      return {
        max_new_elements_per_block: 4,
        recommended_segment_duration_sec: 90,
        vocabulary_level: "intermediate",
        max_sentence_length: "medium",
        abstraction_level: "moderate",
        analogy_style: "school",
        tone: "neutral_clear",
        reformulation_density: "medium",
        example_style: "school_context",
        visual_anchor_style: "illustrative",
        test_bloom_floor: 1,
        test_bloom_ceiling: 5,
        test_question_style: "standard",
      };
  }
}

/**
 * Resolve the effective education stage considering priority rules:
 * education_stage > age_band > declared_level
 */
function resolveEffectiveStage(profile: LearnerAudienceProfile): EducationStage {
  if (profile.education_stage !== "unknown") {
    return profile.education_stage;
  }

  // Infer from age_band
  const ageMappings: Record<AgeBand, EducationStage> = {
    child: "primary",
    preteen: "middle_school",
    teen: "high_school",
    young_adult: "undergrad",
    adult: "professional",
    unknown: "unknown",
  };

  return ageMappings[profile.age_band];
}

/**
 * Detect mismatch between document difficulty and learner profile.
 */
export function detectAudienceMismatch(
  documentComplexity: number,  // 1-10
  density: "low" | "medium" | "high",
  profile: LearnerAudienceProfile
): AudienceMismatch {
  const stage = resolveEffectiveStage(profile);
  const profileLevel = getProfileLevel(stage, profile.declared_level);

  // Map complexity to difficulty
  const docDifficulty = documentComplexity <= 3 ? "easy"
    : documentComplexity <= 5 ? "intermediate"
    : documentComplexity <= 7 ? "advanced"
    : "expert";

  // Compute mismatch risk
  const docScore = { easy: 1, intermediate: 2, advanced: 3, expert: 4 }[docDifficulty];
  const profileScore = { beginner: 1, intermediate: 2, advanced: 3 }[profileLevel];
  const gap = docScore - profileScore;
  const riskLevel = Math.min(1, Math.max(0, gap * 0.35));

  // Density amplifies mismatch for beginners
  const densityAmplifier = density === "high" && profileLevel === "beginner" ? 0.15 : 0;
  const finalRisk = Math.min(1, riskLevel + densityAmplifier);

  let message = "";
  if (finalRisk >= 0.5) {
    message = `Le document est de niveau ${docDifficulty} mais le profil apprenant est ${profileLevel}. Le contenu sera adapté mais certains passages pourraient rester complexes.`;
  } else if (finalRisk >= 0.3) {
    message = `Léger écart entre la difficulté du document et le niveau du profil apprenant.`;
  }

  return {
    detected: finalRisk >= 0.3,
    risk_level: finalRisk,
    document_difficulty: docDifficulty,
    profile_level: profileLevel,
    message,
  };
}

function getProfileLevel(
  stage: EducationStage,
  declared: DeclaredLevel
): "beginner" | "intermediate" | "advanced" {
  if (declared !== "unknown") return declared;

  const stageLevel: Record<EducationStage, "beginner" | "intermediate" | "advanced"> = {
    primary: "beginner",
    middle_school: "beginner",
    high_school: "intermediate",
    undergrad: "intermediate",
    graduate: "advanced",
    professional: "advanced",
    adult_reskilling: "intermediate",
    unknown: "intermediate",
  };

  return stageLevel[stage];
}

// ============================================================
// Tone / vocabulary helpers for M5 content generation
// ============================================================

/**
 * Get vocabulary-adapted definition intro for a concept.
 */
export function getDefinitionIntro(adaptation: AudienceAdaptation): string {
  switch (adaptation.vocabulary_level) {
    case "simple": return "En d'autres termes, c'est";
    case "intermediate": return "Ce concept désigne";
    case "academic": return "Ce concept renvoie à";
    case "technical": return "Formellement,";
  }
}

/**
 * Get tone-adapted transition between segments.
 */
export function getSegmentTransition(adaptation: AudienceAdaptation, segIndex: number): string {
  if (segIndex === 0) return "";
  switch (adaptation.tone) {
    case "warm_guided": return "Très bien ! Maintenant, passons à la suite :";
    case "neutral_clear": return "Après le bloc précédent, nous abordons maintenant :";
    case "formal_precise": return "Section suivante :";
    case "direct_efficient": return "Bloc suivant :";
  }
}

/**
 * Get adapted recall prompt templates based on profile.
 */
export function getRecallPromptStyle(adaptation: AudienceAdaptation): {
  question: (label: string) => string;
  completion: (label: string) => string;
  reformulation: (label: string) => string;
  prediction: (label: string) => string;
} {
  switch (adaptation.test_question_style) {
    case "guided":
      return {
        question: (l) => `Peux-tu expliquer simplement ce qu'est "${l}" ?`,
        completion: (l) => `Complète cette phrase : "${l}", c'est ___`,
        reformulation: (l) => `Redis avec tes propres mots ce que signifie "${l}".`,
        prediction: (l) => `Imagine que "${l}" n'existe pas. Que se passerait-il ?`,
      };
    case "standard":
      return {
        question: (l) => `Qu'est-ce que "${l}" ? Donnez sa définition en une phrase.`,
        completion: (l) => `Complétez : "${l}" se définit comme ___`,
        reformulation: (l) => `Expliquez "${l}" avec vos propres mots.`,
        prediction: (l) => `Que se passerait-il si "${l}" était absent du cours ?`,
      };
    case "challenging":
      return {
        question: (l) => `Définissez précisément "${l}" et situez-le dans le contexte du cours.`,
        completion: (l) => `Complétez et justifiez : "${l}" se caractérise par ___`,
        reformulation: (l) => `Reformulez "${l}" en mettant en évidence ses implications.`,
        prediction: (l) => `Analysez les conséquences de l'absence de "${l}" sur l'ensemble du cours.`,
      };
  }
}

/**
 * Get the contract block phrasing adapted to profile.
 */
export function getContractPhrasing(adaptation: AudienceAdaptation): {
  objective: (count: number, critical: number) => string;
  structure: (segments: number, minutes: number) => string;
  recall: () => string;
} {
  switch (adaptation.tone) {
    case "warm_guided":
      return {
        objective: (count, critical) => `Tu vas apprendre ${count} notion(s), dont ${critical} très importante(s).`,
        structure: (segments, minutes) => `C'est découpé en ${segments} étape(s), ça te prendra environ ${minutes} min.`,
        recall: () => `À la fin, un petit test pour vérifier ce que tu as retenu !`,
      };
    case "neutral_clear":
      return {
        objective: (count, critical) => `Objectif : maîtriser ${count} concept(s) dont ${critical} critique(s).`,
        structure: (segments, minutes) => `Structure : ${segments} bloc(s) pédagogiques, durée estimée ~${minutes} min.`,
        recall: () => `Plan de rappel : test final + rappels J+1 et J+7.`,
      };
    case "formal_precise":
      return {
        objective: (count, critical) => `Objectifs d'apprentissage : ${count} concepts, dont ${critical} de criticité 1.`,
        structure: (segments, minutes) => `Architecture : ${segments} segments cognitifs. Durée estimée : ${minutes} minutes.`,
        recall: () => `Évaluation : test final multi-niveaux + rappels espacés (J+1, J+7).`,
      };
    case "direct_efficient":
      return {
        objective: (count, critical) => `${count} concepts à maîtriser (${critical} critiques).`,
        structure: (segments, minutes) => `${segments} blocs — ~${minutes} min.`,
        recall: () => `Test final + rappels J+1/J+7.`,
      };
  }
}

/**
 * Get hook phrasing adapted to profile.
 */
export function getHookPhrasing(
  adaptation: AudienceAdaptation,
  mainTopic: string,
  criticalLabel?: string,
  objectiveLabel?: string
): string {
  if (criticalLabel) {
    switch (adaptation.tone) {
      case "warm_guided":
        return `Savais-tu que "${criticalLabel}" est la clé de tout ce cours ? Sans cette notion, difficile de comprendre le reste. Voyons ça ensemble !`;
      case "neutral_clear":
        return `Pourquoi est-il important de comprendre "${criticalLabel}" ? Parce que sans cette notion, le reste du cours perd son ancrage.`;
      case "formal_precise":
        return `Le concept de "${criticalLabel}" constitue le pivot de cette formation. Sa compréhension conditionne l'ensemble de l'apprentissage.`;
      case "direct_efficient":
        return `"${criticalLabel}" : concept central. Maîtrisez-le d'abord, le reste en découle.`;
    }
  }

  const verb = objectiveLabel ?? "explorer";
  switch (adaptation.tone) {
    case "warm_guided":
      return `On va ${verb} ensemble : ${mainTopic}. C'est parti !`;
    case "neutral_clear":
      return `Vous allez ${verb} : ${mainTopic}.`;
    case "formal_precise":
      return `Objet d'étude : ${mainTopic}.`;
    case "direct_efficient":
      return `${mainTopic} — ${verb}.`;
  }
}
