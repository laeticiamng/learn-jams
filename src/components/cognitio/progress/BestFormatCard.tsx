// ============================================================
// BestFormatCard — Format effectiveness comparison
// ============================================================

import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import type { FormatEffectivenessRecord } from "@/domain/cognitio/longitudinal.types";

interface BestFormatCardProps {
  records: FormatEffectivenessRecord[];
}

const FORMAT_LABELS: Record<string, string> = {
  fiche_dynamique: "Fiche dynamique",
  histoire_animee: "Histoire interactive",
  music: "Musique",
};

export function BestFormatCard({ records }: BestFormatCardProps) {
  if (records.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border rounded-lg p-5"
      >
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" /> Efficacité des formats
        </h3>
        <p className="text-xs text-muted-foreground">Pas encore assez de données. Continuez !</p>
      </motion.div>
    );
  }

  // Group by format
  const byFormat = new Map<string, { attempts: number; avgScore: number; retention: number }>();
  for (const r of records) {
    const existing = byFormat.get(r.format);
    if (existing) {
      existing.attempts += r.attempts_count;
      existing.avgScore = (existing.avgScore + (r.avg_composite_score ?? 0)) / 2;
      existing.retention = (existing.retention + (r.retention_signal ?? 0)) / 2;
    } else {
      byFormat.set(r.format, {
        attempts: r.attempts_count,
        avgScore: r.avg_composite_score ?? 0,
        retention: r.retention_signal ?? 0,
      });
    }
  }

  const sorted = [...byFormat.entries()].sort((a, b) => b[1].retention - a[1].retention);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-5 space-y-3"
    >
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" /> Efficacité des formats
      </h3>

      <div className="space-y-2">
        {sorted.map(([format, data], i) => {
          const barWidth = Math.max(10, Math.round(data.retention * 100));
          const isBest = i === 0 && data.retention > 0;

          return (
            <div key={format} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${isBest ? "text-primary" : "text-muted-foreground"}`}>
                  {FORMAT_LABELS[format] ?? format}
                  {isBest && " - Ce format semble mieux fonctionner pour toi"}
                </span>
                <span className="text-muted-foreground">{data.attempts} essai(s)</span>
              </div>
              <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isBest ? "bg-primary" : "bg-muted-foreground/30"}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
