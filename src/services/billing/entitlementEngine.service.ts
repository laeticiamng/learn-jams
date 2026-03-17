// ============================================================
// Entitlement Engine — Snapshot computation, format availability, paywall context
//
// ENTITLEMENT PRECEDENCE MODEL (authoritative):
//   1. Admin metadata override (user_metadata.is_admin === true OR role === "admin")
//      → useUserPlan resolves to plan_key from metadata (default: "school")
//      → "school" plan has ALL features as "included" with quota = -1 (unlimited)
//   2. Active subscription plan (from subscriptions table, status = "active")
//      → currently maps to "core" plan
//   3. Default: "free" plan
//
// UNLIMITED CONVENTION:
//   quota = -1 means unlimited everywhere:
//     - PlanFormatEntry.monthly_quota
//     - EntitlementEntry.quota_total / quota_remaining / effective_remaining
//     - PLAN_QUOTAS in planResolver.service.ts
//   This convention is enforced in resolveQuotaRemaining() and resolveEffectiveRemaining().
//
// FEATURE GATING:
//   All feature gates MUST use checkEntitlement() or getFormatAvailability() against
//   the snapshot. Direct quota lookups bypass flex credits and top-ups.
// ============================================================

import type { PlanKey, FeatureKey } from "@/domain/billing/pricing.types";
import { FEATURE_KEYS } from "@/domain/billing/pricing.types";
import type {
  FormatAvailability,
  PlanFormatEntry,
  UserEntitlementSnapshot,
  EntitlementEntry,
  TopupSummary,
  EntitlementRestriction,
  PaywallContext,
  PaywallTrigger,
} from "@/domain/billing/entitlement.types";
import { getPlanQuota, suggestUpgrade } from "./planResolver.service";
import { computeAvailableFlexCredits } from "./adaptiveCredits.service";

// ---------- Static Plan-Format Matrix ----------

