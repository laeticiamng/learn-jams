// ============================================================
// QABadge — Small status badge for QA result
// ============================================================

import type { QAStatus } from "@/domain/cognitio/qa.types";

interface QABadgeProps {
  status: QAStatus;
  score?: number;
}

const BADGE_CONFIG: Record<QAStatus, { label: string; className: string }> = {
  pass: { label: "QA OK", className: "bg-green-100 text-green-700 border-green-300" },
  warn: { label: "QA Avertissement", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  block: { label: "QA Bloqué", className: "bg-red-100 text-red-700 border-red-300" },
};

export function QABadge({ status, score }: QABadgeProps) {
  const config = BADGE_CONFIG[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === "pass" ? "bg-green-500" : status === "warn" ? "bg-yellow-500" : "bg-red-500"
      }`} />
      {config.label}
      {score != null && <span className="text-[10px] opacity-75">({score}/100)</span>}
    </span>
  );
}
