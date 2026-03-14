// ============================================================
// ExperimentBadge — Shows experiment variant (dev/admin only)
// ============================================================

import type { ExperimentVariant } from "@/domain/product/experiments.types";

interface ExperimentBadgeProps {
  experimentKey: string;
  variant: ExperimentVariant | null;
}

const VARIANT_COLORS: Record<ExperimentVariant, string> = {
  control: "bg-gray-100 text-gray-600",
  baseline_summary: "bg-blue-100 text-blue-600",
  dynamic_sheet: "bg-green-100 text-green-600",
  animated_story: "bg-purple-100 text-purple-600",
};

export function ExperimentBadge({ experimentKey, variant }: ExperimentBadgeProps) {
  if (!variant) return null;

  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${VARIANT_COLORS[variant] ?? "bg-gray-100 text-gray-600"}`}>
      {experimentKey}:{variant}
    </span>
  );
}
