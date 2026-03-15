// ============================================================
// Mission Blueprint Engine — Builds complete mission blueprints
// using the universe selector and semantic extraction output
// ============================================================

import type {
  MissionContent,
  MissionRoom,
  MissionBossRoom,
  MissionItem,
  BrickType,
  QualityBand,
  LearningContract,
  VisualAnchor,
} from "@/domain/cognitio/types";
import type { MissionFamily } from "@/domain/cognitio/escapeGame.types";
import { selectMissionSubTheme } from "@/domain/cognitio/escapeGame.types";
import {
  getQualityBand,
  getFallbackMode,
  getRoomCount,
  shouldIncludeBoss,
} from "@/domain/cognitio/validators";
import type { UniverseSelectionResult } from "./missionUniverseSelector";
import type { NormalizedConcept } from "./conceptNormalizer";

// ---------- Types ----------

export interface BlueprintInput {
  universe: UniverseSelectionResult;
  concepts: NormalizedConcept[];
  confusion_pairs: { concept_a: string; concept_b: string; distinction: string }[];
  quality_score: number;
  main_topic: string;
  learning_contract: LearningContract;
  visual_anchors: VisualAnchor[];
}

export interface BlueprintOutput {
  mission_json: MissionContent;
  quality_band: QualityBand;
  fallback_mode: string;
  room_count: number;
  includes_boss: boolean;
  blueprint_reasoning: string;
}

const BRICK_TYPES: BrickType[] = ["OBSERVATION", "TRI", "SEQUENCE", "ELIMINATION", "DECISION"];

// ---------- Main Builder ----------

/**
 * Build a complete mission blueprint from semantic extraction results
 * and universe selection.
 */
export function buildMissionBlueprint(input: BlueprintInput): BlueprintOutput {
  const qualityBand = getQualityBand(input.quality_score);
  const fallbackMode = getFallbackMode(qualityBand);
  const roomCount = getRoomCount(qualityBand);
  const includesBoss = shouldIncludeBoss(qualityBand);
  const { universe, concepts, main_topic } = input;

  if (fallbackMode === "synthesis_only" || concepts.length === 0) {
    return {
      mission_json: buildSynthesisOnly(main_topic, input.learning_contract, input.visual_anchors),
      quality_band: qualityBand,
      fallback_mode: fallbackMode,
      room_count: 0,
      includes_boss: false,
      blueprint_reasoning: "Qualité insuffisante pour une mission interactive. Synthèse uniquement.",
    };
  }

  // Get themed sub-theme
  const subTheme = selectMissionSubTheme(universe.mission_family, main_topic);

  // Build rooms
  const rooms = buildThemedRooms(concepts, roomCount, subTheme, universe);

  // Build boss
  const boss = includesBoss ? buildThemedBoss(concepts, input.confusion_pairs, subTheme, universe) : undefined;

  // Build narrative intro
  const narrativeIntro = buildNarrativeIntro(main_topic, subTheme, qualityBand, universe);

  const mission_json: MissionContent = {
    title: `Mission: ${main_topic}`,
    narrative_intro: narrativeIntro,
    rooms,
    boss,
    learning_contract: input.learning_contract,
    visual_anchors: input.visual_anchors,
  };

  return {
    mission_json,
    quality_band: qualityBand,
    fallback_mode: fallbackMode,
    room_count: rooms.length,
    includes_boss: !!boss,
    blueprint_reasoning: universe.selection_reasoning,
  };
}

// ---------- Room Building ----------

function buildThemedRooms(
  concepts: NormalizedConcept[],
  roomCount: number,
  subTheme: ReturnType<typeof selectMissionSubTheme>,
  universe: UniverseSelectionResult
): MissionRoom[] {
  const rooms: MissionRoom[] = [];
  const brickSequence = selectBrickSequence(roomCount, universe.profile.challenge_type);

  for (let i = 0; i < roomCount; i++) {
    const brick = brickSequence[i];
    const roomConcepts = concepts.slice(
      Math.floor((i * concepts.length) / roomCount),
      Math.floor(((i + 1) * concepts.length) / roomCount)
    );

    if (roomConcepts.length === 0) continue;

    const items = buildRoomItems(brick, roomConcepts, concepts);

    rooms.push({
      room_index: i,
      title: `Salle ${i + 1} — ${getBrickLabel(brick)}`,
      narrative_context: subTheme.roomNarratives[brick],
      brick_type: brick,
      items,
      hints: buildRoomHints(roomConcepts),
      target_concepts: roomConcepts.map((c) => c.normalized_label),
      time_limit_sec: computeTimeLimit(brick, items.length, universe.profile.tension_level),
    });
  }

  return rooms;
}

function buildThemedBoss(
  concepts: NormalizedConcept[],
  confusionPairs: BlueprintInput["confusion_pairs"],
  subTheme: ReturnType<typeof selectMissionSubTheme>,
  universe: UniverseSelectionResult
): MissionBossRoom {
  // Use principal and trap concepts for boss
  const bossConcepts = concepts
    .filter((c) => c.concept_type === "principal" || c.concept_type === "trap" || c.concept_type === "secondary")
    .slice(0, 6);

  const brickTypes: BrickType[] = ["TRI", "DECISION", "ELIMINATION"];
  const items = bossConcepts.map((concept, i) => {
    const brick = brickTypes[i % brickTypes.length];
    return buildSingleItem(brick, concept, concepts);
  });

  return {
    title: "Boss Final — Épreuve de synthèse",
    narrative_context: subTheme.bossIntro,
    brick_types: brickTypes,
    items,
    hints: [
      "Revenez aux fondamentaux. Quels sont les concepts clés ?",
      "Cherchez les distinctions essentielles entre les notions.",
    ],
    target_concepts: bossConcepts.map((c) => c.normalized_label),
    time_limit_sec: 180,
  };
}

