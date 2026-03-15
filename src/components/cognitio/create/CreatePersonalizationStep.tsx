// ============================================================
// CreatePersonalizationStep — Objective, level, style (step 3)
// Displayed as a collapsible "Affiner le rendu" section.
// ============================================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, Target, GraduationCap, MessageSquare } from "lucide-react";
import type { LearningObjective } from "@/domain/cognitio/types";
import type { EducationStage, ExplanationStyle } from "@/domain/cognitio/learner-profile.types";

interface CreatePersonalizationStepProps {
  objective: LearningObjective;
  educationStage: EducationStage;
  explanationStyle: ExplanationStyle;
  onObjectiveChange: (o: LearningObjective) => void;
  onEducationStageChange: (s: EducationStage) => void;
  onExplanationStyleChange: (s: ExplanationStyle) => void;
}

const OBJECTIVES: { value: LearningObjective; icon: string; label: string; desc: string }[] = [
  { value: "discovery", icon: "sparkles", label: "Découverte", desc: "Première approche du sujet" },
  { value: "revision", icon: "book", label: "Révision", desc: "Revoir un sujet déjà vu" },
  { value: "exam", icon: "clipboard", label: "Examen", desc: "Préparation d'un examen" },
  { value: "consolidation", icon: "layers", label: "Consolidation", desc: "Renforcer des acquis" },
];

const EDUCATION_STAGES: { value: EducationStage; label: string }[] = [
  { value: "middle_school", label: "Collège" },
  { value: "high_school", label: "Lycée" },
  { value: "undergrad", label: "Licence" },
  { value: "graduate", label: "Master" },
  { value: "professional", label: "Professionnel" },
  { value: "adult_reskilling", label: "Reprise d'études" },
  { value: "unknown", label: "Auto (prudent)" },
];

const EXPLANATION_STYLES: { value: ExplanationStyle; label: string; desc: string }[] = [
  { value: "guided", label: "Très guidée", desc: "Pas à pas" },
  { value: "balanced", label: "Équilibrée", desc: "Clarté + densité" },
  { value: "academic", label: "Académique", desc: "Vocabulaire technique" },
  { value: "professional", label: "Professionnelle", desc: "Précision maximale" },
];

export function CreatePersonalizationStep({
  objective,
  educationStage,
  explanationStyle,
  onObjectiveChange,
  onEducationStageChange,
  onExplanationStyleChange,
}: CreatePersonalizationStepProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Summary line showing current selections
  const currentObjectiveLabel = OBJECTIVES.find(o => o.value === objective)?.label ?? objective;
  const currentLevelLabel = EDUCATION_STAGES.find(s => s.value === educationStage)?.label ?? educationStage;
  const currentStyleLabel = EXPLANATION_STYLES.find(s => s.value === explanationStyle)?.label ?? explanationStyle;

  return (
    <div className="rounded-xl border border-border/30 bg-card/30 overflow-hidden">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-muted/20"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">
              {t("create_flow.personalization_title", { defaultValue: "Affiner le rendu" })}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {currentObjectiveLabel} · {currentLevelLabel} · {currentStyleLabel}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-5 border-t border-border/20 pt-4">
              {/* Smart defaults hint */}
              <p className="text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
                {t("create_flow.smart_defaults_hint", {
                  defaultValue: "COGNITIO adapte automatiquement le niveau et le style. Tu peux personnaliser davantage si tu veux.",
                })}
              </p>

              {/* Objective */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  {t("create.objective_label", { defaultValue: "Objectif d'apprentissage" })}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {OBJECTIVES.map((obj) => (
                    <button
                      key={obj.value}
                      onClick={() => onObjectiveChange(obj.value)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        objective === obj.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/30 hover:border-border/50 bg-card/50"
                      }`}
                    >
                      <p className="text-xs font-medium">{obj.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{obj.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Level & Style side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Level */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {t("create.level_label", { defaultValue: "Pour quel niveau ?" })}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EDUCATION_STAGES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => onEducationStageChange(s.value)}
                        className={`px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                          educationStage === s.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20 text-primary"
                            : "border-border/30 hover:border-border/50 bg-card/50 text-muted-foreground"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {t("create.style_label", { defaultValue: "Style d'explication" })}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EXPLANATION_STYLES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => onExplanationStyleChange(s.value)}
                        className={`px-2.5 py-2 rounded-lg border text-left transition-all ${
                          explanationStyle === s.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border/30 hover:border-border/50 bg-card/50"
                        }`}
                      >
                        <span className={`text-xs font-medium ${explanationStyle === s.value ? "text-primary" : "text-muted-foreground"}`}>
                          {s.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
