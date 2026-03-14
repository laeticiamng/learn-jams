import { motion } from "framer-motion";
import type { CompositeScore } from "@/domain/cognitio/types";
import { formatPercentage } from "@/lib/cognitio-ui";

interface DebriefScoreCardProps {
  score: CompositeScore;
}

const METRICS = [
  { key: "accuracy" as const, label: "Précision", color: "text-blue-500" },
  { key: "confidence_calibration" as const, label: "Calibration confiance", color: "text-purple-500" },
  { key: "bloom_coverage" as const, label: "Couverture Bloom", color: "text-green-500" },
  { key: "trap_detection" as const, label: "Détection pièges", color: "text-orange-500" },
  { key: "completion_rate" as const, label: "Complétion", color: "text-cyan-500" },
];

export default function DebriefScoreCard({ score }: DebriefScoreCardProps) {
  const totalColor =
    score.total >= 80 ? "text-green-500" : score.total >= 60 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="glass-card-elevated p-6 rounded-xl space-y-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Score composite
        </p>
        <motion.p
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-5xl font-bold font-display ${totalColor}`}
        >
          {score.total}
        </motion.p>
        <p className="text-xs text-muted-foreground mt-1">/100</p>
      </div>

      <div className="space-y-3">
        {METRICS.map(({ key, label, color }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3"
          >
            <span className="text-sm text-muted-foreground flex-1">{label}</span>
            <div className="w-24 h-2 bg-muted/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score[key] * 100}%` }}
                transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                className="h-full rounded-full bg-current"
                style={{ color: `var(--${color.replace("text-", "")}, currentColor)` }}
              />
            </div>
            <span className={`text-sm font-mono tabular-nums w-12 text-right ${color}`}>
              {formatPercentage(score[key])}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
