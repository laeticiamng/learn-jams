// ============================================================
// Escape Room Engine — Manages room creation, lock/unlock
// logic, room transitions, and room state.
// ============================================================

import type {
  EscapeRoom,
  EscapePuzzle,
  RoomLock,
  LockType,
  InventoryItem,
  EscapeHint,
  EscapeGameState,
  RoomDiscoverable,
} from "@/domain/cognitio/escapeEngine.types";
import type { BrickType } from "@/domain/cognitio/types";
import type { NormalizedConcept } from "./conceptNormalizer";
import { sanitizeMissionDisplayText, hasEditorialNoise } from "@/lib/cognitio-semantic-cleaning";
import { generateAIPuzzles } from "./aiPuzzleService";

// ---------- Room Templates ----------

const ROOM_TYPE_SEQUENCE = [
  "briefing",
  "exploration",
  "analysis",
  "diagnostic",
  "decision",
  "synthesis",
  "final",
] as const;

const ROOM_TYPE_LABELS: Record<string, string> = {
  briefing: "Briefing",
  exploration: "Exploration",
  analysis: "Analyse",
  diagnostic: "Diagnostic",
  decision: "Décision",
  synthesis: "Synthèse",
  final: "Résolution finale",
};

const ROOM_TYPE_TO_BRICKS: Record<string, BrickType[]> = {
  briefing: ["OBSERVATION"],
  exploration: ["OBSERVATION", "TRI"],
  analysis: ["TRI", "SEQUENCE"],
  diagnostic: ["ELIMINATION", "DECISION"],
  decision: ["DECISION", "ELIMINATION"],
  synthesis: ["SEQUENCE", "DECISION"],
  final: ["TRI", "DECISION", "ELIMINATION"],
};

// ---------- Room Generation ----------

export interface RoomGenerationInput {
  concepts: NormalizedConcept[];
  roomCount: number;
  difficulty_base: number;
  includeCodeLocks: boolean;
  narrative_contexts: Record<string, string>;
  main_topic?: string;
}

/**
 * Generate a sequence of escape rooms from concepts.
 * Each room has a purpose, lock, puzzles, rewards, and hints.
 * Tries AI-powered puzzle generation first, falls back to local templates.
 */
export async function generateEscapeRooms(input: RoomGenerationInput): Promise<EscapeRoom[]> {
  const { concepts, roomCount, difficulty_base, includeCodeLocks, narrative_contexts, main_topic } = input;
  const rooms: EscapeRoom[] = [];

  // Determine room type sequence based on count
  const roomTypes = selectRoomTypeSequence(roomCount);

  // Distribute concepts across rooms
  const conceptGroups = distributeConceptsToRooms(concepts, roomCount);

  // Code lock accumulator
  const codeParts: string[] = [];

  for (let i = 0; i < roomCount; i++) {
    const roomType = roomTypes[i];
    const roomConcepts = conceptGroups[i];
    const difficulty = Math.min(5, difficulty_base + Math.floor(i * 0.8));
    const roomId = `room_${i}_${crypto.randomUUID().slice(0, 8)}`;

    // Create lock for this room
    const lock = createRoomLock(i, rooms, codeParts, includeCodeLocks);

    // Create puzzles — try AI first, fall back to local templates
    const bricks = ROOM_TYPE_TO_BRICKS[roomType] ?? ["OBSERVATION"];
    let puzzles: EscapePuzzle[];

    if (main_topic && roomConcepts.length > 0) {
      puzzles = await generateRoomPuzzlesWithAI(
        roomConcepts, bricks, difficulty, i, roomCount, codeParts, main_topic, roomType
      );
    } else {
      puzzles = generateRoomPuzzlesLocal(roomConcepts, bricks, difficulty, i, roomCount, codeParts);
    }

    // Create reward items
    const rewards = generateRoomRewards(roomConcepts, i, roomType);

    // Create 4-level hints
    const hints = generateRoomHints(roomConcepts, roomType, difficulty);

    // Create discoverable elements (hidden clues, environmental objects)
    const discoverables = generateRoomDiscoverables(roomConcepts, roomType, puzzles, i);

    // Inject meta-puzzle into the final room as a capstone synthesis challenge
    if (roomType === "final" && concepts.length >= 3) {
      puzzles.push(createMetaPuzzle(concepts, roomCount, difficulty));
    }

    // [MISSION_TRACE] Log editorial noise detection for each room's content
    for (const concept of roomConcepts) {
      const labelHasNoise = hasEditorialNoise(concept.normalized_label);
      const defHasNoise = hasEditorialNoise(concept.compressed_definition || concept.definition);
      if (labelHasNoise || defHasNoise) {
        console.warn(`[MISSION_TRACE] room=${i} concept="${concept.normalized_label.slice(0, 40)}" labelNoise=${labelHasNoise} defNoise=${defHasNoise}`);
      }
    }

    rooms.push({
      room_index: i,
      id: roomId,
      title: `Salle ${i + 1} — ${ROOM_TYPE_LABELS[roomType] ?? roomType}`,
      room_type: roomType,
      narrative_context: narrative_contexts[roomType] ?? "",
      entry_narrative: buildEntryNarrative(roomType, i, roomCount),
      completion_narrative: buildCompletionNarrative(roomType, i, roomCount),
      lock,
      puzzles,
      rewards,
      hints,
      discoverables,
      target_concepts: roomConcepts.map(c => sanitizeMissionDisplayText(c.normalized_label) || c.normalized_label),
      difficulty,
      time_limit_sec: computeRoomTimeLimit(puzzles.length, difficulty),
      unlocked: i === 0, // Only first room is unlocked initially
      completed: false,
    });
  }

  return rooms;
}

