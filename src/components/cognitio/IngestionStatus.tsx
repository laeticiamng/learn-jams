import { motion } from "framer-motion";
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
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        {title}
      </h3>
      {steps.map((step, i) => (
        <motion.div
          key={step.name}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            step.status === "running"
              ? "bg-primary/5 border border-primary/20"
              : step.status === "completed"
                ? "bg-green-500/5 border border-green-500/10"
                : step.status === "error"
                  ? "bg-red-500/5 border border-red-500/10"
                  : "border border-transparent"
          }`}
        >
          <StepIcon status={step.status} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${
              step.status === "pending" ? "text-muted-foreground" : ""
            }`}>
              {step.label}
            </p>
            {step.message && (
              <p className={`text-xs mt-0.5 ${
                step.status === "error" ? "text-red-500" : "text-muted-foreground"
              }`}>
                {step.message}
              </p>
            )}
          </div>
          {step.status === "running" && step.progress !== undefined && (
            <span className="text-xs tabular-nums text-primary font-mono">
              {step.progress}%
            </span>
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
        <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
          <Check className="w-3.5 h-3.5 text-green-500" />
        </div>
      );
    case "running":
      return (
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        </div>
      );
    case "error":
      return (
        <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
        </div>
      );
    default:
      return (
        <div className="w-6 h-6 rounded-full bg-muted/20 flex items-center justify-center shrink-0">
          <Circle className="w-3 h-3 text-muted-foreground/40" />
        </div>
      );
  }
}
