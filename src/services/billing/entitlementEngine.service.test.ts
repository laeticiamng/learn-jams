import { describe, it, expect } from "vitest";
import {
  computeEntitlementSnapshot,
  getFormatAvailability,
  checkEntitlement,
  buildPaywallContext,
  getPlanFormatMatrix,
} from "./entitlementEngine.service";
import type { FeatureKey } from "@/domain/billing/pricing.types";
import type { UserEntitlementSnapshot } from "@/domain/billing/entitlement.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a minimal UserEntitlementSnapshot for a given plan without going
 * through computeEntitlementSnapshot (useful when we want full control over
 * the entitlement values).
 */
function makeSnapshot(
  planKey: UserEntitlementSnapshot["plan_key"],
  entitlements: UserEntitlementSnapshot["entitlements"],
  opts: Partial<Pick<UserEntitlementSnapshot, "flex_credits_available" | "active_topups">> = {},
): UserEntitlementSnapshot {
  return {
    id: `test_${planKey}`,
    user_id: "user-test",
    plan_key: planKey,
    computed_at: new Date().toISOString(),
    entitlements,
    flex_credits_available: opts.flex_credits_available ?? {},
    active_topups: opts.active_topups ?? [],
    restrictions: [],
  };
}

// ---------------------------------------------------------------------------
// getPlanFormatMatrix
// ---------------------------------------------------------------------------

