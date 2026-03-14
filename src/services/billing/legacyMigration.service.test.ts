import { describe, it, expect } from "vitest";
import {
  getLegacyMapping,
  computeMigrationRules,
  simulateMigration,
  executeMigration,
  rollbackMigration,
  getMigrationStats,
} from "./legacyMigration.service";

// ===== getLegacyMapping =====

describe("getLegacyMapping", () => {
  it("returns a mapping for legacy_basic", () => {
    const mapping = getLegacyMapping("legacy_basic");
    expect(mapping).not.toBeNull();
    expect(mapping?.legacy_plan_id).toBe("legacy_basic");
  });

  it("returns a mapping for legacy_standard", () => {
    const mapping = getLegacyMapping("legacy_standard");
    expect(mapping).not.toBeNull();
    expect(mapping?.legacy_plan_id).toBe("legacy_standard");
  });

  it("returns a mapping for legacy_premium", () => {
    const mapping = getLegacyMapping("legacy_premium");
    expect(mapping).not.toBeNull();
    expect(mapping?.legacy_plan_id).toBe("legacy_premium");
  });

  it("returns a mapping for legacy_family", () => {
    const mapping = getLegacyMapping("legacy_family");
    expect(mapping).not.toBeNull();
    expect(mapping?.legacy_plan_id).toBe("legacy_family");
  });

  it("returns a mapping for legacy_student", () => {
    const mapping = getLegacyMapping("legacy_student");
    expect(mapping).not.toBeNull();
    expect(mapping?.legacy_plan_id).toBe("legacy_student");
  });

  it("returns a mapping for legacy_trial_pro", () => {
    const mapping = getLegacyMapping("legacy_trial_pro");
    expect(mapping).not.toBeNull();
    expect(mapping?.legacy_plan_id).toBe("legacy_trial_pro");
  });

  it("returns null for an unknown plan ID", () => {
    const mapping = getLegacyMapping("nonexistent_plan");
    expect(mapping).toBeNull();
  });

  it("returns null for an empty string", () => {
    const mapping = getLegacyMapping("");
    expect(mapping).toBeNull();
  });

  it("maps legacy_basic to the correct target plan (core)", () => {
    const mapping = getLegacyMapping("legacy_basic");
    expect(mapping?.target_plan_key).toBe("core");
  });

  it("maps legacy_standard to the correct target plan (plus)", () => {
    const mapping = getLegacyMapping("legacy_standard");
    expect(mapping?.target_plan_key).toBe("plus");
  });

  it("maps legacy_premium to the correct target plan (premium_family)", () => {
    const mapping = getLegacyMapping("legacy_premium");
    expect(mapping?.target_plan_key).toBe("premium_family");
  });

  it("maps legacy_family to the correct target plan (family_plus)", () => {
    const mapping = getLegacyMapping("legacy_family");
    expect(mapping?.target_plan_key).toBe("family_plus");
  });

  it("maps legacy_student to the correct target plan (core)", () => {
    const mapping = getLegacyMapping("legacy_student");
    expect(mapping?.target_plan_key).toBe("core");
  });

  it("maps legacy_trial_pro to the correct target plan (free)", () => {
    const mapping = getLegacyMapping("legacy_trial_pro");
    expect(mapping?.target_plan_key).toBe("free");
  });
});

// ===== computeMigrationRules =====

