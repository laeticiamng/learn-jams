// ============================================================
// Legacy Migration Service — Maps legacy plans to current billing structure
// ============================================================

import type {
  LegacyPlanMapping,
  MigrationRule,
  MigrationAuditEntry,
} from "@/domain/billing/entitlement.types";
import type { PlanKey, FeatureKey } from "@/domain/billing/pricing.types";
import { FEATURE_KEYS } from "@/domain/billing/pricing.types";

// ---------- New-plan default quotas used for comparison ----------
// -1 = unlimited, 0 = locked/disabled

const NEW_PLAN_QUOTAS: Record<PlanKey, Record<FeatureKey, number>> = {
  free: {
    dynamic_sheet_generation: 3,
    animated_story_generation: 0,
    escape_game_generation: 0,
    music_generation: 2,
    video_generation_ai_seconds: 0,
    video_template_render: 0,
    guardian_sms: 0,
    guardian_email: 0,
    premium_export: 0,
  },
  core: {
    dynamic_sheet_generation: -1,
    animated_story_generation: -1,
    escape_game_generation: 10,
    music_generation: 25,
    video_generation_ai_seconds: 15,
    video_template_render: 5,
    guardian_sms: 0,
    guardian_email: 0,
    premium_export: 0,
  },
  plus: {
    dynamic_sheet_generation: -1,
    animated_story_generation: -1,
    escape_game_generation: 30,
    music_generation: 60,
    video_generation_ai_seconds: 60,
    video_template_render: 15,
    guardian_sms: 0,
    guardian_email: 10,
    premium_export: -1,
  },
  premium_family: {
    dynamic_sheet_generation: -1,
    animated_story_generation: -1,
    escape_game_generation: 80,
    music_generation: 100,
    video_generation_ai_seconds: 120,
    video_template_render: 30,
    guardian_sms: 10,
    guardian_email: 30,
    premium_export: -1,
  },
  family_plus: {
    dynamic_sheet_generation: -1,
    animated_story_generation: -1,
    escape_game_generation: 200,
    music_generation: 250,
    video_generation_ai_seconds: 300,
    video_template_render: 80,
    guardian_sms: 30,
    guardian_email: 100,
    premium_export: -1,
  },
  school: {
    dynamic_sheet_generation: -1,
    animated_story_generation: -1,
    escape_game_generation: 500,
    music_generation: 500,
    video_generation_ai_seconds: 600,
    video_template_render: 100,
    guardian_sms: 100,
    guardian_email: 500,
    premium_export: -1,
  },
};

// ---------- In-memory audit store (mock persistence) ----------

const _auditStore: Map<string, MigrationAuditEntry> = new Map();

// ---------- Static Legacy Plan Mappings ----------

/**
 * Maps known legacy plan IDs to their migration configuration.
 * migration_rules and notification_sent are set at migration time.
 */
export const LEGACY_PLAN_MAPPINGS: Record<string, LegacyPlanMapping> = {
  // Basic plan → core (30-day grace; user had unlimited sheets which core also provides)
  legacy_basic: {
    legacy_plan_id: "legacy_basic",
    target_plan_key: "core",
    migration_rules: [
      {
        feature_key: "dynamic_sheet_generation",
        legacy_quota: -1,
        new_quota: -1,
        // Unlimited was preserved, but compensate for any perceived downgrade risk
        compensation_credits: 10,
      },
    ],
    grace_period_days: 30,
    notification_sent: false,
  },

  // Standard plan → plus (30-day grace; quotas are comparable)
  legacy_standard: {
    legacy_plan_id: "legacy_standard",
    target_plan_key: "plus",
    migration_rules: [],
    grace_period_days: 30,
    notification_sent: false,
  },

  // Premium plan → premium_family (60-day grace; family tier bump)
  legacy_premium: {
    legacy_plan_id: "legacy_premium",
    target_plan_key: "premium_family",
    migration_rules: [],
    grace_period_days: 60,
    notification_sent: false,
  },

  // Family plan → family_plus (60-day grace; natural family tier upgrade)
  legacy_family: {
    legacy_plan_id: "legacy_family",
    target_plan_key: "family_plus",
    migration_rules: [],
    grace_period_days: 60,
    notification_sent: false,
  },

  // Student plan → core (90-day grace; student discount maintained via grace period)
  legacy_student: {
    legacy_plan_id: "legacy_student",
    target_plan_key: "core",
    migration_rules: [],
    grace_period_days: 90,
    notification_sent: false,
  },

  // Trial pro → free (14-day grace; trial has expired)
  legacy_trial_pro: {
    legacy_plan_id: "legacy_trial_pro",
    target_plan_key: "free",
    migration_rules: [],
    grace_period_days: 14,
    notification_sent: false,
  },
};

