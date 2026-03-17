import { describe, it, expect } from "vitest";
import { getSupabaseConfigStatus } from "./client";

describe("getSupabaseConfigStatus", () => {
  // In the test environment, vitest.config.ts sets valid VITE_SUPABASE_URL and
  // VITE_SUPABASE_PUBLISHABLE_KEY, so the client should report configured.
  it("reports configured when env vars are set in test environment", () => {
    const status = getSupabaseConfigStatus();
    expect(status.hasUrl).toBe(true);
    expect(status.hasKey).toBe(true);
    expect(status.urlValid).toBe(true);
    expect(status.configured).toBe(true);
    expect(status.diagnosticMessage).toBe("Supabase configuration OK");
  });

  it("returns a safe diagnostic message without secrets", () => {
    const status = getSupabaseConfigStatus();
    // Should never contain the full anon key
    expect(status.diagnosticMessage).not.toContain("eyJ");
  });
});
