// ============================================================
// Provider Abuse Guard — Prevent abuse of expensive APIs
// ============================================================

import type { FeatureKey, PlanKey } from "@/domain/billing/pricing.types";
import { checkRateLimit, type RateLimitResult } from "@/security/rateLimit";
import { preCheckCost, checkCircuitBreaker, type CostCheckResult } from "@/security/costGuards";
import { checkQuota } from "@/services/billing/quotaEngine.service";
import type { ConsumeResult } from "@/domain/billing/pricing.types";

export interface AbuseCheckResult {
  allowed: boolean;
  reason?: string;
  rateLimit?: RateLimitResult;
  costCheck?: CostCheckResult;
  quotaCheck?: ConsumeResult;
}

/**
 * Feature key to rate limit key mapping.
 */
const FEATURE_TO_RATE_KEY: Record<string, string> = {
  music_generation: "generate:song",
  dynamic_sheet_generation: "generate:sheet",
  animated_story_generation: "generate:story",
  escape_game_generation: "generate:escape",
  video_generation_ai_seconds: "generate:video",
  guardian_sms: "send:sms",
  guardian_email: "send:email",
};

/**
 * Feature key to provider mapping.
 */
const FEATURE_TO_PROVIDER: Record<string, string> = {
  music_generation: "suno",
  dynamic_sheet_generation: "openai",
  animated_story_generation: "openai",
  escape_game_generation: "openai",
  video_generation_ai_seconds: "runway_replicate",
  video_template_render: "internal",
  guardian_sms: "twilio",
  guardian_email: "resend",
  premium_export: "internal",
};

/**
 * Full abuse check before an expensive operation.
 * Checks: rate limit → circuit breaker → cost guard → quota.
 */
export async function checkProviderAbuse(
  userId: string,
  plan: PlanKey,
  feature: FeatureKey,
  currentDailyCostUsd: number,
): Promise<AbuseCheckResult> {
  // 1. Rate limit check
  const rateLimitKey = FEATURE_TO_RATE_KEY[feature];
  if (rateLimitKey) {
    const rateResult = checkRateLimit(userId, rateLimitKey);
    if (!rateResult.allowed) {
      return { allowed: false, reason: "rate_limit_exceeded", rateLimit: rateResult };
    }
  }

  // 2. Circuit breaker check
  const provider = FEATURE_TO_PROVIDER[feature];
  if (provider && provider !== "internal") {
    const cb = checkCircuitBreaker(provider);
    if (cb.open) {
      return { allowed: false, reason: `circuit_breaker_open: ${cb.reason}` };
    }
  }

  // 3. Cost guard check
  const costResult = preCheckCost(feature, plan, currentDailyCostUsd);
  if (!costResult.allowed) {
    return { allowed: false, reason: costResult.reason, costCheck: costResult };
  }

  // 4. Quota check
  const quotaResult = await checkQuota(userId, plan, feature);
  if (!quotaResult.allowed) {
    return { allowed: false, reason: "quota_exceeded", quotaCheck: quotaResult };
  }

  return { allowed: true, rateLimit: undefined, costCheck: costResult, quotaCheck: quotaResult };
}