// ---------- Helpers ----------

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getNewQuota(planKey: PlanKey, featureKey: FeatureKey): number {
  return NEW_PLAN_QUOTAS[planKey]?.[featureKey] ?? 0;
}

/**
 * Computes the compensation credits for a single feature when moving from
 * legacy_quota to new_quota. Only awards credits when the new plan is a
 * strict reduction (both finite and new < legacy).
 */
function computeCompensationForFeature(
  featureKey: FeatureKey,
  legacyQuota: number,
  newQuota: number,
): number {
  // Both unlimited — no compensation needed
  if (legacyQuota === -1 && newQuota === -1) return 0;

  // Legacy unlimited but new is finite — compensate with the full new quota as bonus
  if (legacyQuota === -1 && newQuota >= 0) {
    return newQuota > 0 ? newQuota : 5;
  }

  // New plan is also unlimited — no compensation needed
  if (newQuota === -1) return 0;

  // Both finite — compensate the difference when there is a reduction
  if (newQuota < legacyQuota) {
    return legacyQuota - newQuota;
  }

  return 0;
}

// ---------- Public API ----------

/**
 * Returns the LegacyPlanMapping for the given legacy plan ID, or null if unknown.
 */
export function getLegacyMapping(legacyPlanId: string): LegacyPlanMapping | null {
  return LEGACY_PLAN_MAPPINGS[legacyPlanId] ?? null;
}

/**
 * Compares legacy quotas against the target plan's quotas and builds MigrationRule[]
 * with compensation_credits wherever the user loses quota.
 *
 * @param legacyPlanId   - The identifier of the legacy plan being migrated from.
 * @param legacyQuotas   - Per-feature quotas on the old plan (-1 = unlimited).
 */
export function computeMigrationRules(
  legacyPlanId: string,
  legacyQuotas: Partial<Record<FeatureKey, number>>,
): MigrationRule[] {
  const mapping = getLegacyMapping(legacyPlanId);
  if (!mapping) return [];

  const targetPlan = mapping.target_plan_key;
  const rules: MigrationRule[] = [];

  for (const featureKey of FEATURE_KEYS) {
    const legacyQuota = legacyQuotas[featureKey];
    // Skip features that weren't part of the legacy plan at all
    if (legacyQuota === undefined) continue;

    const newQuota = getNewQuota(targetPlan, featureKey);
    const compensation = computeCompensationForFeature(featureKey, legacyQuota, newQuota);

    rules.push({
      feature_key: featureKey,
      legacy_quota: legacyQuota,
      new_quota: newQuota,
      compensation_credits: compensation,
    });
  }

  // Merge with any static rules declared in the mapping (e.g. legacy_basic sheet compensation)
  const staticRules = mapping.migration_rules;
  for (const staticRule of staticRules) {
    const alreadyComputed = rules.find((r) => r.feature_key === staticRule.feature_key);
    if (!alreadyComputed) {
      rules.push(staticRule);
    } else {
      // Prefer the higher compensation value between static and computed
      alreadyComputed.compensation_credits = Math.max(
        alreadyComputed.compensation_credits,
        staticRule.compensation_credits,
      );
    }
  }

  return rules;
}

/**
 * Creates a MigrationAuditEntry for the given user, legacy plan, and rules.
 * The entry is stored in the in-memory audit store with status "pending".
 */
export function createMigrationAudit(
  userId: string,
  legacyPlanId: string,
  rules: MigrationRule[],
): MigrationAuditEntry {
  const mapping = getLegacyMapping(legacyPlanId);
  const targetPlanKey: PlanKey = mapping?.target_plan_key ?? "free";
  const totalCompensation = rules.reduce((sum, r) => sum + r.compensation_credits, 0);

  const entry: MigrationAuditEntry = {
    id: generateId("audit"),
    user_id: userId,
    legacy_plan_id: legacyPlanId,
    target_plan_key: targetPlanKey,
    migrated_at: new Date().toISOString(),
    rules_applied: rules,
    compensation_granted: totalCompensation > 0,
    status: "pending",
  };

  _auditStore.set(entry.id, entry);
  return entry;
}

