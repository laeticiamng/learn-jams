// ============================================================
// Hook: useMissionPlay — Mission gameplay state management
// ============================================================

import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  MissionContent,
  MissionRoom,
  MissionItem,
  RoomEvent,
  CompositeScore,
  DebriefData,
} from "@/domain/cognitio/types";
import { computeCalibrationGap } from "@/domain/cognitio/validators";

type MissionPhase = "loading" | "intro" | "playing" | "completed";

interface MissionPlayState {
  currentRoomIndex: number;
  currentItemIndex: number;
  isBoss: boolean;
  events: RoomEvent[];
  hintsUsed: Set<string>;
  runId: string | null;
}

export function useMissionPlay(missionId: string, userId: string) {
  const [mission, setMission] = useState<MissionContent | null>(null);
  const [phase, setPhase] = useState<MissionPhase>("loading");
  const [state, setState] = useState<MissionPlayState>({
    currentRoomIndex: 0,
    currentItemIndex: 0,
    isBoss: false,
    events: [],
    hintsUsed: new Set(),
    runId: null,
  });
  const [timerEnabled, setTimerEnabled] = useState(true);

  const loadMission = useCallback(async () => {
    setPhase("loading");
    try {
      const { data, error } = await supabase
        .from("generated_missions")
        .select("mission_json")
        .eq("id", missionId)
        .single();

      if (error) throw error;

      const missionContent = (typeof data.mission_json === "string"
        ? JSON.parse(data.mission_json)
        : data.mission_json) as MissionContent;

      setMission(missionContent);
      setPhase("intro");
    } catch (err: unknown) {
      console.error("Failed to load mission:", err);
      setPhase("loading");
    }
  }, [missionId]);

  const startMission = useCallback(async () => {
    try {
      const { data: run, error: runError } = await supabase
        .from("mission_runs")
        .insert([{
          mission_id: missionId,
          user_id: userId,
          completion_status: "in_progress",
        }])
        .select("id")
        .single();

      if (runError) throw runError;

      setState({
        currentRoomIndex: 0,
        currentItemIndex: 0,
        isBoss: false,
        events: [],
        hintsUsed: new Set(),
        runId: run.id,
      });
      setPhase("playing");
    } catch (err: unknown) {
      console.error("Failed to start mission run:", err);
    }
  }, [missionId, userId]);

  const currentRoom: MissionRoom | null = useMemo(() => {
    if (!mission) return null;
    if (state.isBoss && mission.boss) return null;
    return mission.rooms[state.currentRoomIndex] ?? null;
  }, [mission, state.currentRoomIndex, state.isBoss]);

  const currentItem: MissionItem | null = useMemo(() => {
    if (!mission) return null;
    if (state.isBoss && mission.boss) {
      return mission.boss.items[state.currentItemIndex] ?? null;
    }
    return currentRoom?.items[state.currentItemIndex] ?? null;
  }, [mission, currentRoom, state.currentItemIndex, state.isBoss]);

  const totalRooms = useMemo(() => {
    if (!mission) return 0;
    return mission.rooms.length + (mission.boss ? 1 : 0);
  }, [mission]);

  const progress = useMemo(() => {
    if (totalRooms === 0) return 0;
    const completedRooms = state.currentRoomIndex + (state.isBoss ? mission?.rooms.length ?? 0 : 0);
    return Math.round((completedRooms / totalRooms) * 100);
  }, [state.currentRoomIndex, state.isBoss, totalRooms, mission]);

  const submitAnswer = useCallback(
    (answer: string | string[], confidence: number, timeTakenMs: number) => {
      if (!currentItem) return;

      const isCorrect = Array.isArray(currentItem.correct_answer)
        ? JSON.stringify([...answer].sort()) === JSON.stringify([...currentItem.correct_answer].sort())
        : answer === currentItem.correct_answer;

      const event: RoomEvent = {
        room_index: state.isBoss ? -1 : state.currentRoomIndex,
        item_id: currentItem.id,
        answer_given: answer,
        is_correct: isCorrect,
        time_taken_ms: timeTakenMs,
        confidence,
        hint_used: state.hintsUsed.has(currentItem.id),
      };

      setState((prev) => ({
        ...prev,
        events: [...prev.events, event],
      }));

      return { isCorrect, explanation: currentItem.explanation };
    },
    [currentItem, state.currentRoomIndex, state.isBoss, state.hintsUsed]
  );

  const useHint = useCallback(() => {
    if (!currentItem) return null;
    setState((prev) => ({
      ...prev,
      hintsUsed: new Set([...prev.hintsUsed, currentItem.id]),
    }));

    if (state.isBoss && mission?.boss) {
      const idx = Math.min(
        state.hintsUsed.size,
        mission.boss.hints.length - 1
      );
      return mission.boss.hints[idx] ?? null;
    }

    if (currentRoom) {
      const idx = Math.min(state.hintsUsed.size, currentRoom.hints.length - 1);
      return currentRoom.hints[idx] ?? null;
    }

    return null;
  }, [currentItem, currentRoom, mission, state.isBoss, state.hintsUsed]);

  const completeMission = useCallback(async () => {
    if (!state.runId) return;

    const score = computeCompositeScore(state.events);
    const debrief = computeDebrief(state.events, mission);

    await supabase
      .from("mission_runs")
      .update({
        completed_at: new Date().toISOString(),
        completion_status: "completed",
        room_events_json: state.events as unknown as Json,
        score_composite_json: score as unknown as Json,
        debrief_json: debrief as unknown as Json,
      })
      .eq("id", state.runId);

    setPhase("completed");
  }, [state.runId, state.events, mission]);

  const nextItem = useCallback(() => {
    if (!mission) return;

    const items = state.isBoss
      ? mission.boss?.items ?? []
      : currentRoom?.items ?? [];

    if (state.currentItemIndex < items.length - 1) {
      setState((prev) => ({
        ...prev,
        currentItemIndex: prev.currentItemIndex + 1,
      }));
    } else if (!state.isBoss && state.currentRoomIndex < mission.rooms.length - 1) {
      setState((prev) => ({
        ...prev,
        currentRoomIndex: prev.currentRoomIndex + 1,
        currentItemIndex: 0,
      }));
    } else if (!state.isBoss && mission.boss) {
      setState((prev) => ({
        ...prev,
        isBoss: true,
        currentItemIndex: 0,
      }));
    } else {
      completeMission();
    }
  }, [mission, currentRoom, state, completeMission]);

  const toggleTimer = useCallback(() => setTimerEnabled((prev) => !prev), []);

  return {
    mission,
    phase,
    state,
    currentRoom,
    currentItem,
    totalRooms,
    progress,
    loading: phase === "loading",
    timerEnabled,
    loadMission,
    startMission,
    submitAnswer,
    useHint,
    nextItem,
    toggleTimer,
  };
}

