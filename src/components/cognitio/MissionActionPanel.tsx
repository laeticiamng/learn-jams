// ============================================================
// MissionActionPanel — Answer selection, confidence slider,
// validation button, and hint trigger for mission rooms
// ============================================================

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lightbulb, Send } from "lucide-react";
import type { MissionItem } from "@/domain/cognitio/types";
import MissionPuzzleWidget from "./MissionPuzzleWidget";

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
  const [pendingAnswer, setPendingAnswer] = useState<string | string[] | null>(null);
  const [confidence, setConfidence] = useState(0.5);
  const [submitted, setSubmitted] = useState(false);
  const startTime = useRef(Date.now());

  // Determine if this brick type uses the integrated widget (with built-in submit)
  const usesIntegratedWidget = item.interaction_mode && item.interaction_mode !== "select";

  // Reset on new item
  useEffect(() => {
    setPendingAnswer(null);
    setConfidence(0.5);
    setSubmitted(false);
    startTime.current = Date.now();
  }, [item.id]);

  const handleWidgetAnswer = useCallback(
    (answer: string | string[]) => {
      if (submitted || disabled) return;
      if (usesIntegratedWidget) {
        // For integrated widgets, the widget itself triggers submission
        setPendingAnswer(answer);
      } else {
        setPendingAnswer(answer);
      }
    },
    [submitted, disabled, usesIntegratedWidget]
  );

  const handleSubmit = useCallback(() => {
    if (!pendingAnswer || submitted || disabled) return;
    const timeTaken = Date.now() - startTime.current;
    setSubmitted(true);
    onSubmit(pendingAnswer, confidence, timeTaken);
  }, [pendingAnswer, confidence, submitted, disabled, onSubmit]);

  // Auto-submit for integrated widgets once answer is set
  useEffect(() => {
    if (usesIntegratedWidget && pendingAnswer && !submitted) {
      // Show confidence slider briefly before submitting
    }
  }, [usesIntegratedWidget, pendingAnswer, submitted]);

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="glass-card-elevated p-6 rounded-xl space-y-4">
        <p className="font-medium text-base">{item.prompt}</p>

        {/* Puzzle widget — adapts to interaction mode */}
        {!submitted && (
          <MissionPuzzleWidget
            item={item}
            onAnswer={handleWidgetAnswer}
            disabled={submitted || disabled}
          />
        )}

        {/* Confidence slider */}
        <AnimatePresence>
          {!submitted && pendingAnswer && (
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
            disabled={!pendingAnswer || disabled}
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
