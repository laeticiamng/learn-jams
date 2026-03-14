import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, Clock, ArrowRight, Check, X } from "lucide-react";
import type { MissionItem, BrickType } from "@/domain/cognitio/types";
import { getBrickLabel } from "@/lib/cognitio-ui";

interface MissionRoomProps {
  roomTitle: string;
  brickType: BrickType;
  narrativeContext: string;
  item: MissionItem;
  itemIndex: number;
  totalItems: number;
  timerEnabled: boolean;
  timeLimitSec?: number;
  onSubmit: (answer: string | string[], confidence: number, timeTakenMs: number) => { isCorrect: boolean; explanation: string } | undefined;
  onHint: () => string | null;
  onNext: () => void;
}

export default function MissionRoom({
  roomTitle,
  brickType,
  narrativeContext,
  item,
  itemIndex,
  totalItems,
  timerEnabled,
  timeLimitSec = 120,
  onSubmit,
  onHint,
  onNext,
}: MissionRoomProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0.5);
  const [result, setResult] = useState<{ isCorrect: boolean; explanation: string } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    startTime.current = Date.now();
    setSelectedAnswer(null);
    setConfidence(0.5);
    setResult(null);
    setHint(null);
    setElapsed(0);
  }, [item.id]);

  useEffect(() => {
    if (!timerEnabled || result) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerEnabled, result]);

  const handleSubmit = useCallback(() => {
    if (!selectedAnswer) return;
    const timeTaken = Date.now() - startTime.current;
    const res = onSubmit(selectedAnswer, confidence, timeTaken);
    if (res) setResult(res);
  }, [selectedAnswer, confidence, onSubmit]);

  const handleHint = useCallback(() => {
    const h = onHint();
    if (h) setHint(h);
  }, [onHint]);

  return (
    <div className="space-y-6">
      {/* Room header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">
            {getBrickLabel(brickType)}
          </p>
          <h2 className="text-lg font-bold mt-1">{roomTitle}</h2>
        </div>
        <div className="flex items-center gap-3">
          {timerEnabled && !result && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
              <Clock className="w-4 h-4" />
              {formatTime(elapsed)}/{formatTime(timeLimitSec)}
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            {itemIndex + 1}/{totalItems}
          </span>
        </div>
      </div>

      {/* Narrative */}
      <p className="text-sm text-muted-foreground leading-relaxed glass-card p-4 rounded-xl">
        {narrativeContext}
      </p>

      {/* Question */}
      <div className="glass-card-elevated p-6 rounded-xl space-y-4">
        <p className="font-medium">{item.prompt}</p>

        {/* Options */}
        {item.options && (
          <div className="space-y-2">
            {item.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const showCorrect = result && option === item.correct_answer;
              const showWrong = result && isSelected && !result.isCorrect;

              return (
                <motion.button
                  key={option}
                  whileHover={!result ? { scale: 1.01 } : undefined}
                  whileTap={!result ? { scale: 0.99 } : undefined}
                  onClick={() => !result && setSelectedAnswer(option)}
                  disabled={!!result}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    showCorrect
                      ? "border-green-500 bg-green-500/10"
                      : showWrong
                        ? "border-red-500 bg-red-500/10"
                        : isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border/20 hover:border-border/40"
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      showCorrect
                        ? "border-green-500 bg-green-500"
                        : showWrong
                          ? "border-red-500 bg-red-500"
                          : isSelected
                            ? "border-primary bg-primary"
                            : "border-border/40"
                    }`}>
                      {showCorrect && <Check className="w-3 h-3 text-white" />}
                      {showWrong && <X className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm">{option}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Confidence slider */}
        {!result && selectedAnswer && (
          <div className="space-y-2 pt-2">
            <label className="text-xs text-muted-foreground">
              Votre confiance: {Math.round(confidence * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
              className="w-full accent-primary"
              aria-label="Niveau de confiance"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Pas sûr</span>
              <span>Très sûr</span>
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      {hint && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 rounded-xl border-l-4 border-yellow-500/50"
        >
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{hint}</p>
          </div>
        </motion.div>
      )}

      {/* Result explanation */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border-l-4 ${
            result.isCorrect
              ? "bg-green-500/5 border-green-500/50"
              : "bg-red-500/5 border-red-500/50"
          }`}
        >
          <p className={`text-sm font-medium mb-1 ${
            result.isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}>
            {result.isCorrect ? "Correct !" : "Incorrect"}
          </p>
          <p className="text-sm text-muted-foreground">{result.explanation}</p>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!result && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHint}
              className="gap-2 text-muted-foreground"
            >
              <Lightbulb className="w-4 h-4" /> Indice
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedAnswer}
              className="ml-auto gradient-bg-premium rounded-xl"
            >
              Valider
            </Button>
          </>
        )}
        {result && (
          <Button onClick={onNext} className="ml-auto gap-2 rounded-xl">
            Suivant <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
