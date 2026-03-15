// ============================================================
// MissionActionPanel — Answer selection, confidence slider,
// validation button, and hint trigger for mission rooms
// ============================================================

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lightbulb, Check, X, Send } from "lucide-react";
import type { MissionItem, BrickType } from "@/domain/cognitio/types";

interface MissionActionPanelProps {
  item: MissionItem;
  onSubmit: (answer: string | string[], confidence: number, timeTakenMs: number) => void;
  onRequestHint: () => void;
  hintsAvailable: number;
  disabled?: boolean;
}

export default function MissionActionPanel({
  item,
  onSubmit,
  onRequestHint,
  hintsAvailable,
  disabled = false,
}: MissionActionPanelProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0.5);
  const [submitted, setSubmitted] = useState(false);
  const startTime = useRef(Date.now());

  // Reset on new item
  useEffect(() => {
    setSelectedAnswer(null);
    setConfidence(0.5);
    setSubmitted(false);
    startTime.current = Date.now();
  }, [item.id]);

  const handleSubmit = useCallback(() => {
    if (!selectedAnswer || submitted || disabled) return;
    const timeTaken = Date.now() - startTime.current;
    setSubmitted(true);
    onSubmit(selectedAnswer, confidence, timeTaken);
  }, [selectedAnswer, confidence, submitted, disabled, onSubmit]);

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="glass-card-elevated p-6 rounded-xl space-y-4">
        <p className="font-medium text-base">{item.prompt}</p>

        {/* Options */}
        {item.options && (
          <div className="space-y-2">
            {item.options.map((option) => {
              const isSelected = selectedAnswer === option;

              return (
                <motion.button
                  key={option}
                  whileHover={!submitted ? { scale: 1.01 } : undefined}
                  whileTap={!submitted ? { scale: 0.99 } : undefined}
                  onClick={() => !submitted && !disabled && setSelectedAnswer(option)}
                  disabled={submitted || disabled}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/20 hover:border-border/40"
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-border/40"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm">{option}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Confidence slider */}
        <AnimatePresence>
          {!submitted && selectedAnswer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 pt-2"
            >
              <label className="text-xs text-muted-foreground">
                Votre confiance :{" "}
                <span className="font-semibold text-foreground">
                  {Math.round(confidence * 100)}%
                </span>
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
                <span>Moyennement</span>
                <span>Très sûr</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      {!submitted && (
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRequestHint}
            disabled={hintsAvailable <= 0 || disabled}
            className="gap-2 text-muted-foreground"
          >
            <Lightbulb className="w-4 h-4" />
            Indice ({hintsAvailable})
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedAnswer || disabled}
            className="ml-auto gradient-bg-premium rounded-xl gap-2"
          >
            <Send className="w-4 h-4" />
            Valider
          </Button>
        </div>
      )}
    </div>
  );
}
