// ============================================================
// DebriefScoreCard — Display composite score & breakdown
// ============================================================

import { motion } from "framer-motion";
import type { CompositeScore } from "@/domain/cognitio/recall.types";

interface DebriefScoreCardProps {
  compositeScore: CompositeScore;
  mastered: number;
  fragile: number;
  failed: number;
}

export function DebriefScoreCard({ compositeScore, mastered, fragile, failed }: DebriefScoreCardProps) {
  const total = compositeScore.total;
  const scoreColor = total >= 80 ? "text-green-600" : total >= 60 ? "text-yellow-600" : "text-red-600";
  const ringColor = total >= 80 ? "stroke-green-500" : total >= 60 ? "stroke-yellow-500" : "stroke-red-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold">Score composite</h3>

      <div className="flex items-center gap-6">
        {/* Circular score */}
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" className="stroke-muted/20" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              className={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(total / 100) * 213.6} 213.6`}
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${scoreColor}`}>
            {total}
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-1.5 text-xs">
          <BreakdownRow label="Exactitude" value={compositeScore.breakdown.raw_component} max={60} color="bg-blue-500" />
          <BreakdownRow label="Calibration" value={compositeScore.breakdown.calibration_component} max={20} color="bg-purple-500" />
          <BreakdownRow label="Couverture" value={compositeScore.breakdown.coverage_component} max={20} color="bg-emerald-500" />
        </div>
      </div>

      {/* Concept summary */}
      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" /> {mastered} maîtrisé(s)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" /> {fragile} fragile(s)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> {failed} échoué(s)
        </span>
      </div>
    </motion.div>
  );
}

function BreakdownRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted/20 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right font-medium">{value}/{max}</span>
    </div>
  );
}