// ---------- Room Type Sequence ----------

function selectRoomTypeSequence(count: number): EscapeRoom["room_type"][] {
  if (count <= 2) return ["briefing", "final"];
  if (count <= 3) return ["briefing", "analysis", "final"];
  if (count <= 4) return ["briefing", "exploration", "analysis", "final"];
  if (count <= 5) return ["briefing", "exploration", "analysis", "decision", "final"];
  return ROOM_TYPE_SEQUENCE.slice(0, count);
}

// ---------- Lock Creation ----------

function createRoomLock(
  roomIndex: number,
  previousRooms: EscapeRoom[],
  codeParts: string[],
  useCodeLocks: boolean
): RoomLock {
  // First room has no lock
  if (roomIndex === 0) {
    return {
      type: "none",
      lock_description: "",
      unlock_hint: "",
    };
  }

  // Every 3rd room uses a code lock if enabled
  if (useCodeLocks && roomIndex >= 2 && roomIndex % 2 === 0 && codeParts.length > 0) {
    const code = codeParts.join("");
    return {
      type: "code_lock",
      code,
      lock_description: `Un verrou à code bloque cette salle. Combinez les indices des salles précédentes.`,
      unlock_hint: `Le code est composé de ${codeParts.length} éléments trouvés dans les salles précédentes.`,
    };
  }

  // Score gate for the final room — require minimum 60% accuracy
  if (roomIndex === previousRooms.length && previousRooms.length >= 3) {
    return {
      type: "score_gate",
      min_score: 0.6,
      lock_description: "Votre précision doit atteindre au moins 60% pour accéder à l'épreuve finale.",
      unlock_hint: "Améliorez votre score en répondant correctement aux puzzles précédents.",
    };
  }

  // Key item lock for rooms after the 3rd — requires key from 2 rooms prior
  if (roomIndex >= 3 && roomIndex % 3 === 0 && previousRooms.length >= 2) {
    const sourceRoom = previousRooms[roomIndex - 2];
    const keyItem = sourceRoom?.rewards.find(r => r.is_key_item);
    if (keyItem) {
      return {
        type: "key_item",
        required_item_id: keyItem.id,
        lock_description: `Cette salle nécessite un objet clé. Cherchez dans les salles précédentes.`,
        unlock_hint: `L'objet "${keyItem.name}" de la salle "${sourceRoom.title}" est nécessaire.`,
      };
    }
  }

  // Most rooms use puzzle_gate (must complete previous room)
  const prevRoom = previousRooms[roomIndex - 1];
  if (prevRoom) {
    return {
      type: "puzzle_gate",
      required_puzzle_ids: prevRoom.puzzles.map(p => p.id),
      lock_description: `Résolvez tous les puzzles de la salle précédente pour débloquer cette salle.`,
      unlock_hint: `Retournez à la salle "${prevRoom.title}" et complétez tous les défis.`,
    };
  }

  return {
    type: "puzzle_gate",
    required_puzzle_ids: [],
    lock_description: "Complétez la salle précédente.",
    unlock_hint: "Progressez dans les salles précédentes.",
  };
}

// ---------- Lock Validation ----------

/**
 * Check if a room lock can be opened given current game state.
 */
