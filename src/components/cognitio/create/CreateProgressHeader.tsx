// ============================================================
// CreateProgressHeader — Cinematic step progression
// Intent: Show the user's journey from choice → upload → creation
// with visual weight and emotional rhythm.
// ============================================================

import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import type { CreateFormat } from "@/lib/create-format-config";

interface CreateProgressHeaderProps {
  selectedFormat: CreateFormat | null;
  hasSource: boolean;
}

export function CreateProgressHeader({ selectedFormat, hasSource }: CreateProgressHeaderProps) {
  const { t } = useTranslation();

  const steps = [
    {
      label: t("create_flow.step_format", { defaultValue: "Format" }),
      done: !!selectedFormat,
      active: !selectedFormat,
    },
    {
      label: t("create_flow.step_source", { defaultValue: "Contenu" }),
      done: hasSource,
      active: !!selectedFormat && !hasSource,
    },
    {
      label: t("create_flow.step_create", { defaultValue: "Création" }),
      done: false,
      active: !!selectedFormat && hasSource,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progress = completedCount / steps.length;

  return (
    <div className="relative mb-8">
      {/* Background track */}
      <div className="absolute top-[13px] left-[10%] right-[10%] h-px bg-border/20" />

      {/* Animated progress line */}
      <motion.div
        className="absolute top-[13px] left-[10%] h-px bg-gradient-to-r from-primary via-primary/80 to-primary/40 origin-left"
        style={{ right: "10%" }}
        animate={{ scaleX: progress }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      />

      <div className="flex items-center justify-between relative">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center gap-2 flex-1">
            <motion.div
              animate={{
                scale: step.active ? [1, 1.08, 1] : 1,
              }}
              transition={step.active ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-500 relative ${
                step.done
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : step.active
                    ? "bg-primary/10 text-primary border-2 border-primary/40"
                    : "bg-muted/20 text-muted-foreground/50 border border-border/20"
              }`}
            >
              {step.done ? (
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Check className="w-3.5 h-3.5" />
                </motion.div>
              ) : step.active ? (
                <Sparkles className="w-3 h-3" />
              ) : (
                i + 1
              )}
              {/* Active glow ring */}
              {step.active && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary/20"
                  animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
            </motion.div>
            <span
              className={`text-[11px] font-medium transition-all duration-300 ${
                step.done
                  ? "text-primary"
                  : step.active
                    ? "text-foreground"
                    : "text-muted-foreground/50"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
