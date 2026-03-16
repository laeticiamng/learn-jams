// ============================================================
// AdaptiveHintPanel — Context-aware hint button that adjusts
// visibility and urgency based on difficulty profile and
// hint usage.
// ============================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DifficultyProfile } from "@/domain/cognitio/immersiveEngine.types";

interface AdaptiveHintPanelProps {
  difficulty: DifficultyProfile;
  onRequestHint: () => void;
  hintsUsed: number;
}

export default function AdaptiveHintPanel({
  difficulty,
  onRequestHint,
  hintsUsed,
}: AdaptiveHintPanelProps) {
  const [expanded, setExpanded] = useState(false);

  // Determine hint availability
  const isGenerous = difficulty.hint_frequency === "generous";
  const isMinimal = difficulty.hint_frequency === "minimal";

  const hintLabel = isGenerous
    ? "Besoin d'aide ?"
    : isMinimal
      ? `Indice (${hintsUsed} utilisés)`
      : "Indice";

  return (
    <div className="absolute bottom-4 left-4 z-20">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: "spring" }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isMinimal && hintsUsed >= 3) {
              setExpanded(true);
            } else {
              onRequestHint();
            }
          }}
          className="gap-2 text-xs bg-background/80 backdrop-blur-sm border border-border/20 rounded-xl"
        >
          <Lightbulb className={`w-3.5 h-3.5 ${isGenerous ? "text-yellow-500" : "text-muted-foreground"}`} />
          {hintLabel}
        </Button>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-2 p-3 bg-background/95 backdrop-blur-xl border border-border/20 rounded-xl max-w-xs"
          >
            <p className="text-xs text-muted-foreground mb-2">
              Vous avez déjà utilisé {hintsUsed} indices. Chaque indice supplémentaire réduit votre score.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setExpanded(false)} className="text-xs">
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onRequestHint();
                  setExpanded(false);
                }}
                className="text-xs"
              >
                Demander quand même
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
