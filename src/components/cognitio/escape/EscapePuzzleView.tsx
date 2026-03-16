// ============================================================
// EscapePuzzleView — Renders and handles all puzzle types
// including active generation, code locks, and standard
// multiple-choice puzzles.
// ============================================================

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Lightbulb, Clock, ArrowRight, Check, X,
  Lock, Send, Pencil,
} from "lucide-react";
import type { EscapePuzzle, EscapeHint } from "@/domain/cognitio/escapeEngine.types";
import type { PuzzleValidationResult } from "@/services/cognitio/escapePuzzleEngine";
import EscapeDragDropPuzzle from "./EscapeDragDropPuzzle";
import type { DragDropMode } from "./EscapeDragDropPuzzle";

interface EscapePuzzleViewProps {
  puzzle: EscapePuzzle;
  puzzleIndex: number;
  totalPuzzles: number;
  roomTitle: string;
  timeElapsed: number;
  timeLimitSec?: number;
  onSubmit: (answer: string | string[], confidence: number) => PuzzleValidationResult | null;
  onHint: () => EscapeHint | null;
  onNext: () => void;
}

export default function EscapePuzzleView({
  puzzle,
  puzzleIndex,
  totalPuzzles,
  roomTitle,
  timeElapsed,
  timeLimitSec,
  onSubmit,
  onHint,
  onNext,
}: EscapePuzzleViewProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [confidence, setConfidence] = useState(0.5);
  const [result, setResult] = useState<PuzzleValidationResult | null>(null);
  const [hint, setHint] = useState<EscapeHint | null>(null);
  const [showConfidence, setShowConfidence] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when puzzle changes
  useEffect(() => {
    setSelectedAnswer(null);
    setTextAnswer("");
    setConfidence(0.5);
    setResult(null);
    setHint(null);
    setShowConfidence(false);
  }, [puzzle.id]);

  const isActiveGeneration = puzzle.puzzle_type === "active_generation" || puzzle.puzzle_type === "synthesis";
  const isDragDrop = puzzle.puzzle_type === "sequencing" || puzzle.puzzle_type === "association" || puzzle.puzzle_type === "reconstruction";
  const dragDropMode: DragDropMode = puzzle.puzzle_type === "association" ? "matching" : puzzle.puzzle_type === "reconstruction" ? "spatial" : "ordering";
  const hasOptions = puzzle.options && puzzle.options.length > 0 && !isDragDrop;

  const handleSubmit = useCallback(() => {
    const answer = isActiveGeneration ? textAnswer : selectedAnswer;
    if (!answer) return;

    const res = onSubmit(answer, confidence);
    if (res) setResult(res);
  }, [selectedAnswer, textAnswer, confidence, onSubmit, isActiveGeneration]);

  const handleDragDropSubmit = useCallback((answer: string[]) => {
    const res = onSubmit(answer, confidence);
    if (res) setResult(res);
  }, [onSubmit, confidence]);

  const handleHint = useCallback(() => {
    const h = onHint();
    if (h) setHint(h);
  }, [onHint]);

  const handleSelectAnswer = (option: string) => {
    if (result) return;
    setSelectedAnswer(option);
    setShowConfidence(true);
  };

  const handleTextChange = (text: string) => {
    setTextAnswer(text);
    if (text.length > 10) setShowConfidence(true);
  };

  return (
    <div className="space-y-5">
      {/* Puzzle header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">
            {getPuzzleTypeLabel(puzzle.puzzle_type)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Puzzle {puzzleIndex + 1}/{totalPuzzles}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {timeLimitSec && !result && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
              <Clock className="w-4 h-4" />
              {formatTime(timeElapsed)}/{formatTime(timeLimitSec)}
            </div>
          )}
          {puzzle.code_contribution && (
            <div className="flex items-center gap-1 text-xs text-amber-500">
              <Lock className="w-3 h-3" />
              Code
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground glass-card p-3 rounded-xl">
        {puzzle.instructions}
      </p>

      {/* Question */}
      <div className="glass-card-elevated p-5 rounded-xl space-y-4">
        <p className="font-medium text-sm leading-relaxed">{puzzle.prompt}</p>

        {/* Multiple choice options */}
        {hasOptions && !isActiveGeneration && (
          <div className="space-y-2">
            {puzzle.options!.map((option) => {
              const isSelected = selectedAnswer === option;
              const correctAnswer = Array.isArray(puzzle.correct_answer) ? puzzle.correct_answer[0] : puzzle.correct_answer;
              const showCorrect = result && option === correctAnswer;
              const showWrong = result && isSelected && !result.is_correct;

              return (
                <motion.button
                  key={option}
                  whileHover={!result ? { scale: 1.01 } : undefined}
                  whileTap={!result ? { scale: 0.99 } : undefined}
                  onClick={() => handleSelectAnswer(option)}
                  disabled={!!result}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${
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
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        showCorrect
                          ? "border-green-500 bg-green-500"
                          : showWrong
                            ? "border-red-500 bg-red-500"
                            : isSelected
                              ? "border-primary bg-primary"
                              : "border-border/40"
                      }`}
                    >
                      {showCorrect && <Check className="w-3 h-3 text-white" />}
                      {showWrong && <X className="w-3 h-3 text-white" />}
                    </div>
                    <span>{option}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Drag & drop puzzles */}
        {isDragDrop && !result && (
          <EscapeDragDropPuzzle
            mode={dragDropMode}
            items={puzzle.options ?? []}
            matchTargets={dragDropMode === "matching" ? (Array.isArray(puzzle.correct_answer) ? puzzle.correct_answer.map((_, i) => `Cible ${i + 1}`) : []) : undefined}
            correctOrder={Array.isArray(puzzle.correct_answer) ? puzzle.correct_answer : [puzzle.correct_answer]}
            prompt={puzzle.prompt}
            instructions={puzzle.instructions}
            onSubmit={handleDragDropSubmit}
            disabled={!!result}
          />
        )}

        {/* Active generation textarea */}
        {isActiveGeneration && (
          <div className="space-y-2">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={textAnswer}
                onChange={(e) => handleTextChange(e.target.value)}
                disabled={!!result}
                placeholder="Rédigez votre réponse ici..."
                className="w-full min-h-[120px] p-3 rounded-xl border border-border/20 bg-background/50 text-sm resize-y focus:outline-none focus:border-primary/50 disabled:opacity-50"
                aria-label="Votre réponse"
              />
              <Pencil className="absolute top-3 right-3 w-4 h-4 text-muted-foreground/30" />
            </div>
            {!result && textAnswer.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {textAnswer.split(/\s+/).length} mots
              </p>
            )}
          </div>
        )}

        {/* Confidence slider */}
        {!result && showConfidence && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-2 pt-2"
          >
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
          </motion.div>
        )}
      </div>

      {/* Hint */}
      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-4 rounded-xl border-l-4 border-yellow-500/50"
          >
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                  Indice niveau {hint.level}
                  {hint.score_penalty > 0 && (
                    <span className="text-muted-foreground font-normal">
                      {" "}(-{Math.round(hint.score_penalty * 100)}% score)
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{hint.text}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border-l-4 ${
              result.is_correct
                ? "bg-green-500/5 border-green-500/50"
                : "bg-red-500/5 border-red-500/50"
            }`}
          >
            <p
              className={`text-sm font-medium mb-1 ${
                result.is_correct
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {result.feedback_title}
            </p>
            <p className="text-sm text-muted-foreground mb-2">{result.feedback_message}</p>
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              {result.explanation}
            </p>
            {result.code_fragment && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-500">
                <Lock className="w-3 h-3" />
                Fragment de code découvert: <span className="font-mono font-bold">{result.code_fragment}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
              disabled={isActiveGeneration ? textAnswer.length < 10 : !selectedAnswer}
              className="ml-auto gap-2 gradient-bg-premium rounded-xl"
            >
              {isActiveGeneration ? (
                <>
                  <Send className="w-4 h-4" /> Soumettre
                </>
              ) : (
                "Valider"
              )}
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

// ---------- Helpers ----------

function getPuzzleTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    observation: "Observation",
    classification: "Classification",
    sequencing: "Séquençage",
    elimination: "Élimination",
    decision: "Décision",
    association: "Association",
    reconstruction: "Reconstruction",
    diagnostic: "Diagnostic",
    code_lock: "Code verrou",
    synthesis: "Synthèse",
    active_generation: "Génération active",
    interpretation: "Interprétation",
    logic_gate: "Logique",
    pattern_match: "Motifs",
  };
  return labels[type] ?? type;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
