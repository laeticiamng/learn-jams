// ============================================================
// Escape Game Builder — Orchestrates all engines to build
// a complete escape game session from a mission blueprint.
// Bridges the existing MissionBlueprintEngine with the new
// escape game layer.
// ============================================================

import type {
  EscapeGameSession,
  EscapeGameState,
  EscapeGameMetadata,
  EscapeRoom,
  InventoryItem,
  NarrativeArc,
} from "@/domain/cognitio/escapeEngine.types";
import type {
  MissionContent,
  MissionRoom,
  MissionBossRoom,
  MissionItem,
  BloomLevel,
} from "@/domain/cognitio/types";
import type { MissionFamily, MissionUniverseProfile } from "@/domain/cognitio/escapeGame.types";
import { selectMissionSubTheme } from "@/domain/cognitio/escapeGame.types";
import type { AnalyzedConcept, AnalyzedConfusionPair, DocumentDomain } from "@/domain/cognitio/contracts";
import { generateEscapeRooms } from "./escapeRoomEngine";
import { generateNarrativeArc } from "./escapeNarrativeEngine";
import { buildPuzzleDependencyGraph } from "./escapePuzzleEngine";
import { buildImmersiveEscapeGame } from "./immersiveEscapeEngine";
import type { ImmersiveEngineOutput } from "./immersiveEscapeEngine";
import type { NormalizedConcept } from "./conceptNormalizer";
import type { BlueprintOutput } from "./missionBlueprintEngine";
import { sanitizeMissionDisplayText, hasEditorialNoise } from "@/lib/cognitio-semantic-cleaning";

// ---------- Types ----------

export interface EscapeGameBuildInput {
  /** Existing blueprint output (from current pipeline) */
  blueprint: BlueprintOutput;
  /** Original concepts */
  concepts: NormalizedConcept[];
  /** Mission family */
  mission_family: MissionFamily;
  /** Universe profile */
  universe_profile: MissionUniverseProfile;
  /** Main topic */
  main_topic: string;
  /** User ID */
  user_id: string;
  /** Mission ID */
  mission_id: string;
  /** Document domain for immersive narrative atmosphere */
  domain?: string;
}

// ---------- Main Builder ----------

/**
 * Build a complete escape game session from a blueprint.
 * This is the main entry point that transforms a standard
 * mission into a full escape game experience.
 */
export async function buildEscapeGameSession(input: EscapeGameBuildInput): Promise<EscapeGameSession> {
  const {
    blueprint,
    concepts,
    mission_family,
    universe_profile,
    main_topic,
    user_id,
    mission_id,
    domain,
  } = input;

  // 0. Sanitize main_topic to prevent editorial noise in narrative
  const cleanTopic = sanitizeMissionDisplayText(main_topic) || main_topic;

  // 1. Get sub-theme for narrative context
  const subTheme = selectMissionSubTheme(mission_family, cleanTopic);

  // 2. Determine room count based on quality
  const roomCount = Math.max(3, blueprint.room_count);

  // 3. Generate escape rooms from concepts
  const rooms = await generateEscapeRooms({
    concepts,
    roomCount,
    difficulty_base: getDifficultyBase(universe_profile),
    includeCodeLocks: roomCount >= 4,
    narrative_contexts: subTheme.roomNarratives,
    main_topic: cleanTopic,
  });

  // 4. If blueprint has a boss, add it as the final room
  if (blueprint.includes_boss && blueprint.mission_json.boss) {
    const bossRoom = convertBossToEscapeRoom(
      blueprint.mission_json.boss,
      rooms.length,
      subTheme.bossIntro
    );
    rooms.push(bossRoom);
  }

  // 5. Generate narrative arc (enriched with immersive universe profiles)
  const narrative = generateNarrativeArc({
    main_topic: cleanTopic,
    mission_family,
    sub_theme: subTheme,
    rooms,
    tension_level: universe_profile.tension_level,
    domain,
  });

  // 6. Collect all inventory items
  const allInventoryItems = rooms.flatMap(r => r.rewards);

  // 7. Build metadata
  const metadata = buildMetadata(rooms, concepts, mission_family, universe_profile);

  // 8. Create initial game state
  const state = createInitialState();

  return {
    id: crypto.randomUUID(),
    mission_id,
    user_id,
    rooms,
    inventory: [],
    narrative,
    state,
    metadata,
  };
}

/**
 * Convert an existing MissionContent to an escape game session.
 * This allows backwards compatibility with existing missions.
 */
