// ============================================================
// PublishStatusBanner — Shows publication readiness status
// ============================================================

import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import type { PublishDecision } from "@/domain/cognitio/qa.types";

interface PublishStatusBannerProps {
  decision: PublishDecision;
}

const STATUS_CONFIG: Record<PublishDecision["status"], {
  icon: typeof CheckCircle2;
  label: string;
  bgClass: string;
  textClass: string;
}> = {
  published: {
    icon: CheckCircle2,
    label: "Publié",
    bgClass: "bg-green-50 border-green-200",
    textClass: "text-green-800",
  },
  draft: {
    icon: Clock,
    label: "Brouillon",
    bgClass: "bg-muted/30 border-border",
    textClass: "text-muted-foreground",
  },
  review_needed: {
    icon: AlertTriangle,
    label: "Révision nécessaire",
    bgClass: "bg-yellow-50 border-yellow-200",
    textClass: "text-yellow-800",
  },
  blocked: {
    icon: XCircle,
    label: "Publication bloquée",
    bgClass: "bg-red-50 border-red-200",
    textClass: "text-red-800",
  },
};

export function PublishStatusBanner({ decision }: PublishStatusBannerProps) {
  const config = STATUS_CONFIG[decision.status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg p-4 ${config.bgClass}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${config.textClass}`} />
        <div>
          <p className={`text-sm font-medium ${config.textClass}`}>{config.label}</p>
          {decision.reason && (
            <p className={`text-xs mt-0.5 ${config.textClass} opacity-75`}>{decision.reason}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
