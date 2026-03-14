// ============================================================
// LearnerLevelPicker — Target audience level selection
// ============================================================

import { motion } from "framer-motion";
import { GraduationCap, Building, Briefcase, RotateCcw, BookOpen, School } from "lucide-react";
import type { EducationStage } from "@/domain/lyrics/learnerProfile.types";

interface LearnerLevelPickerProps {
  selected: EducationStage;
  onSelect: (level: EducationStage) => void;
}

const LEVELS: { id: EducationStage; label: string; icon: typeof GraduationCap; gradient: string }[] = [
  { id: "middle_school", label: "Collège", icon: School, gradient: "from-green-400 to-emerald-500" },
  { id: "high_school", label: "Lycée", icon: BookOpen, gradient: "from-blue-400 to-cyan-500" },
  { id: "undergrad", label: "Licence", icon: GraduationCap, gradient: "from-purple-400 to-violet-500" },
  { id: "graduate", label: "Master", icon: Building, gradient: "from-orange-400 to-amber-500" },
  { id: "professional", label: "Professionnel", icon: Briefcase, gradient: "from-red-400 to-rose-500" },
  { id: "adult_reskilling", label: "Reprise d'études", icon: RotateCcw, gradient: "from-teal-400 to-cyan-500" },
];

export default function LearnerLevelPicker({ selected, onSelect }: LearnerLevelPickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {LEVELS.map((level) => {
        const Icon = level.icon;
        const isActive = selected === level.id;
        return (
          <motion.button
            key={level.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(level.id)}
            className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border transition-all text-left ${
              isActive
                ? "border-primary/40 bg-primary/5 shadow-sm"
                : "border-border/20 bg-muted/10 hover:bg-muted/20"
            }`}
          >
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${level.gradient} flex items-center justify-center shrink-0`}>
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
              {level.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
