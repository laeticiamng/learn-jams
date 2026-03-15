// ============================================================
// PipelineVisualization — Visual flow of M1→M7 pipeline steps
// Shows each stage with status, timing, and key metrics.
// ============================================================

import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  FileInput,
  Brain,
  Puzzle,
  Palette,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  ArrowRight,
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
  metric?: (counters: PipelineDebugCounters) => string | null;
}

const STEPS: StepConfig[] = [
  {
    key: "ingesting",
    labelKey: "pipeline_viz.step_ingesting",
    defaultLabel: "Import",
    icon: <FileInput className="w-4 h-4" />,
    metric: (c) => c.detected_sections_count > 0 ? `${c.detected_sections_count} sections` : null,
  },
  {
    key: "analyzing",
    labelKey: "pipeline_viz.step_analyzing",
    defaultLabel: "Analyse",
    icon: <Brain className="w-4 h-4" />,
    metric: (c) => c.extracted_concepts_after_filter_count > 0
      ? `${c.extracted_concepts_after_filter_count} concepts`
      : null,
  },
  {
    key: "architecting",
    labelKey: "pipeline_viz.step_architecting",
    defaultLabel: "Mémoire",
    icon: <Puzzle className="w-4 h-4" />,
    metric: (c) => c.memory_segments_generated_count > 0
      ? `${c.memory_segments_generated_count} segments`
      : null,
  },
  {
    key: "formatting",
    labelKey: "pipeline_viz.step_formatting",
    defaultLabel: "Format",
    icon: <Palette className="w-4 h-4" />,
    metric: (c) => c.final_format_decision || null,
  },
  {
    key: "generating",
    labelKey: "pipeline_viz.step_generating",
    defaultLabel: "Génération",
    icon: <Sparkles className="w-4 h-4" />,
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

  // Only show during/after pipeline execution
  if (phase === "import") return null;

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">
          {t("pipeline_viz.title", "Pipeline COGNITIO")}
        </span>
      </div>

      {/* Desktop: horizontal flow */}
      <div className="hidden sm:flex items-center gap-1 justify-between">
        {STEPS.map((step, i) => {
          const status = getStepStatus(step.key, phase, hasError);
          return (
            <div key={step.key} className="flex items-center gap-1 flex-1">
              <StepNode
                step={step}
                status={status}
                metric={debugCounters ? step.metric?.(debugCounters) ?? null : null}
                t={t}
              />
              {i < STEPS.length - 1 && (
                <ArrowRight className={`w-3.5 h-3.5 shrink-0 mx-0.5 ${
                  status === "done" ? "text-green-500" : "text-muted-foreground/30"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical flow */}
      <div className="flex sm:hidden flex-col gap-2">
        {STEPS.map((step) => {
          const status = getStepStatus(step.key, phase, hasError);
          return (
            <StepNode
              key={step.key}
              step={step}
              status={status}
              metric={debugCounters ? step.metric?.(debugCounters) ?? null : null}
              t={t}
              horizontal
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
}: {
  step: StepConfig;
  status: "pending" | "active" | "done" | "error";
  metric: string | null;
  t: (key: string, defaultValue: string) => string;
  horizontal?: boolean;
}) {
  const statusIcon = {
    pending: <Circle className="w-3 h-3 text-muted-foreground/40" />,
    active: <Loader2 className="w-3 h-3 text-primary animate-spin" />,
    done: <CheckCircle2 className="w-3 h-3 text-green-500" />,
    error: <XCircle className="w-3 h-3 text-red-500" />,
  };

  const bgColors = {
    pending: "bg-muted/20 border-border/20",
    active: "bg-primary/5 border-primary/30",
    done: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/30",
    error: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30",
  };

  const textColors = {
    pending: "text-muted-foreground/50",
    active: "text-primary",
    done: "text-green-700 dark:text-green-400",
    error: "text-red-700 dark:text-red-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${bgColors[status]} ${
        horizontal ? "flex-1" : ""
      }`}
    >
      <span className={textColors[status]}>{step.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium truncate ${textColors[status]}`}>
            {t(step.labelKey, step.defaultLabel)}
          </span>
          {statusIcon[status]}
        </div>
        {metric && status === "done" && (
          <span className="text-[10px] text-muted-foreground truncate block">
            {metric}
          </span>
        )}
      </div>
    </motion.div>
  );
}
