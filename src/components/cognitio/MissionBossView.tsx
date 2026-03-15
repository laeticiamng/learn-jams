// ============================================================
// MissionBossView — Boss challenge with themed header,
// multi-brick types, and enhanced feedback
// ============================================================

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, Crown, Zap, Shield } from "lucide-react";
import type { MissionBossRoom, MissionItem } from "@/domain/cognitio/types";
import { getBrickLabel } from "@/lib/cognitio-ui";
import MissionActionPanel from "./MissionActionPanel";
import MissionFeedbackPanel from "./MissionFeedbackPanel";
import { validateAnswer, type ValidationResult } from "@/services/cognitio/missionValidationEngine";
import {
  generateHint,
  createHintRecord,
  recordHintUsage,
  type HintUsageRecord,
} from "@/services/cognitio/missionHintEngine";

interface MissionBossViewProps {
  boss: MissionBossRoom;
  currentItemIndex: number;
  onAnswerSubmitted: (result: ValidationResult, answer: string | string[], confidence: number, timeTakenMs: number) => void;
  onNext: () => void;
}

export default function MissionBossView({
  boss,
  currentItemIndex,
  onAnswerSubmitted,
  onNext,
}: MissionBossViewProps) {
  const currentItem = boss.items[currentItemIndex];
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [hintRecord, setHintRecord] = useState<HintUsageRecord>(() =>
    createHintRecord(currentItem?.id ?? "")
  );

  const resetState = useCallback(() => {
    setValidationResult(null);
    setHints([]);
    if (boss.items[currentItemIndex + 1]) {
      setHintRecord(createHintRecord(boss.items[currentItemIndex + 1].id));
    }
  }, [boss.items, currentItemIndex]);

  const handleSubmit = useCallback(
    (answer: string | string[], confidence: number, timeTakenMs: number) => {
      if (!currentItem) return;
      const result = validateAnswer({
        item: currentItem,
        answer,
        time_taken_ms: timeTakenMs,
        confidence,
        hints_used: hintRecord.hints_requested,
      });
      setValidationResult(result);
      onAnswerSubmitted(result, answer, confidence, timeTakenMs);
    },
    [currentItem, hintRecord.hints_requested, onAnswerSubmitted]
  );

  const handleHint = useCallback(() => {
    if (!currentItem) return;
    const nextLevel = (hintRecord.hints_requested + 1) as 1 | 2 | 3;
    if (nextLevel > 3) return;

    const hint = generateHint({
      item: currentItem,
      hint_level: nextLevel,
      learner_level: "university",
      previous_hints_used: hintRecord.hints_requested,
      time_spent_sec: 0,
    });

    setHints((prev) => [...prev, hint.text]);
    setHintRecord((prev) => recordHintUsage(prev, hint));
  }, [currentItem, hintRecord]);

  const handleNext = useCallback(() => {
    resetState();
    onNext();
  }, [resetState, onNext]);

  if (!currentItem) return null;

  return (
    <div className="space-y-5">
      {/* Boss header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card-elevated p-6 rounded-xl text-center border-2 border-red-500/20 relative overflow-hidden"
      >
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent" />

        <div className="relative z-10">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
            <Skull className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold">{boss.title}</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {boss.narrative_context}
          </p>

          {/* Brick types */}
          <div className="flex items-center justify-center gap-2 mt-3">
            {boss.brick_types.map((brick, i) => (
              <span
                key={i}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  currentItem.type === brick
                    ? "bg-red-500/20 text-red-500 border-red-500/30 font-semibold"
                    : "bg-red-500/5 text-red-400/70 border-red-500/10"
                }`}
              >
                {getBrickLabel(brick)}
              </span>
            ))}
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {boss.items.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < currentItemIndex
                    ? "bg-green-500"
                    : i === currentItemIndex
                      ? "bg-red-500 ring-2 ring-red-500/30"
                      : "bg-border/30"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Épreuve {currentItemIndex + 1}/{boss.items.length}
          </p>
        </div>
      </motion.div>

      {/* Hints */}
      <AnimatePresence>
        {hints.map((hint, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-3 rounded-xl border-l-4 border-yellow-500/50"
          >
            <p className="text-sm text-muted-foreground">{hint}</p>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Action or Feedback */}
      <AnimatePresence mode="wait">
        {!validationResult ? (
          <motion.div key="action" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MissionActionPanel
              item={currentItem}
              onSubmit={handleSubmit}
              onRequestHint={handleHint}
              hintsAvailable={3 - hintRecord.hints_requested}
            />
          </motion.div>
        ) : (
          <motion.div key="feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
