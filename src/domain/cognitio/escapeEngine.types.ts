// ============================================================
// Escape Game Engine — Core Types
// Adds structural escape game mechanics on top of existing
// mission system: rooms with locks, puzzle dependencies,
// inventory, narrative arcs, and meta-progression.
// ============================================================

import type { BloomLevel, BrickType, MissionItem } from "./types";
import type { EscapeBrickType, MissionFamily, MissionUniverseProfile } from "./escapeGame.types";

// ---------- Extended Puzzle Types ----------

export const EXTENDED_PUZZLE_TYPES = [
  // Existing brick types (mapped)
  "observation",
  "classification",
  "sequencing",
  "elimination",
  "decision",
  // New escape-specific types
  "association",        // Link related elements
  "reconstruction",     // Rebuild a protocol/process from fragments
  "diagnostic",         // Analyze data to reach a diagnosis
  "code_lock",          // Combine answers to form a code
  "synthesis",          // Write/construct a response
  "interpretation",     // Interpret a document/image/data
  "logic_gate",         // Boolean logic puzzle
  "pattern_match",      // Find a pattern in data
  "active_generation",  // Create/write/formulate something
] as const;

export type ExtendedPuzzleType = (typeof EXTENDED_PUZZLE_TYPES)[number];

// ---------- Lock / Key System ----------

export type LockType =
  | "code_lock"         // Numeric/text code from puzzle answers
  | "key_item"          // Requires specific inventory item
  | "multi_key"         // Requires multiple items
  | "puzzle_gate"       // Requires specific puzzles solved
  | "score_gate"        // Requires minimum accuracy
  | "none";             // No lock (entry room)

export interface RoomLock {
  type: LockType;
  /** For code_lock: the code to enter */
  code?: string;
  /** For key_item: the inventory item id needed */
  required_item_id?: string;
  /** For multi_key: list of required item ids */
  required_item_ids?: string[];
  /** For puzzle_gate: list of puzzle ids that must be solved */
  required_puzzle_ids?: string[];
  /** For score_gate: minimum accuracy (0-1) */
  min_score?: number;
  /** Display text for the lock */
  lock_description: string;
  /** Hint for how to unlock */
  unlock_hint: string;
}

// ---------- Inventory Items ----------

export type InventoryItemType =
  | "document"     // Dossier, report, file
  | "artifact"     // Physical object, badge, tool
  | "clue"         // Textual or visual clue
  | "key"          // Unlock item
  | "data"         // Data set, chart, scan
  | "protocol"     // Procedure, methodology
  | "badge"        // Achievement badge
  | "fragment";    // Part of a larger puzzle

export interface InventoryItem {
  id: string;
  type: InventoryItemType;
  name: string;
  description: string;
  icon: string;            // Lucide icon name
  /** Which room/puzzle grants this item */
  source_room_index: number;
  source_puzzle_id?: string;
  /** Whether this item is required to proceed */
  is_key_item: boolean;
  /** Concept this item represents */
  concept_key?: string;
  /** Visual hint text shown when examining the item */
  examine_text?: string;
  /** Whether item has been collected */
  collected: boolean;
}

// ---------- Escape Room ----------

export interface EscapeRoom {
  room_index: number;
  id: string;
  title: string;
  /** Room purpose in the escape narrative */
  room_type: "briefing" | "exploration" | "analysis" | "diagnostic" | "decision" | "synthesis" | "final";
  narrative_context: string;
  /** Narrative intro when entering the room */
  entry_narrative: string;
  /** Narrative on completion */
  completion_narrative: string;
  /** Lock guarding this room */
  lock: RoomLock;
  /** Puzzles within this room */
  puzzles: EscapePuzzle[];
  /** Items that can be found/earned in this room */
  rewards: InventoryItem[];
  /** Progressive hints for the room (4 levels) */
  hints: EscapeHint[];
  /** Concepts targeted by this room */
  target_concepts: string[];
  /** Difficulty level 1-5 */
  difficulty: number;
  /** Time pressure (optional) */
  time_limit_sec?: number;
  /** Whether room is unlocked */
  unlocked: boolean;
  /** Whether room is completed */
  completed: boolean;
}

// ---------- Escape Puzzle ----------

export interface EscapePuzzle {
  id: string;
  puzzle_type: ExtendedPuzzleType;
  /** Original brick type for backwards compatibility */
  brick_type: BrickType | EscapeBrickType;
  prompt: string;
  instructions: string;
  /** For multiple-choice puzzles */
  options?: string[];
  /** For active generation puzzles */
  input_type?: "text" | "textarea" | "code" | "ordered_list" | "match_pairs";
  /** Correct answer(s) */
  correct_answer: string | string[];
  /** Validation keywords for free-text answers */
  validation_keywords?: string[];
  /** Explanation shown after answering */
  explanation: string;
  /** Concept this puzzle tests */
  concept_key: string;
  bloom_level: BloomLevel;
  difficulty: number;
  /** What this puzzle unlocks when solved */
  unlocks?: PuzzleUnlock;
  /** Whether this puzzle contributes to a code lock */
  code_contribution?: {
    position: number;    // Position in the code
    value: string;       // Value contributed when solved correctly
  };
  /** Required inventory items to attempt this puzzle */
  required_items?: string[];
  /** Whether this puzzle has been solved */
  solved: boolean;
  /** Number of attempts made */
  attempts: number;
}

