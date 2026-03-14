import { describe, it, expect } from "vitest";
import { validateEdgeEnv, isServerOnlyKey, SERVER_ONLY_KEYS, ENV_REQUIREMENTS } from "./env";

describe("env validator", () => {
  it("detects missing required secrets", () => {
    const result = validateEdgeEnv({});
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.missing.some((m) => m.includes("STRIPE_SECRET_KEY"))).toBe(true);
  });

  it("passes when all required secrets are set", () => {
    const env: Record<string, string> = {};
    for (const key of SERVER_ONLY_KEYS) {
      env[key] = "test_value";
    }
    const result = validateEdgeEnv(env);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("reports optional keys as warnings", () => {
    const env: Record<string, string> = {};
    for (const key of SERVER_ONLY_KEYS) {
      if (key !== "INTERNAL_WEBHOOK_SECRET") {
        env[key] = "test_value";
      }
    }
    const result = validateEdgeEnv(env);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("INTERNAL_WEBHOOK_SECRET"))).toBe(true);
  });

  it("identifies server-only keys", () => {
    expect(isServerOnlyKey("STRIPE_SECRET_KEY")).toBe(true);
    expect(isServerOnlyKey("SUPABASE_SERVICE_ROLE_KEY")).toBe(true);
    expect(isServerOnlyKey("VITE_SUPABASE_URL")).toBe(false);
  });

  it("client env requires VITE_SUPABASE_PUBLISHABLE_KEY (not ANON_KEY)", () => {
    const clientReqs = ENV_REQUIREMENTS.filter((r) => r.context === "client");
    const keys = clientReqs.map((r) => r.key);
    expect(keys).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    expect(keys).not.toContain("VITE_SUPABASE_ANON_KEY");
  });

  it("client env requires VITE_SUPABASE_URL", () => {
    const clientReqs = ENV_REQUIREMENTS.filter((r) => r.context === "client");
    const keys = clientReqs.map((r) => r.key);
    expect(keys).toContain("VITE_SUPABASE_URL");
  });
});
