// ============================================================
// FeedbackPulse — Micro-feedback system for environmental
// visual reactions. Provides success, error, and unlock
// feedback as ambient visual pulses. Zero DOM nodes when idle.
// ============================================================

import { useCallback } from "react";
import { useImmersion } from "./ImmersionContext";

// ---------- Feedback Colors ----------

const FEEDBACK_COLORS = {
  success: "hsl(142, 70%, 45%)",
  error: "hsl(0, 70%, 50%)",
  unlock: "hsl(45, 100%, 65%)",
  info: "hsl(215, 80%, 55%)",
} as const;

type FeedbackType = keyof typeof FEEDBACK_COLORS;

// ---------- Hook ----------

interface FeedbackActions {
  /** Green radial pulse — correct answer, completion */
  success: () => void;
  /** Red vignette + shake — wrong answer, error */
  error: () => void;
  /** Gold burst — badge unlock, level up, room cleared */
  unlock: () => void;
  /** Blue subtle pulse — info, hint, navigation */
  info: () => void;
  /** Custom pulse with any color */
  custom: (color: string, intensity?: number) => void;
}

export function useFeedback(): FeedbackActions {
  const { pulse, budget } = useImmersion();

  const fire = useCallback(
    (type: FeedbackType, intensityOverride?: number) => {
      // Reduced motion: skip visual pulse entirely
      if (budget.reducedMotion) return;

      const intensities: Record<FeedbackType, number> = {
        success: 0.6,
        error: 0.4,
        unlock: 0.8,
        info: 0.3,
      };

      pulse(FEEDBACK_COLORS[type], intensityOverride ?? intensities[type]);
    },
    [pulse, budget.reducedMotion],
  );

  const success = useCallback(() => fire("success"), [fire]);
  const error = useCallback(() => fire("error"), [fire]);
  const unlock = useCallback(() => fire("unlock"), [fire]);
  const info = useCallback(() => fire("info"), [fire]);
  const custom = useCallback(
    (color: string, intensity = 0.5) => {
      if (!budget.reducedMotion) pulse(color, intensity);
    },
    [pulse, budget.reducedMotion],
  );

  return { success, error, unlock, info, custom };
}
