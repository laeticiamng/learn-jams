// ============================================================
// Mission Universe Profiles — Comprehensive universe definitions
// that adapt mission tone, ambiance, and challenge types
// to the actual course subject matter
// ============================================================

import type { MissionFamily, AudienceLevel, MissionUniverseProfile } from "@/domain/cognitio/escapeGame.types";

// ---------- Universe Profile Type (Extended) ----------

export interface MissionUniverseFullProfile {
  universe_key: string;
  domain: string;
  tone: MissionUniverseProfile["tone"];
  ambiance: MissionUniverseProfile["ambiance"];
  narrative_style: MissionUniverseProfile["narrative_style"];
  challenge_type: ChallengeType;
  tension_level: 1 | 2 | 3 | 4 | 5;
  abstraction_level: 1 | 2 | 3 | 4 | 5;
  hint_style: MissionUniverseProfile["hint_style"];
  reward_style: MissionUniverseProfile["reward_style"];
  ui_flavor: UIFlavor;
  color_scheme: ColorScheme;
  icon_theme: string;
  vocabulary_register: VocabularyRegister;
}

export type ChallengeType =
  | "decision_prioritization"   // Medical: triage, treatment decisions
  | "investigation_audit"       // Public health: risk control, auditing
  | "argumentation_arbitrage"   // Law: dossier, reasoning, debate
  | "diagnostic_debugging"      // CS: system diagnosis, architecture
  | "chronological_causality"   // History: timeline, sources, causality
  | "mechanism_chain"           // Biology: exploration, causal chains
  | "proof_construction"        // Math: proofs, logical reasoning
  | "experiment_method"         // Sciences: hypothesis, protocol
  | "creative_construction"     // Arts/Literature: creation, analysis
  | "progressive_mastery";      // General: step-by-step learning

export type UIFlavor = "clinical" | "courtroom" | "laboratory" | "terminal" | "archive" | "exploration" | "workshop" | "academy" | "standard";

export type ColorScheme = {
  primary: string;
  accent: string;
  bg_tone: "warm" | "cool" | "neutral" | "dark";
};

export type VocabularyRegister = "formal" | "academic" | "conversational" | "playful" | "professional";

// ---------- Domain-Specific Universe Profiles ----------

