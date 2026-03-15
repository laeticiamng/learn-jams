// ============================================================
// MemorizationGoalPicker — Memorization objective selection
// ============================================================

import { motion } from "framer-motion";
import { Sparkles, BookOpen, ClipboardCheck, Brain } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MemorizationGoal } from "@/domain/lyrics/learnerProfile.types";

interface MemorizationGoalPickerProps {
  selected: MemorizationGoal;
  onSelect: (goal: MemorizationGoal) => void;
}

const GOALS: { id: MemorizationGoal; icon: typeof Brain }[] = [
  { id: "discover", icon: Sparkles },
  { id: "revise", icon: BookOpen },
  { id: "exam", icon: ClipboardCheck },
  { id: "max_retention", icon: Brain },
];

export default function MemorizationGoalPicker({ selected, onSelect }: MemorizationGoalPickerProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-2">
      {GOALS.map((goal) => {
        const Icon = goal.icon;
        const isActive = selected === goal.id;
        return (
          <motion.button
            key={goal.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(goal.id)}
            className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl border transition-all text-left ${
              isActive
                ? "border-primary/40 bg-primary/5 shadow-sm"
                : "border-border/20 bg-muted/10 hover:bg-muted/20"
            }`}
          >
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <span className={`text-xs font-medium block ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {t(`memorization_goal.${goal.id}.label`)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {t(`memorization_goal.${goal.id}.desc`)}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