const PLAN_FORMAT_MATRIX: PlanFormatEntry[] = [
  // ── free ──────────────────────────────────────────────────────────────────
  { plan_key: "free", feature_key: "dynamic_sheet_generation",  availability: "limited",    monthly_quota: 3,   overage_allowed: false, topup_eligible: true  },
  { plan_key: "free", feature_key: "music_generation",          availability: "limited",    monthly_quota: 2,   overage_allowed: false, topup_eligible: true  },
  { plan_key: "free", feature_key: "escape_game_generation",    availability: "locked",     monthly_quota: 0,   overage_allowed: false, topup_eligible: false },
  { plan_key: "free", feature_key: "animated_story_generation", availability: "locked",     monthly_quota: 0,   overage_allowed: false, topup_eligible: false },
  { plan_key: "free", feature_key: "video_generation_ai_seconds", availability: "locked",   monthly_quota: 0,   overage_allowed: false, topup_eligible: false },
  { plan_key: "free", feature_key: "video_template_render",     availability: "locked",     monthly_quota: 0,   overage_allowed: false, topup_eligible: false },
  { plan_key: "free", feature_key: "guardian_sms",              availability: "locked",     monthly_quota: 0,   overage_allowed: false, topup_eligible: false },
  { plan_key: "free", feature_key: "guardian_email",            availability: "locked",     monthly_quota: 0,   overage_allowed: false, topup_eligible: false },
  { plan_key: "free", feature_key: "premium_export",            availability: "locked",     monthly_quota: 0,   overage_allowed: false, topup_eligible: false },

  // ── core ──────────────────────────────────────────────────────────────────
  { plan_key: "core", feature_key: "dynamic_sheet_generation",  availability: "included",   monthly_quota: -1,  overage_allowed: false, topup_eligible: false },
  { plan_key: "core", feature_key: "animated_story_generation", availability: "included",   monthly_quota: -1,  overage_allowed: false, topup_eligible: false },
  { plan_key: "core", feature_key: "escape_game_generation",    availability: "included",   monthly_quota: 10,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "core", feature_key: "music_generation",          availability: "included",   monthly_quota: 25,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "core", feature_key: "video_generation_ai_seconds", availability: "limited",  monthly_quota: 15,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "core", feature_key: "video_template_render",     availability: "limited",    monthly_quota: 5,   overage_allowed: false, topup_eligible: true  },
  { plan_key: "core", feature_key: "guardian_sms",              availability: "locked",     monthly_quota: 0,   overage_allowed: false, topup_eligible: false },
  { plan_key: "core", feature_key: "guardian_email",            availability: "locked",     monthly_quota: 0,   overage_allowed: false, topup_eligible: false },
  { plan_key: "core", feature_key: "premium_export",            availability: "locked",     monthly_quota: 0,   overage_allowed: false, topup_eligible: false },

  // ── plus ──────────────────────────────────────────────────────────────────
  { plan_key: "plus", feature_key: "dynamic_sheet_generation",  availability: "included",   monthly_quota: -1,  overage_allowed: false, topup_eligible: false },
  { plan_key: "plus", feature_key: "animated_story_generation", availability: "included",   monthly_quota: -1,  overage_allowed: false, topup_eligible: false },
  { plan_key: "plus", feature_key: "escape_game_generation",    availability: "included",   monthly_quota: 30,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "plus", feature_key: "music_generation",          availability: "included",   monthly_quota: 60,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "plus", feature_key: "video_generation_ai_seconds", availability: "included", monthly_quota: 60,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "plus", feature_key: "video_template_render",     availability: "included",   monthly_quota: 15,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "plus", feature_key: "guardian_sms",              availability: "locked",     monthly_quota: 0,   overage_allowed: false, topup_eligible: false },
  { plan_key: "plus", feature_key: "guardian_email",            availability: "included",   monthly_quota: 10,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "plus", feature_key: "premium_export",            availability: "included",   monthly_quota: -1,  overage_allowed: false, topup_eligible: false },

  // ── premium_family ────────────────────────────────────────────────────────
  { plan_key: "premium_family", feature_key: "dynamic_sheet_generation",  availability: "included", monthly_quota: -1,  overage_allowed: false, topup_eligible: false },
  { plan_key: "premium_family", feature_key: "animated_story_generation", availability: "included", monthly_quota: -1,  overage_allowed: false, topup_eligible: false },
  { plan_key: "premium_family", feature_key: "escape_game_generation",    availability: "included", monthly_quota: 80,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "premium_family", feature_key: "music_generation",          availability: "included", monthly_quota: 100, overage_allowed: false, topup_eligible: true  },
  { plan_key: "premium_family", feature_key: "video_generation_ai_seconds", availability: "included", monthly_quota: 120, overage_allowed: false, topup_eligible: true },
  { plan_key: "premium_family", feature_key: "video_template_render",     availability: "included", monthly_quota: 30,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "premium_family", feature_key: "guardian_sms",              availability: "included", monthly_quota: 10,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "premium_family", feature_key: "guardian_email",            availability: "included", monthly_quota: 30,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "premium_family", feature_key: "premium_export",            availability: "included", monthly_quota: -1,  overage_allowed: false, topup_eligible: false },

  // ── family_plus ───────────────────────────────────────────────────────────
  { plan_key: "family_plus", feature_key: "dynamic_sheet_generation",  availability: "included", monthly_quota: -1,  overage_allowed: false, topup_eligible: false },
  { plan_key: "family_plus", feature_key: "animated_story_generation", availability: "included", monthly_quota: -1,  overage_allowed: false, topup_eligible: false },
  { plan_key: "family_plus", feature_key: "escape_game_generation",    availability: "included", monthly_quota: 200, overage_allowed: false, topup_eligible: true  },
  { plan_key: "family_plus", feature_key: "music_generation",          availability: "included", monthly_quota: 250, overage_allowed: false, topup_eligible: true  },
  { plan_key: "family_plus", feature_key: "video_generation_ai_seconds", availability: "included", monthly_quota: 300, overage_allowed: false, topup_eligible: true },
  { plan_key: "family_plus", feature_key: "video_template_render",     availability: "included", monthly_quota: 80,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "family_plus", feature_key: "guardian_sms",              availability: "included", monthly_quota: 30,  overage_allowed: false, topup_eligible: true  },
  { plan_key: "family_plus", feature_key: "guardian_email",            availability: "included", monthly_quota: 100, overage_allowed: false, topup_eligible: true  },
  { plan_key: "family_plus", feature_key: "premium_export",            availability: "included", monthly_quota: -1,  overage_allowed: false, topup_eligible: false },

  // ── school ────────────────────────────────────────────────────────────────
  { plan_key: "school", feature_key: "dynamic_sheet_generation",    availability: "included", monthly_quota: -1, overage_allowed: false, topup_eligible: false },
  { plan_key: "school", feature_key: "animated_story_generation",   availability: "included", monthly_quota: -1, overage_allowed: false, topup_eligible: false },
  { plan_key: "school", feature_key: "escape_game_generation",      availability: "included", monthly_quota: -1, overage_allowed: false, topup_eligible: false },
  { plan_key: "school", feature_key: "music_generation",            availability: "included", monthly_quota: -1, overage_allowed: false, topup_eligible: false },
  { plan_key: "school", feature_key: "video_generation_ai_seconds", availability: "included", monthly_quota: -1, overage_allowed: false, topup_eligible: false },
  { plan_key: "school", feature_key: "video_template_render",       availability: "included", monthly_quota: -1, overage_allowed: false, topup_eligible: false },
  { plan_key: "school", feature_key: "guardian_sms",                availability: "included", monthly_quota: -1, overage_allowed: false, topup_eligible: false },
  { plan_key: "school", feature_key: "guardian_email",              availability: "included", monthly_quota: -1, overage_allowed: false, topup_eligible: false },
  { plan_key: "school", feature_key: "premium_export",              availability: "included", monthly_quota: -1, overage_allowed: false, topup_eligible: false },
];

