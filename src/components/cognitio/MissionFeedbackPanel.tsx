// ============================================================
// MissionFeedbackPanel — Displays validation result with
// correct/incorrect feedback, explanation, and pedagogical note
// ============================================================

import { motion } from "framer-motion";
import { Check, X, AlertTriangle, ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ValidationFeedback } from "@/services/cognitio/missionValidationEngine";

interface MissionFeedbackPanelProps {
  isCorrect: boolean;
  feedback: ValidationFeedback;
  partialScore?: number;
  onNext: () => void;
}

export default function MissionFeedbackPanel({
  isCorrect,
  feedback,
  partialScore,
  onNext,
}: MissionFeedbackPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Result header */}
      <div
        className={`p-5 rounded-xl border-l-4 ${
          isCorrect
            ? "bg-green-500/5 border-green-500/50"
            : "bg-red-500/5 border-red-500/50"
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isCorrect ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {isCorrect ? (
              <Check className="w-5 h-5 text-white" />
            ) : (
              <X className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <p
              className={`font-bold ${
                isCorrect
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {feedback.title}
            </p>
            {partialScore !== undefined && partialScore > 0 && !isCorrect && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Score partiel : {Math.round(partialScore * 100)}%
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{feedback.message}</p>
      </div>

      {/* Correct answer display (if wrong) */}
      {!isCorrect && (
        <div className="glass-card p-4 rounded-xl border border-green-500/20">
          <p className="text-xs text-muted-foreground mb-1">Bonne réponse :</p>
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            {feedback.correct_answer_display}
          </p>
        </div>
      )}

      {/* Explanation */}
      <div className="glass-card p-4 rounded-xl space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Explication
        </p>
        <p className="text-sm text-foreground leading-relaxed">
          {feedback.explanation}
        </p>
      </div>

      {/* Pedagogical note */}
      {feedback.pedagogical_note && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20"
        >
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            {feedback.pedagogical_note}
          </p>
        </motion.div>
      )}

      {/* Encouragement */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lightbulb className="w-3.5 h-3.5 text-primary" />
        <p>{feedback.encouragement}</p>
      </div>

      {/* Next button */}
      <Button onClick={onNext} className="w-full gap-2 rounded-xl">
        Suivant <ArrowRight className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}
