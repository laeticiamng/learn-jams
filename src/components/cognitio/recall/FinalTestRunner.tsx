// ============================================================
// FinalTestRunner — Runs a recall test with confidence rating
// ============================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Brain, CheckCircle2, XCircle } from "lucide-react";
import { ConfidenceScale } from "./ConfidenceScale";
import type { RecallItem, ConfidenceLevel } from "@/domain/cognitio/recall.types";

interface FinalTestRunnerProps {
  items: RecallItem[];
  currentIndex: number;
  onSubmit: (answer: string, confidence: ConfidenceLevel) => void;
  progress: number;
}

export function FinalTestRunner({ items, currentIndex, onSubmit, progress }: FinalTestRunnerProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceLevel | null>(null);
  const [textAnswer, setTextAnswer] = useState("");

  const item = items[currentIndex];
  if (!item) return null;

  const isQCU = item.type === "qcu";
  const hasAnswer = isQCU ? selectedAnswer !== null : textAnswer.trim().length > 0;
  const canSubmit = hasAnswer && confidence !== null;

  const handleSubmit = () => {
    if (!canSubmit || confidence === null) return;
    const answer = isQCU ? selectedAnswer! : textAnswer.trim();
    onSubmit(answer, confidence);
    setSelectedAnswer(null);
    setConfidence(null);
    setTextAnswer("");
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {currentIndex + 1} / {items.length}</span>
          <span className="flex items-center gap-1">
            <Brain className="w-3.5 h-3.5" />
            Bloom {item.bloom_level}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-5"
        >
          {/* Question */}
          <div className="glass-card-elevated p-5 md:p-6">
            <div className="flex items-start gap-2 mb-1">
              {item.is_discrimination && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                  Discrimination
                </span>
              )}
              {item.is_transfer && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                  Transfert
                </span>
              )}
            </div>
            <h3 className="text-base md:text-lg font-semibold leading-relaxed">{item.prompt}</h3>
          </div>

          {/* QCU Choices */}
          {isQCU && item.choices && (
            <div className="space-y-2">
              {item.choices.map((choice, i) => (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => setSelectedAnswer(choice)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    selectedAnswer === choice
                      ? "border-primary bg-primary/10"
                      : "border-border/30 bg-card/60 hover:bg-card/80"
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center text-xs font-semibold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm">{choice}</span>
                    {selectedAnswer === choice && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                  </span>
                </motion.button>
              ))}
            </div>
          )}

          {/* Text Answer */}
          {!isQCU && (
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Votre réponse..."
              className="w-full min-h-[100px] p-4 rounded-xl border border-border/30 bg-card/60 resize-y text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}

          {/* Confidence Scale */}
          <ConfidenceScale value={confidence} onChange={setConfidence} />

          {/* Submit */}
          <Button
            className="w-full h-11 rounded-xl"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {currentIndex + 1 < items.length ? (
              <>Suivant <ArrowRight className="w-4 h-4 ml-2" /></>
            ) : (
              "Terminer le test"
            )}
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
