// ============================================================
// Escape Game / Mission — Premium Types
// ============================================================

import type { BloomLevel, BrickType, LearningObjective } from "./types";

// ---------- Extended Brick Types (beyond base 5) ----------

export const ESCAPE_BRICK_TYPES = [
  "TRI",
  "SEQUENCE",
  "ELIMINATION",
  "OBSERVATION",
  "DECISION",
  "CODE_RECONSTRUCT",
  "ASSOCIATION",
  "TRAP_DISTINCTION",
  "PUZZLE_STEPS",
  "ERROR_IDENTIFICATION",
  "COMPLETION",
  "DECISION_TREE",
  "LOCK_LOGIC",
  "ORDERING",
] as const;

export type EscapeBrickType = (typeof ESCAPE_BRICK_TYPES)[number];

// ---------- Mission Family Types ----------

export const MISSION_FAMILIES = [
  "exploration",
  "investigation",
  "crisis",
  "logic_sequencing",
  "clinical_simulation",
  "legal_reasoning",
  "scientific_discovery",
  "progressive_method",
] as const;

export type MissionFamily = (typeof MISSION_FAMILIES)[number];

// ---------- Age / Level Profiles ----------

export const AUDIENCE_LEVELS = [
  "college",
  "lycee",
  "prepa",
  "university",
  "medical",
  "law",
  "adult_pro",
] as const;

export type AudienceLevel = (typeof AUDIENCE_LEVELS)[number];

// ---------- Mission Universe Profile ----------

export interface MissionUniverseProfile {
  audience_level: AudienceLevel;
  tone: "playful" | "engaging" | "analytical" | "rigorous" | "direct";
  ambiance: "adventure" | "mystery" | "sci_fi" | "historical" | "professional" | "clinical" | "courtroom";
  narrative_style: "immersive" | "guided" | "minimal";
  tension_level: 1 | 2 | 3 | 4 | 5;
  abstraction_level: 1 | 2 | 3 | 4 | 5;
  hint_style: "generous" | "moderate" | "sparse";
  reward_style: "encouraging" | "informative" | "achievement_based";
  interface_style: "colorful" | "clean" | "minimal";
}

// ---------- Mission Structure (full escape game) ----------

export interface EscapeGameMission {
  // 1. Brief / Intro
  brief: MissionBrief;
  // 2. Universe
  universe: MissionUniverse;
  // 3. Progression
  stages: MissionStage[];
  // 4. Boss / Final Challenge
  final_challenge: FinalChallenge | null;
  // 5. Debrief
  debrief_template: DebriefTemplate;
  // Metadata
  mission_family: MissionFamily;
  universe_profile: MissionUniverseProfile;
  estimated_duration_sec: number;
  target_bloom_levels: BloomLevel[];
  mechanic_variety_count: number;
}

export interface MissionBrief {
  context: string;
  objective: string;
  rules: string[];
  learning_preview: string[];
}

export interface MissionUniverse {
  name: string;
  setting: string;
  ambiance_description: string;
  narrative_hook: string;
  coherence_with_course: string;
}

export interface MissionStage {
  stage_index: number;
  title: string;
  narrative_context: string;
  puzzles: EscapePuzzle[];
  hints: ProgressiveHint[];
  target_concepts: string[];
  difficulty_ramp: number; // 1-5, should increase
  time_limit_sec?: number;
}

export interface EscapePuzzle {
  id: string;
  mechanic: EscapeBrickType;
  prompt: string;
  instructions: string;
  options?: string[];
  correct_answer: string | string[];
  explanation: string;
  concept_key: string;
  bloom_level: BloomLevel;
  difficulty: number;
  trap_label?: string;
  serves_memorization: boolean;
}

export interface ProgressiveHint {
  level: 1 | 2 | 3;
  text: string;
  reveals_answer: boolean;
}

export interface FinalChallenge {
  title: string;
  narrative_context: string;
  mechanic_types: EscapeBrickType[]; // minimum 3 different
  puzzles: EscapePuzzle[];
  hints: ProgressiveHint[];
  target_concepts: string[];
  is_timed: boolean;
  time_limit_sec?: number;
}

export interface DebriefTemplate {
  key_takeaways: string[];
  global_logic: string;
  common_mistakes: string[];
  active_recall_prompts: string[];
  transfer_suggestions: string[];
}