export function canUnlockRoom(room: EscapeRoom, state: EscapeGameState): boolean {
  if (room.unlocked) return true;

  const lock = room.lock;

  switch (lock.type) {
    case "none":
      return true;

    case "code_lock": {
      // Check if all code parts have been discovered
      if (!lock.code) return false;
      const discoveredCode = Array.from(state.codes_discovered.values()).join("");
      return discoveredCode === lock.code;
    }

    case "key_item":
      return lock.required_item_id
        ? state.inventory_collected.includes(lock.required_item_id)
        : false;

    case "multi_key":
      return lock.required_item_ids
        ? lock.required_item_ids.every(id => state.inventory_collected.includes(id))
        : false;

    case "puzzle_gate":
      return lock.required_puzzle_ids
        ? lock.required_puzzle_ids.every(id => state.puzzles_solved.includes(id))
        : false;

    case "score_gate":
      return lock.min_score ? state.accuracy >= lock.min_score : true;

    default:
      return false;
  }
}

/**
 * Attempt to unlock a room with a code.
 * Returns true if successful.
 */
export function attemptCodeUnlock(room: EscapeRoom, code: string): boolean {
  if (room.lock.type !== "code_lock") return false;
  return room.lock.code === code;
}

/**
 * Check which rooms can now be unlocked based on current state.
 * Returns list of newly unlockable room indices.
 */
export function checkUnlockableRooms(
  rooms: EscapeRoom[],
  state: EscapeGameState
): number[] {
  const newlyUnlockable: number[] = [];

  for (const room of rooms) {
    if (room.unlocked) continue;
    if (canUnlockRoom(room, state)) {
      newlyUnlockable.push(room.room_index);
    }
  }

  return newlyUnlockable;
}

// ---------- Puzzle Generation ----------

function generateRoomPuzzles(
  concepts: NormalizedConcept[],
  bricks: BrickType[],
  difficulty: number,
  roomIndex: number,
  totalRooms: number,
  codeParts: string[]
): EscapePuzzle[] {
  const puzzles: EscapePuzzle[] = [];

  for (let i = 0; i < Math.min(concepts.length, 4); i++) {
    const concept = concepts[i];
    const brick = bricks[i % bricks.length];
    const puzzleType = mapBrickToExtended(brick);
    const puzzleId = `puzzle_${roomIndex}_${i}_${crypto.randomUUID().slice(0, 8)}`;

    // Determine if this puzzle contributes to a code lock
    const isCodeContributor = roomIndex < totalRooms - 1 && i === 0;
    const codeValue = isCodeContributor ? String(Math.floor(Math.random() * 10)) : undefined;

    if (codeValue) {
      codeParts.push(codeValue);
    }

    const distractors = concepts
      .filter(c => c.normalized_label !== concept.normalized_label)
      .slice(0, 3)
      .map(c => c.normalized_label);

    const options = shuffleArray([concept.normalized_label, ...distractors]);

    // Sanitize all display text to prevent editorial noise from reaching the UI
    const sanitizedPrompt = sanitizeMissionDisplayText(buildPuzzlePrompt(brick, concept, puzzleType));
    const sanitizedOptions = options.map(o => sanitizeMissionDisplayText(o)).filter(o => o.length >= 2);
    const sanitizedAnswer = sanitizeMissionDisplayText(concept.normalized_label);
    const sanitizedExplanation = sanitizeMissionDisplayText(concept.compressed_definition || concept.definition);

    puzzles.push({
      id: puzzleId,
      puzzle_type: puzzleType,
      brick_type: brick,
      prompt: sanitizedPrompt,
      instructions: buildPuzzleInstructions(puzzleType),
      options: sanitizedOptions.length >= 2 ? sanitizedOptions : options,
      correct_answer: sanitizedAnswer || concept.normalized_label,
      explanation: sanitizedExplanation || concept.compressed_definition || concept.definition,
      concept_key: concept.normalized_label,
      bloom_level: mapDifficultyToBloom(difficulty),
      difficulty,
      code_contribution: codeValue
        ? { position: codeParts.length - 1, value: codeValue }
        : undefined,
      unlocks: buildPuzzleUnlock(roomIndex, i, concepts.length, totalRooms),
      solved: false,
      attempts: 0,
    });
  }

  // Add an active generation puzzle for rooms with enough concepts
  if (concepts.length >= 2 && roomIndex > 0) {
    const synthConcepts = concepts.slice(0, 3);
    puzzles.push(createSynthesisPuzzle(synthConcepts, roomIndex, difficulty));
  }

  // Add a surprise bonus puzzle in the middle room (hidden challenge)
  if (roomIndex === Math.floor(totalRooms / 2) && concepts.length >= 1) {
    puzzles.push(createBonusPuzzle(concepts[0], roomIndex, difficulty));
  }

  return puzzles;
}

