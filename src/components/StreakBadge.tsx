import { Flame } from "lucide-react";
import { motion } from "framer-motion";

interface StreakBadgeProps {
  streak: number;
  compact?: boolean;
}

export default function StreakBadge({ streak, compact = false }: StreakBadgeProps) {
  if (streak <= 0) return null;

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold"
      >
        <Flame className="w-3.5 h-3.5" />
        {streak}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-4 rounded-2xl border border-orange-500/20 bg-orange-500/5"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
        <Flame className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="font-display text-2xl font-bold text-orange-500">{streak}</div>
        <div className="text-xs text-muted-foreground">
          {streak === 1 ? "jour consécutif" : "jours consécutifs"}
        </div>
      </div>
    </motion.div>
  );
}
