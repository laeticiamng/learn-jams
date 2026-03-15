// ============================================================
// Retry Engine — Intelligent retry strategies for pipeline steps
// Provides step-level retry with exponential backoff, strategy
// selection based on error type, and retry budget tracking.
// ============================================================

export type RetryableStep =
  | "ingestion"
  | "analysis"
  | "memory"
  | "format"
  | "generation";

export type RetryStrategy =
  | "immediate"       // Retry immediately (transient error)
  | "backoff"         // Exponential backoff (rate limit / server error)
  | "reconfigure"     // Change parameters before retry
  | "fallback"        // Try alternative approach
  | "abort";          // Non-retryable error

export interface RetryDecision {
  strategy: RetryStrategy;
  delay_ms: number;
  max_attempts: number;
  reason: string;
  reconfigure_hint?: string;
}

export interface RetryAttempt {
  step: RetryableStep;
  attempt_number: number;
  strategy: RetryStrategy;
  delay_ms: number;
  timestamp: number;
  error_message: string;
  succeeded: boolean;
}

export interface RetryBudget {
  total_retries: number;
  max_total_retries: number;
  retries_by_step: Partial<Record<RetryableStep, number>>;
  exhausted: boolean;
  attempts: RetryAttempt[];
}

// ---------- Error Classification ----------

const TRANSIENT_PATTERNS = [
  /network/i,
  /timeout/i,
  /ECONNRESET/i,
  /ECONNREFUSED/i,
  /fetch failed/i,
  /503/,
  /504/,
  /502/,
];

const RATE_LIMIT_PATTERNS = [
  /429/,
  /rate limit/i,
  /too many requests/i,
  /quota exceeded/i,
];

const NON_RETRYABLE_PATTERNS = [
  /401/,
  /403/,
  /invalid.*token/i,
  /not authorized/i,
  /feature_disabled/i,
];

function classifyError(error: string): RetryStrategy {
  if (NON_RETRYABLE_PATTERNS.some(p => p.test(error))) return "abort";
  if (RATE_LIMIT_PATTERNS.some(p => p.test(error))) return "backoff";
  if (TRANSIENT_PATTERNS.some(p => p.test(error))) return "immediate";
  // Default: assume it's a logic error that needs reconfiguration
  return "reconfigure";
}

// ---------- Retry Decision ----------

const STEP_MAX_RETRIES: Record<RetryableStep, number> = {
  ingestion: 2,
  analysis: 2,
  memory: 1,
  format: 1,
  generation: 2,
};

const BACKOFF_BASE_MS = 1000;

export function getRetryDecision(
  step: RetryableStep,
  error: string,
  attemptNumber: number,
): RetryDecision {
  const strategy = classifyError(error);
  const maxAttempts = STEP_MAX_RETRIES[step];

  if (strategy === "abort" || attemptNumber >= maxAttempts) {
    return {
      strategy: "abort",
      delay_ms: 0,
      max_attempts: maxAttempts,
      reason: attemptNumber >= maxAttempts
        ? `Max retries (${maxAttempts}) exhausted for ${step}`
        : `Non-retryable error: ${error}`,
    };
  }

  if (strategy === "backoff") {
    const delay = BACKOFF_BASE_MS * Math.pow(2, attemptNumber);
    return {
      strategy: "backoff",
      delay_ms: Math.min(delay, 16000),
      max_attempts: maxAttempts,
      reason: `Rate limited, backing off ${delay}ms`,
    };
  }

  if (strategy === "immediate") {
    return {
      strategy: "immediate",
      delay_ms: 500,
      max_attempts: maxAttempts,
      reason: `Transient error, retrying immediately`,
    };
  }

  // Reconfigure strategy — suggest parameter changes
  const hints: Partial<Record<RetryableStep, string>> = {
    analysis: "Try reducing text length or simplifying document structure",
    generation: "Try a different output format or reduce concept count",
    ingestion: "Try pasting text directly instead of uploading a file",
  };

  return {
    strategy: "reconfigure",
    delay_ms: 1000,
    max_attempts: maxAttempts,
    reason: `Logic error, reconfiguration suggested`,
    reconfigure_hint: hints[step],
  };
}

// ---------- Retry Budget ----------

const MAX_TOTAL_RETRIES = 5;

export function createRetryBudget(): RetryBudget {
  return {
    total_retries: 0,
    max_total_retries: MAX_TOTAL_RETRIES,
    retries_by_step: {},
    exhausted: false,
    attempts: [],
  };
}

export function recordRetryAttempt(
  budget: RetryBudget,
  step: RetryableStep,
  strategy: RetryStrategy,
  delay_ms: number,
  error_message: string,
  succeeded: boolean,
): RetryBudget {
  const newBudget: RetryBudget = {
    ...budget,
    total_retries: budget.total_retries + 1,
    retries_by_step: {
      ...budget.retries_by_step,
      [step]: (budget.retries_by_step[step] ?? 0) + 1,
    },
    attempts: [
      ...budget.attempts,
      {
        step,
        attempt_number: (budget.retries_by_step[step] ?? 0) + 1,
        strategy,
        delay_ms,
        timestamp: Date.now(),
        error_message,
        succeeded,
      },
    ],
  };

  newBudget.exhausted = newBudget.total_retries >= MAX_TOTAL_RETRIES;
  return newBudget;
}

export function canRetry(budget: RetryBudget, step: RetryableStep): boolean {
  if (budget.exhausted) return false;
  const stepRetries = budget.retries_by_step[step] ?? 0;
  return stepRetries < STEP_MAX_RETRIES[step];
}

// ---------- Delay helper ----------

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