/**
 * Create a meta-puzzle that requires combining all fragments collected.
 * This is the true "final puzzle" of the escape game.
 */
export function createMetaPuzzle(
  allConcepts: NormalizedConcept[],
  totalRooms: number,
  difficulty: number
): EscapePuzzle {
  const keyConceptLabels = allConcepts.slice(0, Math.min(allConcepts.length, 6)).map(c => sanitizeMissionDisplayText(c.normalized_label) || c.normalized_label);
  const keywords = allConcepts.slice(0, 6).flatMap(c => {
    const words = sanitizeMissionDisplayText(c.compressed_definition || c.definition).split(/\s+/);
    return words.filter(w => w.length > 4).slice(0, 2);
  });

  return {
    id: `puzzle_meta_final_${crypto.randomUUID().slice(0, 8)}`,
    puzzle_type: "active_generation",
    brick_type: "DECISION",
    prompt: sanitizeMissionDisplayText(`[ÉPREUVE FINALE — MÉTA-PUZZLE] Tous les fragments collectés doivent maintenant être assemblés. En utilisant les concepts clés découverts tout au long de la mission (${keyConceptLabels.join(", ")}), formulez une synthèse globale qui relie l'ensemble de vos découvertes.`),
    instructions: "Cette épreuve finale évalue votre compréhension globale. Votre réponse doit intégrer le maximum de concepts découverts dans les salles précédentes. Rédigez 3-5 phrases.",
    input_type: "textarea",
    correct_answer: keyConceptLabels.join(", "),
    validation_keywords: [...new Set(keywords)].slice(0, 10),
    explanation: sanitizeMissionDisplayText(`La synthèse attendue devait relier : ${keyConceptLabels.join(", ")}. Chaque fragment collecté représentait un aspect du sujet.`),
    concept_key: keyConceptLabels[0],
    bloom_level: "create",
    difficulty: Math.min(5, difficulty + 2),
    solved: false,
    attempts: 0,
    // Requires all fragment items to be collected
    required_items: Array.from({ length: Math.min(totalRooms - 1, 4) }, (_, i) => `item_${i}`),
  };
}

function createSynthesisPuzzle(
  concepts: NormalizedConcept[],
  roomIndex: number,
  difficulty: number
): EscapePuzzle {
  const conceptLabels = concepts.map(c => sanitizeMissionDisplayText(c.normalized_label) || c.normalized_label);
  const keywords = concepts.flatMap(c => {
    const words = sanitizeMissionDisplayText(c.compressed_definition || c.definition).split(/\s+/);
    return words.filter(w => w.length > 4).slice(0, 3);
  });

  return {
    id: `puzzle_synth_${roomIndex}_${crypto.randomUUID().slice(0, 8)}`,
    puzzle_type: "active_generation",
    brick_type: "DECISION",
    prompt: sanitizeMissionDisplayText(`En vous basant sur les concepts "${conceptLabels.join('", "')}", formulez une explication synthétique qui relie ces notions.`),
    instructions: "Rédigez votre réponse en 2-3 phrases. Votre réponse sera évaluée sur la présence des concepts clés.",
    input_type: "textarea",
    correct_answer: conceptLabels.join(", "),
    validation_keywords: [...new Set(keywords)].slice(0, 8),
    explanation: sanitizeMissionDisplayText(`Les concepts clés à intégrer étaient : ${conceptLabels.join(", ")}.`),
    concept_key: conceptLabels[0],
    bloom_level: "create",
    difficulty: Math.min(5, difficulty + 1),
    solved: false,
    attempts: 0,
  };
}

// ---------- Reward Generation ----------

