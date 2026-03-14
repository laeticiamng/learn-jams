import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { RecallQuestion } from "@/domain/cognitio/types";

interface RecallConfidenceInputProps {
  question: RecallQuestion;
  onSubmit: (answer: string | string[], confidence: number) => void;
}

export default function RecallConfidenceInput({
  question,
  onSubmit,
}: RecallConfidenceInputProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0.5);

  const handleSubmit = useCallback(() => {
    if (selected) onSubmit(selected, confidence);
  }, [selected, confidence, onSubmit]);

  return (
    <div className="space-y-4">
      <p className="font-medium">{question.question}</p>

      {question.is_discrimination && (
        <p className="text-xs text-orange-500 flex items-center gap-1.5">
          Question de discrimination — attention aux confusions fréquentes
        </p>
      )}

      {question.options && (
        <div className="space-y-2">
          {question.options.map((option) => (
            <button
              key={option}
              onClick={() => setSelected(option)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selected === option
                  ? "border-primary bg-primary/5"
                  : "border-border/20 hover:border-border/40"
              }`}
            >
              <span className="text-sm">{option}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
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
            <span>Pas sûr du tout</span>
            <span>Absolument certain</span>
          </div>
        </motion.div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!selected}
        className="w-full rounded-xl"
      >
        Valider
      </Button>
    </div>
  );
}
