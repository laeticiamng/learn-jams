// ============================================================
// usePipelineRetry — Hook for pipeline retry with budget tracking
// ============================================================

import { useState, useCallback } from "react";
import {
  createRetryBudget,
  recordRetryAttempt,
  getRetryDecision,
  canRetry,
  delay,
  type RetryBudget,
  type RetryableStep,
} from "@/services/cognitio/retryEngine.service";

interface UsePipelineRetryReturn {
  budget: RetryBudget;
  /** Attempt to retry a step. Returns true if retry was successful. */
  retryStep: (
    step: RetryableStep,
    error: string,
    retryFn: () => Promise<boolean>,
  ) => Promise<boolean>;
  /** Check if a step can still be retried */
  canRetryStep: (step: RetryableStep) => boolean;
  /** Reset retry budget */
  resetBudget: () => void;
}

export function usePipelineRetry(): UsePipelineRetryReturn {
  const [budget, setBudget] = useState<RetryBudget>(createRetryBudget);

  const retryStep = useCallback(async (
    step: RetryableStep,
    error: string,
    retryFn: () => Promise<boolean>,
  ): Promise<boolean> => {
    const attemptNumber = budget.retries_by_step[step] ?? 0;
    const decision = getRetryDecision(step, error, attemptNumber);

    if (decision.strategy === "abort") {
      setBudget(prev => recordRetryAttempt(prev, step, "abort", 0, error, false));
      return false;
    }

    if (!canRetry(budget, step)) {
      return false;
    }

    // Wait before retrying
    if (decision.delay_ms > 0) {
      await delay(decision.delay_ms);
    }

    try {
      const succeeded = await retryFn();
      setBudget(prev => recordRetryAttempt(prev, step, decision.strategy, decision.delay_ms, error, succeeded));
      return succeeded;
    } catch (retryErr: unknown) {
      const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      setBudget(prev => recordRetryAttempt(prev, step, decision.strategy, decision.delay_ms, retryMsg, false));
      return false;
    }
  }, [budget]);

  const canRetryStep = useCallback((step: RetryableStep): boolean => {
    return canRetry(budget, step);
  }, [budget]);

  const resetBudget = useCallback(() => {
    setBudget(createRetryBudget());
  }, []);

  return { budget, retryStep, canRetryStep, resetBudget };
}
