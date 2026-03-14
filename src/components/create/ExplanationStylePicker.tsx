// ============================================================
// ExplanationStylePicker — Explanation style selection
// ============================================================

import { motion } from "framer-motion";
import type { ExplanationStyle } from "@/domain/lyrics/learnerProfile.types";

interface ExplanationStylePickerProps {
  selected: ExplanationStyle;
  onSelect: (style: ExplanationStyle) => void;
}

const STYLES: { id: ExplanationStyle; label: string; desc: string }[] = [
  { id: "guided", label: "Tres guide", desc: "Chaque notion est expliquee pas a pas" },
  { id: "balanced", label: "Equilibre", desc: "Un bon mix entre clarte et densite" },
  { id: "academic", label: "Academique", desc: "Vocabulaire technique, style universitaire" },
  { id: "professional", label: "Professionnel", desc: "Precision maximale, zero simplification" },
];

export default function ExplanationStylePicker({ selected, onSelect }: ExplanationStylePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {STYLES.map((style) => {
        const isActive = selected === style.id;
        return (
          <motion.button
            key={style.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(style.id)}
            className={`flex flex-col px-3.5 py-3 rounded-xl border transition-all text-left ${
              isActive
                ? "border-primary/40 bg-primary/5 shadow-sm"
                : "border-border/20 bg-muted/10 hover:bg-muted/20"
            }`}
          >
            <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
              {style.label}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">{style.desc}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
