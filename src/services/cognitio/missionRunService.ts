// ============================================================
// Mission Run Service — Manages mission run lifecycle:
// create, progress, save, resume, complete
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  MissionContent,
  MissionRun,
  RoomEvent,
  CompositeScore,
  DebriefData,
  ErrorNode,
  OverconfidenceZone,
  BloomLevel,
} from "@/domain/cognitio/types";
import type { HintUsageRecord } from "./missionHintEngine";

// ---------- Types ----------

export interface MissionRunState {
  run_id: string;
  mission_id: string;
  user_id: string;
  current_room_index: number;
  current_item_index: number;
  is_boss: boolean;
  events: RoomEvent[];
  hint_records: Map<string, HintUsageRecord>;
  score_running: number;
  started_at: string;
  last_saved_at: string | null;
}

export interface RoomProgress {
  room_index: number;
  room_title: string;
  completed: boolean;
  items_total: number;
  items_answered: number;
  correct_count: number;
  hints_used: number;
  time_spent_ms: number;
}

export interface MissionRunSummary {
  run_id: string;
  total_rooms: number;
  rooms_completed: number;
  total_items: number;
  items_answered: number;
  correct_count: number;
  accuracy: number;
  hints_total: number;
  time_total_ms: number;
  is_complete: boolean;
}

// ---------- Run Lifecycle ----------

/**
 * Create a new mission run in the database.
 */