function computeCompositeScore(events: RoomEvent[]): CompositeScore {
  if (events.length === 0) {
    return { accuracy: 0, confidence_calibration: 0, bloom_coverage: 0, trap_detection: 0, completion_rate: 0, total: 0 };
  }

  const accuracy = events.filter((e) => e.is_correct).length / events.length;
  const calibrationGap = computeCalibrationGap(events);
  const confidence_calibration = Math.max(0, 1 - calibrationGap);
  const completion_rate = 1;
  const bloomLevels = new Set(events.map((e) => e.item_id));
  const bloom_coverage = Math.min(1, bloomLevels.size / Math.max(1, events.length) + 0.3);
  const trap_detection = events.filter((e) => e.is_correct && !e.hint_used).length / Math.max(1, events.length);

  const total = (accuracy * 0.35 + confidence_calibration * 0.2 + bloom_coverage * 0.15 + trap_detection * 0.15 + completion_rate * 0.15) * 100;

  return { accuracy, confidence_calibration, bloom_coverage, trap_detection, completion_rate, total: Math.round(total) };
}

function computeDebrief(events: RoomEvent[], mission: MissionContent | null): DebriefData | null {
  if (!mission || events.length === 0) return null;

  const score = computeCompositeScore(events);
  const errors = events
    .filter((e) => !e.is_correct)
    .map((e) => ({
      concept_key: e.item_id,
      concept_label: resolveConceptLabel(e.item_id, mission),
      error_type: e.confidence > 0.7 ? "overconfident" as const : "wrong_answer" as const,
      room_index: e.room_index,
      bloom_level: resolveBloomLevel(e.item_id, mission),
    }));

  const fragile = [...new Set(errors.map((e) => e.concept_key))];

  const overconfidence = events
    .filter((e) => e.confidence > 0.7 && !e.is_correct)
    .map((e) => ({
      concept_key: e.item_id,
      declared_confidence: e.confidence,
      actual_accuracy: 0,
      gap: e.confidence,
    }));

  return {
    score,
    error_tree: errors,
    fragile_concepts: fragile,
    missed_traps: [],
    overconfidence_zones: overconfidence,
    revision_plan: fragile.map((k) => ({
      concept_key: k,
      action: "review" as const,
      priority: "high" as const,
    })),
  };
}

function resolveConceptLabel(itemId: string, mission: MissionContent | null): string {
  if (!mission) return itemId;
  for (const room of mission.rooms) {
    const item = room.items.find((i) => i.id === itemId);
    if (item) return item.concept_key;
  }
  if (mission.boss) {
    const item = mission.boss.items.find((i) => i.id === itemId);
    if (item) return item.concept_key;
  }
  return itemId;
}

function resolveBloomLevel(itemId: string, mission: MissionContent | null): import("@/domain/cognitio/types").BloomLevel {
  if (!mission) return "remember";
  for (const room of mission.rooms) {
    const item = room.items.find((i) => i.id === itemId);
    if (item) return item.bloom_level;
  }
  if (mission.boss) {
    const item = mission.boss.items.find((i) => i.id === itemId);
    if (item) return item.bloom_level;
  }
  return "remember";
}
