// ============================================================
// EscapeDragDropPuzzle — Interactive drag-and-drop puzzle
// supporting ordering (sequencing), matching (association),
// and spatial (reconstruction) puzzle modes.
// ============================================================

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GripVertical, ArrowRight, Link2, Layers, RotateCcw } from "lucide-react";

// ---------- Types ----------

export type DragDropMode = "ordering" | "matching" | "spatial";

export interface DragDropPuzzleProps {
  mode: DragDropMode;
  /** Items to order / match */
  items: string[];
  /** For matching: target slots to match against */
  matchTargets?: string[];
  /** The correct order (for ordering) or correct mapping (for matching) */
  correctOrder: string[];
  prompt: string;
  instructions: string;
  onSubmit: (answer: string[]) => void;
  disabled?: boolean;
}

// ---------- Component ----------

export default function EscapeDragDropPuzzle({
  mode,
  items,
  matchTargets,
  correctOrder,
  prompt,
  instructions,
  onSubmit,
  disabled,
}: DragDropPuzzleProps) {
  const [orderedItems, setOrderedItems] = useState<string[]>(() =>
    shuffleArray([...items])
  );
  const [matchPairs, setMatchPairs] = useState<Map<string, string>>(new Map());
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleReset = useCallback(() => {
    setOrderedItems(shuffleArray([...items]));
    setMatchPairs(new Map());
    setSelectedSource(null);
    setSubmitted(false);
  }, [items]);

  const handleSubmitOrdering = useCallback(() => {
    setSubmitted(true);
    onSubmit(orderedItems);
  }, [orderedItems, onSubmit]);

  const handleSubmitMatching = useCallback(() => {
    const answer = (matchTargets ?? []).map(target =>
      matchPairs.get(target) ?? ""
    );
    setSubmitted(true);
    onSubmit(answer);
  }, [matchPairs, matchTargets, onSubmit]);

  const handleMatchSelect = useCallback((item: string, isTarget: boolean) => {
    if (submitted || disabled) return;

    if (!isTarget) {
      // Source item selected
      setSelectedSource(prev => prev === item ? null : item);
    } else {
      // Target selected — pair with selected source
      if (selectedSource) {
        setMatchPairs(prev => {
          const next = new Map(prev);
          // Remove any existing pair for this target or source
          for (const [k, v] of next) {
            if (v === selectedSource) next.delete(k);
          }
          next.set(item, selectedSource);
          return next;
        });
        setSelectedSource(null);
      }
    }
  }, [selectedSource, submitted, disabled]);

  // ---------- Ordering Mode ----------
  if (mode === "ordering") {
    return (
      <div className="space-y-4">
        <div className="glass-card p-3 rounded-xl">
          <p className="text-xs text-muted-foreground">{instructions}</p>
        </div>

        <p className="font-medium text-sm">{prompt}</p>

        <Reorder.Group
          axis="y"
          values={orderedItems}
          onReorder={submitted ? () => {} : setOrderedItems}
          className="space-y-2"
        >
          {orderedItems.map((item, index) => {
            const isCorrectPosition = submitted && correctOrder[index] === item;
            const isWrongPosition = submitted && correctOrder[index] !== item;

            return (
              <Reorder.Item
                key={item}
                value={item}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all select-none ${
                  submitted
                    ? isCorrectPosition
                      ? "border-green-500/40 bg-green-500/5"
                      : "border-red-500/40 bg-red-500/5"
                    : "border-border/20 bg-background hover:border-primary/30 cursor-grab active:cursor-grabbing"
                }`}
                dragListener={!submitted && !disabled}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {index + 1}
                </span>
                <span className="text-sm flex-1">{item}</span>
                {submitted && (
                  <span className="text-xs">
                    {isCorrectPosition ? "✓" : "✗"}
                  </span>
                )}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        <div className="flex items-center gap-3">
          {!submitted && (
            <>
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
              </Button>
              <Button
                onClick={handleSubmitOrdering}
                disabled={disabled}
                className="ml-auto gap-2 gradient-bg-premium rounded-xl"
              >
                Valider l'ordre <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------- Matching Mode ----------
  if (mode === "matching" && matchTargets) {
    const unpairedSources = items.filter(item =>
      !Array.from(matchPairs.values()).includes(item)
    );

    return (
      <div className="space-y-4">
        <div className="glass-card p-3 rounded-xl">
          <p className="text-xs text-muted-foreground">{instructions}</p>
        </div>

        <p className="font-medium text-sm">{prompt}</p>

        <div className="grid grid-cols-2 gap-4">
          {/* Sources */}
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Éléments
            </p>
            {items.map(item => {
              const isPaired = Array.from(matchPairs.values()).includes(item);
              const isSelected = selectedSource === item;

              return (
                <motion.button
                  key={`src-${item}`}
                  whileHover={!submitted ? { scale: 1.02 } : undefined}
                  whileTap={!submitted ? { scale: 0.98 } : undefined}
                  onClick={() => handleMatchSelect(item, false)}
                  disabled={submitted || disabled}
                  className={`w-full text-left p-2.5 rounded-xl border text-sm transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : isPaired
                        ? "border-green-500/30 bg-green-500/5 opacity-60"
                        : "border-border/20 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Targets */}
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Cibles
            </p>
            {matchTargets.map(target => {
              const pairedWith = matchPairs.get(target);
              const isCorrect = submitted && pairedWith === correctOrder[matchTargets.indexOf(target)];
              const isWrong = submitted && pairedWith !== correctOrder[matchTargets.indexOf(target)];

              return (
                <motion.button
                  key={`tgt-${target}`}
                  whileHover={!submitted && selectedSource ? { scale: 1.02 } : undefined}
                  onClick={() => handleMatchSelect(target, true)}
                  disabled={submitted || disabled || !selectedSource}
                  className={`w-full text-left p-2.5 rounded-xl border text-sm transition-all ${
                    submitted
                      ? isCorrect
                        ? "border-green-500/40 bg-green-500/5"
                        : "border-red-500/40 bg-red-500/5"
                      : pairedWith
                        ? "border-amber-500/30 bg-amber-500/5"
                        : selectedSource
                          ? "border-primary/30 hover:bg-primary/5 border-dashed"
                          : "border-border/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{target}</span>
                      {pairedWith && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 truncate block mt-0.5">
                          ← {pairedWith}
                        </span>
                      )}
                    </div>
                    {submitted && (
                      <span className="text-xs shrink-0">{isCorrect ? "✓" : "✗"}</span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!submitted && (
            <>
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
              </Button>
              <Button
                onClick={handleSubmitMatching}
                disabled={disabled || matchPairs.size < matchTargets.length}
                className="ml-auto gap-2 gradient-bg-premium rounded-xl"
              >
                Valider les paires <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------- Spatial / Reconstruction Mode ----------
  return (
    <div className="space-y-4">
      <div className="glass-card p-3 rounded-xl">
        <p className="text-xs text-muted-foreground">{instructions}</p>
      </div>

      <p className="font-medium text-sm">{prompt}</p>

      <Reorder.Group
        axis="y"
        values={orderedItems}
        onReorder={submitted ? () => {} : setOrderedItems}
        className="space-y-1.5"
      >
        {orderedItems.map((item, index) => {
          const isCorrectPosition = submitted && correctOrder[index] === item;

          return (
            <Reorder.Item
              key={item}
              value={item}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all select-none ${
                submitted
                  ? isCorrectPosition
                    ? "border-green-500/40 bg-green-500/5"
                    : "border-red-500/40 bg-red-500/5"
                  : "border-border/20 bg-background hover:border-primary/20 cursor-grab active:cursor-grabbing"
              }`}
              dragListener={!submitted && !disabled}
            >
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary">{index + 1}</span>
              </div>
              <span className="flex-1 truncate">{item}</span>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      <div className="flex items-center gap-3">
        {!submitted && (
          <>
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
            </Button>
            <Button
              onClick={handleSubmitOrdering}
              disabled={disabled}
              className="ml-auto gap-2 gradient-bg-premium rounded-xl"
            >
              Valider <ArrowRight className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Helpers ----------

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