function generateRoomRewards(
  concepts: NormalizedConcept[],
  roomIndex: number,
  roomType: string
): InventoryItem[] {
  const rewards: InventoryItem[] = [];

  // Each room gives at least one inventory item
  if (concepts.length > 0) {
    const concept = concepts[0];
    const itemType = getItemTypeForRoom(roomType);
    const cleanLabel = sanitizeMissionDisplayText(concept.normalized_label) || concept.normalized_label;
    const cleanDesc = sanitizeMissionDisplayText(concept.compressed_definition || concept.definition.slice(0, 120));

    rewards.push({
      id: `item_${roomIndex}_${crypto.randomUUID().slice(0, 8)}`,
      type: itemType,
      name: buildItemName({ ...concept, normalized_label: cleanLabel }, itemType),
      description: cleanDesc || concept.compressed_definition || concept.definition.slice(0, 120),
      icon: getItemIcon(itemType),
      source_room_index: roomIndex,
      is_key_item: roomIndex < 3, // First rooms give key items
      concept_key: concept.normalized_label,
      examine_text: `Cet objet contient des informations essentielles sur "${cleanLabel}".`,
      collected: false,
    });
  }

  // Additional badge for completing room
  rewards.push({
    id: `badge_room_${roomIndex}`,
    type: "badge",
    name: `Badge Salle ${roomIndex + 1}`,
    description: `Récompense pour avoir complété la salle ${roomIndex + 1}.`,
    icon: "award",
    source_room_index: roomIndex,
    is_key_item: false,
    collected: false,
  });

  return rewards;
}

// ---------- Hint Generation (4 levels) ----------

function generateRoomHints(
  concepts: NormalizedConcept[],
  roomType: string,
  difficulty: number
): EscapeHint[] {
  const hints: EscapeHint[] = [];

  // Level 1: General direction (no penalty)
  hints.push({
    level: 1,
    text: buildHintLevel1(roomType, concepts),
    reveals_answer: false,
    score_penalty: 0,
    auto_trigger: { after_attempts: 2, after_seconds: 90 },
  });

  // Level 2: More specific guidance (small penalty)
  hints.push({
    level: 2,
    text: buildHintLevel2(concepts),
    reveals_answer: false,
    score_penalty: 0.1,
    auto_trigger: { after_attempts: 3, after_seconds: 150 },
  });

  // Level 3: Strong guidance (moderate penalty)
  hints.push({
    level: 3,
    text: buildHintLevel3(concepts),
    reveals_answer: false,
    score_penalty: 0.25,
    auto_trigger: { after_attempts: 4, after_seconds: 210 },
  });

  // Level 4: Near-complete answer (significant penalty)
  hints.push({
    level: 4,
    text: buildHintLevel4(concepts),
    reveals_answer: true,
    score_penalty: 0.5,
  });

  return hints;
}

// ---------- Narrative Builders ----------

function buildEntryNarrative(roomType: string, index: number, total: number): string {
  const narratives: Record<string, string> = {
    briefing: "Vous entrez dans la salle de briefing. Les écrans s'allument, les données affluent. Votre mission commence ici.",
    exploration: "La porte s'ouvre sur un espace rempli d'indices. Chaque détail compte. Observez attentivement.",
    analysis: "Vous accédez au laboratoire d'analyse. Les données collectées doivent maintenant être décryptées.",
    diagnostic: "L'heure du diagnostic approche. Recoupez les indices et identifiez la solution.",
    decision: "Le moment de la décision. Toutes les informations convergent vers un choix crucial.",
    synthesis: "Salle de synthèse. Rassemblez vos découvertes pour construire votre conclusion.",
    final: "Dernière salle. Tout ce que vous avez appris et collecté mène à cette épreuve finale.",
  };
  return narratives[roomType] ?? `Vous entrez dans la salle ${index + 1} sur ${total}.`;
}

function buildCompletionNarrative(roomType: string, index: number, total: number): string {
  const narratives: Record<string, string> = {
    briefing: "Briefing assimilé. Vous êtes prêt pour la suite de la mission.",
    exploration: "Exploration terminée. Vous avez collecté des indices précieux.",
    analysis: "Analyse complétée. Les données révèlent leurs secrets.",
    diagnostic: "Diagnostic posé. Votre raisonnement est solide.",
    decision: "Décision prise. La voie est tracée.",
    synthesis: "Synthèse réussie. Vous avez assemblé les pièces du puzzle.",
    final: "Mission accomplie. Vous avez prouvé votre maîtrise.",
  };
  return narratives[roomType] ?? `Salle ${index + 1} complétée !`;
}

// ---------- Hint Builders ----------