// ---------- Helpers ----------

function findMatrixEntry(planKey: PlanKey, featureKey: FeatureKey): PlanFormatEntry | undefined {
  return PLAN_FORMAT_MATRIX.find(
    (e) => e.plan_key === planKey && e.feature_key === featureKey,
  );
}

function resolveQuotaRemaining(quotaTotal: number, quotaUsed: number): number {
  if (quotaTotal === -1) return -1;
  return Math.max(0, quotaTotal - quotaUsed);
}

function resolveEffectiveRemaining(
  quotaRemaining: number,
  flexBonus: number,
  topupBonus: number,
): number {
  if (quotaRemaining === -1) return -1;
  return quotaRemaining + flexBonus + topupBonus;
}

// ---------- Public API ----------

/**
 * Returns the FormatAvailability for a given plan × feature combination.
 * Falls back to "locked" if no matrix entry is found.
 */
export function getFormatAvailability(planKey: PlanKey, featureKey: FeatureKey): FormatAvailability {
  return findMatrixEntry(planKey, featureKey)?.availability ?? "locked";
}

/**
 * Returns all PlanFormatEntry rows for a given plan.
 */
export function getPlanFormatMatrix(planKey: PlanKey): PlanFormatEntry[] {
  return PLAN_FORMAT_MATRIX.filter((e) => e.plan_key === planKey);
}

/**
 * Builds a PaywallContext for a feature that cannot be accessed on the current plan/snapshot.
 */
export function buildPaywallContext(
  planKey: PlanKey,
  featureKey: FeatureKey,
  snapshot: UserEntitlementSnapshot,
): PaywallContext {
  const availability = getFormatAvailability(planKey, featureKey);
  const entry = snapshot.entitlements.find((e) => e.feature_key === featureKey);
  const flexAvailable = (snapshot.flex_credits_available[featureKey] ?? 0) > 0;
  const suggestedPlan = suggestUpgrade(planKey, featureKey) ?? undefined;
  const matrixEntry = findMatrixEntry(planKey, featureKey);

  let trigger: PaywallTrigger;
  let messageKey: string;

  if (availability === "locked") {
    trigger = "format_locked";
    messageKey = `paywall.feature_locked.${featureKey}`;
  } else if (entry && entry.effective_remaining === 0) {
    trigger = flexAvailable ? "adaptive_reallocation" : "quota_exhausted";
    messageKey = flexAvailable
      ? `paywall.adaptive_available.${featureKey}`
      : `paywall.quota_exhausted.${featureKey}`;
  } else {
    trigger = "feature_upgrade";
    messageKey = `paywall.upgrade_suggested.${featureKey}`;
  }

  return {
    trigger,
    feature_key: featureKey,
    current_plan: planKey,
    suggested_plan: suggestedPlan,
    suggested_topup: matrixEntry?.topup_eligible ? `topup.${featureKey}` : undefined,
    can_use_flex: flexAvailable,
    message_key: messageKey,
  };
}

/**
 * Checks whether a user snapshot allows consuming `amount` units of a feature.
 * Returns { allowed, source } on success, or { allowed: false, paywall } on denial.
 */
