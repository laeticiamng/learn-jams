// ============================================================
// Provider Domain Validators
// ============================================================

import {
  PROVIDER_DOMAINS, PROVIDER_TYPES,
  type ProviderDomain, type ProviderType, type ProviderRouteRules,
} from "./provider.types";
import { JOB_STATUSES, JOB_TYPES, type JobType, type JobStatus } from "./job.types";

export function isValidProviderDomain(domain: string): domain is ProviderDomain {
  return (PROVIDER_DOMAINS as readonly string[]).includes(domain);
}

export function isValidProviderType(type: string): type is ProviderType {
  return (PROVIDER_TYPES as readonly string[]).includes(type);
}

export function isValidJobType(type: string): type is JobType {
  return (JOB_TYPES as readonly string[]).includes(type);
}

export function isValidJobStatus(status: string): status is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(status);
}

export function validateProviderRouteRules(rules: ProviderRouteRules): string[] {
  const errors: string[] = [];

  if (rules.cost_ceiling_usd !== undefined && rules.cost_ceiling_usd < 0) {
    errors.push("cost_ceiling_usd must be non-negative");
  }

  if (rules.latency_ceiling_ms !== undefined && rules.latency_ceiling_ms < 100) {
    errors.push("latency_ceiling_ms must be at least 100ms");
  }

  if (rules.quality_tier !== undefined && !["standard", "premium"].includes(rules.quality_tier)) {
    errors.push("quality_tier must be 'standard' or 'premium'");
  }

  if (rules.retry_policy) {
    if (rules.retry_policy.max_retries < 0 || rules.retry_policy.max_retries > 10) {
      errors.push("max_retries must be 0-10");
    }
    if (rules.retry_policy.backoff_ms.length === 0) {
      errors.push("backoff_ms must have at least one entry");
    }
  }

  return errors;
}

// ── Env Validation ─────────────────────────────────────────

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

const REQUIRED_ENVS: Record<string, string[]> = {
  supabase: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
  openai: ["OPENAI_API_KEY"],
  stripe: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  suno: ["SUNO_API_KEY"],
};

const OPTIONAL_ENVS: Record<string, string[]> = {
  resend: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
  twilio: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
  sentry: ["SENTRY_DSN"],
  posthog: ["POSTHOG_API_KEY", "POSTHOG_HOST"],
};

export function validateEnvironment(env: Record<string, string | undefined>): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const [provider, keys] of Object.entries(REQUIRED_ENVS)) {
    for (const key of keys) {
      if (!env[key]) missing.push(`${key} (required for ${provider})`);
    }
  }

  for (const [provider, keys] of Object.entries(OPTIONAL_ENVS)) {
    for (const key of keys) {
      if (!env[key]) warnings.push(`${key} (optional for ${provider})`);
    }
  }

  return { valid: missing.length === 0, missing, warnings };
}
