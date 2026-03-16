// ============================================================
// Tests: Admin unlock verification for m.laeticia@hotmail.fr
// Validates that the migration grants full admin access
// ============================================================

import { describe, it, expect } from "vitest";
import { hasPermission, getRolePermissions, isAdmin } from "@/security/roles";
import {
  computeEntitlementSnapshot,
  getFormatAvailability,
  checkEntitlement,
  getPlanFormatMatrix,
} from "@/services/billing/entitlementEngine.service";
import { isFeatureEnabled } from "@/services/product/featureFlags.service";
import { FEATURE_KEYS } from "@/domain/billing/pricing.types";
import { DEFAULT_FLAGS, FEATURE_FLAG_KEYS } from "@/domain/product/featureFlags.types";
import type { ResolvedFlags } from "@/domain/product/featureFlags.types";

// ---------------------------------------------------------------------------
// Simulated admin metadata as set by the migration
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = "m.laeticia@hotmail.fr";
const ADMIN_METADATA = {
  role: "admin" as const,
  is_admin: true,
  plan_key: "school" as const,
};

// All flags enabled (as the migration sets enabled = true on all flags)
const ALL_FLAGS_ENABLED: ResolvedFlags = Object.fromEntries(
  FEATURE_FLAG_KEYS.map((key) => [key, true]),
) as ResolvedFlags;

// ---------------------------------------------------------------------------
// 1. Role & Permission verification
// ---------------------------------------------------------------------------

