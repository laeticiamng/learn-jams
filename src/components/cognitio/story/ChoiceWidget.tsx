// ============================================================
// ChoiceWidget — Interactive choice for active pause scenes
// ============================================================

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";
import type { SceneChoiceWidget } from "@/domain/cognitio/story.types";

interface ChoiceWidgetProps {
  widget: SceneChoiceWidget;
  onAnswer: () => void;
}

export function ChoiceWidget({ widget, onAnswer }: ChoiceWidgetProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (optionId: string) => {
    if (selected) return; // Already answered
    setSelected(optionId);
    onAnswer();
  };

  return (
    <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50/50">
      <p className="text-sm font-medium mb-3">{widget.prompt}</p>

      <div className="space-y-2">
        {widget.options.map((option) => {
          const isSelected = selected === option.id;
          const isRevealed = selected !== null;
          const isCorrect = option.is_best;

          let borderClass = "border-muted";
          let bgClass = "bg-white hover:bg-muted/30";

          if (isRevealed) {
            if (isCorrect) {
              borderClass = "border-green-400";
              bgClass = "bg-green-50";
            } else if (isSelected && !isCorrect) {
              borderClass = "border-red-400";
              bgClass = "bg-red-50";
            } else {
              bgClass = "bg-white/50";
            }
          }

          return (
            <motion.button
              key={option.id}
              className={`w-full text-left border rounded-lg p-3 text-sm transition-colors ${borderClass} ${bgClass} ${
                !isRevealed ? "cursor-pointer" : "cursor-default"
              }`}
              onClick={() => handleSelect(option.id)}
              whileHover={!isRevealed ? { scale: 1.01 } : {}}
              whileTap={!isRevealed ? { scale: 0.99 } : {}}
            >
              <div className="flex items-center justify-between">
                <span>{option.label}</span>
                {isRevealed && isCorrect && (
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0 ml-2" />
                )}
                {isRevealed && isSelected && !isCorrect && (
                  <XCircle className="h-4 w-4 text-red-600 shrink-0 ml-2" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