// ---------- Retention Design Report ----------

export interface RetentionDesignReport {
  mission_id: string;
  concepts_covered: string[];
  traps_covered: string[];
  active_recalls_present: number;
  difficulty_level: number;
  mission_course_coherence: number; // 0-1
  mission_profile_coherence: number; // 0-1
  bloom_distribution: Partial<Record<BloomLevel, number>>;
  mechanic_distribution: Partial<Record<EscapeBrickType, number>>;
}

// ---------- Mission QA Checklist ----------

export interface MissionQACheck {
  check_id: string;
  check_name: string;
  passed: boolean;
  severity: "blocking" | "warning" | "info";
  details: string;
}

export interface MissionQAResult {
  mission_id: string;
  overall_score: number; // 0-100
  checks: MissionQACheck[];
  publish_blocked: boolean;
  blocking_violations: string[];
  warnings: string[];
}

// ---------- Universe Selection Logic ----------

export function selectUniverseProfile(level: AudienceLevel): MissionUniverseProfile {
  switch (level) {
    case "college":
      return {
        audience_level: "college",
        tone: "playful",
        ambiance: "adventure",
        narrative_style: "immersive",
        tension_level: 2,
        abstraction_level: 2,
        hint_style: "generous",
        reward_style: "encouraging",
        interface_style: "colorful",
      };
    case "lycee":
      return {
        audience_level: "lycee",
        tone: "engaging",
        ambiance: "mystery",
        narrative_style: "immersive",
        tension_level: 3,
        abstraction_level: 3,
        hint_style: "moderate",
        reward_style: "achievement_based",
        interface_style: "clean",
      };
    case "prepa":
      return {
        audience_level: "prepa",
        tone: "rigorous",
        ambiance: "sci_fi",
        narrative_style: "guided",
        tension_level: 4,
        abstraction_level: 4,
        hint_style: "sparse",
        reward_style: "informative",
        interface_style: "clean",
      };
    case "university":
      return {
        audience_level: "university",
        tone: "analytical",
        ambiance: "historical",
        narrative_style: "guided",
        tension_level: 3,
        abstraction_level: 4,
        hint_style: "moderate",
        reward_style: "informative",
        interface_style: "clean",
      };
    case "medical":
      return {
        audience_level: "medical",
        tone: "rigorous",
        ambiance: "clinical",
        narrative_style: "guided",
        tension_level: 4,
        abstraction_level: 5,
        hint_style: "sparse",
        reward_style: "informative",
        interface_style: "minimal",
      };
    case "law":
      return {
        audience_level: "law",
        tone: "analytical",
        ambiance: "courtroom",
        narrative_style: "guided",
        tension_level: 4,
        abstraction_level: 5,
        hint_style: "moderate",
        reward_style: "informative",
        interface_style: "clean",
      };
    case "adult_pro":
      return {
        audience_level: "adult_pro",
        tone: "direct",
        ambiance: "professional",
        narrative_style: "minimal",
        tension_level: 3,
        abstraction_level: 4,
        hint_style: "moderate",
        reward_style: "achievement_based",
        interface_style: "minimal",
      };
  }
}

// ---------- Mission Family Selection ----------

export function selectMissionFamily(
  courseType: string,
  level: AudienceLevel,
): MissionFamily {
  const normalized = courseType.toLowerCase();

  if (level === "medical" || normalized.includes("médec") || normalized.includes("santé") || normalized.includes("clinic")) {
    return "clinical_simulation";
  }
  if (level === "law" || normalized.includes("droit") || normalized.includes("jurid")) {
    return "legal_reasoning";
  }
  if (normalized.includes("math") || normalized.includes("logiq") || normalized.includes("algo")) {
    return "logic_sequencing";
  }
  if (normalized.includes("scien") || normalized.includes("phys") || normalized.includes("chim") || normalized.includes("bio")) {
    return "scientific_discovery";
  }
  if (normalized.includes("histoi") || normalized.includes("géo") || normalized.includes("socio")) {
    return "investigation";
  }
  if (normalized.includes("méthod") || normalized.includes("apprenti")) {
    return "progressive_method";
  }
  if (level === "college") {
    return "exploration";
  }

  return "exploration";
}