describe("getPlanFormatMatrix", () => {
  it("returns entries for the free plan", () => {
    const entries = getPlanFormatMatrix("free");
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.plan_key === "free")).toBe(true);
  });

  it("free plan has at least one locked format", () => {
    const entries = getPlanFormatMatrix("free");
    const locked = entries.filter((e) => e.availability === "locked");
    expect(locked.length).toBeGreaterThan(0);
  });

  it("returns entries for the core plan", () => {
    const entries = getPlanFormatMatrix("core");
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.plan_key === "core")).toBe(true);
  });

  it("core plan has at least one included format", () => {
    const entries = getPlanFormatMatrix("core");
    const included = entries.filter((e) => e.availability === "included");
    expect(included.length).toBeGreaterThan(0);
  });

  it("all entries have valid availability values", () => {
    const validValues = new Set(["included", "limited", "locked", "beta", "topup_only"]);
    const entries = getPlanFormatMatrix("free");
    for (const entry of entries) {
      expect(validValues.has(entry.availability)).toBe(true);
    }
  });

  it("core plan entries all have valid availability values", () => {
    const validValues = new Set(["included", "limited", "locked", "beta", "topup_only"]);
    const entries = getPlanFormatMatrix("core");
    for (const entry of entries) {
      expect(validValues.has(entry.availability)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// getFormatAvailability
// ---------------------------------------------------------------------------

describe("getFormatAvailability", () => {
  it("returns 'locked' for escape_game_generation on free plan", () => {
    expect(getFormatAvailability("free", "escape_game_generation")).toBe("locked");
  });

  it("returns 'included' for dynamic_sheet_generation on core plan", () => {
    expect(getFormatAvailability("core", "dynamic_sheet_generation")).toBe("included");
  });

  it("returns 'limited' for music_generation on free plan", () => {
    expect(getFormatAvailability("free", "music_generation")).toBe("limited");
  });

  it("returns 'locked' for an unknown feature key", () => {
    // Cast to FeatureKey to satisfy TypeScript — the value is intentionally invalid
    const result = getFormatAvailability("free", "nonexistent_feature" as FeatureKey);
    expect(result).toBe("locked");
  });

  it("returns 'locked' for guardian_sms on core plan", () => {
    expect(getFormatAvailability("core", "guardian_sms")).toBe("locked");
  });

  it("returns 'included' for escape_game_generation on core plan", () => {
    expect(getFormatAvailability("core", "escape_game_generation")).toBe("included");
  });
});

// ---------------------------------------------------------------------------
// checkEntitlement
// ---------------------------------------------------------------------------

describe("checkEntitlement", () => {
  it("allows when quota remaining is sufficient", () => {
    const snapshot = makeSnapshot("core", [
      {
        feature_key: "music_generation",
        availability: "included",
        quota_total: 25,
        quota_used: 10,
        quota_remaining: 15,
        flex_bonus: 0,
        topup_bonus: 0,
        effective_remaining: 15,
      },
    ]);

    const result = checkEntitlement(snapshot, "music_generation", 1);
    expect(result.allowed).toBe(true);
    expect(result.source).toBe("quota");
    expect(result.paywall).toBeUndefined();
  });

  it("denies when quota is exhausted and returns a paywall", () => {
    const snapshot = makeSnapshot("core", [
      {
        feature_key: "music_generation",
        availability: "included",
        quota_total: 25,
        quota_used: 25,
        quota_remaining: 0,
        flex_bonus: 0,
        topup_bonus: 0,
        effective_remaining: 0,
      },
    ]);

    const result = checkEntitlement(snapshot, "music_generation", 1);
    expect(result.allowed).toBe(false);
    expect(result.source).toBe("none");
    expect(result.paywall).toBeDefined();
    expect(result.paywall!.trigger).toBe("quota_exhausted");
  });

  it("allows when flex bonus covers the request", () => {
    const snapshot = makeSnapshot(
      "core",
      [
        {
          feature_key: "music_generation",
          availability: "included",
          quota_total: 25,
          quota_used: 25,
          quota_remaining: 0,
          flex_bonus: 5,
          topup_bonus: 0,
          effective_remaining: 5,
        },
      ],
      { flex_credits_available: { music_generation: 5 } },
    );

    const result = checkEntitlement(snapshot, "music_generation", 1);
    expect(result.allowed).toBe(true);
    expect(result.source).toBe("flex");
  });

  it("allows when topup bonus covers the request", () => {
    const snapshot = makeSnapshot(
      "core",
      [
        {
          feature_key: "escape_game_generation",
          availability: "included",
          quota_total: 10,
          quota_used: 10,
          quota_remaining: 0,
          flex_bonus: 0,
          topup_bonus: 3,
          effective_remaining: 3,
        },
      ],
      {
        active_topups: [
          { feature_key: "escape_game_generation", remaining: 3, expires_at: null },
        ],
      },
    );

    const result = checkEntitlement(snapshot, "escape_game_generation", 1);
    expect(result.allowed).toBe(true);
    expect(result.source).toBe("topup");
  });

  it("denies for locked formats and returns a paywall with format_locked trigger", () => {
    const snapshot = makeSnapshot("free", [
      {
        feature_key: "escape_game_generation",
        availability: "locked",
        quota_total: 0,
        quota_used: 0,
        quota_remaining: 0,
        flex_bonus: 0,
        topup_bonus: 0,
        effective_remaining: 0,
      },
    ]);

    const result = checkEntitlement(snapshot, "escape_game_generation", 1);
    expect(result.allowed).toBe(false);
    expect(result.paywall).toBeDefined();
    expect(result.paywall!.trigger).toBe("format_locked");
  });

  it("allows unlimited quota features regardless of usage", () => {
    const snapshot = makeSnapshot("core", [
      {
        feature_key: "dynamic_sheet_generation",
        availability: "included",
        quota_total: -1,
        quota_used: 9999,
        quota_remaining: -1,
        flex_bonus: 0,
        topup_bonus: 0,
        effective_remaining: -1,
      },
    ]);

    const result = checkEntitlement(snapshot, "dynamic_sheet_generation", 1);
    expect(result.allowed).toBe(true);
    expect(result.source).toBe("quota");
  });

  it("denies when no entitlement entry exists for the feature", () => {
    const snapshot = makeSnapshot("free", []);
    const result = checkEntitlement(snapshot, "music_generation", 1);
    expect(result.allowed).toBe(false);
    expect(result.source).toBe("none");
    expect(result.paywall).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// buildPaywallContext
// ---------------------------------------------------------------------------

describe("buildPaywallContext", () => {
  it("returns format_locked trigger for a locked feature", () => {
    const snapshot = makeSnapshot("free", [
      {
        feature_key: "escape_game_generation",
        availability: "locked",
        quota_total: 0,
        quota_used: 0,
        quota_remaining: 0,
        flex_bonus: 0,
        topup_bonus: 0,
        effective_remaining: 0,
      },
    ]);

    const ctx = buildPaywallContext("free", "escape_game_generation", snapshot);
    expect(ctx.trigger).toBe("format_locked");
    expect(ctx.feature_key).toBe("escape_game_generation");
    expect(ctx.current_plan).toBe("free");
  });

  it("returns quota_exhausted trigger for an exhausted non-locked feature with no flex credits", () => {
    const snapshot = makeSnapshot("core", [
      {
        feature_key: "music_generation",
        availability: "included",
        quota_total: 25,
        quota_used: 25,
        quota_remaining: 0,
        flex_bonus: 0,
        topup_bonus: 0,
        effective_remaining: 0,
      },
    ]);

    const ctx = buildPaywallContext("core", "music_generation", snapshot);
    expect(ctx.trigger).toBe("quota_exhausted");
  });

  it("suggests an upgrade plan for locked features on the free plan", () => {
    const snapshot = makeSnapshot("free", []);

    const ctx = buildPaywallContext("free", "escape_game_generation", snapshot);
    // escape_game_generation is enabled on core — suggestUpgrade should return "core"
    expect(ctx.suggested_plan).toBe("core");
  });

  it("includes can_use_flex = true when flex credits are available", () => {
    const snapshot = makeSnapshot(
      "core",
      [
        {
          feature_key: "music_generation",
          availability: "included",
          quota_total: 25,
          quota_used: 25,
          quota_remaining: 0,
          flex_bonus: 5,
          topup_bonus: 0,
          effective_remaining: 0,
        },
      ],
      { flex_credits_available: { music_generation: 5 } },
    );

    const ctx = buildPaywallContext("core", "music_generation", snapshot);
    expect(ctx.can_use_flex).toBe(true);
  });

  it("includes can_use_flex = false when no flex credits are available", () => {
    const snapshot = makeSnapshot(
      "core",
      [
        {
          feature_key: "music_generation",
          availability: "included",
          quota_total: 25,
          quota_used: 25,
          quota_remaining: 0,
          flex_bonus: 0,
          topup_bonus: 0,
          effective_remaining: 0,
        },
      ],
      { flex_credits_available: {} },
    );

    const ctx = buildPaywallContext("core", "music_generation", snapshot);
    expect(ctx.can_use_flex).toBe(false);
  });

  it("returns adaptive_reallocation trigger when flex credits are available on exhausted quota", () => {
    const snapshot = makeSnapshot(
      "core",
      [
        {
          feature_key: "music_generation",
          availability: "included",
          quota_total: 25,
          quota_used: 25,
          quota_remaining: 0,
          flex_bonus: 3,
          topup_bonus: 0,
          effective_remaining: 0,
        },
      ],
      { flex_credits_available: { music_generation: 3 } },
    );

    const ctx = buildPaywallContext("core", "music_generation", snapshot);
    expect(ctx.trigger).toBe("adaptive_reallocation");
  });

  it("suggested_topup is set for topup_eligible features", () => {
    const snapshot = makeSnapshot("core", []);
    const ctx = buildPaywallContext("core", "escape_game_generation", snapshot);
    // escape_game_generation is topup_eligible on core
    expect(ctx.suggested_topup).toBe("topup.escape_game_generation");
  });

  it("suggested_topup is undefined for non-topup-eligible features", () => {
    const snapshot = makeSnapshot("free", []);
    const ctx = buildPaywallContext("free", "escape_game_generation", snapshot);
    // escape_game_generation is NOT topup_eligible on free (locked, topup_eligible: false)
    expect(ctx.suggested_topup).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// computeEntitlementSnapshot
// ---------------------------------------------------------------------------

describe("computeEntitlementSnapshot", () => {
  it("computes a correct snapshot for free plan with no usage", () => {
    const snapshot = computeEntitlementSnapshot("user-1", "free", {}, {}, []);

    expect(snapshot.user_id).toBe("user-1");
    expect(snapshot.plan_key).toBe("free");
    expect(snapshot.entitlements.length).toBeGreaterThan(0);

    const music = snapshot.entitlements.find((e) => e.feature_key === "music_generation");
    expect(music).toBeDefined();
    expect(music!.quota_total).toBe(2);
    expect(music!.quota_used).toBe(0);
    expect(music!.quota_remaining).toBe(2);
    expect(music!.availability).toBe("limited");
  });

  it("computes a correct snapshot for core plan with partial usage", () => {
    const snapshot = computeEntitlementSnapshot(
      "user-2",
      "core",
      { music_generation: 10, escape_game_generation: 3 },
      {},
      [],
    );

    const music = snapshot.entitlements.find((e) => e.feature_key === "music_generation");
    expect(music).toBeDefined();
    expect(music!.quota_total).toBe(25);
    expect(music!.quota_used).toBe(10);
    expect(music!.quota_remaining).toBe(15);

    const escape = snapshot.entitlements.find((e) => e.feature_key === "escape_game_generation");
    expect(escape).toBeDefined();
    expect(escape!.quota_total).toBe(10);
    expect(escape!.quota_used).toBe(3);
    expect(escape!.quota_remaining).toBe(7);
  });

  it("includes restrictions for locked features", () => {
    const snapshot = computeEntitlementSnapshot("user-3", "free", {}, {}, []);

    const lockedRestrictions = snapshot.restrictions.filter((r) => r.reason === "plan_locked");
    expect(lockedRestrictions.length).toBeGreaterThan(0);

    const escapeRestriction = lockedRestrictions.find(
      (r) => r.feature_key === "escape_game_generation",
    );
    expect(escapeRestriction).toBeDefined();
    expect(escapeRestriction!.message_key).toBe(
      "restriction.plan_locked.escape_game_generation",
    );
  });

  it("includes restrictions for exhausted features", () => {
    const snapshot = computeEntitlementSnapshot(
      "user-4",
      "free",
      // Use all 2 music_generation credits on the free plan
      { music_generation: 2 },
      // No flex credits
      {},
      [],
    );

    const exhaustedRestrictions = snapshot.restrictions.filter(
      (r) => r.reason === "quota_exhausted",
    );
    expect(exhaustedRestrictions.length).toBeGreaterThan(0);

    const musicRestriction = exhaustedRestrictions.find(
      (r) => r.feature_key === "music_generation",
    );
    expect(musicRestriction).toBeDefined();
    expect(musicRestriction!.message_key).toBe(
      "restriction.quota_exhausted.music_generation",
    );
  });

  it("calculates effective_remaining correctly as quota + flex + topup", () => {
    const topups = [
      { feature_key: "escape_game_generation" as FeatureKey, remaining: 4, expires_at: null },
    ];

    const snapshot = computeEntitlementSnapshot(
      "user-5",
      "core",
      // 8 used out of 10 → quota_remaining = 2
      { escape_game_generation: 8 },
      // Provide explicit flex credits
      { escape_game_generation: 3 },
      topups,
    );

    const escape = snapshot.entitlements.find((e) => e.feature_key === "escape_game_generation");
    expect(escape).toBeDefined();
    expect(escape!.quota_remaining).toBe(2);
    expect(escape!.flex_bonus).toBe(3);
    expect(escape!.topup_bonus).toBe(4);
    // effective_remaining = 2 + 3 + 4 = 9
    expect(escape!.effective_remaining).toBe(9);
  });

  it("returns effective_remaining = -1 for unlimited quota features", () => {
    const snapshot = computeEntitlementSnapshot("user-6", "core", {}, {}, []);

    const dynamic = snapshot.entitlements.find(
      (e) => e.feature_key === "dynamic_sheet_generation",
    );
    expect(dynamic).toBeDefined();
    expect(dynamic!.quota_total).toBe(-1);
    expect(dynamic!.quota_remaining).toBe(-1);
    expect(dynamic!.effective_remaining).toBe(-1);
  });

  it("snapshot id encodes user_id and plan_key", () => {
    const snapshot = computeEntitlementSnapshot("user-7", "plus", {}, {}, []);
    expect(snapshot.id).toContain("user-7");
    expect(snapshot.id).toContain("plus");
  });

  it("active_topups are forwarded unchanged onto the snapshot", () => {
    const topups = [
      { feature_key: "music_generation" as FeatureKey, remaining: 10, expires_at: "2026-12-31" },
    ];
    const snapshot = computeEntitlementSnapshot("user-8", "core", {}, {}, topups);
    expect(snapshot.active_topups).toEqual(topups);
  });

  it("uses provided flex_credits directly instead of computing them", () => {
    const explicitFlex: Partial<Record<FeatureKey, number>> = {
      music_generation: 99,
    };

    const snapshot = computeEntitlementSnapshot("user-9", "core", {}, explicitFlex, []);

    const music = snapshot.entitlements.find((e) => e.feature_key === "music_generation");
    expect(music).toBeDefined();
    expect(music!.flex_bonus).toBe(99);
    expect(snapshot.flex_credits_available).toEqual(explicitFlex);
  });
});
