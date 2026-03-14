// ============================================================
// ProgressTimelineCard — Simple progress over time
// ============================================================

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import type { ProgressSnapshot } from "@/domain/cognitio/longitudinal.types";

interface ProgressTimelineCardProps {
  snapshots: ProgressSnapshot[];
}

export function ProgressTimelineCard({ snapshots }: ProgressTimelineCardProps) {
  if (snapshots.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border rounded-lg p-5"
      >
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" /> Progression
        </h3>
        <p className="text-xs text-muted-foreground">Les données de progression apparaitront après quelques sessions.</p>
      </motion.div>
    );
  }

  // Show last 7 snapshots in chronological order
  const recent = [...snapshots].reverse().slice(-7);
  const maxConcepts = Math.max(...recent.map((s) => s.concepts_known + s.concepts_fragile + s.concepts_aging), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-5 space-y-3"
    >
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" /> Progression
      </h3>

      {/* Mini bar chart */}
      <div className="flex items-end gap-1 h-16">
        {recent.map((snap) => {
          const total = snap.concepts_known + snap.concepts_fragile + snap.concepts_aging;
          const knownPct = (snap.concepts_known / maxConcepts) * 100;
          const fragilePct = (snap.concepts_fragile / maxConcepts) * 100;
          const agingPct = (snap.concepts_aging / maxConcepts) * 100;

          return (
            <div key={snap.snapshot_date} className="flex-1 flex flex-col justify-end gap-px" title={snap.snapshot_date}>
              {snap.concepts_aging > 0 && (
                <div className="bg-orange-400 rounded-t-sm" style={{ height: `${agingPct}%`, minHeight: 2 }} />
              )}
              {snap.concepts_fragile > 0 && (
                <div className="bg-red-400" style={{ height: `${fragilePct}%`, minHeight: 2 }} />
              )}
              <div className="bg-green-500 rounded-b-sm" style={{ height: `${knownPct}%`, minHeight: 2 }} />
            </div>
          );
        })}
      </div>

      {/* Latest stats */}
      {recent.length > 0 && (
        <div className="flex gap-4 text-[10px] text-muted-foreground">
          <span>Début : {recent[0].snapshot_date}</span>
          <span>Fin : {recent[recent.length - 1].snapshot_date}</span>
          {recent[recent.length - 1].avg_mastery_score !== null && (
            <span>Maitrise moy. : {Math.round((recent[recent.length - 1].avg_mastery_score ?? 0) * 100)}%</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
