// ============================================================
// IngestionStatus — Transformation staging
// Intent: Make each step feel like a visible transformation,
// not just a checklist. The active step breathes, the completed
// ones resolve with satisfaction.
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertCircle, Circle } from "lucide-react";
import type { PipelineStepStatus } from "@/domain/cognitio/types";

interface StepInfo {
  name: string;
  label: string;
  status: PipelineStepStatus;
  message?: string;
  progress?: number;
}

interface IngestionStatusProps {
  steps: StepInfo[];
  title?: string;
}

export default function IngestionStatus({ steps, title = "Progression" }: IngestionStatusProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {/* Overall pulse indicator */}
        {steps.some(s => s.status === "running") && (
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
      {steps.map((step, i) => (
        <motion.div
          key={step.name}
          initial={{ opacity: 0, x: -12, filter: "blur(4px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ delay: i * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={`flex items-center gap-3 p-3.5 rounded-xl transition-all duration-500 ${
            step.status === "running"
              ? "bg-primary/5 border border-primary/20 shadow-sm shadow-primary/5"
              : step.status === "completed"
                ? "bg-green-500/3 border border-green-500/10"
                : step.status === "error"
                  ? "bg-red-500/5 border border-red-500/10"
                  : "border border-transparent"
          }`}
        >
          <StepIcon status={step.status} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium transition-colors duration-300 ${
              step.status === "running"
                ? "text-foreground"
                : step.status === "completed"
                  ? "text-green-300/80"
                  : step.status === "error"
                    ? "text-red-300"
                    : "text-muted-foreground/50"
            }`}>
              {step.label}
            </p>
            <AnimatePresence>
              {step.message && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`text-xs mt-0.5 ${
                    step.status === "error" ? "text-red-400/80" : "text-muted-foreground/60"
                  }`}
                >
                  {step.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Progress indicator with animation */}
          {step.status === "running" && step.progress !== undefined && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-border/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary/60 rounded-full"
                  animate={{ width: `${step.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-xs tabular-nums text-primary font-mono">
                {step.progress}%
              </span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function StepIcon({ status }: { status: PipelineStepStatus }) {
  switch (status) {
    case "completed":
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0"
        >
          <Check className="w-3.5 h-3.5 text-green-400" />
        </motion.div>
      );
    case "running":
      return (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 relative">
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          {/* Breathing ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/15"
            animate={{ scale: [1, 1.4, 1.4], opacity: [0.5, 0, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        </div>
      );
    case "error":
      return (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center shrink-0"
        >
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        </motion.div>
      );
    default:
      return (
        <div className="w-7 h-7 rounded-full bg-muted/10 flex items-center justify-center shrink-0">
          <Circle className="w-2.5 h-2.5 text-muted-foreground/25" />
        </div>
      );
  }
}
