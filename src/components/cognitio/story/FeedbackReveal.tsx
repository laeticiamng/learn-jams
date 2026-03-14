// ============================================================
// FeedbackReveal — Shows corrective feedback after choice
// ============================================================

import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import type { SceneFeedbackReveal } from "@/domain/cognitio/story.types";

interface FeedbackRevealProps {
  reveal: SceneFeedbackReveal;
}

export function FeedbackReveal({ reveal }: FeedbackRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-green-200 bg-green-50 rounded-lg p-3"
    >
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">Explication</p>
          <p className="text-sm text-green-700 mt-1">{reveal.corrective_explanation}</p>
          {reveal.concept_reinforced.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {reveal.concept_reinforced.map((key) => (
                <span key={key} className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {key}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