// ---------- Item Building ----------

function buildRoomItems(
  brick: BrickType,
  roomConcepts: NormalizedConcept[],
  allConcepts: NormalizedConcept[]
): MissionItem[] {
  return roomConcepts.slice(0, 4).map((concept) =>
    buildSingleItem(brick, concept, allConcepts)
  );
}

function buildSingleItem(
  brick: BrickType,
  concept: NormalizedConcept,
  allConcepts: NormalizedConcept[]
): MissionItem {
  const distractors = allConcepts
    .filter((c) => c.normalized_label !== concept.normalized_label)
    .slice(0, 3)
    .map((c) => c.normalized_label);

  const options = shuffleArray([concept.normalized_label, ...distractors]);

  return {
    id: crypto.randomUUID(),
    type: brick,
    prompt: buildPrompt(brick, concept),
    options,
    correct_answer: concept.normalized_label,
    explanation: concept.compressed_definition || concept.definition,
    concept_key: concept.normalized_label,
    bloom_level: "understand",
    difficulty: concept.concept_type === "principal" ? 4 : concept.concept_type === "trap" ? 5 : 3,
  };
}

function buildPrompt(brick: BrickType, concept: NormalizedConcept): string {
  const label = concept.normalized_label;
  const defPreview = concept.compressed_definition.slice(0, 60);

  switch (brick) {
    case "OBSERVATION":
      return `Observez et identifiez : ${defPreview}…`;
    case "TRI":
      return `Classez "${label}" dans la bonne catégorie`;
    case "SEQUENCE":
      return `Placez "${label}" dans la séquence correcte`;
    case "ELIMINATION":
      return `Parmi ces éléments, lequel est l'intrus ?`;
    case "DECISION":
      return `Face à cette situation, quelle est la bonne approche concernant "${label}" ?`;
  }
}

// ---------- Brick Sequence ----------

function selectBrickSequence(count: number, challengeType: string): BrickType[] {
  const sequence: BrickType[] = [];

  // Start with OBSERVATION, end with DECISION
  if (count >= 2) {
    sequence.push("OBSERVATION");
    const middle = BRICK_TYPES.filter((b) => b !== "OBSERVATION" && b !== "DECISION");
    for (let i = 0; i < count - 2 && i < middle.length; i++) {
      sequence.push(middle[i % middle.length]);
    }
    sequence.push("DECISION");
  } else {
    sequence.push("OBSERVATION");
  }

  return sequence.slice(0, count);
}

// ---------- Hints ----------

function buildRoomHints(concepts: NormalizedConcept[]): string[] {
  const hints: string[] = [];
  if (concepts.length > 0) {
    hints.push(`Pensez à la définition de "${concepts[0].normalized_label}".`);
  }
  if (concepts.length > 1) {
    hints.push(`Comparez "${concepts[0].normalized_label}" avec "${concepts[1].normalized_label}" — qu'est-ce qui les distingue ?`);
  }
  if (concepts.length > 0 && concepts[0].compressed_definition) {
    hints.push(concepts[0].compressed_definition.slice(0, 120) + (concepts[0].compressed_definition.length > 120 ? "…" : ""));
  }
  return hints;
}

// ---------- Narrative ----------

function buildNarrativeIntro(
  topic: string,
  subTheme: ReturnType<typeof selectMissionSubTheme>,
  qualityBand: QualityBand,
  universe: UniverseSelectionResult
): string {
  let intro = subTheme.intro(topic);

  if (qualityBand === "medium") {
    intro += " Note : la qualité du contenu source est moyenne — certaines salles ont été simplifiées.";
  }
  if (qualityBand === "poor") {
    intro += " Attention : le contenu source est limité — mission réduite.";
  }

  return intro;
}

// ---------- Helpers ----------

function getBrickLabel(brick: BrickType): string {
  const labels: Record<BrickType, string> = {
    TRI: "Triage",
    SEQUENCE: "Séquençage",
    ELIMINATION: "Élimination",
    OBSERVATION: "Observation",
    DECISION: "Décision",
  };
  return labels[brick];
}

function computeTimeLimit(brick: BrickType, itemCount: number, tensionLevel: number): number {
  const baseSec = 120;
  const perItem = 30;
  const tensionFactor = 1 - (tensionLevel - 1) * 0.1; // Higher tension = less time
  return Math.round((baseSec + itemCount * perItem) * tensionFactor);
}

function buildSynthesisOnly(topic: string, contract: LearningContract, anchors: VisualAnchor[]): MissionContent {
  return {
    title: `Synthèse: ${topic}`,
    narrative_intro: "La qualité du contenu source ne permet pas de générer une mission interactive complète. Voici une synthèse des concepts identifiés.",
    rooms: [],
    learning_contract: contract,
    visual_anchors: anchors,
  };
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