export function checkEntitlement(
  snapshot: UserEntitlementSnapshot,
  featureKey: FeatureKey,
  amount: number = 1,
): { allowed: boolean; source: string; paywall?: PaywallContext } {
  const entry = snapshot.entitlements.find((e) => e.feature_key === featureKey);

  if (!entry || entry.availability === "locked") {
    return {
      allowed: false,
      source: "none",
      paywall: buildPaywallContext(snapshot.plan_key, featureKey, snapshot),
    };
  }

  // Unlimited quota — always allowed from quota
  if (entry.quota_total === -1) {
    return { allowed: true, source: "quota" };
  }

  // Quota covers the request
  if (entry.quota_remaining >= amount) {
    return { allowed: true, source: "quota" };
  }

  // Top-up covers the remaining need
  const topupEntry = snapshot.active_topups.find((t) => t.feature_key === featureKey);
  if (topupEntry && topupEntry.remaining >= amount) {
    return { allowed: true, source: "topup" };
  }

  // Flex credits cover the request
  const flexAvailable = snapshot.flex_credits_available[featureKey] ?? 0;
  if (flexAvailable >= amount) {
    return { allowed: true, source: "flex" };
  }

  // Combined quota + flex + topup covers the request
  if (entry.effective_remaining >= amount) {
    const source = entry.topup_bonus > 0 ? "topup" : "flex";
    return { allowed: true, source };
  }

  return {
    allowed: false,
    source: "none",
    paywall: buildPaywallContext(snapshot.plan_key, featureKey, snapshot),
  };
}

/**
 * Builds a complete UserEntitlementSnapshot for a user.
 */
export function computeEntitlementSnapshot(
  userId: string,
  planKey: PlanKey,
  currentUsage: Partial<Record<FeatureKey, number>>,
  flexCredits: Partial<Record<FeatureKey, number>> | null,
  topups: TopupSummary[],
): UserEntitlementSnapshot {
  const computedAt = new Date().toISOString();
  const snapshotId = `${userId}_${planKey}_${computedAt}`;

  // Resolve flex credits — use provided value or compute on the fly
  const flexCreditsAvailable: Partial<Record<FeatureKey, number>> =
    flexCredits ?? computeAvailableFlexCredits(planKey, currentUsage);

  const entitlements: EntitlementEntry[] = [];
  const restrictions: EntitlementRestriction[] = [];

  for (const featureKey of FEATURE_KEYS) {
    const matrixEntry = findMatrixEntry(planKey, featureKey);
    const availability: FormatAvailability = matrixEntry?.availability ?? "locked";
    const quotaTotal = matrixEntry?.monthly_quota ?? getPlanQuota(planKey, featureKey);
    const quotaUsed = currentUsage[featureKey] ?? 0;
    const quotaRemaining = resolveQuotaRemaining(quotaTotal, quotaUsed);

    const flexBonus = flexCreditsAvailable[featureKey] ?? 0;

    const topupEntry = topups.find((t) => t.feature_key === featureKey);
    const topupBonus = topupEntry?.remaining ?? 0;

    const effectiveRemaining = resolveEffectiveRemaining(quotaRemaining, flexBonus, topupBonus);

    entitlements.push({
      feature_key: featureKey,
      availability,
      quota_total: quotaTotal,
      quota_used: quotaUsed,
      quota_remaining: quotaRemaining,
      flex_bonus: flexBonus,
      topup_bonus: topupBonus,
      effective_remaining: effectiveRemaining,
    });

    // Build restrictions for locked or exhausted features
    if (availability === "locked") {
      const upgradePath = suggestUpgrade(planKey, featureKey) ?? undefined;
      restrictions.push({
        feature_key: featureKey,
        reason: "plan_locked",
        upgrade_path: upgradePath,
        topup_available: matrixEntry?.topup_eligible ?? false,
        message_key: `restriction.plan_locked.${featureKey}`,
      });
    } else if (effectiveRemaining === 0 && quotaTotal !== -1) {
      const upgradePath = suggestUpgrade(planKey, featureKey) ?? undefined;
      restrictions.push({
        feature_key: featureKey,
        reason: "quota_exhausted",
        upgrade_path: upgradePath,
        topup_available: matrixEntry?.topup_eligible ?? false,
        message_key: `restriction.quota_exhausted.${featureKey}`,
      });
    }
  }

  return {
    id: snapshotId,
    user_id: userId,
    plan_key: planKey,
    computed_at: computedAt,
    entitlements,
    flex_credits_available: flexCreditsAvailable,
    active_topups: topups,
    restrictions,
  };
}
