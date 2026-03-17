// ============================================================
// Admin Entitlement Tests — Verify that school plan (admin default)
// has all features unlocked with unlimited quotas.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  getFormatAvailability,
  computeEntitlementSnapshot,
  checkEntitlement,
} from "./entitlementEngine.service";
import { FEATURE_KEYS } from "@/domain/billing/pricing.types";
import type { FeatureKey } from "@/domain/billing/pricing.types";
import { FORMAT_CONFIGS } from "@/lib/create-format-config";
import { isAdmin } from "@/security/roles";
import { resolveRenderMode } from "@/services/cognitio/scenePerformanceResolver";

// ---------- Admin Detection ----------

describe("isAdmin detection", () => {
  it("detects admin via role field", () => {
    expect(isAdmin({ role: "admin" })).toBe(true);
  });

  it("detects admin via is_admin field", () => {
    expect(isAdmin({ is_admin: true })).toBe(true);
  });

  it("detects admin via both fields", () => {
    expect(isAdmin({ role: "admin", is_admin: true })).toBe(true);
  });

  it("rejects non-admin user", () => {
    expect(isAdmin({ role: "user" })).toBe(false);
  });

  it("rejects null metadata", () => {
    expect(isAdmin(null)).toBe(false);
  });

  it("rejects undefined metadata", () => {
    expect(isAdmin(undefined)).toBe(false);
  });
});

// ---------- School Plan (Admin Default) — All Features Included ----------

describe("school plan — admin entitlements", () => {
  it("all 9 feature keys are included on school plan", () => {
    for (const key of FEATURE_KEYS) {
      const avail = getFormatAvailability("school", key);
      expect(avail).toBe("included");
    }
  });

  it("all features have unlimited quota (-1) on school plan", () => {
    const snapshot = computeEntitlementSnapshot("admin-user", "school", {}, null, []);
    for (const entry of snapshot.entitlements) {
      expect(entry.quota_total).toBe(-1);
      expect(entry.quota_remaining).toBe(-1);
      expect(entry.effective_remaining).toBe(-1);
    }
  });

  it("all features pass entitlement check on school plan regardless of usage", () => {
    const highUsage: Partial<Record<FeatureKey, number>> = {};
    for (const key of FEATURE_KEYS) {
      highUsage[key] = 99999;
    }

    const snapshot = computeEntitlementSnapshot("admin-user", "school", highUsage, null, []);
    for (const key of FEATURE_KEYS) {
      const result = checkEntitlement(snapshot, key, 1);
      expect(result.allowed).toBe(true);
      expect(result.source).toBe("quota");
    }
  });

  it("school plan has zero restrictions", () => {
    const snapshot = computeEntitlementSnapshot("admin-user", "school", {}, null, []);
    expect(snapshot.restrictions.length).toBe(0);
  });
});

// ---------- Format Lock Computation ----------

describe("format lock computation for admin vs free", () => {
  it("admin (school plan) has no locked formats", () => {
    const lockedFormats = Object.values(FORMAT_CONFIGS)
      .filter((c) => getFormatAvailability("school", c.featureKey) === "locked")
      .map((c) => c.key);
    expect(lockedFormats).toEqual([]);
  });

  it("free plan has locked formats", () => {
    const lockedFormats = Object.values(FORMAT_CONFIGS)
      .filter((c) => getFormatAvailability("free", c.featureKey) === "locked")
      .map((c) => c.key);
    expect(lockedFormats.length).toBeGreaterThan(0);
    expect(lockedFormats).toContain("escape_game");
  });
});

// ---------- 3D Fallback Resolution ----------

describe("3D render mode fallback resolution", () => {
  it("returns fallback_2d when no WebGL", () => {
    const mode = resolveRenderMode({
      webgl_available: false,
      webgl2_available: false,
      gpu_tier: "unknown",
      is_mobile: false,
      reduced_motion: false,
      estimated_fps: 0,
    });
    expect(mode).toBe("fallback_2d");
  });

  it("returns full_3d for high-end desktop", () => {
    const mode = resolveRenderMode({
      webgl_available: true,
      webgl2_available: true,
      gpu_tier: "high",
      is_mobile: false,
      reduced_motion: false,
      estimated_fps: 60,
    });
    expect(mode).toBe("full_3d");
  });

  it("returns lite_3d for medium GPU", () => {
    const mode = resolveRenderMode({
      webgl_available: true,
      webgl2_available: true,
      gpu_tier: "medium",
      is_mobile: false,
      reduced_motion: false,
      estimated_fps: 45,
    });
    expect(mode).toBe("lite_3d");
  });

  it("returns pseudo_3d for reduced motion preference", () => {
    const mode = resolveRenderMode({
      webgl_available: true,
      webgl2_available: true,
      gpu_tier: "high",
      is_mobile: false,
      reduced_motion: true,
      estimated_fps: 60,
    });
    expect(mode).toBe("pseudo_3d");
  });

  it("returns lite_3d for mobile even with high GPU", () => {
    const mode = resolveRenderMode({
      webgl_available: true,
      webgl2_available: true,
      gpu_tier: "high",
      is_mobile: true,
      reduced_motion: false,
      estimated_fps: 45,
    });
    expect(mode).toBe("lite_3d");
  });
});
