// ============================================================
// Provider Domain Types — Core abstractions
// ============================================================

export const PROVIDER_DOMAINS = [
  "auth", "storage", "llm", "image", "video", "tts",
  "music", "billing", "email", "sms", "monitoring", "analytics",
] as const;
export type ProviderDomain = (typeof PROVIDER_DOMAINS)[number];

export const PROVIDER_TYPES = ["managed", "external_api", "self_hosted"] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export interface ProviderRecord {
  id: string;
  domain: ProviderDomain;
  provider_key: string;
  provider_type: ProviderType;
  enabled: boolean;
  config_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProviderRoute {
  id: string;
  domain: ProviderDomain;
  preferred_provider_key: string;
  fallback_provider_key: string | null;
  rules_json: ProviderRouteRules;
  updated_at: string;
}

export interface ProviderRouteRules {
  cost_ceiling_usd?: number;
  latency_ceiling_ms?: number;
  quality_tier?: "standard" | "premium";
  retry_policy?: RetryPolicy;
}

export interface RetryPolicy {
  max_retries: number;
  backoff_ms: number[];
  retry_on: string[];
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  max_retries: 3,
  backoff_ms: [2000, 4000, 8000],
  retry_on: ["timeout", "rate_limit", "server_error"],
};

// ── Provider Health ────────────────────────────────────────

export type ProviderHealthStatus = "healthy" | "degraded" | "down";

export interface ProviderHealth {
  provider_key: string;
  status: ProviderHealthStatus;
  latency_ms: number | null;
  last_error: string | null;
  checked_at: string;
}

// ── Provider Resolution ────────────────────────────────────

export interface ResolvedProvider {
  provider_key: string;
  provider_type: ProviderType;
  is_fallback: boolean;
  config_json: Record<string, unknown>;
}

export interface ProviderResolutionResult {
  domain: ProviderDomain;
  resolved: ResolvedProvider;
  fallback_available: boolean;
  route_rules: ProviderRouteRules;
}
