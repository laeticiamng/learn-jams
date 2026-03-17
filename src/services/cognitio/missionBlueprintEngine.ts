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
import { detectDocumentNoise, computeNoiseScore, stripDocumentNoise, cleanMainTopic, isEditorialArtifact } from "@/lib/cognitio-semantic-cleaning";

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
  /** P0: Debug info for each concept used/rejected in mission building */
  item_debug?: MissionItemDebug[];
  /** P0: Count of concepts rejected due to document noise */
  noise_rejected_count?: number;
  /** P0: Count of items that failed post-build validation */
  post_validation_issues?: string[];
}

const BRICK_TYPES: BrickType[] = ["OBSERVATION", "TRI", "SEQUENCE", "ELIMINATION", "DECISION"];

// ---------- P0: Mission Item Noise Validation ----------

export interface MissionItemDebug {
  concept_source: string;
  segment_source: string;
  cleanliness_score: number;
  rejected: boolean;
  rejection_reason: string | null;
  fallback_used: boolean;
}

/**
 * Validate that a concept is clean enough to use in a mission item.
 * Returns null if valid, or a rejection reason string if noisy.
 */
function validateConceptForMission(concept: NormalizedConcept): string | null {
  // Check label
  const labelNoise = detectDocumentNoise(concept.normalized_label);
  if (labelNoise.noisy) {
    return `Label contains document noise: ${labelNoise.matches.join(", ")}`;
  }

  // Check compressed definition
  if (concept.compressed_definition) {
    const defNoise = detectDocumentNoise(concept.compressed_definition);
    if (defNoise.noisy) {
      return `Definition contains document noise: ${defNoise.matches.join(", ")}`;
    }
    const defNoiseScore = computeNoiseScore(concept.compressed_definition);
    if (defNoiseScore > 0.3) {
      return `Definition noise score too high: ${defNoiseScore.toFixed(2)}`;
    }
  }

  // Check label is not too short or purely structural
  if (concept.normalized_label.length < 3) {
    return "Label too short";
  }

  return null;
}

/**
 * Filter concepts for mission use — only keep clean, pedagogical concepts.
 * Also attempts to clean borderline concepts before rejecting.
 */
function filterConceptsForMission(concepts: NormalizedConcept[]): {
  clean: NormalizedConcept[];
  rejected: { concept: NormalizedConcept; reason: string }[];
  debug: MissionItemDebug[];
} {
  const clean: NormalizedConcept[] = [];
  const rejected: { concept: NormalizedConcept; reason: string }[] = [];
  const debug: MissionItemDebug[] = [];

  for (const concept of concepts) {
    const reason = validateConceptForMission(concept);

    if (reason) {
      // Try to salvage by stripping noise from definition
      const strippedDef = stripDocumentNoise(concept.compressed_definition || concept.definition);
      const strippedLabel = stripDocumentNoise(concept.normalized_label);
      const retryNoise = detectDocumentNoise(strippedLabel);

      if (!retryNoise.noisy && strippedLabel.length >= 3 && strippedDef.length >= 10) {
        // Salvageable — use cleaned version
        const salvaged: NormalizedConcept = {
          ...concept,
          normalized_label: strippedLabel,
          compressed_definition: strippedDef,
          quality_score: Math.max(0, concept.quality_score - 0.2),
        };
        clean.push(salvaged);
        debug.push({
          concept_source: concept.original_label,
          segment_source: concept.definition.slice(0, 80),
          cleanliness_score: 1 - computeNoiseScore(strippedLabel + " " + strippedDef),
          rejected: false,
          rejection_reason: null,
          fallback_used: true,
        });
        console.debug(`[MISSION][P0] Salvaged concept "${concept.normalized_label}" → "${strippedLabel}"`);
      } else {
        rejected.push({ concept, reason });
        debug.push({
          concept_source: concept.original_label,
          segment_source: concept.definition.slice(0, 80),
          cleanliness_score: 0,
          rejected: true,
          rejection_reason: reason,
          fallback_used: false,
        });
        console.debug(`[MISSION][P0] Rejected concept "${concept.normalized_label}": ${reason}`);
      }
    } else {
      clean.push(concept);
      debug.push({
        concept_source: concept.original_label,
        segment_source: concept.definition.slice(0, 80),
        cleanliness_score: 1 - computeNoiseScore(concept.normalized_label + " " + (concept.compressed_definition || "")),
        rejected: false,
        rejection_reason: null,
        fallback_used: false,
      });
    }
  }

  return { clean, rejected, debug };
}

/**
 * Validate a fully-built mission item to ensure no document noise leaked through.
 */
