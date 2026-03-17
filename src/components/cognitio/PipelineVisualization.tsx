// ============================================================
// PipelineVisualization — Cinematic transformation sequence
// Intent: Make the M1→M7 pipeline feel like a dramatic reveal,
// not a progress bar. Each step activates, pulses, completes
// with visual weight.
// ============================================================

import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileInput,
  Brain,
  Puzzle,
  Palette,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
} from "lucide-react";
import type { PipelinePhase } from "@/hooks/useCreatePipeline";
import type { PipelineDebugCounters } from "@/domain/cognitio/contracts";

interface PipelineVisualizationProps {
  phase: PipelinePhase;
  debugCounters: PipelineDebugCounters | null;
  hasError: boolean;
}

interface StepConfig {
  key: PipelinePhase;
  labelKey: string;
  defaultLabel: string;
  icon: React.ReactNode;
  color: string;
  metric?: (counters: PipelineDebugCounters) => string | null;
}

const STEPS: StepConfig[] = [
  {
    key: "ingesting",
    labelKey: "pipeline_viz.step_ingesting",
    defaultLabel: "Import",
    icon: <FileInput className="w-4 h-4" />,
    color: "hsl(215, 80%, 55%)",
    metric: (c) => c.detected_sections_count > 0 ? `${c.detected_sections_count} sections` : null,
  },
  {
    key: "analyzing",
    labelKey: "pipeline_viz.step_analyzing",
    defaultLabel: "Analyse",
    icon: <Brain className="w-4 h-4" />,
    color: "hsl(265, 90%, 60%)",
    metric: (c) => c.extracted_concepts_after_filter_count > 0
      ? `${c.extracted_concepts_after_filter_count} concepts`
      : null,
  },
  {
    key: "architecting",
    labelKey: "pipeline_viz.step_architecting",
    defaultLabel: "Mémoire",
    icon: <Puzzle className="w-4 h-4" />,
    color: "hsl(300, 70%, 50%)",
    metric: (c) => c.memory_segments_generated_count > 0
      ? `${c.memory_segments_generated_count} segments`
      : null,
  },
  {
    key: "formatting",
    labelKey: "pipeline_viz.step_formatting",
    defaultLabel: "Format",
    icon: <Palette className="w-4 h-4" />,
    color: "hsl(180, 70%, 45%)",
    metric: (c) => c.final_format_decision || null,
  },
  {
    key: "generating",
    labelKey: "pipeline_viz.step_generating",
    defaultLabel: "Génération",
    icon: <Sparkles className="w-4 h-4" />,
    color: "hsl(45, 90%, 55%)",
    metric: (c) => c.generation_success ? "OK" : null,
  },
];

const PHASE_ORDER: PipelinePhase[] = ["import", "ingesting", "analyzing", "architecting", "formatting", "generating", "result"];

function getStepStatus(
  stepPhase: PipelinePhase,
  currentPhase: PipelinePhase,
  hasError: boolean,
): "pending" | "active" | "done" | "error" {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);
  const stepIdx = PHASE_ORDER.indexOf(stepPhase);

  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) {
    return hasError ? "error" : "active";
  }
  return "pending";
}

export function PipelineVisualization({ phase, debugCounters, hasError }: PipelineVisualizationProps) {
  const { t } = useTranslation();

  if (phase === "import") return null;

  const activeStepIndex = STEPS.findIndex(s => getStepStatus(s.key, phase, hasError) === "active");
  const completedCount = STEPS.filter(s => getStepStatus(s.key, phase, hasError) === "done").length;
  const progress = phase === "result" ? 100 : (completedCount / STEPS.length) * 100;

  return (
    <div className="glass-card-elevated rounded-2xl p-5 relative overflow-hidden">
      {/* Background energy gradient — shifts color based on active step */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: activeStepIndex >= 0
            ? `radial-gradient(ellipse at ${20 + activeStepIndex * 15}% 50%, ${STEPS[activeStepIndex].color}08, transparent 60%)`
            : phase === "result"
              ? "radial-gradient(ellipse at 80% 50%, hsl(142 70% 45% / 0.06), transparent 60%)"
              : "none",
        }}
        transition={{ duration: 1 }}
      />

      {/* Progress track */}
      <div className="relative mb-4">
        <div className="h-1 bg-border/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: phase === "result"
                ? "linear-gradient(90deg, hsl(142 70% 45%), hsl(142 70% 55%))"
                : "linear-gradient(90deg, hsl(265 90% 60%), hsl(215 80% 55%), hsl(300 70% 50%))",
            }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        </div>
      </div>

      {/* Desktop: horizontal flow */}
      <div className="hidden sm:flex items-center gap-0.5 justify-between relative">
        {STEPS.map((step, i) => {
          const status = getStepStatus(step.key, phase, hasError);
          return (
            <StepNode
              key={step.key}
              step={step}
              status={status}
              metric={debugCounters ? step.metric?.(debugCounters) ?? null : null}
              t={t}
              index={i}
            />
          );
        })}
      </div>

      {/* Mobile: vertical flow */}
      <div className="flex sm:hidden flex-col gap-2">
        {STEPS.map((step, i) => {
          const status = getStepStatus(step.key, phase, hasError);
          return (
            <StepNode
              key={step.key}
              step={step}
              status={status}
              metric={debugCounters ? step.metric?.(debugCounters) ?? null : null}
              t={t}
              horizontal
              index={i}
            />
          );
        })}
      </div>
    </div>
  );
}

function StepNode({
  step,
  status,
  metric,
  t,
  horizontal,
  index,
}: {
  step: StepConfig;
  status: "pending" | "active" | "done" | "error";
  metric: string | null;
  t: (key: string, defaultValue: string) => string;
  horizontal?: boolean;
  index: number;
}) {
  const statusIcon = {
    pending: <Circle className="w-3 h-3 text-muted-foreground/30" />,
    active: <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />,
    done: (
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
      </motion.div>
    ),
    error: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-500 relative ${
        status === "active"
          ? "bg-primary/8 border border-primary/20"
          : status === "done"
            ? "bg-green-500/5 border border-green-500/10"
            : status === "error"
              ? "bg-red-500/5 border border-red-500/10"
              : "border border-transparent"
      } ${horizontal ? "flex-1" : ""}`}
    >
      {/* Active glow pulse */}
      {status === "active" && (
        <motion.div
          className="absolute inset-0 rounded-xl border border-primary/10"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <span className={`relative z-10 ${
        status === "active" ? "text-primary" :
        status === "done" ? "text-green-400" :
        status === "error" ? "text-red-400" :
        "text-muted-foreground/40"
      }`}>
        {step.icon}
      </span>

      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium truncate ${
            status === "active" ? "text-foreground" :
            status === "done" ? "text-green-300/90" :
            status === "error" ? "text-red-300/90" :
            "text-muted-foreground/40"
          }`}>
            {t(step.labelKey, step.defaultLabel)}
          </span>
          {statusIcon[status]}
        </div>
        <AnimatePresence>
          {metric && status === "done" && (
            <motion.span
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[10px] text-muted-foreground/60 truncate block"
            >
              {metric}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