function buildHintLevel1(roomType: string, concepts: NormalizedConcept[]): string {
  const hints: Record<string, string> = {
    briefing: "Prenez le temps de lire chaque élément. Les informations clés se cachent dans les détails.",
    exploration: "Observez chaque élément attentivement. La réponse est dans ce que vous voyez.",
    analysis: "Cherchez les liens logiques entre les éléments. Quel critère les distingue ?",
    diagnostic: "Éliminez d'abord ce qui est impossible. La réponse se révèlera par déduction.",
    decision: "Évaluez chaque option selon le contexte. Quelle est la plus cohérente ?",
    synthesis: "Rassemblez mentalement tous les indices collectés. La synthèse émerge de la vue d'ensemble.",
    final: "Mobilisez tout ce que vous avez appris. Chaque salle précédente contient un indice.",
  };
  return hints[roomType] ?? "Prenez du recul et relisez l'énoncé attentivement.";
}

function buildHintLevel2(concepts: NormalizedConcept[]): string {
  if (concepts.length === 0) return "Concentrez-vous sur les éléments fondamentaux.";
  const concept = concepts[0];
  const label = sanitizeMissionDisplayText(concept.normalized_label) || concept.normalized_label;
  const defPreview = sanitizeMissionDisplayText((concept.compressed_definition || concept.definition).slice(0, 80));
  return `Pensez au concept "${label}". Rappelez-vous : ${defPreview}…`;
}

function buildHintLevel3(concepts: NormalizedConcept[]): string {
  if (concepts.length === 0) return "La réponse est liée aux définitions fondamentales.";
  const concept = concepts[0];
  const label = sanitizeMissionDisplayText(concept.normalized_label) || concept.normalized_label;
  const def = sanitizeMissionDisplayText(concept.compressed_definition || concept.definition);
  return `La réponse est directement liée à "${label}" : ${def}`;
}

function buildHintLevel4(concepts: NormalizedConcept[]): string {
  if (concepts.length === 0) return "Consultez les indices collectés dans votre inventaire.";
  const concept = concepts[0];
  const answer = sanitizeMissionDisplayText(concept.normalized_label) || concept.normalized_label;
  const firstPart = answer.slice(0, Math.ceil(answer.length * 0.6));
  const def = sanitizeMissionDisplayText(concept.compressed_definition || concept.definition);
  return `La réponse est "${firstPart}…". ${def}`;
}

// ---------- Bonus / Surprise Puzzles ----------

function createBonusPuzzle(
  concept: NormalizedConcept,
  roomIndex: number,
  difficulty: number
): EscapePuzzle {
  const label = sanitizeMissionDisplayText(concept.normalized_label) || concept.normalized_label;
  const explanation = sanitizeMissionDisplayText(concept.compressed_definition || concept.definition);
  return {
    id: `puzzle_bonus_${roomIndex}_${crypto.randomUUID().slice(0, 8)}`,
    puzzle_type: "interpretation",
    brick_type: "OBSERVATION",
    prompt: `[DÉFI BONUS] Un message chiffré apparaît sur le mur : « ${scrambleText(label)} ». Déchiffrez le concept caché.`,
    instructions: "Ce défi bonus est optionnel mais rapporte des points supplémentaires. Identifiez le concept dissimulé.",
    options: shuffleArray([label, ...generateDecoys(label, 3)]),
    correct_answer: label,
    explanation: `Le concept caché était "${label}". ${explanation}`,
    concept_key: label,
    bloom_level: "analyze",
    difficulty: Math.min(5, difficulty + 1),
    solved: false,
    attempts: 0,
  };
}

/** Scramble text to create a cipher-like puzzle */
function scrambleText(text: string): string {
  const words = text.split(/\s+/);
  return words.map(w => {
    if (w.length <= 3) return w;
    const first = w[0];
    const last = w[w.length - 1];
    const middle = w.slice(1, -1).split("").sort(() => Math.random() - 0.5).join("");
    return `${first}${middle}${last}`;
  }).join(" ");
}

/** Generate decoy answers for scrambled puzzles */
function generateDecoys(correctLabel: string, count: number): string[] {
  const decoys: string[] = [];
  const words = correctLabel.split(/\s+/);
  for (let i = 0; i < count; i++) {
    const modified = words.map(w => {
      if (w.length <= 2) return w;
      const chars = w.split("");
      const idx = Math.floor(Math.random() * (chars.length - 1));
      chars[idx] = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      return chars.join("");
    }).join(" ");
    decoys.push(modified);
  }
  return decoys;
}

// ---------- Discoverable Generation ----------