export async function convertMissionToEscapeGame(
  mission: MissionContent,
  missionId: string,
  userId: string,
  missionFamily: MissionFamily,
  universeProfile: MissionUniverseProfile,
  mainTopic: string,
  domain?: string,
): EscapeGameSession {
  const cleanMainTopic = sanitizeMissionDisplayText(mainTopic) || mainTopic;
  const subTheme = selectMissionSubTheme(missionFamily, cleanMainTopic);

  // Convert existing rooms to escape rooms
  const escapeRooms: EscapeRoom[] = mission.rooms.map((room, index) =>
    convertMissionRoom(room, index, mission.rooms.length, subTheme)
  );

  // Convert boss if present
  if (mission.boss) {
    escapeRooms.push(
      convertBossToEscapeRoom(mission.boss, escapeRooms.length, subTheme.bossIntro)
    );
  }

  // Generate narrative (enriched with immersive universe profiles)
  const narrative = generateNarrativeArc({
    main_topic: cleanMainTopic,
    mission_family: missionFamily,
    sub_theme: subTheme,
    rooms: escapeRooms,
    tension_level: universeProfile.tension_level,
    domain,
  });

  const metadata = buildMetadata(escapeRooms, [], missionFamily, universeProfile);

  return {
    id: crypto.randomUUID(),
    mission_id: missionId,
    user_id: userId,
    rooms: escapeRooms,
    inventory: [],
    narrative,
    state: createInitialState(),
    metadata,
  };
}

// ---------- Conversion Helpers ----------

function convertMissionRoom(
  room: MissionRoom,
  index: number,
  totalRooms: number,
  subTheme: { roomNarratives: Record<string, string>; bossIntro: string }
): EscapeRoom {
  const roomTypeSequence = ["briefing", "exploration", "analysis", "diagnostic", "decision", "synthesis", "final"] as const;
  const roomType = roomTypeSequence[Math.min(index, roomTypeSequence.length - 1)] ?? "exploration";

  // Convert MissionItems to EscapePuzzles
  const puzzles = room.items.map((item, i) =>
    convertMissionItem(item, index, i)
  );

  // Create rewards
  const rewards: InventoryItem[] = [{
    id: `item_legacy_${index}`,
    type: "clue",
    name: `Indice: ${room.target_concepts[0] ?? "Concept"}`,
    description: room.narrative_context.slice(0, 120),
    icon: "search",
    source_room_index: index,
    is_key_item: index < 2,
    concept_key: room.target_concepts[0],
    collected: false,
  }, {
    id: `badge_legacy_${index}`,
    type: "badge",
    name: `Badge Salle ${index + 1}`,
    description: `Récompense pour avoir complété "${room.title}".`,
    icon: "award",
    source_room_index: index,
    is_key_item: false,
    collected: false,
  }];

  // Create hints (upgrade from string[] to 4-level EscapeHint[])
  const hints = convertHints(room.hints);

  return {
    room_index: index,
    id: `room_legacy_${index}`,
    title: room.title,
    room_type: roomType,
    narrative_context: room.narrative_context,
    entry_narrative: subTheme.roomNarratives[room.brick_type] ?? room.narrative_context,
    completion_narrative: `Salle "${room.title}" complétée ! Vous progressez.`,
    lock: index === 0
      ? { type: "none", lock_description: "", unlock_hint: "" }
      : {
          type: "puzzle_gate",
          required_puzzle_ids: [],
          lock_description: "Complétez la salle précédente pour continuer.",
          unlock_hint: "Résolvez tous les puzzles de la salle précédente.",
        },
    puzzles,
    rewards,
    hints,
    discoverables: [{
      id: `disc_legacy_${index}`,
      label: "Document de briefing",
      type: "document",
      discovery_text: room.narrative_context.slice(0, 150),
      hints_at_puzzle_id: puzzles[0]?.id,
      discovered: false,
    }],
    target_concepts: room.target_concepts,
    difficulty: Math.min(5, 2 + index),
    time_limit_sec: room.time_limit_sec,
    unlocked: index === 0,
    completed: false,
  };
}

function convertMissionItem(
  item: MissionItem,
  roomIndex: number,
  puzzleIndex: number
): import("@/domain/cognitio/escapeEngine.types").EscapePuzzle {
  const puzzleTypeMap: Record<string, import("@/domain/cognitio/escapeEngine.types").ExtendedPuzzleType> = {
    OBSERVATION: "observation",
    TRI: "classification",
    SEQUENCE: "sequencing",
    ELIMINATION: "elimination",
    DECISION: "decision",
  };

  // Sanitize all display-facing text to prevent editorial noise leaking to UI
  const sanitizedPrompt = sanitizeMissionDisplayText(item.prompt);
  const sanitizedOptions = (item.options ?? []).map(o => sanitizeMissionDisplayText(o)).filter(o => o.length >= 2);
  const sanitizedExplanation = item.explanation ? sanitizeMissionDisplayText(item.explanation) : item.explanation;
  const sanitizedAnswer = Array.isArray(item.correct_answer)
    ? item.correct_answer.map(a => sanitizeMissionDisplayText(a)).filter(a => a.length >= 1)
    : sanitizeMissionDisplayText(item.correct_answer);

  return {
    id: item.id,
    puzzle_type: puzzleTypeMap[item.type] ?? "observation",
    brick_type: item.type,
    prompt: sanitizedPrompt || item.prompt,
    instructions: buildInstructionsForBrick(item.type),
    options: sanitizedOptions.length >= 2 ? sanitizedOptions : item.options,
    correct_answer: (Array.isArray(sanitizedAnswer) ? sanitizedAnswer.length >= 1 : sanitizedAnswer.length >= 1) ? sanitizedAnswer : item.correct_answer,
    explanation: sanitizedExplanation || item.explanation,
    concept_key: item.concept_key,
    bloom_level: item.bloom_level,
    difficulty: item.difficulty,
    solved: false,
    attempts: 0,
  };
}