export interface PuzzleUnlock {
  type: "room" | "puzzle" | "item" | "narrative";
  target_id: string;
  /** Message shown on unlock */
  unlock_message: string;
}

// ---------- 4-Level Hint System ----------

export interface EscapeHint {
  level: 1 | 2 | 3 | 4;
  text: string;
  /** Whether this hint practically reveals the answer */
  reveals_answer: boolean;
  /** Score penalty for using this hint */
  score_penalty: number;
  /** Condition to auto-show this hint */
  auto_trigger?: {
    after_attempts: number;
    after_seconds: number;
  };
}

// ---------- Narrative Arc ----------

export interface NarrativeArc {
  /** Opening briefing */
  briefing: NarrativeBeat;
  /** Per-room narrative beats */
  room_narratives: NarrativeBeat[];
  /** Tension escalation events */
  tension_events: TensionEvent[];
  /** Final resolution narrative */
  resolution: NarrativeBeat;
  /** Domain-specific setting */
  setting: string;
  /** Narrative tone */
  tone: "clinical" | "investigative" | "adventurous" | "scholarly" | "urgent" | "mysterious";
}

export interface NarrativeBeat {
  title: string;
  text: string;
  /** Emotional tone of this beat */
  emotion: "curiosity" | "tension" | "discovery" | "urgency" | "relief" | "triumph";
  /** Optional timed reveal delay (ms) */
  reveal_delay_ms?: number;
}

export interface TensionEvent {
  /** When this event triggers */
  trigger: "room_complete" | "puzzle_failed" | "time_warning" | "hint_used" | "boss_entered";
  room_index?: number;
  message: string;
  emotion: "warning" | "encouragement" | "dramatic" | "celebration";
}

// ---------- Full Escape Game Mission ----------

export interface EscapeGameSession {
  id: string;
  mission_id: string;
  user_id: string;
  /** All rooms in order */
  rooms: EscapeRoom[];
  /** Player inventory */
  inventory: InventoryItem[];
  /** Narrative arc */
  narrative: NarrativeArc;
  /** Current game state */
  state: EscapeGameState;
  /** Mission metadata */
  metadata: EscapeGameMetadata;
}

export interface EscapeGameState {
  current_room_index: number;
  current_puzzle_index: number;
  phase: "briefing" | "exploring" | "puzzle" | "room_complete" | "boss" | "debrief" | "completed";
  rooms_unlocked: number[];
  rooms_completed: number[];
  puzzles_solved: string[];
  inventory_collected: string[];
  codes_discovered: Map<string, string>;
  score: number;
  accuracy: number;
  hints_used: number;
  total_time_sec: number;
  events: EscapeEvent[];
}

export interface EscapeEvent {
  type: "puzzle_attempt" | "puzzle_solved" | "room_unlocked" | "room_completed" | "item_collected" | "hint_used" | "code_entered" | "narrative_seen";
  timestamp: string;
  room_index: number;
  puzzle_id?: string;
  item_id?: string;
  details: Record<string, unknown>;
}

export interface EscapeGameMetadata {
  mission_family: MissionFamily;
  universe_profile: MissionUniverseProfile;
  total_rooms: number;
  total_puzzles: number;
  total_items: number;
  estimated_duration_sec: number;
  difficulty_curve: number[];
  concepts_covered: string[];
  bloom_distribution: Partial<Record<BloomLevel, number>>;
}

// ---------- Debrief & Meta-Progression ----------

export interface EscapeDebrief {
  /** Overall performance */
  score: number;
  accuracy: number;
  completion_time_sec: number;
  rooms_completed: number;
  total_rooms: number;
  /** Per-concept mastery changes */
  concept_results: ConceptResult[];
  /** Items for spaced repetition */
  spaced_repetition_items: SpacedRepetitionItem[];
  /** Narrative resolution */
  resolution_narrative: string;
  /** Achievements earned */
  achievements: Achievement[];
  /** Recommendations */
  next_actions: NextAction[];
}

export interface ConceptResult {
  concept_key: string;
  concept_label: string;
  mastery_delta: number;
  was_correct: boolean;
  confidence: number;
  hints_used: number;
  bloom_level: BloomLevel;
}

export interface SpacedRepetitionItem {
  concept_key: string;
  next_review_at: string;
  review_type: "recall" | "recognition" | "generation" | "contrast";
  difficulty_adjustment: number;
  /** Which puzzle type to use for review */
  recommended_puzzle_type: ExtendedPuzzleType;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  condition: string;
}

export interface NextAction {
  type: "review" | "new_mission" | "boss_challenge" | "practice";
  label: string;
  description: string;
  priority: "high" | "medium" | "low";
  concept_keys?: string[];
}