describe("computeMigrationRules", () => {
  it("returns an empty array for an unknown legacy plan", () => {
    const rules = computeMigrationRules("nonexistent_plan", { music_generation: 10 });
    expect(rules).toEqual([]);
  });

  it("computes compensation when quotas decrease (finite reduction)", () => {
    // legacy_trial_pro → free; free.music_generation = 2, legacy had 10 → reduction of 8
    const rules = computeMigrationRules("legacy_trial_pro", { music_generation: 10 });
    const musicRule = rules.find(r => r.feature_key === "music_generation");
    expect(musicRule).toBeDefined();
    expect(musicRule?.compensation_credits).toBeGreaterThan(0);
    // Compensation = legacy (10) - new (2) = 8
    expect(musicRule?.compensation_credits).toBe(8);
  });

  it("computes compensation when legacy was unlimited and new plan has a finite quota", () => {
    // legacy_trial_pro → free; free.escape_game_generation = 0 (locked), legacy had -1 (unlimited)
    // computeCompensationForFeature(-1, 0) → newQuota is 0, returns 5 (fallback minimum)
    const rules = computeMigrationRules("legacy_trial_pro", { escape_game_generation: -1 });
    const escapeRule = rules.find(r => r.feature_key === "escape_game_generation");
    expect(escapeRule).toBeDefined();
    expect(escapeRule?.compensation_credits).toBeGreaterThan(0);
  });

  it("grants no compensation when quotas increase from legacy to new plan", () => {
    // legacy_student → core; core.music_generation = 25, legacy had only 5 → increase
    const rules = computeMigrationRules("legacy_student", { music_generation: 5 });
    const musicRule = rules.find(r => r.feature_key === "music_generation");
    expect(musicRule).toBeDefined();
    expect(musicRule?.compensation_credits).toBe(0);
  });

  it("grants no compensation when quotas stay the same (both unlimited)", () => {
    // legacy_standard → plus; plus.animated_story_generation = -1, legacy also had -1
    const rules = computeMigrationRules("legacy_standard", { animated_story_generation: -1 });
    const storyRule = rules.find(r => r.feature_key === "animated_story_generation");
    expect(storyRule).toBeDefined();
    expect(storyRule?.compensation_credits).toBe(0);
  });

  it("prefers higher compensation between static and computed rules for legacy_basic", () => {
    // legacy_basic has a static rule for dynamic_sheet_generation with 10 credits
    // computed gives 0 (both unlimited); static gives 10 → result must be 10
    const rules = computeMigrationRules("legacy_basic", { dynamic_sheet_generation: -1 });
    const sheetRule = rules.find(r => r.feature_key === "dynamic_sheet_generation");
    expect(sheetRule).toBeDefined();
    expect(sheetRule?.compensation_credits).toBe(10);
  });

  it("skips features not present in the legacy quotas object", () => {
    // Only pass guardian_sms — other features should not appear in rules
    const rules = computeMigrationRules("legacy_standard", { guardian_sms: 5 });
    expect(rules.every(r => r.feature_key === "guardian_sms")).toBe(true);
  });
});

// ===== simulateMigration =====