function convertBossToEscapeRoom(
  boss: MissionBossRoom,
  roomIndex: number,
  bossIntro: string
): EscapeRoom {
  const puzzles = boss.items.map((item, i) => convertMissionItem(item, roomIndex, i));

  return {
    room_index: roomIndex,
    id: `room_boss_${roomIndex}`,
    title: boss.title,
    room_type: "final",
    narrative_context: boss.narrative_context,
    entry_narrative: bossIntro,
    completion_narrative: "Le Boss est vaincu ! Mission accomplie avec brio.",
    lock: {
      type: "puzzle_gate",
      required_puzzle_ids: [],
      lock_description: "Complétez toutes les salles pour accéder au Boss final.",
      unlock_hint: "Assurez-vous que toutes les salles précédentes sont terminées.",
    },
    puzzles,
    rewards: [{
      id: `badge_boss_${roomIndex}`,
      type: "badge",
      name: "Badge Boss Final",
      description: "Récompense pour avoir vaincu le Boss de la mission.",
      icon: "trophy",
      source_room_index: roomIndex,
      is_key_item: false,
      collected: false,
    }],
    hints: convertHints(boss.hints),
    discoverables: [{
      id: `disc_boss_${roomIndex}`,
      label: "Coffre-fort du Boss",
      type: "secret",
      discovery_text: "Le coffre-fort contient les derniers indices pour l'épreuve finale. Rassemblez vos connaissances.",
      discovered: false,
    }],
    target_concepts: boss.target_concepts,
    difficulty: 5,
    time_limit_sec: boss.time_limit_sec,
    unlocked: false,
    completed: false,
  };
}

function convertHints(hints: string[]): import("@/domain/cognitio/escapeEngine.types").EscapeHint[] {
  const escapeHints: import("@/domain/cognitio/escapeEngine.types").EscapeHint[] = [];

  // Map existing hints to levels 1-3, add a generated level 4
  for (let i = 0; i < Math.min(hints.length, 3); i++) {
    escapeHints.push({
      level: (i + 1) as 1 | 2 | 3,
      text: hints[i],
      reveals_answer: i >= 2,
      score_penalty: [0, 0.1, 0.25][i],
      auto_trigger: { after_attempts: i + 2, after_seconds: 60 + i * 60 },
    });
  }

  // Always add level 4 (near-complete guidance)
  escapeHints.push({
    level: 4,
    text: hints.length > 0
      ? `${hints[hints.length - 1]} — Concentrez-vous sur les définitions fondamentales des concepts en jeu.`
      : "Relisez attentivement les concepts clés. La réponse se trouve dans les fondamentaux.",
    reveals_answer: true,
    score_penalty: 0.5,
  });

  return escapeHints;
}

// ---------- Helpers ----------

function createInitialState(): EscapeGameState {
  return {
    current_room_index: 0,
    current_puzzle_index: 0,
    phase: "briefing",
    rooms_unlocked: [0],
    rooms_completed: [],
    puzzles_solved: [],
    inventory_collected: [],
    codes_discovered: new Map(),
    score: 0,
    accuracy: 0,
    hints_used: 0,
    total_time_sec: 0,
    events: [],
  };
}

function getDifficultyBase(profile: MissionUniverseProfile): number {
  return Math.max(1, Math.min(4, profile.abstraction_level - 1));
}

function buildMetadata(
  rooms: EscapeRoom[],
  concepts: NormalizedConcept[],
  missionFamily: MissionFamily,
  universeProfile: MissionUniverseProfile
): EscapeGameMetadata {
  const totalPuzzles = rooms.reduce((sum, r) => sum + r.puzzles.length, 0);
  const totalItems = rooms.reduce((sum, r) => sum + r.rewards.length, 0);
  const estimatedDuration = rooms.reduce((sum, r) => sum + (r.time_limit_sec ?? 180), 0);

  // Bloom distribution
  const bloomDist: Partial<Record<BloomLevel, number>> = {};
  for (const room of rooms) {
    for (const puzzle of room.puzzles) {
      bloomDist[puzzle.bloom_level] = (bloomDist[puzzle.bloom_level] ?? 0) + 1;
    }
  }

  return {
    mission_family: missionFamily,
    universe_profile: universeProfile,
    total_rooms: rooms.length,
    total_puzzles: totalPuzzles,
    total_items: totalItems,
    estimated_duration_sec: estimatedDuration,
    difficulty_curve: rooms.map(r => r.difficulty),
    concepts_covered: [...new Set(rooms.flatMap(r => r.target_concepts))],
    bloom_distribution: bloomDist,
  };
}

