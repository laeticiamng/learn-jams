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
  InventoryItem,
  HiddenClue,
  InteractionMode,
  MatchPair,
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

// Extended brick types used in full/excellent quality missions
const EXTENDED_BRICK_TYPES: BrickType[] = [
  "CODE_RECONSTRUCT", "ASSOCIATION", "TRAP_DISTINCTION", "PUZZLE_STEPS",
  "ERROR_IDENTIFICATION", "COMPLETION", "DECISION_TREE", "LOCK_LOGIC", "ORDERING",
];

// All available brick types
const ALL_BRICK_TYPES: BrickType[] = [...BRICK_TYPES, ...EXTENDED_BRICK_TYPES];

// Map brick type to interaction mode
function getInteractionMode(brick: BrickType): InteractionMode {
  switch (brick) {
    case "SEQUENCE":
    case "ORDERING":
    case "CODE_RECONSTRUCT":
    case "PUZZLE_STEPS":
      return "drag_order";
    case "ASSOCIATION":
      return "drag_match";
    case "COMPLETION":
      return "fill_blanks";
    case "LOCK_LOGIC":
      return "lock_code";
    case "ERROR_IDENTIFICATION":
      return "click_error";
    case "DECISION_TREE":
      return "tree_navigate";
    case "TRAP_DISTINCTION":
    case "TRI":
    case "ELIMINATION":
      return "select";
    case "OBSERVATION":
    case "DECISION":
    default:
      return "select";
  }
}

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
  for (const option of item.options) {
    const optionNoise = detectDocumentNoise(option);
    if (optionNoise.noisy) {
      issues.push(`Option "${option.slice(0, 40)}..." contains noise: ${optionNoise.matches.join(", ")}`);
    }
  }

  // Check correct answer
  const answerNoise = detectDocumentNoise(item.correct_answer);
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

  // Build inventory items and puzzle chains
  const inventoryItems = buildInventoryItems(rooms, boss);
  applyPuzzleChains(rooms, inventoryItems);
  applyHiddenClues(rooms, cleanConcepts);

  // Upgrade boss to meta-puzzle if quality allows
  if (boss && (qualityBand === "excellent" || qualityBand === "good")) {
    boss.is_meta_puzzle = true;
    boss.requires_all_fragments = true;
    boss.synthesis_prompt = `Vous avez traversé toutes les salles et collecté les connaissances nécessaires sur "${safeTopic}". Il est temps de tout assembler pour résoudre l'épreuve finale.`;
    boss.required_items = inventoryItems
      .filter(item => item.obtained_from_puzzle !== "boss")
      .map(item => item.id);
  }

  const mission_json: MissionContent = {
    title: `Mission: ${safeTopic}`,
    narrative_intro: narrativeIntro,
    rooms,
    boss,
    learning_contract: input.learning_contract,
    visual_anchors: input.visual_anchors,
    inventory_items: inventoryItems,
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

  const interactionMode = getInteractionMode(brick);
  const baseItem: MissionItem = {
    id: crypto.randomUUID(),
    type: brick,
    prompt: buildPrompt(brick, concept),
    options: shuffleArray([concept.normalized_label, ...distractors]),
    correct_answer: concept.normalized_label,
    explanation: concept.compressed_definition || concept.definition,
    concept_key: concept.normalized_label,
    bloom_level: getBloomForBrick(brick),
    difficulty: concept.concept_type === "principal" ? 4 : concept.concept_type === "trap" ? 5 : 3,
    interaction_mode: interactionMode,
  };

  // Enrich item based on brick type
  return enrichItemForBrick(baseItem, brick, concept, allConcepts);
}

/**
 * Map brick type to appropriate Bloom level.
 */
function getBloomForBrick(brick: BrickType): import("@/domain/cognitio/types").BloomLevel {
  switch (brick) {
    case "OBSERVATION": return "remember";
    case "TRI":
    case "ASSOCIATION": return "understand";
    case "SEQUENCE":
    case "ORDERING":
    case "COMPLETION": return "apply";
    case "ELIMINATION":
    case "ERROR_IDENTIFICATION":
    case "TRAP_DISTINCTION": return "analyze";
    case "DECISION":
    case "DECISION_TREE": return "evaluate";
    case "CODE_RECONSTRUCT":
    case "PUZZLE_STEPS":
    case "LOCK_LOGIC": return "create";
    default: return "understand";
  }
}

/**
 * Enrich a mission item with type-specific fields.
 */
