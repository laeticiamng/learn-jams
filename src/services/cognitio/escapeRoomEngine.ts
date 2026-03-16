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
} from "@/domain/cognitio/escapeEngine.types";
import type { BrickType } from "@/domain/cognitio/types";
import type { NormalizedConcept } from "./conceptNormalizer";

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
}

/**
 * Generate a sequence of escape rooms from concepts.
 * Each room has a purpose, lock, puzzles, rewards, and hints.
 */
export function generateEscapeRooms(input: RoomGenerationInput): EscapeRoom[] {
  const { concepts, roomCount, difficulty_base, includeCodeLocks, narrative_contexts } = input;
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

    // Create puzzles from concepts
    const bricks = ROOM_TYPE_TO_BRICKS[roomType] ?? ["OBSERVATION"];
    const puzzles = generateRoomPuzzles(roomConcepts, bricks, difficulty, i, roomCount, codeParts);

    // Create reward items
    const rewards = generateRoomRewards(roomConcepts, i, roomType);

    // Create 4-level hints
    const hints = generateRoomHints(roomConcepts, roomType, difficulty);

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
      target_concepts: roomConcepts.map(c => c.normalized_label),
      difficulty,
      time_limit_sec: computeRoomTimeLimit(puzzles.length, difficulty),
      unlocked: i === 0, // Only first room is unlocked initially
      completed: false,
    });
  }

  return rooms;
}

// ---------- Room Type Sequence ----------

function selectRoomTypeSequence(count: number): string[] {
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

    case "code_lock":
      // Check if all code parts have been discovered
      if (!lock.code) return false;
      const discoveredCode = Array.from(state.codes_discovered.values()).join("");
      return discoveredCode === lock.code;

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

    puzzles.push({
      id: puzzleId,
      puzzle_type: puzzleType,
      brick_type: brick,
      prompt: buildPuzzlePrompt(brick, concept, puzzleType),
      instructions: buildPuzzleInstructions(puzzleType),
      options,
      correct_answer: concept.normalized_label,
      explanation: concept.compressed_definition || concept.definition,
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

  return puzzles;
}

function createSynthesisPuzzle(
  concepts: NormalizedConcept[],
  roomIndex: number,
  difficulty: number
): EscapePuzzle {
  const conceptLabels = concepts.map(c => c.normalized_label);
  const keywords = concepts.flatMap(c => {
    const words = (c.compressed_definition || c.definition).split(/\s+/);
    return words.filter(w => w.length > 4).slice(0, 3);
  });

  return {
    id: `puzzle_synth_${roomIndex}_${crypto.randomUUID().slice(0, 8)}`,
    puzzle_type: "active_generation",
    brick_type: "DECISION",
    prompt: `En vous basant sur les concepts "${conceptLabels.join('", "')}", formulez une explication synthétique qui relie ces notions.`,
    instructions: "Rédigez votre réponse en 2-3 phrases. Votre réponse sera évaluée sur la présence des concepts clés.",
    input_type: "textarea",
    correct_answer: conceptLabels.join(", "),
    validation_keywords: [...new Set(keywords)].slice(0, 8),
    explanation: `Les concepts clés à intégrer étaient : ${conceptLabels.join(", ")}.`,
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

    rewards.push({
      id: `item_${roomIndex}_${crypto.randomUUID().slice(0, 8)}`,
      type: itemType,
      name: buildItemName(concept, itemType),
      description: concept.compressed_definition || concept.definition.slice(0, 120),
      icon: getItemIcon(itemType),
      source_room_index: roomIndex,
      is_key_item: roomIndex < 3, // First rooms give key items
      concept_key: concept.normalized_label,
      examine_text: `Cet objet contient des informations essentielles sur "${concept.normalized_label}".`,
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
  const defPreview = (concept.compressed_definition || concept.definition).slice(0, 80);
  return `Pensez au concept "${concept.normalized_label}". Rappelez-vous : ${defPreview}…`;
}

function buildHintLevel3(concepts: NormalizedConcept[]): string {
  if (concepts.length === 0) return "La réponse est liée aux définitions fondamentales.";
  const concept = concepts[0];
  return `La réponse est directement liée à "${concept.normalized_label}" : ${concept.compressed_definition || concept.definition}`;
}

function buildHintLevel4(concepts: NormalizedConcept[]): string {
  if (concepts.length === 0) return "Consultez les indices collectés dans votre inventaire.";
  const concept = concepts[0];
  const answer = concept.normalized_label;
  const firstPart = answer.slice(0, Math.ceil(answer.length * 0.6));
  return `La réponse est "${firstPart}…". ${concept.compressed_definition || concept.definition}`;
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
  const label = concept.normalized_label;
  const defPreview = (concept.compressed_definition || concept.definition).slice(0, 60);

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