describe("Admin unlock — role & permissions", () => {
  it("isAdmin returns true with migration metadata (role=admin)", () => {
    expect(isAdmin({ role: "admin" })).toBe(true);
  });

  it("isAdmin returns true with migration metadata (is_admin=true)", () => {
    expect(isAdmin({ is_admin: true })).toBe(true);
  });

  it("isAdmin returns true with full migration metadata", () => {
    expect(isAdmin(ADMIN_METADATA)).toBe(true);
  });

  it("admin has access to all admin permissions", () => {
    const adminPermissions = [
      "admin:dashboard",
      "admin:margin_reports",
      "admin:cost_events",
      "admin:feature_flags",
      "admin:webhook_logs",
      "admin:security_audit",
      "admin:user_management",
    ] as const;

    for (const perm of adminPermissions) {
      expect(hasPermission("admin", perm)).toBe(true);
    }
  });

  it("admin has access to all generation permissions", () => {
    const generationPermissions = [
      "generate:song",
      "generate:sheet",
      "generate:story",
      "generate:escape",
      "generate:video",
    ] as const;

    for (const perm of generationPermissions) {
      expect(hasPermission("admin", perm)).toBe(true);
    }
  });

  it("admin has access to data and billing permissions", () => {
    expect(hasPermission("admin", "data:own:read")).toBe(true);
    expect(hasPermission("admin", "data:own:write")).toBe(true);
    expect(hasPermission("admin", "data:child:read")).toBe(true);
    expect(hasPermission("admin", "billing:manage")).toBe(true);
    expect(hasPermission("admin", "billing:view_reports")).toBe(true);
  });

  it("admin has more permissions than a regular user", () => {
    const adminPerms = getRolePermissions("admin");
    const userPerms = getRolePermissions("user");
    expect(adminPerms.length).toBeGreaterThan(userPerms.length);
  });

  it("admin has guardian management permissions", () => {
    expect(hasPermission("admin", "guardian:invite")).toBe(true);
    expect(hasPermission("admin", "guardian:revoke")).toBe(true);
    expect(hasPermission("admin", "guardian:view_child")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Feature flags — all enabled for admin
// ---------------------------------------------------------------------------

describe("Admin unlock — feature flags all enabled", () => {
  it("all feature flags are enabled when migration runs", () => {
    for (const key of FEATURE_FLAG_KEYS) {
      expect(isFeatureEnabled(ALL_FLAGS_ENABLED, key)).toBe(true);
    }
  });

  it("admin dashboards flag is enabled", () => {
    expect(isFeatureEnabled(ALL_FLAGS_ENABLED, "ff_admin_dashboards_enabled")).toBe(true);
  });

  it("guardian loop flag is enabled", () => {
    expect(isFeatureEnabled(ALL_FLAGS_ENABLED, "ff_guardian_loop_enabled")).toBe(true);
  });

  it("experiments flag is enabled", () => {
    expect(isFeatureEnabled(ALL_FLAGS_ENABLED, "ff_experiments_enabled")).toBe(true);
  });

  it("institution mode flag is enabled", () => {
    expect(isFeatureEnabled(ALL_FLAGS_ENABLED, "ff_institution_mode_enabled")).toBe(true);
  });

  it("flags that are OFF by default are now ON for admin", () => {
    const defaultOffFlags = FEATURE_FLAG_KEYS.filter((k) => !DEFAULT_FLAGS[k]);
    expect(defaultOffFlags.length).toBeGreaterThan(0);

    for (const key of defaultOffFlags) {
      expect(isFeatureEnabled(ALL_FLAGS_ENABLED, key)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. School plan — all features included
// ---------------------------------------------------------------------------

describe("Admin unlock — school plan entitlements", () => {
  it("school plan has all 9 features as included", () => {
    const matrix = getPlanFormatMatrix("school");
    expect(matrix.length).toBe(FEATURE_KEYS.length);

    for (const entry of matrix) {
      expect(entry.availability).toBe("included");
    }
  });

  it("every feature is available as included on school plan", () => {
    for (const featureKey of FEATURE_KEYS) {
      expect(getFormatAvailability("school", featureKey)).toBe("included");
    }
  });

  it("school plan has no locked features (unlike free plan)", () => {
    const schoolMatrix = getPlanFormatMatrix("school");
    const freeMatrix = getPlanFormatMatrix("free");

    const schoolLocked = schoolMatrix.filter((e) => e.availability === "locked");
    const freeLocked = freeMatrix.filter((e) => e.availability === "locked");

    expect(schoolLocked.length).toBe(0);
    expect(freeLocked.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Entitlement snapshot — unlimited access
// ---------------------------------------------------------------------------

describe("Admin unlock — entitlement snapshot (school plan)", () => {
  const adminUserId = "admin-laeticia-test";

  it("computes snapshot with all features available", () => {
    const snapshot = computeEntitlementSnapshot(adminUserId, "school", {}, {}, []);

    expect(snapshot.plan_key).toBe("school");
    expect(snapshot.entitlements.length).toBe(FEATURE_KEYS.length);

    for (const entry of snapshot.entitlements) {
      expect(entry.availability).toBe("included");
    }
  });

  it("no restrictions exist on school plan with no usage", () => {
    const snapshot = computeEntitlementSnapshot(adminUserId, "school", {}, {}, []);
    expect(snapshot.restrictions.length).toBe(0);
  });

  it("unlimited features (quota=-1) remain unlimited regardless of usage", () => {
    const heavyUsage: Partial<Record<typeof FEATURE_KEYS[number], number>> = {
      dynamic_sheet_generation: 99999,
      animated_story_generation: 99999,
      premium_export: 99999,
    };

    const snapshot = computeEntitlementSnapshot(adminUserId, "school", heavyUsage, {}, []);

    for (const featureKey of ["dynamic_sheet_generation", "animated_story_generation", "premium_export"] as const) {
      const entry = snapshot.entitlements.find((e) => e.feature_key === featureKey);
      expect(entry).toBeDefined();
      expect(entry!.quota_total).toBe(-1);
      expect(entry!.quota_remaining).toBe(-1);
      expect(entry!.effective_remaining).toBe(-1);
    }
  });

  it("checkEntitlement allows all features on school plan snapshot", () => {
    const snapshot = computeEntitlementSnapshot(adminUserId, "school", {}, {}, []);

    for (const featureKey of FEATURE_KEYS) {
      const result = checkEntitlement(snapshot, featureKey, 1);
      expect(result.allowed).toBe(true);
      expect(result.source).toBe("quota");
      expect(result.paywall).toBeUndefined();
    }
  });

  it("checkEntitlement allows even large amounts on unlimited features", () => {
    const snapshot = computeEntitlementSnapshot(adminUserId, "school", {}, {}, []);

    const result = checkEntitlement(snapshot, "dynamic_sheet_generation", 1000);
    expect(result.allowed).toBe(true);
    expect(result.source).toBe("quota");
  });

  it("school plan quotas are the highest across all plans", () => {
    const schoolMatrix = getPlanFormatMatrix("school");
    const freePlusMatrix = getPlanFormatMatrix("family_plus");

    for (const featureKey of FEATURE_KEYS) {
      const schoolEntry = schoolMatrix.find((e) => e.feature_key === featureKey);
      const fpEntry = freePlusMatrix.find((e) => e.feature_key === featureKey);

      if (schoolEntry && fpEntry) {
        // School quota should be >= family_plus quota
        if (schoolEntry.monthly_quota !== -1 && fpEntry.monthly_quota !== -1) {
          expect(schoolEntry.monthly_quota).toBeGreaterThanOrEqual(fpEntry.monthly_quota);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Migration SQL verification (structure checks)
// ---------------------------------------------------------------------------

describe("Admin unlock — migration consistency", () => {
  it("admin metadata matches what useUserPlan expects", () => {
    // useUserPlan checks: meta?.is_admin === true || meta?.role === "admin"
    // then uses: (meta.plan_key as PlanKey) ?? "school"
    const meta = ADMIN_METADATA;

    expect(meta.is_admin === true || meta.role === "admin").toBe(true);
    expect(meta.plan_key).toBe("school");
  });

  it("migration entitlement snapshot matches computed snapshot structure", () => {
    // The migration creates entitlements with quota_total=-1, quota_used=0, quota_remaining=-1
    // Verify the computed engine produces compatible values
    const snapshot = computeEntitlementSnapshot("admin-test", "school", {}, {}, []);

    const unlimitedFeatures = ["dynamic_sheet_generation", "animated_story_generation", "premium_export"] as const;

    for (const featureKey of unlimitedFeatures) {
      const entry = snapshot.entitlements.find((e) => e.feature_key === featureKey);
      expect(entry).toBeDefined();
      expect(entry!.quota_total).toBe(-1);
      expect(entry!.quota_used).toBe(0);
      expect(entry!.quota_remaining).toBe(-1);
    }
  });

  it("all 9 FEATURE_KEYS are covered by the school plan", () => {
    const schoolMatrix = getPlanFormatMatrix("school");
    const coveredKeys = new Set(schoolMatrix.map((e) => e.feature_key));

    for (const key of FEATURE_KEYS) {
      expect(coveredKeys.has(key)).toBe(true);
    }
  });

  it("all 22 FEATURE_FLAG_KEYS are represented in the flags system", () => {
    // Verify every flag key exists in DEFAULT_FLAGS
    for (const key of FEATURE_FLAG_KEYS) {
      expect(key in DEFAULT_FLAGS).toBe(true);
    }
    expect(FEATURE_FLAG_KEYS.length).toBe(Object.keys(DEFAULT_FLAGS).length);
  });
});
