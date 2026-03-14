// ============================================================
// MasteryOverviewCard — Summary of concept mastery distribution
// ============================================================

import { motion } from "framer-motion";
import { Brain } from "lucide-react";

interface MasteryOverviewCardProps {
  stats: {
    totalConcepts: number;
    mastered: number;
    learning: number;
    fragile: number;
    dueForReview: number;
  };
}

export function MasteryOverviewCard({ stats }: MasteryOverviewCardProps) {
  const { totalConcepts, mastered, learning, fragile, dueForReview } = stats;

  const segments = [
    { label: "Acquis", count: mastered, color: "bg-green-500", textColor: "text-green-600" },
    { label: "En cours", count: learning, color: "bg-yellow-500", textColor: "text-yellow-600" },
    { label: "Fragiles", count: fragile, color: "bg-red-500", textColor: "text-red-600" },
  ];

  const barTotal = Math.max(totalConcepts, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" /> Vue d'ensemble
        </h3>
        <span className="text-xs text-muted-foreground">{totalConcepts} concept(s)</span>
      </div>

      {/* Stacked bar */}
      {totalConcepts > 0 && (
        <div className="h-3 rounded-full bg-muted/20 overflow-hidden flex">
          {segments.map((seg) =>
            seg.count > 0 ? (
              <div
                key={seg.label}
                className={`h-full ${seg.color} transition-all duration-500`}
                style={{ width: `${(seg.count / barTotal) * 100}%` }}
              />
            ) : null,
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${seg.color}`} />
            <span className={`font-medium ${seg.textColor}`}>{seg.count}</span>
            <span className="text-muted-foreground">{seg.label}</span>
          </div>
        ))}
      </div>

      {dueForReview > 0 && (
        <p className="text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded">
          {dueForReview} concept(s) à revoir
        </p>
      )}
    </motion.div>
  );
}
