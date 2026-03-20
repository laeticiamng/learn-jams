// ============================================================
// ScoreRevealScene — Cinematic score reveal for mission end.
// Trophy materializes with particle burst, score counts up.
// Pure 2D + Framer Motion (no Three.js dependency).
// Falls back gracefully on reduced-motion.
// ============================================================

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useCountUp } from "./useCountUp";
import { CelebrationBurst } from "./CelebrationBurst";

interface ScoreRevealSceneProps {
  totalScore: number;
  performanceLevel: "excellent" | "good" | "medium" | "needs_work";
}

const LEVEL_CONFIG = {
  excellent: {
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    glow: "hsl(45, 100%, 65%)",
    ringColor: "border-yellow-500/30",
    label: "Exceptionnel",
  },
  good: {
    color: "text-green-500",
    bg: "bg-green-500/10",
    glow: "hsl(142, 70%, 45%)",
    ringColor: "border-green-500/30",
    label: "Excellent travail",
  },
  medium: {
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    glow: "hsl(215, 80%, 55%)",
    ringColor: "border-blue-500/30",
    label: "Encourageant",
  },
  needs_work: {
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    glow: "hsl(30, 90%, 55%)",
    ringColor: "border-orange-500/30",
    label: "Bases à renforcer",
  },
} as const;

export function ScoreRevealScene({ totalScore, performanceLevel }: ScoreRevealSceneProps) {
  const config = LEVEL_CONFIG[performanceLevel];
  const { value: displayScore, ref: scoreRef } = useCountUp(totalScore, {
    duration: 1500,
    delay: 600,
    immediate: true,
  });

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      {/* Pulsing backdrop glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${config.glow.replace(")", ", 0.08)")}, transparent 60%)`,
        }}
      />

      {/* Trophy with burst */}
      <CelebrationBurst
        trigger={true}
        color={config.glow}
        particleCount={16}
      >
        <motion.div
          initial={{ scale: 0, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{
            delay: 0.1,
            duration: 0.8,
            type: "spring",
            stiffness: 200,
            damping: 15,
          }}
          className="relative"
        >
          {/* Outer glow ring */}
          <motion.div
            className={`absolute -inset-4 rounded-full border-2 ${config.ringColor}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.15, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          {/* Trophy container */}
          <div className={`w-24 h-24 rounded-full ${config.bg} flex items-center justify-center`}>
            <Trophy className={`w-12 h-12 ${config.color}`} />
          </div>
        </motion.div>
      </CelebrationBurst>

      {/* Score counter */}
      <motion.div
        ref={scoreRef as React.RefObject<HTMLDivElement>}
        className="text-center space-y-1"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className={`text-6xl font-bold font-display tabular-nums ${config.color}`}>
          {displayScore}
        </p>
        <p className="text-sm text-muted-foreground">/100</p>
      </motion.div>

      {/* Performance label */}
      <motion.p
        className="text-sm font-medium text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        {config.label}
      </motion.p>
    </div>
  );
}
