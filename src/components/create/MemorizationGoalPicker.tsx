// ============================================================
// MemorizationGoalPicker — Memorization objective selection
// ============================================================

import { motion } from "framer-motion";
import { Sparkles, BookOpen, ClipboardCheck, Brain } from "lucide-react";
import type { MemorizationGoal } from "@/domain/lyrics/learnerProfile.types";

interface MemorizationGoalPickerProps {
  selected: MemorizationGoal;
  onSelect: (goal: MemorizationGoal) => void;
}

const GOALS: { id: MemorizationGoal; label: string; icon: typeof Brain; desc: string }[] = [
  { id: "discover", label: "Comprendre", icon: Sparkles, desc: "Premiere decouverte du sujet" },
  { id: "revise", label: "Reviser", icon: BookOpen, desc: "Consolider les connaissances" },
  { id: "exam", label: "Examen", icon: ClipboardCheck, desc: "Preparer un controle ou examen" },
  { id: "max_retention", label: "Retention max", icon: Brain, desc: "Memoriser durablement par l'ecoute" },
];

export default function MemorizationGoalPicker({ selected, onSelect }: MemorizationGoalPickerProps) {
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
                {goal.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{goal.desc}</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