function generateRoomDiscoverables(
  concepts: NormalizedConcept[],
  roomType: string,
  puzzles: EscapePuzzle[],
  roomIndex: number
): RoomDiscoverable[] {
  const discoverables: RoomDiscoverable[] = [];

  // Environmental element — always present, provides context
  const envDescriptions: Record<string, { label: string; text: string }> = {
    briefing: { label: "Tableau de briefing", text: "Un tableau blanc couvert de notes. Certaines informations semblent liées aux épreuves à venir." },
    exploration: { label: "Tiroir entrouvert", text: "Un tiroir laissé entrouvert contient des documents partiellement visibles. Peut-être un indice ?" },
    analysis: { label: "Écran de monitoring", text: "Un écran affiche des données en temps réel. Un motif se répète dans les résultats…" },
    diagnostic: { label: "Dossier annoté", text: "Un dossier avec des annotations manuscrites. Les marques soulignent des mots clés importants." },
    decision: { label: "Post-it sur le mur", text: "Plusieurs post-it colorés sont collés au mur. Ils semblent organiser une réflexion en arbre de décision." },
    synthesis: { label: "Schéma au tableau", text: "Un schéma relie plusieurs concepts entre eux. Les connexions dessinent une logique d'ensemble." },
    final: { label: "Coffre-fort entrouvert", text: "Un coffre-fort dont la porte est légèrement ouverte. À l'intérieur, un dernier indice…" },
  };

  const env = envDescriptions[roomType] ?? { label: "Élément suspect", text: "Quelque chose attire votre attention. Examinez plus attentivement." };
  discoverables.push({
    id: `disc_env_${roomIndex}`,
    label: env.label,
    type: "environment",
    discovery_text: env.text,
    discovered: false,
  });

  // Document clue — concept-based, hints at first puzzle answer
  if (concepts.length > 0) {
    const concept = concepts[0];
    const cleanLabel = sanitizeMissionDisplayText(concept.normalized_label) || concept.normalized_label;
    const defSnippet = sanitizeMissionDisplayText((concept.compressed_definition || concept.definition).slice(0, 100));
    discoverables.push({
      id: `disc_doc_${roomIndex}`,
      label: `Document: ${cleanLabel}`,
      type: "document",
      discovery_text: `Ce document révèle : "${defSnippet}…" — cette information pourrait être utile pour résoudre un puzzle.`,
      hints_at_puzzle_id: puzzles[0]?.id,
      discovered: false,
    });
  }

  // Hidden object — appears after solving first puzzle, grants a clue
  if (puzzles.length >= 2 && concepts.length >= 2) {
    const hiddenConcept = concepts[Math.min(1, concepts.length - 1)];
    const cleanHiddenLabel = sanitizeMissionDisplayText(hiddenConcept.normalized_label) || hiddenConcept.normalized_label;
    discoverables.push({
      id: `disc_secret_${roomIndex}`,
      label: "Objet caché",
      type: "secret",
      discovery_text: `Vous découvrez un indice caché ! Il mentionne "${cleanHiddenLabel}" — cela éclaire le puzzle suivant.`,
      hints_at_puzzle_id: puzzles[1]?.id,
      visible_after_puzzle_id: puzzles[0]?.id,
      discovered: false,
    });
  }

  return discoverables;
}

// ---------- Helper Functions ----------

function mapBrickToExtended(brick: BrickType): import("@/domain/cognitio/escapeEngine.types").ExtendedPuzzleType {
  const map: Record<BrickType, import("@/domain/cognitio/escapeEngine.types").ExtendedPuzzleType> = {
    OBSERVATION: "observation",
    TRI: "classification",
    SEQUENCE: "sequencing",
    ELIMINATION: "elimination",
    DECISION: "decision",
  };
  return map[brick] ?? "observation";
}

function mapDifficultyToBloom(difficulty: number): import("@/domain/cognitio/types").BloomLevel {
  if (difficulty <= 1) return "remember";
  if (difficulty <= 2) return "understand";
  if (difficulty <= 3) return "apply";
  if (difficulty <= 4) return "analyze";
  if (difficulty <= 5) return "evaluate";
  return "create";
}

function buildPuzzlePrompt(
  brick: BrickType,
  concept: NormalizedConcept,
  puzzleType: string
): string {
  const label = sanitizeMissionDisplayText(concept.normalized_label) || concept.normalized_label;
  const defPreview = sanitizeMissionDisplayText((concept.compressed_definition || concept.definition).slice(0, 60));

  switch (brick) {
    case "OBSERVATION":
      return `Observez et identifiez : ${defPreview}…`;
    case "TRI":
      return `Classez "${label}" parmi les catégories suivantes`;
    case "SEQUENCE":
      return `Placez "${label}" dans la bonne position de la séquence`;
    case "ELIMINATION":
      return `Parmi ces éléments, lequel est l'intrus ?`;
    case "DECISION":
      return `Quelle est la bonne approche pour "${label}" ?`;
    default:
      return `Résolvez : ${defPreview}…`;
  }
}

