// ============================================================
// ProcessingTimeline — Visual pipeline progress indicator
// ============================================================

import { motion } from "framer-motion";
import { Check, Loader2, Circle } from "lucide-react";

export interface TimelineStep {
  label: string;
  status: "pending" | "active" | "completed" | "error";
  detail?: string;
}

interface ProcessingTimelineProps {
  steps: TimelineStep[];
  title?: string;
}

export function ProcessingTimeline({ steps, title }: ProcessingTimelineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-xl p-5 space-y-4"
    >
      {title && (
        <h3 className="text-sm font-semibold">{title}</h3>
      )}

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5">
              {step.status === "completed" && (
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              {step.status === "active" && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                </div>
              )}
              {step.status === "pending" && (
                <Circle className="w-5 h-5 text-muted-foreground/30" />
              )}
              {step.status === "error" && (
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">!</span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <p className={`text-xs font-medium ${
                step.status === "active" ? "text-primary" :
                step.status === "completed" ? "text-foreground" :
                step.status === "error" ? "text-red-600" :
                "text-muted-foreground"
              }`}>
                {step.label}
              </p>
              {step.detail && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{step.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
