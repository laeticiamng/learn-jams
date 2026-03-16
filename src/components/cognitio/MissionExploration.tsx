// ============================================================
// MissionExploration — Renders narrative text with clickable
// keywords that reveal hidden clues and bonus hints.
// ============================================================

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Sparkles } from "lucide-react";
import type { HiddenClue } from "@/domain/cognitio/types";

interface MissionExplorationProps {
  narrativeText: string;
  hiddenClues: HiddenClue[];
  onClueDiscovered?: (clue: HiddenClue) => void;
}

export default function MissionExploration({
  narrativeText,
  hiddenClues,
  onClueDiscovered,
}: MissionExplorationProps) {
  const [discoveredClues, setDiscoveredClues] = useState<Set<string>>(new Set());
  const [activeClue, setActiveClue] = useState<HiddenClue | null>(null);

  const handleKeywordClick = useCallback(
    (clue: HiddenClue) => {
      if (discoveredClues.has(clue.id)) {
        // Toggle display
        setActiveClue((prev) => (prev?.id === clue.id ? null : clue));
        return;
      }

      setDiscoveredClues((prev) => new Set(prev).add(clue.id));
      setActiveClue(clue);
      onClueDiscovered?.(clue);
    },
    [discoveredClues, onClueDiscovered]
  );

  // Build rendered text with highlighted keywords
  const renderNarrativeWithClues = () => {
    if (hiddenClues.length === 0) {
      return (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {narrativeText}
        </p>
      );
    }

    // Sort clues by position in text (longest keyword first to avoid partial matches)
    const sortedClues = [...hiddenClues].sort(
      (a, b) => b.trigger_keyword.length - a.trigger_keyword.length
    );

    // Build regex pattern from all keywords
    const escapedKeywords = sortedClues.map((c) =>
      c.trigger_keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );
    const pattern = new RegExp(`(${escapedKeywords.join("|")})`, "gi");

    const parts = narrativeText.split(pattern);

    return (
      <p className="text-sm text-muted-foreground leading-relaxed">
        {parts.map((part, i) => {
          const matchingClue = sortedClues.find(
            (c) => c.trigger_keyword.toLowerCase() === part.toLowerCase()
          );

          if (matchingClue) {
            const isDiscovered = discoveredClues.has(matchingClue.id);
            return (
              <span
                key={i}
                onClick={() => handleKeywordClick(matchingClue)}
                className={`cursor-pointer transition-all rounded px-0.5 ${
                  isDiscovered
                    ? "text-primary font-semibold underline decoration-primary/30 decoration-dotted"
                    : "hover:text-primary/80 hover:bg-primary/5 underline decoration-border/30 decoration-dotted"
                }`}
                title={isDiscovered ? "Indice découvert — cliquez pour revoir" : "Cliquez pour explorer"}
              >
                {part}
                {!isDiscovered && (
                  <Sparkles className="w-3 h-3 inline ml-0.5 text-yellow-500/50" />
                )}
              </span>
            );
          }

          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  };

  return (
    <div className="space-y-3">
      {/* Exploration hint */}
      {hiddenClues.length > 0 && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <Eye className="w-3 h-3" />
          <span>
            Explorez le texte — {discoveredClues.size}/{hiddenClues.length} indices découverts
          </span>
        </div>
      )}

      {/* Narrative with clickable keywords */}
      <div className="glass-card p-4 rounded-xl">
        {renderNarrativeWithClues()}
      </div>

      {/* Revealed clue panel */}
      <AnimatePresence>
        {activeClue && (
          <motion.div
            key={activeClue.id}
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-4 rounded-xl border-l-4 border-primary/40 space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-primary">
                  Indice découvert !
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {activeClue.clue_text}
              </p>
              {activeClue.bonus_hint && (
                <p className="text-xs text-primary/70 italic mt-1">
                  {activeClue.bonus_hint}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
