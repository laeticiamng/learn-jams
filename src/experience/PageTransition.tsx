// ============================================================
// PageTransition — Smooth inter-page transitions.
// Wraps React Router outlet with AnimatePresence for
// immersion-aware transitions. Adapts to immersion level
// and respects reduced-motion.
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useImmersion } from "./ImmersionContext";
import type { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

// Transition configs per immersion level
const TRANSITIONS = {
  // Level 0: instant (reduced-motion)
  instant: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  },
  // Level 0-1: simple fade
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3, ease: "easeOut" },
  },
  // Level 1: fade + subtle lift
  lift: {
    initial: { opacity: 0, y: 12, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -8, filter: "blur(2px)" },
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  // Level 2+: cinematic reveal
  cinematic: {
    initial: { opacity: 0, y: 20, filter: "blur(8px)", scale: 0.98 },
    animate: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 },
    exit: { opacity: 0, y: -12, filter: "blur(4px)", scale: 0.99 },
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
} as const;

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const { level, budget } = useImmersion();

  // Select transition config based on immersion level
  let config: (typeof TRANSITIONS)[keyof typeof TRANSITIONS];

  if (budget.reducedMotion) {
    config = TRANSITIONS.instant;
  } else if (level === 0) {
    config = TRANSITIONS.fade;
  } else if (level === 1) {
    config = TRANSITIONS.lift;
  } else {
    config = TRANSITIONS.cinematic;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={config.initial}
        animate={config.animate}
        exit={config.exit}
        transition={config.transition}
        style={{ minHeight: "100vh" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