function enrichItemForBrick(
  item: MissionItem,
  brick: BrickType,
  concept: NormalizedConcept,
  allConcepts: NormalizedConcept[]
): MissionItem {
  const def = concept.compressed_definition || concept.definition;

  switch (brick) {
    case "CODE_RECONSTRUCT": {
      // Split definition into fragments to reassemble
      const sentences = def.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
      if (sentences.length >= 3) {
        item.fragments = shuffleArray(sentences);
        item.correct_answer = sentences;
        item.prompt = `Reconstituez le texte suivant dans le bon ordre concernant "${concept.normalized_label}" :`;
        item.options = undefined; // fragments replace options
      }
      return item;
    }

    case "ASSOCIATION": {
      // Build match pairs: concept → definition
      const others = allConcepts
        .filter(c => c.normalized_label !== concept.normalized_label)
        .slice(0, 3);
      const pairs: MatchPair[] = [
        { left: concept.normalized_label, right: def.slice(0, 60) + "…" },
        ...others.map(c => ({
          left: c.normalized_label,
          right: (c.compressed_definition || c.definition).slice(0, 60) + "…",
        })),
      ];
      item.pairs = shuffleArray(pairs);
      item.correct_answer = pairs.map(p => `${p.left}::${p.right}`);
      item.prompt = `Associez chaque concept à sa définition :`;
      item.options = undefined;
      return item;
    }

    case "TRAP_DISTINCTION": {
      // Present real vs misleading statement
      const trap = allConcepts.find(c => c.concept_type === "trap");
      if (trap) {
        item.prompt = `Attention au piège ! Parmi ces affirmations sur "${concept.normalized_label}", laquelle est FAUSSE ?`;
        item.options = shuffleArray([
          def.slice(0, 80),
          (trap.compressed_definition || trap.definition).slice(0, 80),
          `${concept.normalized_label} est identique à ${trap.normalized_label}`,
          def.slice(0, 40) + "… [affirmation correcte]",
        ]);
        item.correct_answer = `${concept.normalized_label} est identique à ${trap.normalized_label}`;
      }
      return item;
    }

    case "PUZZLE_STEPS": {
      // Order steps of a procedure
      const steps = def.split(/(?<=[.;])\s+/).filter(s => s.length > 5).slice(0, 5);
      if (steps.length >= 3) {
        item.correct_answer = steps;
        item.options = shuffleArray([...steps]);
        item.prompt = `Remettez les étapes dans le bon ordre pour "${concept.normalized_label}" :`;
      }
      return item;
    }

    case "ERROR_IDENTIFICATION": {
      // Document with one error to find
      const errorVersion = def.replace(
        concept.normalized_label,
        allConcepts.find(c => c.normalized_label !== concept.normalized_label)?.normalized_label ?? "ERREUR"
      );
      item.error_document = errorVersion;
      item.prompt = `Ce texte contient une erreur. Identifiez le terme incorrect :`;
      item.correct_answer = concept.normalized_label;
      return item;
    }

    case "COMPLETION": {
      // Fill in the blanks
      const keyword = concept.normalized_label;
      const template = def.replace(
        new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
        "{{blank}}"
      );
      if (template !== def) {
        item.completion_template = template;
        item.prompt = `Complétez le texte avec le terme correct :`;
        item.correct_answer = keyword;
        item.options = undefined;
      }
      return item;
    }

    case "LOCK_LOGIC": {
      // Numeric/logic code derived from concept
      const code = String(concept.normalized_label.length * 7 + 42).slice(0, 4);
      item.lock_digits = 4;
      item.prompt = `Indice : le nombre de lettres dans "${concept.normalized_label}" multiplié par 7, plus 42. Entrez les 4 premiers chiffres :`;
      item.correct_answer = code;
      item.options = undefined;
      return item;
    }

    case "ORDERING": {
      // Reorder elements
      const elements = allConcepts.slice(0, 4).map(c => c.normalized_label);
      item.correct_answer = elements;
      item.options = shuffleArray([...elements]);
      item.prompt = `Classez ces concepts dans l'ordre logique de complexité croissante :`;
      return item;
    }

    default:
      return item;
  }
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
    case "CODE_RECONSTRUCT":
      return `Reconstituez le texte dans le bon ordre :`;
    case "ASSOCIATION":
      return `Associez chaque concept à sa définition :`;
    case "TRAP_DISTINCTION":
      return `Parmi ces affirmations, laquelle est fausse ?`;
    case "PUZZLE_STEPS":
      return `Remettez les étapes dans le bon ordre :`;
    case "ERROR_IDENTIFICATION":
      return `Trouvez l'erreur dans ce texte :`;
    case "COMPLETION":
      return `Complétez avec le terme correct :`;
    case "DECISION_TREE":
      return `Naviguez l'arbre de décision pour "${label}" :`;
    case "LOCK_LOGIC":
      return `Trouvez le code logique :`;
    case "ORDERING":
      return `Ordonnez ces éléments correctement :`;
    default:
      return `Question sur "${label}" :`;
  }
}

