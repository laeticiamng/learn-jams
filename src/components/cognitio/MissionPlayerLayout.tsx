// ============================================================
// MissionPlayerLayout — Main orchestrator for interactive
// mission gameplay: intro → rooms → boss → end screen
// ============================================================

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  MissionContent,
  MissionRoom,
  MissionItem,
  RoomEvent,
  CompositeScore,
} from "@/domain/cognitio/types";
import type { ValidationResult } from "@/services/cognitio/missionValidationEngine";
import {
  computeRoomProgress,
  computeRunSummary,
  type RoomProgress,
} from "@/services/cognitio/missionRunService";
import MissionIntroScreen from "./MissionIntroScreen";
import MissionProgressBar from "./MissionProgressBar";
import MissionRoomView from "./MissionRoomView";
import MissionBossView from "./MissionBossView";
import MissionEndScreen from "./MissionEndScreen";
import { useImmersion, useFeedback, useAudio } from "@/experience";

type MissionPhase = "intro" | "playing" | "boss" | "completed";

interface MissionPlayerLayoutProps {
  mission: MissionContent;
  missionId: string;
  onMissionStarted: () => void;
  onMissionCompleted: (events: RoomEvent[], score: CompositeScore) => void;
}

export default function MissionPlayerLayout({
  mission,
  missionId,
  onMissionStarted,
  onMissionCompleted,
}: MissionPlayerLayoutProps) {
  const navigate = useNavigate();
  const feedback = useFeedback();
  const audio = useAudio();
  const { setMood } = useImmersion();
  const [phase, setPhase] = useState<MissionPhase>("intro")
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const [hintsUsedCount, setHintsUsedCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());
  const itemStartRef = useRef(Date.now());

  // Timer
  useEffect(() => {
    if (phase !== "playing" && phase !== "boss") return;
    itemStartRef.current = Date.now();
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - itemStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentRoomIndex, currentItemIndex]);

  // Current room and item
  const currentRoom: MissionRoom | null = useMemo(() => {
    if (phase === "boss") return null;
    return mission.rooms[currentRoomIndex] ?? null;
  }, [mission, currentRoomIndex, phase]);

  const currentItem: MissionItem | null = useMemo(() => {
    if (phase === "boss" && mission.boss) {
      return mission.boss.items[currentItemIndex] ?? null;
    }
    return currentRoom?.items[currentItemIndex] ?? null;
  }, [mission, currentRoom, currentItemIndex, phase]);

  // Room completion tracking
  const roomsCompleted = useMemo(() => {
    return mission.rooms.map((room) => {
      const roomEvents = events.filter((e) => e.room_index === room.room_index);
      return roomEvents.length >= room.items.length;
    });
  }, [events, mission.rooms]);

  const bossUnlocked = roomsCompleted.every(Boolean);

  // Room progress
  const roomProgress = useMemo(
    () => computeRoomProgress(events, mission),
    [events, mission]
  );

  // Score
  const score = useMemo((): CompositeScore => {
    if (events.length === 0) {
      return { accuracy: 0, confidence_calibration: 0, bloom_coverage: 0, trap_detection: 0, completion_rate: 0, total: 0 };
    }
    const accuracy = events.filter((e) => e.is_correct).length / events.length;
    let calibrationSum = 0;
    for (const e of events) {
      calibrationSum += Math.abs(e.confidence - (e.is_correct ? 1 : 0));
    }
    const confidenceCalibration = Math.max(0, 1 - calibrationSum / events.length);
    const trapDetection = events.filter((e) => e.is_correct && !e.hint_used).length / Math.max(1, events.length);
    const bloomCoverage = Math.min(1, new Set(events.map((e) => e.item_id)).size / Math.max(4, events.length) + 0.3);
    const total = (accuracy * 0.35 + confidenceCalibration * 0.2 + bloomCoverage * 0.15 + trapDetection * 0.15 + 0.15) * 100;

    return {
      accuracy: Math.round(accuracy * 100) / 100,
      confidence_calibration: Math.round(confidenceCalibration * 100) / 100,
      bloom_coverage: Math.round(bloomCoverage * 100) / 100,
      trap_detection: Math.round(trapDetection * 100) / 100,
      completion_rate: 1,
      total: Math.round(total),
    };
  }, [events]);

  // -------- Handlers --------

  const handleStart = useCallback(() => {
    startTimeRef.current = Date.now();
    setPhase("playing");
    onMissionStarted();
  }, [onMissionStarted]);

  const handleAnswerSubmitted = useCallback(
    (result: ValidationResult, answer: string | string[], confidence: number, timeTakenMs: number) => {
      const event: RoomEvent = {
        room_index: phase === "boss" ? -1 : currentRoomIndex,
        item_id: currentItem?.id ?? "",
        answer_given: answer,
        is_correct: result.is_correct,
        time_taken_ms: timeTakenMs,
        confidence,
        hint_used: false, // tracked separately
      };
      setEvents((prev) => [...prev, event]);

      // Environmental feedback
      if (result.is_correct) {
        feedback.success();
        audio.play("success");
      } else {
        feedback.error();
        audio.play("error");
        // Overconfidence tension
        if (confidence > 0.7) {
          setMood("tension");
          setTimeout(() => setMood("focus"), 3000);
        }
      }
    },
    [phase, currentRoomIndex, currentItem, feedback, audio, setMood]
  );

  const handleNext = useCallback(() => {
    if (phase === "boss" && mission.boss) {
      if (currentItemIndex < mission.boss.items.length - 1) {
        setCurrentItemIndex((prev) => prev + 1);
      } else {
        // Boss completed
        setPhase("completed");
        onMissionCompleted(events, score);
      }
      return;
    }

    const room = currentRoom;
    if (!room) return;

    if (currentItemIndex < room.items.length - 1) {
      // Next item in room
      setCurrentItemIndex((prev) => prev + 1);
    } else if (currentRoomIndex < mission.rooms.length - 1) {
      // Next room — feedback unlock
      feedback.unlock();
      audio.play("unlock");
      setCurrentRoomIndex((prev) => prev + 1);
      setCurrentItemIndex(0);
    } else if (mission.boss) {
      // Go to boss — tension mood
      feedback.unlock();
      audio.play("unlock");
      setMood("tension");
      setPhase("boss");
      setCurrentItemIndex(0);
    } else {
      // Mission complete (no boss)
      setPhase("completed");
      onMissionCompleted(events, score);
    }
  }, [phase, currentRoom, currentItemIndex, currentRoomIndex, mission, events, score, onMissionCompleted]);

  const totalTimeSec = Math.floor((Date.now() - startTimeRef.current) / 1000);

  // -------- Render --------

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pt-24 relative">
      {/* Ambient background energy — shifts with progression */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-1000 z-0"
        style={{
          background: phase === "boss"
            ? "radial-gradient(ellipse at 50% 30%, hsl(0 80% 50% / 0.03), transparent 60%)"
            : phase === "completed"
              ? "radial-gradient(ellipse at 50% 30%, hsl(142 70% 50% / 0.04), transparent 60%)"
              : `radial-gradient(ellipse at 50% 30%, hsl(265 90% 60% / ${0.02 + (currentRoomIndex / Math.max(mission.rooms.length, 1)) * 0.02}), transparent 60%)`,
        }}
      />

      {/* Intro screen */}
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5 }}
            className="relative z-10"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/cognitio-library")}
              className="gap-2 text-muted-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la bibliothèque
            </Button>
            <MissionIntroScreen mission={mission} onStart={handleStart} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playing / Boss */}
      {(phase === "playing" || phase === "boss") && (
        <div className="relative z-10">
          {/* Header with room transition */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/cognitio-library")}
                className="gap-2 text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Quitter
              </Button>
              {/* Score indicator */}
              <motion.div
                key={score.total}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3 }}
                className="text-sm font-bold tabular-nums text-primary"
              >
                {Math.round(score.total)} pts
              </motion.div>
            </div>
            <h1 className="text-lg font-bold">{mission.title}</h1>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <MissionProgressBar
              rooms={mission.rooms.map((r) => ({
                title: r.title,
                brick_type: r.brick_type,
                items_count: r.items.length,
              }))}
              hasBoss={!!mission.boss}
              currentRoomIndex={currentRoomIndex}
              isBoss={phase === "boss"}
              roomsCompleted={roomsCompleted}
              bossUnlocked={bossUnlocked}
            />
          </div>

          {/* Gameplay with cinematic transitions */}
          <AnimatePresence mode="wait">
            {phase === "boss" && mission.boss ? (
              <motion.div
                key="boss"
                initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <MissionBossView
                  boss={mission.boss}
                  currentItemIndex={currentItemIndex}
                  onAnswerSubmitted={handleAnswerSubmitted}
                  onNext={handleNext}
                />
              </motion.div>
            ) : currentRoom && currentItem ? (
              <motion.div
                key={`room-${currentRoomIndex}-item-${currentItemIndex}`}
                initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <MissionRoomView
                  room={currentRoom}
                  item={currentItem}
                  itemIndex={currentItemIndex}
                  onAnswerSubmitted={handleAnswerSubmitted}
                  onNext={handleNext}
                  timerEnabled={true}
                  elapsed={elapsed}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}

      {/* End screen — completion reveal */}
      {phase === "completed" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10"
        >
          <MissionEndScreen
            mission={mission}
            events={events}
            score={score}
            roomProgress={roomProgress}
            totalTimeSec={totalTimeSec}
            hintsUsedCount={hintsUsedCount}
            onViewDebrief={() => navigate(`/mission/${missionId}/debrief`)}
            onBackToLibrary={() => navigate("/cognitio-library")}
            onReplay={() => window.location.reload()}
            onEscapeGame={() => navigate(`/mission/${missionId}/escape`)}
          />
        </motion.div>
      )}
    </div>
  );
}
