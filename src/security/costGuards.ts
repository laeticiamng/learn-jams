// ============================================================
// Cost Guards — Prevent API cost explosion
// ============================================================

import type { FeatureKey, PlanKey } from "@/domain/billing/pricing.types";
import { ESTIMATED_UNIT_COSTS } from "@/domain/billing/pricing.types";

/**
 * Maximum cost per user per day (USD) before blocking.
 */
export const MAX_DAILY_COST_PER_USER: Record<PlanKey, number> = {
  free: 1.00,
  core: 10.00,
  plus: 25.00,
  premium_family: 40.00,
  family_plus: 80.00,
  school: 200.00,
};

/**
 * Maximum cost per single operation (USD).
 * Any operation exceeding this triggers review.
 */
export const MAX_SINGLE_OPERATION_COST = 5.00;

/**
 * Circuit breaker thresholds per provider.
 * If error rate exceeds threshold in the window, stop calling.
 */
export interface CircuitBreakerConfig {
  provider: string;
  maxFailures: number;
  windowMs: number;
  cooldownMs: number;
}

export const CIRCUIT_BREAKERS: CircuitBreakerConfig[] = [
  { provider: "openai", maxFailures: 10, windowMs: 300_000, cooldownMs: 60_000 },
  { provider: "suno", maxFailures: 5, windowMs: 300_000, cooldownMs: 120_000 },
  { provider: "runway_replicate", maxFailures: 5, windowMs: 300_000, cooldownMs: 120_000 },
  { provider: "twilio", maxFailures: 10, windowMs: 600_000, cooldownMs: 60_000 },
  { provider: "resend", maxFailures: 20, windowMs: 600_000, cooldownMs: 60_000 },
];

// In-memory circuit breaker state
const circuitState = new Map<string, { failures: number[]; openUntil: number }>();

export interface CostCheckResult {
  allowed: boolean;
  reason?: string;
  estimatedCostUsd: number;
}

/**
 * Pre-check if a generation should proceed based on cost limits.
 */
export function preCheckCost(
  feature: FeatureKey,
  plan: PlanKey,
  currentDailyCostUsd: number,
): CostCheckResult {
  const unit = ESTIMATED_UNIT_COSTS.find((u) => u.feature_key === feature);
  const estimatedCost = unit?.estimated_cost_usd ?? 0;

  // Check single operation cost
  if (estimatedCost > MAX_SINGLE_OPERATION_COST) {
    return { allowed: false, reason: "single_operation_too_expensive", estimatedCostUsd: estimatedCost };
  }

  // Check daily cost limit
  const dailyLimit = MAX_DAILY_COST_PER_USER[plan] ?? MAX_DAILY_COST_PER_USER.free;
  if (currentDailyCostUsd + estimatedCost > dailyLimit) {
    return { allowed: false, reason: "daily_cost_limit_exceeded", estimatedCostUsd: estimatedCost };
  }

  return { allowed: true, estimatedCostUsd: estimatedCost };
}

/**
 * Check circuit breaker for a provider.
 */
export function checkCircuitBreaker(provider: string): { open: boolean; reason?: string } {
  const config = CIRCUIT_BREAKERS.find((c) => c.provider === provider);
  if (!config) return { open: false };

  const state = circuitState.get(provider);
  if (!state) return { open: false };

  const now = Date.now();

  // Check if in cooldown
  if (state.openUntil > now) {
    return { open: true, reason: `Circuit breaker open for ${provider} until ${new Date(state.openUntil).toISOString()}` };
  }

  // Prune old failures
  state.failures = state.failures.filter((t) => t > now - config.windowMs);

  if (state.failures.length >= config.maxFailures) {
    state.openUntil = now + config.cooldownMs;
    return { open: true, reason: `${provider}: ${state.failures.length} failures in ${config.windowMs / 1000}s window` };
  }

  return { open: false };
}

/**
 * Record a provider failure for circuit breaker.
 */
export function recordProviderFailure(provider: string): void {
  let state = circuitState.get(provider);
  if (!state) {
    state = { failures: [], openUntil: 0 };
    circuitState.set(provider, state);
  }
  state.failures.push(Date.now());
}

/**
 * Record a provider success (resets circuit breaker).
 */
export function recordProviderSuccess(provider: string): void {
  const state = circuitState.get(provider);
  if (state) {
    state.openUntil = 0;
  }
}

/**
 * Reset all circuit breakers (for testing).
 */
export function resetCircuitBreakers(): void {
  circuitState.clear();
}