// ---------- Brick Sequence ----------

function selectBrickSequence(count: number, challengeType: string): BrickType[] {
  const sequence: BrickType[] = [];

  // For 5-room missions (excellent/good quality), mix in extended bricks
  if (count >= 5) {
    // Extended sequence: OBS → extended → base → extended → DECISION
    const extendedMiddle: BrickType[] = selectExtendedBricksForChallenge(challengeType);
    sequence.push("OBSERVATION");
    sequence.push(extendedMiddle[0] ?? "ASSOCIATION");
    sequence.push("ELIMINATION");
    sequence.push(extendedMiddle[1] ?? "COMPLETION");
    sequence.push("DECISION");
  } else if (count >= 2) {
    // Standard sequence with one extended brick if possible
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

/**
 * Select extended brick types that best match the challenge type.
 */
function selectExtendedBricksForChallenge(challengeType: string): BrickType[] {
  switch (challengeType) {
    case "decision_prioritization":
      return ["TRAP_DISTINCTION", "DECISION_TREE"];
    case "investigation_audit":
      return ["ERROR_IDENTIFICATION", "ASSOCIATION"];
    case "argumentation_arbitrage":
      return ["ASSOCIATION", "TRAP_DISTINCTION"];
    case "diagnostic_debugging":
      return ["ERROR_IDENTIFICATION", "PUZZLE_STEPS"];
    case "chronological_causality":
      return ["ORDERING", "CODE_RECONSTRUCT"];
    case "mechanism_chain":
      return ["PUZZLE_STEPS", "COMPLETION"];
    case "proof_construction":
      return ["LOCK_LOGIC", "PUZZLE_STEPS"];
    case "experiment_method":
      return ["ORDERING", "ERROR_IDENTIFICATION"];
    case "creative_construction":
      return ["COMPLETION", "CODE_RECONSTRUCT"];
    case "progressive_mastery":
      return ["COMPLETION", "ASSOCIATION"];
    default:
      return ["ASSOCIATION", "COMPLETION"];
  }
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
  const labels: Partial<Record<BrickType, string>> = {
    TRI: "Triage",
    SEQUENCE: "Séquençage",
    ELIMINATION: "Élimination",
    OBSERVATION: "Observation",
    DECISION: "Décision",
    CODE_RECONSTRUCT: "Reconstruction",
    ASSOCIATION: "Association",
    TRAP_DISTINCTION: "Piège",
    PUZZLE_STEPS: "Étapes",
    ERROR_IDENTIFICATION: "Erreur",
    COMPLETION: "Complétion",
    DECISION_TREE: "Arbre décisionnel",
    LOCK_LOGIC: "Verrou logique",
    ORDERING: "Ordonnancement",
  };
  return labels[brick] ?? brick;
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

// ---------- Inventory Building ----------

const ROOM_REWARD_ICONS = ["key", "scroll", "flask", "compass", "gem", "shield", "map", "book"];

/**
 * Build inventory items for the mission: each room grants a fragment/key.
 */
function buildInventoryItems(rooms: MissionRoom[], boss?: MissionBossRoom): InventoryItem[] {
  const items: InventoryItem[] = [];

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const itemId = `fragment_room_${i}`;
    const icon = ROOM_REWARD_ICONS[i % ROOM_REWARD_ICONS.length];

    const inventoryItem: InventoryItem = {
      id: itemId,
      name: `Fragment ${i + 1} — ${room.title.replace(/^Salle \d+ — /, "")}`,
      description: `Fragment obtenu en complétant ${room.title}. Nécessaire pour l'épreuve finale.`,
      icon,
      usable_in_puzzles: boss ? boss.items.map(bi => bi.id) : [],
      obtained_from_puzzle: room.items[room.items.length - 1]?.id ?? "",
    };

    items.push(inventoryItem);

    // Assign reward to last item in room
    if (room.items.length > 0) {
      room.items[room.items.length - 1].reward_item = inventoryItem;
    }

    // Assign room reward
    room.room_reward = inventoryItem;
  }

  return items;
}

// ---------- Puzzle Chain Building ----------

/**
 * Apply inter-puzzle dependencies: each room's first puzzle
 * requires completion of the previous room's last puzzle.
 */
function applyPuzzleChains(rooms: MissionRoom[], inventory: InventoryItem[]): void {
  for (let i = 1; i < rooms.length; i++) {
    const prevRoom = rooms[i - 1];
    const currRoom = rooms[i];

    if (prevRoom.items.length > 0 && currRoom.items.length > 0) {
      const prevLastItem = prevRoom.items[prevRoom.items.length - 1];
      const currFirstItem = currRoom.items[0];

      // Chain: first item in next room depends on last item in previous room
      currFirstItem.depends_on = prevLastItem.id;

      // First item in next room requires the inventory fragment from previous room
      const prevFragment = inventory.find(inv => inv.obtained_from_puzzle === prevLastItem.id);
      if (prevFragment) {
        currFirstItem.requires_item = prevFragment.id;
      }

      // Previous room's last item grants an unlock key
      prevLastItem.unlock_key = `room_${i}_access`;
    }
  }
}

// ---------- Hidden Clues / Exploration ----------

/**
 * Generate hidden clues from narrative context and concepts.
 * These are keywords in the narrative that reveal bonus hints when clicked.
 */
function applyHiddenClues(rooms: MissionRoom[], concepts: NormalizedConcept[]): void {
  for (const room of rooms) {
    const clues: HiddenClue[] = [];
    const narrative = room.narrative_context;

    // Find concept keywords mentioned in the narrative
    for (const concept of concepts) {
      const keyword = concept.normalized_label.toLowerCase();
      if (narrative.toLowerCase().includes(keyword.slice(0, Math.min(6, keyword.length)))) {
        clues.push({
          id: `clue_${room.room_index}_${concept.normalized_label.slice(0, 10)}`,
          trigger_keyword: concept.normalized_label,
          clue_text: concept.compressed_definition
            ? concept.compressed_definition.slice(0, 100) + "…"
            : concept.definition.slice(0, 100) + "…",
          bonus_hint: `Ce concept est lié à ${concept.normalized_label}. Gardez-le en tête pour la suite.`,
        });
      }
    }

    // Always add at least one contextual clue per room
    if (clues.length === 0 && room.target_concepts.length > 0) {
      const targetConcept = concepts.find(c => c.normalized_label === room.target_concepts[0]);
      if (targetConcept) {
        clues.push({
          id: `clue_${room.room_index}_context`,
          trigger_keyword: room.target_concepts[0],
          clue_text: `Indice caché : ${(targetConcept.compressed_definition || targetConcept.definition).slice(0, 80)}…`,
          bonus_hint: "Vous avez trouvé un indice caché ! Cela pourrait vous aider.",
        });
      }
    }

    room.hidden_clues = clues.slice(0, 3); // Max 3 hidden clues per room

    // Build exploration text with highlighted keywords
    if (clues.length > 0) {
      room.exploration_text = narrative;
    }
  }
}

// ---------- Meta-puzzle Boss Building ----------

/**
 * Update boss to use extended brick types for meta-puzzle,
 * with mechanics different from those used in rooms.
 */
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

  // Use extended brick types for boss that differ from standard rooms
  const bossBrickTypes: BrickType[] = ["ASSOCIATION", "TRAP_DISTINCTION", "CODE_RECONSTRUCT"];
  const items = bossConcepts.map((concept, i) => {
    const brick = bossBrickTypes[i % bossBrickTypes.length];
    return buildSingleItem(brick, concept, concepts);
  });

  return {
    title: "Boss Final — Épreuve de synthèse",
    narrative_context: subTheme.bossIntro,
    brick_types: bossBrickTypes,
    items,
    hints: [
      "Revenez aux fondamentaux. Quels sont les concepts clés ?",
      "Cherchez les distinctions essentielles entre les notions.",
      "Utilisez les fragments collectés pour guider votre réflexion.",
    ],
    target_concepts: bossConcepts.map((c) => c.normalized_label),
    time_limit_sec: 180,
    is_meta_puzzle: true,
    requires_all_fragments: true,
    synthesis_prompt: `Synthèse finale : assemblez toutes vos connaissances pour résoudre cette épreuve.`,
    required_items: [],
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