function validateMissionItem(item: MissionItem): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check prompt
  const promptNoise = detectDocumentNoise(item.prompt);
  if (promptNoise.noisy) {
    issues.push(`Prompt contains noise: ${promptNoise.matches.join(", ")}`);
  }

  // Check each option
  for (const option of item.options ?? []) {
    const optionNoise = detectDocumentNoise(option);
    if (optionNoise.noisy) {
      issues.push(`Option "${option.slice(0, 40)}..." contains noise: ${optionNoise.matches.join(", ")}`);
    }
  }

  const correctAnswerText = Array.isArray(item.correct_answer)
    ? item.correct_answer.join(" ")
    : item.correct_answer;
  const answerNoise = detectDocumentNoise(correctAnswerText);
  if (answerNoise.noisy) {
    issues.push(`Correct answer contains noise: ${answerNoise.matches.join(", ")}`);
  }

  // Check explanation
  if (item.explanation) {
    const explNoise = detectDocumentNoise(item.explanation);
    if (explNoise.noisy) {
      issues.push(`Explanation contains noise: ${explNoise.matches.join(", ")}`);
    }
  }

  return { valid: issues.length === 0, issues };
}

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

  // P0: Filter concepts through noise validation before building mission
  const { clean: cleanConcepts, rejected: rejectedConcepts, debug: itemDebug } = filterConceptsForMission(concepts);

  if (rejectedConcepts.length > 0) {
    console.warn(
      `[MISSION][P0] Rejected ${rejectedConcepts.length}/${concepts.length} concepts due to document noise:`,
      rejectedConcepts.map(r => `"${r.concept.normalized_label}": ${r.reason}`)
    );
  }

  // If too many concepts were rejected, fall back to synthesis
  if (cleanConcepts.length < 3) {
    console.warn(`[MISSION][P0] Only ${cleanConcepts.length} clean concepts remain — falling back to synthesis.`);
    return {
      mission_json: buildSynthesisOnly(main_topic, input.learning_contract, input.visual_anchors),
      quality_band: qualityBand,
      fallback_mode: "synthesis_only",
      room_count: 0,
      includes_boss: false,
      blueprint_reasoning: "Trop de concepts pollués par du bruit documentaire. Synthèse uniquement.",
      item_debug: itemDebug,
      noise_rejected_count: rejectedConcepts.length,
    };
  }

  // Get themed sub-theme
  const subTheme = selectMissionSubTheme(universe.mission_family, main_topic);

  // Build rooms with clean concepts only
  const rooms = buildThemedRooms(cleanConcepts, roomCount, subTheme, universe);

  // Build boss with clean concepts only
  const boss = includesBoss ? buildThemedBoss(cleanConcepts, input.confusion_pairs, subTheme, universe) : undefined;

  // P0: Post-build validation — check every item in every room
  const postValidationIssues: string[] = [];
  for (const room of rooms) {
    for (let i = 0; i < room.items.length; i++) {
      const itemValidation = validateMissionItem(room.items[i]);
      if (!itemValidation.valid) {
        postValidationIssues.push(`Room "${room.title}" item ${i}: ${itemValidation.issues.join("; ")}`);
        // Strip noise from the item in-place as last resort
        room.items[i] = sanitizeMissionItem(room.items[i]);
      }
    }
  }
  if (boss) {
    for (let i = 0; i < boss.items.length; i++) {
      const itemValidation = validateMissionItem(boss.items[i]);
      if (!itemValidation.valid) {
        postValidationIssues.push(`Boss item ${i}: ${itemValidation.issues.join("; ")}`);
        boss.items[i] = sanitizeMissionItem(boss.items[i]);
      }
    }
  }

  if (postValidationIssues.length > 0) {
    console.warn(`[MISSION][P0] Post-build validation found ${postValidationIssues.length} noisy items (sanitized):`, postValidationIssues);
  }

  // Build narrative intro
  const narrativeIntro = buildNarrativeIntro(main_topic, subTheme, qualityBand, universe);

  // P0: Clean main topic to prevent editorial artifacts in mission title
  const cleanedTopic = cleanMainTopic(main_topic);
  const safeTopic = (cleanedTopic.length >= 3 && !isEditorialArtifact(cleanedTopic))
    ? cleanedTopic
    : "Apprentissage";

  const mission_json: MissionContent = {
    title: `Mission: ${safeTopic}`,
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
    item_debug: itemDebug,
    noise_rejected_count: rejectedConcepts.length,
    post_validation_issues: postValidationIssues.length > 0 ? postValidationIssues : undefined,
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

    // P0 FIX: Use rooms.length for sequential indexing to prevent gaps
    const roomNumber = rooms.length;
    rooms.push({
      room_index: roomNumber,
      title: `Salle ${roomNumber + 1} — ${getBrickLabel(brick)}`,
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

// ---------- P0: Item Sanitization ----------

/**
 * Last-resort sanitization: strip document noise from a built mission item.
 */
function sanitizeMissionItem(item: MissionItem): MissionItem {
  return {
    ...item,
    prompt: stripDocumentNoise(item.prompt),
    options: item.options.map(o => stripDocumentNoise(o)).filter(o => o.length >= 2),
    correct_answer: stripDocumentNoise(item.correct_answer),
    explanation: item.explanation ? stripDocumentNoise(item.explanation) : item.explanation,
  };
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