function buildPuzzleInstructions(puzzleType: string): string {
  const instructions: Record<string, string> = {
    observation: "Examinez attentivement les éléments et identifiez la bonne réponse.",
    classification: "Classez l'élément dans la catégorie appropriée.",
    sequencing: "Replacez les éléments dans le bon ordre.",
    elimination: "Identifiez l'élément qui ne correspond pas au groupe.",
    decision: "Choisissez l'option la plus adaptée au contexte.",
    association: "Reliez les éléments qui vont ensemble.",
    reconstruction: "Reconstituez l'élément à partir des fragments.",
    diagnostic: "Analysez les données et formulez votre diagnostic.",
    code_lock: "Utilisez les indices pour reconstituer le code.",
    synthesis: "Combinez les informations pour formuler votre réponse.",
    active_generation: "Rédigez votre réponse. Elle sera évaluée sur la présence des concepts clés.",
  };
  return instructions[puzzleType] ?? "Résolvez le puzzle pour progresser.";
}

function buildPuzzleUnlock(
  roomIndex: number,
  puzzleIndex: number,
  totalPuzzlesInRoom: number,
  totalRooms: number
): import("@/domain/cognitio/escapeEngine.types").PuzzleUnlock | undefined {
  // Last puzzle in room unlocks next room
  if (puzzleIndex === totalPuzzlesInRoom - 1 && roomIndex < totalRooms - 1) {
    return {
      type: "room",
      target_id: `room_${roomIndex + 1}`,
      unlock_message: `Salle ${roomIndex + 2} débloquée !`,
    };
  }

  // First puzzle unlocks an item
  if (puzzleIndex === 0) {
    return {
      type: "item",
      target_id: `item_${roomIndex}`,
      unlock_message: "Nouvel objet ajouté à votre inventaire !",
    };
  }

  return undefined;
}

function distributeConceptsToRooms(concepts: NormalizedConcept[], roomCount: number): NormalizedConcept[][] {
  const groups: NormalizedConcept[][] = Array.from({ length: roomCount }, () => []);

  for (let i = 0; i < concepts.length; i++) {
    const groupIndex = Math.min(Math.floor((i * roomCount) / concepts.length), roomCount - 1);
    groups[groupIndex].push(concepts[i]);
  }

  // Ensure each room has at least one concept (borrow from neighbors)
  for (let i = 0; i < roomCount; i++) {
    if (groups[i].length === 0 && concepts.length > 0) {
      // Borrow from the largest neighboring group
      const donor = groups.reduce((maxG, g, idx) =>
        g.length > groups[maxG].length ? idx : maxG, 0);
      if (groups[donor].length > 1) {
        groups[i].push(groups[donor].pop()!);
      }
    }
  }

  return groups;
}

function getItemTypeForRoom(roomType: string): import("@/domain/cognitio/escapeEngine.types").InventoryItemType {
  const map: Record<string, import("@/domain/cognitio/escapeEngine.types").InventoryItemType> = {
    briefing: "document",
    exploration: "clue",
    analysis: "data",
    diagnostic: "protocol",
    decision: "artifact",
    synthesis: "fragment",
    final: "badge",
  };
  return map[roomType] ?? "clue";
}

function buildItemName(concept: NormalizedConcept, itemType: string): string {
  const prefixes: Record<string, string> = {
    document: "Dossier",
    clue: "Indice",
    data: "Données",
    protocol: "Protocole",
    artifact: "Artéfact",
    fragment: "Fragment",
    badge: "Badge",
    key: "Clé",
  };
  const prefix = prefixes[itemType] ?? "Objet";
  return `${prefix}: ${concept.normalized_label}`;
}

function getItemIcon(itemType: string): string {
  const icons: Record<string, string> = {
    document: "file-text",
    clue: "search",
    data: "bar-chart-2",
    protocol: "clipboard-list",
    artifact: "gem",
    fragment: "puzzle",
    badge: "award",
    key: "key",
  };
  return icons[itemType] ?? "package";
}

function computeRoomTimeLimit(puzzleCount: number, difficulty: number): number {
  const baseSec = 120;
  const perPuzzle = 45;
  const difficultyFactor = 1 + (difficulty - 1) * 0.15;
  return Math.round((baseSec + puzzleCount * perPuzzle) * difficultyFactor);
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
