// ============================================================
// Tests: Feature Flags Service
// ============================================================

import { describe, it, expect } from "vitest";
import { isFeatureEnabled } from "./featureFlags.service";
import { DEFAULT_FLAGS, type ResolvedFlags } from "@/domain/product/featureFlags.types";

describe("isFeatureEnabled", () => {
  it("returns default value for known flag", () => {
    expect(isFeatureEnabled(DEFAULT_FLAGS, "ff_dynamic_sheet_enabled")).toBe(true);
    expect(isFeatureEnabled(DEFAULT_FLAGS, "ff_guardian_loop_enabled")).toBe(false);
  });

  it("returns custom value when flag is overridden", () => {
    const flags: ResolvedFlags = {
      ...DEFAULT_FLAGS,
      ff_guardian_loop_enabled: true,
    };
    expect(isFeatureEnabled(flags, "ff_guardian_loop_enabled")).toBe(true);
  });

  it("returns false for unknown flag via default", () => {
    expect(isFeatureEnabled(DEFAULT_FLAGS, "ff_admin_dashboards_enabled")).toBe(false);
  });
});