export const DOMAIN_UNIVERSE_PROFILES: Record<string, MissionUniverseFullProfile> = {
  // ===== MEDICAL =====
  medicine_clinical_acute: {
    universe_key: "medicine_clinical_acute",
    domain: "médecine",
    tone: "rigorous",
    ambiance: "clinical",
    narrative_style: "guided",
    challenge_type: "decision_prioritization",
    tension_level: 4,
    abstraction_level: 5,
    hint_style: "sparse",
    reward_style: "informative",
    ui_flavor: "clinical",
    color_scheme: { primary: "#3B82F6", accent: "#EF4444", bg_tone: "cool" },
    icon_theme: "medical",
    vocabulary_register: "academic",
  },
  medicine_prevention: {
    universe_key: "medicine_prevention",
    domain: "médecine",
    tone: "analytical",
    ambiance: "professional",
    narrative_style: "guided",
    challenge_type: "investigation_audit",
    tension_level: 3,
    abstraction_level: 4,
    hint_style: "moderate",
    reward_style: "informative",
    ui_flavor: "clinical",
    color_scheme: { primary: "#10B981", accent: "#F59E0B", bg_tone: "cool" },
    icon_theme: "shield",
    vocabulary_register: "academic",
  },

  // ===== PHARMACIE =====
  pharmacy: {
    universe_key: "pharmacy",
    domain: "pharmacie",
    tone: "rigorous",
    ambiance: "clinical",
    narrative_style: "guided",
    challenge_type: "mechanism_chain",
    tension_level: 3,
    abstraction_level: 5,
    hint_style: "moderate",
    reward_style: "informative",
    ui_flavor: "laboratory",
    color_scheme: { primary: "#8B5CF6", accent: "#06B6D4", bg_tone: "cool" },
    icon_theme: "flask",
    vocabulary_register: "academic",
  },

  // ===== DROIT =====
  law_general: {
    universe_key: "law_general",
    domain: "droit",
    tone: "analytical",
    ambiance: "courtroom",
    narrative_style: "guided",
    challenge_type: "argumentation_arbitrage",
    tension_level: 4,
    abstraction_level: 5,
    hint_style: "moderate",
    reward_style: "informative",
    ui_flavor: "courtroom",
    color_scheme: { primary: "#6366F1", accent: "#D97706", bg_tone: "warm" },
    icon_theme: "scale",
    vocabulary_register: "formal",
  },

  // ===== INFORMATIQUE =====
  computer_science: {
    universe_key: "computer_science",
    domain: "informatique",
    tone: "direct",
    ambiance: "sci_fi",
    narrative_style: "minimal",
    challenge_type: "diagnostic_debugging",
    tension_level: 3,
    abstraction_level: 4,
    hint_style: "moderate",
    reward_style: "achievement_based",
    ui_flavor: "terminal",
    color_scheme: { primary: "#22C55E", accent: "#F97316", bg_tone: "dark" },
    icon_theme: "code",
    vocabulary_register: "professional",
  },

  // ===== HISTOIRE =====
  history: {
    universe_key: "history",
    domain: "histoire",
    tone: "engaging",
    ambiance: "historical",
    narrative_style: "immersive",
    challenge_type: "chronological_causality",
    tension_level: 3,
    abstraction_level: 3,
    hint_style: "moderate",
    reward_style: "informative",
    ui_flavor: "archive",
    color_scheme: { primary: "#D97706", accent: "#92400E", bg_tone: "warm" },
    icon_theme: "scroll",
    vocabulary_register: "academic",
  },

  // ===== BIOLOGIE =====
  biology: {
    universe_key: "biology",
    domain: "biologie",
    tone: "engaging",
    ambiance: "mystery",
    narrative_style: "guided",
    challenge_type: "mechanism_chain",
    tension_level: 3,
    abstraction_level: 4,
    hint_style: "moderate",
    reward_style: "informative",
    ui_flavor: "laboratory",
    color_scheme: { primary: "#10B981", accent: "#3B82F6", bg_tone: "cool" },
    icon_theme: "dna",
    vocabulary_register: "academic",
  },

  // ===== PHYSIQUE / CHIMIE =====
  physics_chemistry: {
    universe_key: "physics_chemistry",
    domain: "sciences physiques",
    tone: "analytical",
    ambiance: "sci_fi",
    narrative_style: "guided",
    challenge_type: "experiment_method",
    tension_level: 3,
    abstraction_level: 5,
    hint_style: "moderate",
    reward_style: "informative",
    ui_flavor: "laboratory",
    color_scheme: { primary: "#6366F1", accent: "#EC4899", bg_tone: "cool" },
    icon_theme: "atom",
    vocabulary_register: "academic",
  },

  // ===== MATHÉMATIQUES =====
  mathematics: {
    universe_key: "mathematics",
    domain: "mathématiques",
    tone: "rigorous",
    ambiance: "mystery",
    narrative_style: "guided",
    challenge_type: "proof_construction",
    tension_level: 4,
    abstraction_level: 5,
    hint_style: "sparse",
    reward_style: "achievement_based",
    ui_flavor: "standard",
    color_scheme: { primary: "#8B5CF6", accent: "#06B6D4", bg_tone: "neutral" },
    icon_theme: "calculator",
    vocabulary_register: "formal",
  },

  // ===== ÉCONOMIE / GESTION =====
  economics: {
    universe_key: "economics",
    domain: "économie",
    tone: "analytical",
    ambiance: "professional",
    narrative_style: "guided",
    challenge_type: "decision_prioritization",
    tension_level: 3,
    abstraction_level: 4,
    hint_style: "moderate",
    reward_style: "informative",
    ui_flavor: "standard",
    color_scheme: { primary: "#059669", accent: "#6366F1", bg_tone: "neutral" },
    icon_theme: "chart",
    vocabulary_register: "professional",
  },

  // ===== LITTÉRATURE / PHILOSOPHIE =====
  literature_philosophy: {
    universe_key: "literature_philosophy",
    domain: "lettres",
    tone: "engaging",
    ambiance: "historical",
    narrative_style: "immersive",
    challenge_type: "creative_construction",
    tension_level: 2,
    abstraction_level: 4,
    hint_style: "generous",
    reward_style: "informative",
    ui_flavor: "archive",
    color_scheme: { primary: "#D97706", accent: "#7C3AED", bg_tone: "warm" },
    icon_theme: "book",
    vocabulary_register: "academic",
  },

  // ===== GÉNÉRAL / FALLBACK =====
  general: {
    universe_key: "general",
    domain: "général",
    tone: "engaging",
    ambiance: "adventure",
    narrative_style: "guided",
    challenge_type: "progressive_mastery",
    tension_level: 3,
    abstraction_level: 3,
    hint_style: "moderate",
    reward_style: "achievement_based",
    ui_flavor: "standard",
    color_scheme: { primary: "#3B82F6", accent: "#F59E0B", bg_tone: "neutral" },
    icon_theme: "star",
    vocabulary_register: "conversational",
  },
};

// ---------- Audience-Level Adjustments ----------

/**
 * Adjust a universe profile based on the learner's audience level.
 */
export function adjustProfileForAudience(
  profile: MissionUniverseFullProfile,
  level: AudienceLevel
): MissionUniverseFullProfile {
  const adjusted = { ...profile };

  switch (level) {
    case "college":
      adjusted.tone = "playful";
      adjusted.narrative_style = "immersive";
      adjusted.tension_level = Math.min(2, adjusted.tension_level) as 1 | 2 | 3 | 4 | 5;
      adjusted.abstraction_level = Math.min(2, adjusted.abstraction_level) as 1 | 2 | 3 | 4 | 5;
      adjusted.hint_style = "generous";
      adjusted.reward_style = "encouraging";
      adjusted.vocabulary_register = "playful";
      break;
    case "lycee":
      adjusted.tone = "engaging";
      adjusted.tension_level = Math.min(3, adjusted.tension_level) as 1 | 2 | 3 | 4 | 5;
      adjusted.abstraction_level = Math.min(3, adjusted.abstraction_level) as 1 | 2 | 3 | 4 | 5;
      adjusted.hint_style = "moderate";
      adjusted.vocabulary_register = "conversational";
      break;
    case "prepa":
      adjusted.tone = "rigorous";
      adjusted.hint_style = "sparse";
      adjusted.reward_style = "achievement_based";
      break;
    case "adult_pro":
      adjusted.tone = "direct";
      adjusted.narrative_style = "minimal";
      adjusted.vocabulary_register = "professional";
      break;
    // university, medical, law — keep domain defaults
  }

  return adjusted;
}
