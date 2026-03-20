// ============================================================
// PipelineSpectacle — Immersive pipeline visualization.
// Transforms the boring spinner into a cinematic progression.
// Each phase has its own mood, glow, and animation.
// Synced with the actual pipeline state from Supabase.
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Search,
  Brain,
  Layers,
  Sparkles,
  Check,
  Loader2,
  Circle,
} from "lucide-react";
import { useEffect } from "react";
import { useImmersion } from "./ImmersionContext";
import type { AmbientMood } from "./ImmersionContext";

interface PipelinePhase {
  key: string;
  label: string;
  icon: typeof Upload;
  mood: AmbientMood;
  glowColor: string;
  status: "pending" | "active" | "completed" | "error";
}

interface PipelineSpectacleProps {
  /** Current pipeline phase name */
  currentPhase: string;
  /** Title to display */
  title?: string;
}

const PHASES: Omit<PipelinePhase, "status">[] = [
  { key: "ingesting", label: "Import du document", icon: Upload, mood: "warm", glowColor: "hsl(265, 90%, 60%)" },
  { key: "analyzing", label: "Analyse sémantique", icon: Search, mood: "focus", glowColor: "hsl(215, 80%, 55%)" },
  { key: "architecting", label: "Architecture mémoire", icon: Brain, mood: "focus", glowColor: "hsl(200, 70%, 50%)" },
  { key: "formatting", label: "Design pédagogique", icon: Layers, mood: "focus", glowColor: "hsl(265, 60%, 45%)" },
  { key: "generating", label: "Génération du contenu", icon: Sparkles, mood: "tension", glowColor: "hsl(45, 100%, 65%)" },
];

function resolvePhaseStatus(
  phaseKey: string,
  currentPhase: string,
): "pending" | "active" | "completed" {
  const currentIdx = PHASES.findIndex((p) => p.key === currentPhase);
  const phaseIdx = PHASES.findIndex((p) => p.key === phaseKey);

  if (currentIdx < 0) return "pending";
  if (phaseIdx < currentIdx) return "completed";
  if (phaseIdx === currentIdx) return "active";
  return "pending";
}

export function PipelineSpectacle({
  currentPhase,
  title = "Transformation en cours",
}: PipelineSpectacleProps) {
  const { setMood, level } = useImmersion();

  // Sync ambient mood with active phase
  useEffect(() => {
    const active = PHASES.find((p) => p.key === currentPhase);
    if (active && level >= 1) {
      setMood(active.mood);
    }
  }, [currentPhase, setMood, level]);

  const phases: PipelinePhase[] = PHASES.map((p) => ({
    ...p,
    status: resolvePhaseStatus(p.key, currentPhase),
  }));

  const activePhase = phases.find((p) => p.status === "active");
  const completedCount = phases.filter((p) => p.status === "completed").length;
  const progress = Math.round(((completedCount + 0.5) / phases.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header with animated title */}
      <motion.div
        className="text-center space-y-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-lg font-bold font-display">{title}</h2>

        {/* Central pulsing orb */}
        <div className="relative w-16 h-16 mx-auto">
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              backgroundColor: activePhase?.glowColor ?? "hsl(265, 90%, 60%)",
              scale: [1, 1.3, 1],
              opacity: [0.15, 0.05, 0.15],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ filter: "blur(20px)" }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-t-primary border-primary/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            {activePhase && (
              <motion.div
                key={activePhase.key}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <activePhase.icon className="w-5 h-5 text-primary" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Active phase label */}
        <AnimatePresence mode="wait">
          {activePhase && (
            <motion.p
              key={activePhase.key}
              className="text-sm text-muted-foreground font-medium"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {activePhase.label}...
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Global progress bar */}
      <div className="space-y-2">
        <div className="h-1.5 bg-border/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full gradient-bg-premium"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center tabular-nums">
          {completedCount}/{phases.length} étapes
        </p>
      </div>

      {/* Phase steps */}
      <div className="space-y-2">
        {phases.map((phase, i) => {
          const Icon = phase.icon;
          return (
            <motion.div
              key={phase.key}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className={`flex items-center gap-3 p-3.5 rounded-xl transition-all duration-500 ${
                phase.status === "active"
                  ? "bg-primary/5 border border-primary/20"
                  : phase.status === "completed"
                    ? "bg-green-500/3 border border-green-500/10"
                    : "border border-transparent opacity-40"
              }`}
            >
              {/* Step icon */}
              {phase.status === "completed" ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0"
                >
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </motion.div>
              ) : phase.status === "active" ? (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 relative">
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  <motion.div
                    className="absolute inset-0 rounded-full border border-primary/15"
                    animate={{ scale: [1, 1.4, 1.4], opacity: [0.5, 0, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-muted/10 flex items-center justify-center shrink-0">
                  <Circle className="w-2.5 h-2.5 text-muted-foreground/25" />
                </div>
              )}

              {/* Label */}
              <div className="flex-1 flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${
                  phase.status === "active" ? "text-primary" :
                  phase.status === "completed" ? "text-green-400/70" :
                  "text-muted-foreground/30"
                }`} />
                <span className={`text-sm font-medium ${
                  phase.status === "active" ? "text-foreground" :
                  phase.status === "completed" ? "text-green-300/80" :
                  "text-muted-foreground/50"
                }`}>
                  {phase.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