export async function createMissionRun(
  missionId: string,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("mission_runs")
    .insert({
      mission_id: missionId,
      user_id: userId,
      completion_status: "in_progress",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create mission run: ${error.message}`);
  return data.id;
}

/**
 * Save current progress of a mission run.
 */
export async function saveMissionProgress(state: MissionRunState): Promise<void> {
  const { error } = await supabase
    .from("mission_runs")
    .update({
      room_events_json: state.events as unknown as Json,
      difficulty_snapshot_json: {
        current_room: state.current_room_index,
        current_item: state.current_item_index,
        is_boss: state.is_boss,
      } as unknown as Json,
    })
    .eq("id", state.run_id);

  if (error) throw new Error(`Failed to save progress: ${error.message}`);
}

/**
 * Complete a mission run and generate debrief.
 */
export async function completeMissionRun(
  state: MissionRunState,
  mission: MissionContent
): Promise<{ score: CompositeScore; debrief: DebriefData }> {
  const score = computeFinalScore(state.events);
  const debrief = generateDebrief(state.events, mission, state.hint_records);

  const { error } = await supabase
    .from("mission_runs")
    .update({
      completed_at: new Date().toISOString(),
      completion_status: "completed",
      room_events_json: state.events as unknown as Json,
      score_composite_json: score as unknown as Json,
      debrief_json: debrief as unknown as Json,
    })
    .eq("id", state.run_id);

  if (error) throw new Error(`Failed to complete run: ${error.message}`);

  return { score, debrief };
}

/**
 * Abandon a mission run.
 */
export async function abandonMissionRun(runId: string): Promise<void> {
  const { error } = await supabase
    .from("mission_runs")
    .update({
      completed_at: new Date().toISOString(),
      completion_status: "abandoned",
    })
    .eq("id", runId);

  if (error) throw new Error(`Failed to abandon run: ${error.message}`);
}

/**
 * Resume an in-progress mission run.
 */
export async function resumeMissionRun(
  runId: string
): Promise<{ events: RoomEvent[]; snapshot: { current_room: number; current_item: number; is_boss: boolean } } | null> {
  const { data, error } = await supabase
    .from("mission_runs")
    .select("room_events_json, difficulty_snapshot_json, completion_status")
    .eq("id", runId)
    .single();

  if (error || !data || data.completion_status !== "in_progress") return null;

  const events = (data.room_events_json as unknown as RoomEvent[]) ?? [];
  const snapshot = (data.difficulty_snapshot_json as unknown as { current_room: number; current_item: number; is_boss: boolean }) ?? {
    current_room: 0,
    current_item: 0,
    is_boss: false,
  };

  return { events, snapshot };
}

// ---------- Progress Tracking ----------

/**
 * Compute room-by-room progress from events.
 */
export function computeRoomProgress(
  events: RoomEvent[],
  mission: MissionContent
): RoomProgress[] {
  const progress: RoomProgress[] = [];

  for (const room of mission.rooms) {
    const roomEvents = events.filter((e) => e.room_index === room.room_index);
    progress.push({
      room_index: room.room_index,
      room_title: room.title,
      completed: roomEvents.length >= room.items.length,
      items_total: room.items.length,
      items_answered: roomEvents.length,
      correct_count: roomEvents.filter((e) => e.is_correct).length,
      hints_used: roomEvents.filter((e) => e.hint_used).length,
      time_spent_ms: roomEvents.reduce((sum, e) => sum + e.time_taken_ms, 0),
    });
  }

  // Boss room
  if (mission.boss) {
    const bossEvents = events.filter((e) => e.room_index === -1);
    progress.push({
      room_index: -1,
      room_title: mission.boss.title,
      completed: bossEvents.length >= mission.boss.items.length,
      items_total: mission.boss.items.length,
      items_answered: bossEvents.length,
      correct_count: bossEvents.filter((e) => e.is_correct).length,
      hints_used: bossEvents.filter((e) => e.hint_used).length,
      time_spent_ms: bossEvents.reduce((sum, e) => sum + e.time_taken_ms, 0),
    });
  }

  return progress;
}

/**
 * Compute a run summary.
 */
export function computeRunSummary(
  runId: string,
  events: RoomEvent[],
  mission: MissionContent
): MissionRunSummary {
  const roomProgress = computeRoomProgress(events, mission);
  const totalRooms = roomProgress.length;
  const roomsCompleted = roomProgress.filter((r) => r.completed).length;
  const totalItems = roomProgress.reduce((s, r) => s + r.items_total, 0);
  const itemsAnswered = events.length;
  const correctCount = events.filter((e) => e.is_correct).length;
  const hintsTotal = events.filter((e) => e.hint_used).length;
  const timeTotal = events.reduce((s, e) => s + e.time_taken_ms, 0);

  return {
    run_id: runId,
    total_rooms: totalRooms,
    rooms_completed: roomsCompleted,
    total_items: totalItems,
    items_answered: itemsAnswered,
    correct_count: correctCount,
    accuracy: itemsAnswered > 0 ? correctCount / itemsAnswered : 0,
    hints_total: hintsTotal,
    time_total_ms: timeTotal,
    is_complete: roomsCompleted === totalRooms,
  };
}

// ---------- Score Computation ----------

function computeFinalScore(events: RoomEvent[]): CompositeScore {
  if (events.length === 0) {
    return { accuracy: 0, confidence_calibration: 0, bloom_coverage: 0, trap_detection: 0, completion_rate: 0, total: 0 };
  }

  const accuracy = events.filter((e) => e.is_correct).length / events.length;

  // Confidence calibration: how well does confidence predict correctness
  let calibrationSum = 0;
  for (const e of events) {
    const expected = e.confidence;
    const actual = e.is_correct ? 1 : 0;
    calibrationSum += Math.abs(expected - actual);
  }
  const confidenceCalibration = Math.max(0, 1 - calibrationSum / events.length);

  // Bloom coverage: diversity of cognitive levels tested
  const bloomLevels = new Set<string>();
  for (const e of events) {
    bloomLevels.add(e.item_id); // We use item_id as proxy
  }
  const bloomCoverage = Math.min(1, bloomLevels.size / Math.max(4, events.length) + 0.3);

  // Trap detection: correct answers without hints
  const trapDetection = events.filter((e) => e.is_correct && !e.hint_used).length / Math.max(1, events.length);

  // Completion rate
  const completionRate = 1;

  const total =
    accuracy * 0.35 +
    confidenceCalibration * 0.20 +
    bloomCoverage * 0.15 +
    trapDetection * 0.15 +
    completionRate * 0.15;

  return {
    accuracy: Math.round(accuracy * 100) / 100,
    confidence_calibration: Math.round(confidenceCalibration * 100) / 100,
    bloom_coverage: Math.round(bloomCoverage * 100) / 100,
    trap_detection: Math.round(trapDetection * 100) / 100,
    completion_rate: completionRate,
    total: Math.round(total * 100),
  };
}

// ---------- Debrief Generation ----------

function generateDebrief(
  events: RoomEvent[],
  mission: MissionContent,
  hintRecords: Map<string, HintUsageRecord>
): DebriefData {
  const score = computeFinalScore(events);

  // Error tree
  const errors: ErrorNode[] = events
    .filter((e) => !e.is_correct)
    .map((e) => {
      const item = findItemById(e.item_id, mission);
      return {
        concept_key: item?.concept_key ?? e.item_id,
        concept_label: item?.concept_key ?? e.item_id,
        error_type: determineErrorType(e, hintRecords.get(e.item_id)),
        room_index: e.room_index,
        bloom_level: item?.bloom_level ?? ("remember" as BloomLevel),
      };
    });

  // Fragile concepts
  const fragileConcepts = [...new Set(errors.map((e) => e.concept_key))];

  // Overconfidence zones
  const overconfidenceZones: OverconfidenceZone[] = events
    .filter((e) => e.confidence > 0.7 && !e.is_correct)
    .map((e) => ({
      concept_key: e.item_id,
      declared_confidence: e.confidence,
      actual_accuracy: 0,
      gap: e.confidence,
    }));

  // Revision plan
  const revisionPlan = fragileConcepts.map((key) => ({
    concept_key: key,
    action: "review" as const,
    priority: errors.filter((e) => e.concept_key === key).length > 1 ? "high" as const : "medium" as const,
  }));

  return {
    score,
    error_tree: errors,
    fragile_concepts: fragileConcepts,
    missed_traps: [],
    overconfidence_zones: overconfidenceZones,
    revision_plan: revisionPlan,
  };
}

function determineErrorType(
  event: RoomEvent,
  hintRecord?: HintUsageRecord
): "wrong_answer" | "overconfident" | "slow" | "hint_needed" {
  if (event.confidence > 0.7) return "overconfident";
  if (hintRecord && hintRecord.hints_requested >= 2) return "hint_needed";
  if (event.time_taken_ms > 120000) return "slow";
  return "wrong_answer";
}

function findItemById(itemId: string, mission: MissionContent) {
  for (const room of mission.rooms) {
    const item = room.items.find((i) => i.id === itemId);
    if (item) return item;
  }
  if (mission.boss) {
    return mission.boss.items.find((i) => i.id === itemId);
  }
  return null;
}
