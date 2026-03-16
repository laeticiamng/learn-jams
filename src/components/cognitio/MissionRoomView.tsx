// ============================================================
// MissionRoomView — Complete room view combining narrative,
// action panel, hints, feedback, and room header
// ============================================================

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Lightbulb, Lock } from "lucide-react";
import type { MissionItem, MissionRoom as MissionRoomType, BrickType } from "@/domain/cognitio/types";
import { getBrickLabel } from "@/lib/cognitio-ui";
import MissionActionPanel from "./MissionActionPanel";
import MissionFeedbackPanel from "./MissionFeedbackPanel";
import MissionExploration from "./MissionExploration";
import { validateAnswer, type ValidationResult } from "@/services/cognitio/missionValidationEngine";
import {
  generateHint,
  createHintRecord,
  recordHintUsage,
  type HintUsageRecord,
} from "@/services/cognitio/missionHintEngine";

interface MissionRoomViewProps {
  room: MissionRoomType;
  item: MissionItem;
  itemIndex: number;
  onAnswerSubmitted: (result: ValidationResult, answer: string | string[], confidence: number, timeTakenMs: number) => void;
  onNext: () => void;
  timerEnabled?: boolean;
  elapsed?: number;
}

export default function MissionRoomView({
  room,
  item,
  itemIndex,
  onAnswerSubmitted,
  onNext,
  timerEnabled = true,
  elapsed = 0,
}: MissionRoomViewProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [hintRecord, setHintRecord] = useState<HintUsageRecord>(() => createHintRecord(item.id));

  // Reset on new item
  const resetState = useCallback(() => {
    setValidationResult(null);
    setHints([]);
    setHintRecord(createHintRecord(item.id));
  }, [item.id]);

  // Handle answer submission
  const handleSubmit = useCallback(
    (answer: string | string[], confidence: number, timeTakenMs: number) => {
      const result = validateAnswer({
        item,
        answer,
        time_taken_ms: timeTakenMs,
        confidence,
        hints_used: hintRecord.hints_requested,
      });

      setValidationResult(result);
      onAnswerSubmitted(result, answer, confidence, timeTakenMs);
    },
    [item, hintRecord.hints_requested, onAnswerSubmitted]
  );

  // Handle hint request
  const handleHint = useCallback(() => {
    const nextLevel = (hintRecord.hints_requested + 1) as 1 | 2 | 3;
    if (nextLevel > 3) return;

    const hint = generateHint({
      item,
      hint_level: nextLevel,
      learner_level: "university",
      previous_hints_used: hintRecord.hints_requested,
      time_spent_sec: elapsed,
    });

    setHints((prev) => [...prev, hint.text]);
    setHintRecord((prev) => recordHintUsage(prev, hint));
  }, [item, hintRecord, elapsed]);

  const handleNext = useCallback(() => {
    resetState();
    onNext();
  }, [resetState, onNext]);

  const timeLimitSec = room.time_limit_sec ?? 120;

  return (
    <div className="space-y-5">
      {/* Room header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">
            {getBrickLabel(room.brick_type)}
          </p>
          <h2 className="text-lg font-bold mt-1">{room.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {timerEnabled && !validationResult && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
              <Clock className="w-4 h-4" />
              {formatTime(elapsed)}/{formatTime(timeLimitSec)}
            </div>
          )}
          <span className="text-xs text-muted-foreground bg-border/20 px-2 py-1 rounded-full">
            {itemIndex + 1}/{room.items.length}
          </span>
        </div>
      </div>

      {/* Narrative context with exploration */}
      {room.hidden_clues && room.hidden_clues.length > 0 ? (
        <MissionExploration
          narrativeText={room.narrative_context}
          hiddenClues={room.hidden_clues}
        />
      ) : (
        <p className="text-sm text-muted-foreground leading-relaxed glass-card p-4 rounded-xl">
          {room.narrative_context}
        </p>
      )}

      {/* Required item notice */}
      {item.requires_item && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
          <Lock className="w-4 h-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            Cet exercice nécessite un fragment collecté dans la salle précédente.
          </p>
        </div>
      )}

      {/* Hints display */}
      <AnimatePresence>
        {hints.map((hint, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 rounded-xl border-l-4 border-yellow-500/50"
          >
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-yellow-600/70 font-semibold uppercase">
                  Indice {i + 1}/3
                </p>
                <p className="text-sm text-muted-foreground">{hint}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Action panel or feedback */}
      <AnimatePresence mode="wait">
        {!validationResult ? (
          <motion.div
            key="action"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MissionActionPanel
              item={item}
              onSubmit={handleSubmit}
              onRequestHint={handleHint}
              hintsAvailable={3 - hintRecord.hints_requested}
            />
          </motion.div>
        ) : (
          <motion.div
            key="feedback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MissionFeedbackPanel
              isCorrect={validationResult.is_correct}
              feedback={validationResult.feedback}
              partialScore={validationResult.partial_score}
              onNext={handleNext}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
