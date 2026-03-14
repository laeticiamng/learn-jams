// ============================================================
// ConfidenceScale — 1-5 confidence rating for recall answers
// ============================================================

import { motion } from "framer-motion";
import { CONFIDENCE_LABELS, type ConfidenceLevel } from "@/domain/cognitio/recall.types";

interface ConfidenceScaleProps {
  value: ConfidenceLevel | null;
  onChange: (level: ConfidenceLevel) => void;
  disabled?: boolean;
}

const SCALE_COLORS: Record<ConfidenceLevel, string> = {
  1: "border-red-400 bg-red-50 text-red-700 hover:bg-red-100",
  2: "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100",
  3: "border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
  4: "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100",
  5: "border-green-400 bg-green-50 text-green-700 hover:bg-green-100",
};

const SELECTED_COLORS: Record<ConfidenceLevel, string> = {
  1: "border-red-500 bg-red-500 text-white",
  2: "border-orange-500 bg-orange-500 text-white",
  3: "border-yellow-500 bg-yellow-500 text-white",
  4: "border-blue-500 bg-blue-500 text-white",
  5: "border-green-500 bg-green-500 text-white",
};

export function ConfidenceScale({ value, onChange, disabled }: ConfidenceScaleProps) {
  const levels: ConfidenceLevel[] = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Quel est votre niveau de confiance ?
      </p>
      <div className="flex gap-2">
        {levels.map((level) => {
          const isSelected = value === level;
          const colorClass = isSelected ? SELECTED_COLORS[level] : SCALE_COLORS[level];

          return (
            <motion.button
              key={level}
              type="button"
              onClick={() => !disabled && onChange(level)}
              disabled={disabled}
              className={`flex-1 border rounded-lg px-2 py-2 text-center transition-all ${colorClass} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              whileHover={!disabled ? { scale: 1.05 } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
            >
              <div className="text-lg font-bold">{level}</div>
              <div className="text-[10px] leading-tight">{CONFIDENCE_LABELS[level]}</div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
