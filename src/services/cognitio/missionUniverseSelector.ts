// ============================================================
// Mission Universe Selector — Selects the optimal universe
// profile based on domain, topic, reasoning type, audience,
// and pedagogical goal
// ============================================================

import type { ReasoningType, LearningObjective } from "@/domain/cognitio/types";
import type { AudienceLevel, MissionFamily } from "@/domain/cognitio/escapeGame.types";
import { mapTopicToUniverse, type UniverseMappingInput } from "./topicToUniverseMapper";
import {
  DOMAIN_UNIVERSE_PROFILES,
  adjustProfileForAudience,
  type MissionUniverseFullProfile,
} from "./missionUniverseProfiles";

// ---------- Types ----------

export interface UniverseSelectionInput {
  domain: string;
  topic_type: string;
  reasoning_type: ReasoningType | string;
  pedagogical_goal: LearningObjective;
  learner_level: AudienceLevel;
}

export interface UniverseSelectionResult {
  profile: MissionUniverseFullProfile;
  mission_family: MissionFamily;
  universe_key: string;
  domain_detected: string;
  selection_confidence: number;
  selection_reasoning: string;
}

// ---------- Main Selector ----------

/**
 * Select the optimal mission universe based on all available signals.
 * This is the main entry point for universe selection.
 */
export function selectMissionUniverse(input: UniverseSelectionInput): UniverseSelectionResult {
  // Step 1: Map topic to universe
  const mappingInput: UniverseMappingInput = {
    domain: input.domain,
    topic: input.topic_type,
    reasoning_type: input.reasoning_type,
    pedagogical_goal: input.pedagogical_goal,
    learner_level: input.learner_level,
  };

  const mapping = mapTopicToUniverse(mappingInput);

  // Step 2: Get base profile
  const baseProfile = DOMAIN_UNIVERSE_PROFILES[mapping.universe_key]
    ?? DOMAIN_UNIVERSE_PROFILES["general"];

  // Step 3: Adjust for audience level
  const adjustedProfile = adjustProfileForAudience(baseProfile, input.learner_level);

  // Step 4: Further refinement based on pedagogical goal
  const finalProfile = refineForPedagogicalGoal(adjustedProfile, input.pedagogical_goal);

  // Step 5: Build reasoning
  const reasoning = buildSelectionReasoning(input, mapping, finalProfile);

  return {
    profile: finalProfile,
    mission_family: mapping.mission_family,
    universe_key: mapping.universe_key,
    domain_detected: mapping.domain_detected,
    selection_confidence: mapping.confidence,
    selection_reasoning: reasoning,
  };
}

// ---------- Refinement ----------

function refineForPedagogicalGoal(
  profile: MissionUniverseFullProfile,
  goal: LearningObjective
): MissionUniverseFullProfile {
  const refined = { ...profile };

  switch (goal) {
    case "discovery":
      // Lower tension, more generous hints for first-time learning
      refined.tension_level = Math.max(1, refined.tension_level - 1) as 1 | 2 | 3 | 4 | 5;
      refined.hint_style = refined.hint_style === "sparse" ? "moderate" : refined.hint_style;
      break;

    case "exam":
      // Higher tension, sparser hints for exam prep
      refined.tension_level = Math.min(5, refined.tension_level + 1) as 1 | 2 | 3 | 4 | 5;
      refined.hint_style = "sparse";
      refined.reward_style = "achievement_based";
      break;

    case "revision":
      // Moderate settings
      break;

    case "consolidation":
      // Focus on depth, informative rewards
      refined.reward_style = "informative";
      refined.abstraction_level = Math.min(5, refined.abstraction_level + 1) as 1 | 2 | 3 | 4 | 5;
      break;
  }

  return refined;
}

function buildSelectionReasoning(
  input: UniverseSelectionInput,
  mapping: ReturnType<typeof mapTopicToUniverse>,
  profile: MissionUniverseFullProfile
): string {
  const parts: string[] = [];

  parts.push(`Domaine détecté: ${mapping.domain_detected}`);
  parts.push(`Univers: ${mapping.universe_key} (confiance: ${Math.round(mapping.confidence * 100)}%)`);

  if (mapping.matched_keywords.length > 0) {
    parts.push(`Mots-clés correspondants: ${mapping.matched_keywords.slice(0, 5).join(", ")}`);
  }

  parts.push(`Famille de mission: ${mapping.mission_family}`);
  parts.push(`Type de défi: ${profile.challenge_type}`);
  parts.push(`Ton: ${profile.tone}, Ambiance: ${profile.ambiance}`);
  parts.push(`Niveau tension: ${profile.tension_level}/5, Abstraction: ${profile.abstraction_level}/5`);

  if (input.pedagogical_goal === "exam") {
    parts.push("Ajusté pour préparation d'examen: tension augmentée, indices réduits");
  }
  if (input.pedagogical_goal === "discovery") {
    parts.push("Ajusté pour découverte: tension réduite, indices plus généreux");
  }

  return parts.join(" | ");
}