describe("simulateMigration", () => {
  it("returns the correct target plan for legacy_basic", () => {
    const result = simulateMigration("legacy_basic", {});
    expect(result.targetPlan).toBe("core");
  });

  it("returns free plan for an unknown legacy plan", () => {
    const result = simulateMigration("unknown_plan", {});
    expect(result.targetPlan).toBe("free");
  });

  it("returns a non-empty summary string", () => {
    const result = simulateMigration("legacy_basic", {});
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("summary includes both source and target plan names", () => {
    const result = simulateMigration("legacy_standard", { music_generation: 10 });
    expect(result.summary).toContain("legacy_standard");
    expect(result.summary).toContain("plus");
  });

  it("summary indicates an unknown plan when no mapping exists", () => {
    const result = simulateMigration("ghost_plan", {});
    expect(result.summary).toContain("ghost_plan");
    expect(result.summary).toContain("No migration path");
  });

  it("calculates total compensation across all features", () => {
    // legacy_trial_pro → free; music: 20 - 2 = 18, escape: 5 - 0 = 5 → total = 23
    const result = simulateMigration("legacy_trial_pro", {
      music_generation: 20,
      escape_game_generation: 5,
    });
    expect(result.totalCompensation).toBeGreaterThan(0);
    expect(result.totalCompensation).toBe(23);
  });

  it("returns zero total compensation when all quotas increase or stay equal", () => {
    // legacy_student → core; both features increase in core vs legacy quotas
    const result = simulateMigration("legacy_student", {
      music_generation: 5,        // core has 25 → increase, no compensation
      escape_game_generation: 2,  // core has 10 → increase, no compensation
    });
    expect(result.totalCompensation).toBe(0);
  });

  it("returns a rules array", () => {
    const result = simulateMigration("legacy_premium", { music_generation: 10 });
    expect(Array.isArray(result.rules)).toBe(true);
  });
});

// ===== executeMigration =====

describe("executeMigration", () => {
  it("returns an audit entry with status 'completed'", () => {
    const audit = executeMigration("user_abc", "legacy_basic", {});
    expect(audit.status).toBe("completed");
  });

  it("audit entry has the correct user_id", () => {
    const audit = executeMigration("user_xyz", "legacy_standard", {});
    expect(audit.user_id).toBe("user_xyz");
  });

  it("audit entry has the correct legacy_plan_id", () => {
    const audit = executeMigration("user_xyz", "legacy_standard", {});
    expect(audit.legacy_plan_id).toBe("legacy_standard");
  });

  it("audit entry has a target_plan_key matching the mapping", () => {
    const audit = executeMigration("user_123", "legacy_premium", {});
    expect(audit.target_plan_key).toBe("premium_family");
  });

  it("audit entry has a non-empty generated id", () => {
    const audit = executeMigration("user_123", "legacy_basic", {});
    expect(typeof audit.id).toBe("string");
    expect(audit.id.length).toBeGreaterThan(0);
  });

  it("audit entry has a valid migrated_at ISO timestamp", () => {
    const audit = executeMigration("user_123", "legacy_basic", {});
    expect(() => new Date(audit.migrated_at)).not.toThrow();
    expect(new Date(audit.migrated_at).toString()).not.toBe("Invalid Date");
  });

  it("sets compensation_granted to true when rules produce credits", () => {
    // legacy_trial_pro → free; music 20 → 2, compensation expected
    const audit = executeMigration("user_comp", "legacy_trial_pro", { music_generation: 20 });
    expect(audit.compensation_granted).toBe(true);
  });

  it("sets compensation_granted to false when no credits are awarded", () => {
    // legacy_student → core with quotas that only increase → no compensation
    const audit = executeMigration("user_nocomp", "legacy_student", { music_generation: 5 });
    expect(audit.compensation_granted).toBe(false);
  });
});

// ===== rollbackMigration =====

describe("rollbackMigration", () => {
  it("changes status to 'rolled_back' for a completed migration", () => {
    const audit = executeMigration("user_rollback", "legacy_basic", {});
    expect(audit.status).toBe("completed");

    const rolledBack = rollbackMigration(audit.id);
    expect(rolledBack.status).toBe("rolled_back");
  });

  it("rolled-back entry retains original user_id and legacy_plan_id", () => {
    const audit = executeMigration("user_rollback_2", "legacy_family", {});
    const rolledBack = rollbackMigration(audit.id);
    expect(rolledBack.user_id).toBe("user_rollback_2");
    expect(rolledBack.legacy_plan_id).toBe("legacy_family");
  });

  it("returns a failed status entry for an unknown audit ID", () => {
    const result = rollbackMigration("audit_does_not_exist");
    expect(result.status).toBe("failed");
    expect(result.id).toBe("audit_does_not_exist");
  });
});

// ===== getMigrationStats =====

describe("getMigrationStats", () => {
  it("returns a stats object with all expected keys", () => {
    const stats = getMigrationStats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("completed");
    expect(stats).toHaveProperty("pending");
    expect(stats).toHaveProperty("failed");
    expect(stats).toHaveProperty("rolled_back");
  });

  it("all stat values are non-negative numbers", () => {
    const stats = getMigrationStats();
    expect(stats.total).toBeGreaterThanOrEqual(0);
    expect(stats.completed).toBeGreaterThanOrEqual(0);
    expect(stats.pending).toBeGreaterThanOrEqual(0);
    expect(stats.failed).toBeGreaterThanOrEqual(0);
    expect(stats.rolled_back).toBeGreaterThanOrEqual(0);
  });

  it("total is at least as large as each individual status count", () => {
    const stats = getMigrationStats();
    expect(stats.total).toBeGreaterThanOrEqual(stats.completed);
    expect(stats.total).toBeGreaterThanOrEqual(stats.pending);
    expect(stats.total).toBeGreaterThanOrEqual(stats.failed);
    expect(stats.total).toBeGreaterThanOrEqual(stats.rolled_back);
  });

  it("reflects migrations executed in the current session", () => {
    const before = getMigrationStats();
    executeMigration("user_stats_test", "legacy_standard", {});
    const after = getMigrationStats();
    expect(after.total).toBe(before.total + 1);
    expect(after.completed).toBe(before.completed + 1);
  });
});
