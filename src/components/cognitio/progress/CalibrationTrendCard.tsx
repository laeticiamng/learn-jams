// ============================================================
// CalibrationTrendCard — Confidence calibration trend over time
// ============================================================

import { motion } from "framer-motion";
import { Target } from "lucide-react";
import type { ProgressSnapshot } from "@/domain/cognitio/longitudinal.types";

interface CalibrationTrendCardProps {
  snapshots: ProgressSnapshot[];
}

export function CalibrationTrendCard({ snapshots }: CalibrationTrendCardProps) {
  const withCalibration = snapshots.filter((s) => s.avg_mastery_score !== null);

  if (withCalibration.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border rounded-lg p-5"
      >
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-muted-foreground" /> Tendance de calibration
        </h3>
        <p className="text-xs text-muted-foreground">
          Il faut au moins 2 sessions pour afficher la tendance.
        </p>
      </motion.div>
    );
  }

  const recent = [...withCalibration].slice(-7);
  const maxScore = Math.max(...recent.map((s) => s.avg_mastery_score ?? 0), 0.01);

  // Compute trend direction
  const first = recent[0].avg_mastery_score ?? 0;
  const last = recent[recent.length - 1].avg_mastery_score ?? 0;
  const trend = last - first;
  const trendLabel = trend > 0.05 ? "En amélioration" : trend < -0.05 ? "En baisse" : "Stable";
  const trendColor = trend > 0.05 ? "text-green-600" : trend < -0.05 ? "text-red-600" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" /> Tendance de calibration
        </h3>
        <span className={`text-xs font-medium ${trendColor}`}>{trendLabel}</span>
      </div>

      {/* Dot chart */}
      <div className="flex items-end gap-2 h-12">
        {recent.map((snap, i) => {
          const score = snap.avg_mastery_score ?? 0;
          const heightPct = (score / maxScore) * 100;
          return (
            <div
              key={snap.snapshot_date}
              className="flex-1 flex flex-col items-center justify-end"
              title={`${snap.snapshot_date}: ${Math.round(score * 100)}%`}
            >
              <div
                className="w-2 h-2 rounded-full bg-primary"
                style={{ marginBottom: `${Math.max(0, heightPct - 10)}%` }}
              />
              <div
                className="w-px bg-primary/30"
                style={{ height: `${Math.max(4, heightPct * 0.4)}px` }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{recent[0].snapshot_date}</span>
        <span>Moy. : {Math.round(last * 100)}%</span>
        <span>{recent[recent.length - 1].snapshot_date}</span>
      </div>
    </motion.div>
  );
}
