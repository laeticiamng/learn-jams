// ============================================================
// Tests: Provider Domain Validators
// ============================================================

import { describe, it, expect } from "vitest";
import {
  isValidProviderDomain,
  isValidProviderType,
  isValidJobType,
  isValidJobStatus,
  validateProviderRouteRules,
  validateEnvironment,
} from "./provider.validators";

describe("isValidProviderDomain", () => {
  it("accepts valid domains", () => {
    expect(isValidProviderDomain("llm")).toBe(true);
    expect(isValidProviderDomain("video")).toBe(true);
    expect(isValidProviderDomain("auth")).toBe(true);
    expect(isValidProviderDomain("billing")).toBe(true);
    expect(isValidProviderDomain("email")).toBe(true);
    expect(isValidProviderDomain("sms")).toBe(true);
    expect(isValidProviderDomain("monitoring")).toBe(true);
    expect(isValidProviderDomain("analytics")).toBe(true);
  });

  it("rejects invalid domains", () => {
    expect(isValidProviderDomain("blockchain")).toBe(false);
    expect(isValidProviderDomain("")).toBe(false);
  });
});

describe("isValidProviderType", () => {
  it("accepts valid types", () => {
    expect(isValidProviderType("managed")).toBe(true);
    expect(isValidProviderType("external_api")).toBe(true);
    expect(isValidProviderType("self_hosted")).toBe(true);
  });

  it("rejects invalid types", () => {
    expect(isValidProviderType("hybrid")).toBe(false);
  });
});

describe("isValidJobType", () => {
  it("accepts valid job types", () => {
    expect(isValidJobType("generate_video")).toBe(true);
    expect(isValidJobType("generate_music")).toBe(true);
    expect(isValidJobType("send_email")).toBe(true);
    expect(isValidJobType("render_template_video")).toBe(true);
    expect(isValidJobType("enhance_synopsis")).toBe(true);
  });

  it("rejects invalid job types", () => {
    expect(isValidJobType("mine_bitcoin")).toBe(false);
  });
});

describe("isValidJobStatus", () => {
  it("accepts valid statuses", () => {
    expect(isValidJobStatus("pending")).toBe(true);
    expect(isValidJobStatus("running")).toBe(true);
    expect(isValidJobStatus("completed")).toBe(true);
    expect(isValidJobStatus("failed")).toBe(true);
    expect(isValidJobStatus("cancelled")).toBe(true);
  });

  it("rejects invalid statuses", () => {
    expect(isValidJobStatus("exploded")).toBe(false);
  });
});

describe("validateProviderRouteRules", () => {
  it("accepts valid empty rules", () => {
    expect(validateProviderRouteRules({})).toHaveLength(0);
  });

  it("accepts valid complete rules", () => {
    const errors = validateProviderRouteRules({
      cost_ceiling_usd: 5.0,
      latency_ceiling_ms: 30000,
      quality_tier: "premium",
      retry_policy: {
        max_retries: 3,
        backoff_ms: [2000, 4000, 8000],
        retry_on: ["timeout"],
      },
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects negative cost ceiling", () => {
    const errors = validateProviderRouteRules({ cost_ceiling_usd: -1 });
    expect(errors.some(e => e.includes("cost_ceiling"))).toBe(true);
  });

  it("rejects too-low latency ceiling", () => {
    const errors = validateProviderRouteRules({ latency_ceiling_ms: 50 });
    expect(errors.some(e => e.includes("latency_ceiling"))).toBe(true);
  });

  it("rejects invalid quality tier", () => {
    const errors = validateProviderRouteRules({ quality_tier: "ultra" as any });
    expect(errors.some(e => e.includes("quality_tier"))).toBe(true);
  });

  it("rejects excessive max retries", () => {
    const errors = validateProviderRouteRules({
      retry_policy: { max_retries: 99, backoff_ms: [1000], retry_on: [] },
    });
    expect(errors.some(e => e.includes("max_retries"))).toBe(true);
  });

  it("rejects empty backoff_ms", () => {
    const errors = validateProviderRouteRules({
      retry_policy: { max_retries: 3, backoff_ms: [], retry_on: [] },
    });
    expect(errors.some(e => e.includes("backoff_ms"))).toBe(true);
  });
});

describe("validateEnvironment", () => {
  it("reports missing required env vars", () => {
    const result = validateEnvironment({});
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.missing.some(m => m.includes("SUPABASE_URL"))).toBe(true);
    expect(result.missing.some(m => m.includes("OPENAI_API_KEY"))).toBe(true);
  });

  it("passes with all required env vars", () => {
    const result = validateEnvironment({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "key",
      OPENAI_API_KEY: "sk-xxx",
      STRIPE_SECRET_KEY: "sk_test_xxx",
      STRIPE_WEBHOOK_SECRET: "whsec_xxx",
      SUNO_API_KEY: "suno_xxx",
    });
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("warns about optional env vars", () => {
    const result = validateEnvironment({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "key",
      OPENAI_API_KEY: "sk-xxx",
      STRIPE_SECRET_KEY: "sk_test_xxx",
      STRIPE_WEBHOOK_SECRET: "whsec_xxx",
      SUNO_API_KEY: "suno_xxx",
    });
    expect(result.warnings.some(w => w.includes("RESEND_API_KEY"))).toBe(true);
    expect(result.warnings.some(w => w.includes("TWILIO"))).toBe(true);
    expect(result.warnings.some(w => w.includes("SENTRY"))).toBe(true);
    expect(result.warnings.some(w => w.includes("POSTHOG"))).toBe(true);
  });
});
