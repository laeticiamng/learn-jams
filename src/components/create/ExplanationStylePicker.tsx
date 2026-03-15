// ============================================================
// ExplanationStylePicker — Explanation style selection
// ============================================================

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { ExplanationStyle } from "@/domain/lyrics/learnerProfile.types";

interface ExplanationStylePickerProps {
  selected: ExplanationStyle;
  onSelect: (style: ExplanationStyle) => void;
}

const STYLE_IDS: ExplanationStyle[] = ["guided", "balanced", "academic", "professional"];

export default function ExplanationStylePicker({ selected, onSelect }: ExplanationStylePickerProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-2">
      {STYLE_IDS.map((id) => {
        const isActive = selected === id;
        return (
          <motion.button
            key={id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(id)}
            className={`flex flex-col px-3.5 py-3 rounded-xl border transition-all text-left ${
              isActive
                ? "border-primary/40 bg-primary/5 shadow-sm"
                : "border-border/20 bg-muted/10 hover:bg-muted/20"
            }`}
          >
            <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
              {t(`explanation_style.${id}.label`)}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {t(`explanation_style.${id}.desc`)}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