function buildInstructionsForBrick(brick: string): string {
  const instructions: Record<string, string> = {
    OBSERVATION: "Examinez attentivement et identifiez la bonne réponse.",
    TRI: "Classez l'élément dans la catégorie appropriée.",
    SEQUENCE: "Replacez les éléments dans le bon ordre.",
    ELIMINATION: "Identifiez l'élément qui ne correspond pas au groupe.",
    DECISION: "Choisissez l'option la plus adaptée au contexte.",
  };
  return instructions[brick] ?? "Résolvez le puzzle pour progresser.";
}

// ---------- Immersive (Premium) Builder ----------

export interface ImmersiveEscapeBuildInput {
  /** Analyzed concepts from the full analysis pipeline */
  concepts: AnalyzedConcept[];
  /** Confusion pairs from analysis */
  confusion_pairs: AnalyzedConfusionPair[];
  /** Document domain */
  domain: DocumentDomain;
  /** Main topic */
  main_topic: string;
  /** Reasoning type from analysis */
  reasoning_type: string;
  /** Mission family */
  mission_family: MissionFamily;
  /** Universe profile */
  universe_profile: MissionUniverseProfile;
  /** User ID */
  user_id: string;
  /** Mission ID */
  mission_id: string;
  /** Optional universe hint from analysis */
  mission_universe_hint?: { domain: string; suggested_universe: string; reasoning_approach: string };
  /** Optional section titles */
  section_titles?: string[];
}

export interface ImmersiveEscapeSession {
  session: EscapeGameSession;
  immersive: ImmersiveEngineOutput;
}

/**
 * Build a premium immersive escape game session from analyzed concepts.
 * This combines the standard escape game session with the 3D immersive
 * engine (dependency graphs, pedagogical objects, camera waypoints).
 * Use this when the full analysis pipeline output is available.
 */
export function buildImmersiveEscapeSession(
  input: ImmersiveEscapeBuildInput,
): ImmersiveEscapeSession {
  // 1. Build the immersive 3D layer
  const immersive = buildImmersiveEscapeGame({
    user_id: input.user_id,
    mission_id: input.mission_id,
    concepts: input.concepts,
    confusion_pairs: input.confusion_pairs,
    domain: input.domain,
    main_topic: input.main_topic,
    reasoning_type: input.reasoning_type,
    mission_universe_hint: input.mission_universe_hint,
    section_titles: input.section_titles,
  });

  // 2. Convert analyzed concepts to normalized concepts for the standard builder
  // Sanitize labels and definitions to prevent editorial noise
  const normalizedConcepts: NormalizedConcept[] = input.concepts.map(c => ({
    normalized_label: sanitizeMissionDisplayText(c.label) || c.label,
    original_label: c.label,
    definition: c.definition,
    compressed_definition: sanitizeMissionDisplayText(c.definition.slice(0, 120)) || c.definition.slice(0, 120),
    concept_type: "principal",
    quality_score: 1,
    rejection: null,
  }));

  // 3. Build standard escape game session with domain for narrative enrichment
  const cleanImmersiveTopic = sanitizeMissionDisplayText(input.main_topic) || input.main_topic;
  const subTheme = selectMissionSubTheme(input.mission_family, cleanImmersiveTopic);
  const roomCount = Math.max(3, immersive.session_metadata.total_rooms + 2);

  const rooms = generateEscapeRooms({
    concepts: normalizedConcepts,
    roomCount,
    difficulty_base: getDifficultyBase(input.universe_profile),
    includeCodeLocks: roomCount >= 4,
    narrative_contexts: subTheme.roomNarratives,
  });

  const narrative = generateNarrativeArc({
    main_topic: cleanImmersiveTopic,
    mission_family: input.mission_family,
    sub_theme: subTheme,
    rooms,
    tension_level: input.universe_profile.tension_level,
    domain: input.domain,
  });

  const metadata = buildMetadata(rooms, normalizedConcepts, input.mission_family, input.universe_profile);

  const session: EscapeGameSession = {
    id: crypto.randomUUID(),
    mission_id: input.mission_id,
    user_id: input.user_id,
    rooms,
    inventory: [],
    narrative,
    state: createInitialState(),
    metadata,
  };

  return { session, immersive };
}