/**
 * Performs a dry-run migration without persisting any changes.
 * Returns the target plan, computed rules, total compensation, and a human-readable summary.
 */
export function simulateMigration(
  legacyPlanId: string,
  legacyQuotas: Partial<Record<FeatureKey, number>>,
): {
  targetPlan: PlanKey;
  rules: MigrationRule[];
  totalCompensation: number;
  summary: string;
} {
  const mapping = getLegacyMapping(legacyPlanId);
  if (!mapping) {
    return {
      targetPlan: "free",
      rules: [],
      totalCompensation: 0,
      summary: `Unknown legacy plan "${legacyPlanId}". No migration path available.`,
    };
  }

  const rules = computeMigrationRules(legacyPlanId, legacyQuotas);
  const totalCompensation = rules.reduce((sum, r) => sum + r.compensation_credits, 0);

  const downgradedFeatures = rules.filter(
    (r) =>
      r.legacy_quota !== r.new_quota &&
      (r.legacy_quota === -1 || (r.new_quota !== -1 && r.new_quota < r.legacy_quota)),
  );

  const lines: string[] = [
    `Dry-run migration: "${legacyPlanId}" → "${mapping.target_plan_key}"`,
    `Grace period: ${mapping.grace_period_days} days`,
    `Features evaluated: ${rules.length}`,
    `Features with reduced quota: ${downgradedFeatures.length}`,
    `Total compensation credits: ${totalCompensation}`,
  ];

  if (downgradedFeatures.length > 0) {
    lines.push(
      "Affected features: " +
        downgradedFeatures.map((r) => r.feature_key).join(", "),
    );
  }

  return {
    targetPlan: mapping.target_plan_key,
    rules,
    totalCompensation,
    summary: lines.join("\n"),
  };
}

/**
 * Executes the migration for a user. Computes rules, creates an audit entry,
 * marks it as "completed", and returns the audit entry.
 */
export function executeMigration(
  userId: string,
  legacyPlanId: string,
  legacyQuotas: Partial<Record<FeatureKey, number>>,
): MigrationAuditEntry {
  const rules = computeMigrationRules(legacyPlanId, legacyQuotas);
  const audit = createMigrationAudit(userId, legacyPlanId, rules);

  const completed: MigrationAuditEntry = {
    ...audit,
    status: "completed",
    migrated_at: new Date().toISOString(),
  };

  _auditStore.set(completed.id, completed);
  return completed;
}

/**
 * Rolls back a previously completed migration by marking its audit entry as "rolled_back".
 * Returns the updated audit entry, or a synthetic failed entry if the audit ID is unknown.
 */
export function rollbackMigration(auditId: string): MigrationAuditEntry {
  const existing = _auditStore.get(auditId);

  if (!existing) {
    // Return a synthetic entry representing the failed rollback attempt
    const notFound: MigrationAuditEntry = {
      id: auditId,
      user_id: "unknown",
      legacy_plan_id: "unknown",
      target_plan_key: "free",
      migrated_at: new Date().toISOString(),
      rules_applied: [],
      compensation_granted: false,
      status: "failed",
    };
    return notFound;
  }

  const rolledBack: MigrationAuditEntry = {
    ...existing,
    status: "rolled_back",
  };

  _auditStore.set(auditId, rolledBack);
  return rolledBack;
}

/**
 * Returns aggregate counts across all audit entries in the in-memory store.
 * In a production environment this would query a database.
 */
export function getMigrationStats(): {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  rolled_back: number;
} {
  // Mock baseline counts to simulate a realistic dataset
  const mockBase = { total: 1200, completed: 1050, pending: 82, failed: 43, rolled_back: 25 };

  let completed = mockBase.completed;
  let pending = mockBase.pending;
  let failed = mockBase.failed;
  let rolled_back = mockBase.rolled_back;

  for (const entry of _auditStore.values()) {
    switch (entry.status) {
      case "completed":
        completed++;
        break;
      case "pending":
        pending++;
        break;
      case "failed":
        failed++;
        break;
      case "rolled_back":
        rolled_back++;
        break;
    }
  }

  return {
    total: mockBase.total + _auditStore.size,
    completed,
    pending,
    failed,
    rolled_back,
  };
}
