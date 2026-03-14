// ============================================================
// Adaptive Credits Engine — Flex credit allocation & conversion
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { FeatureKey, PlanKey } from "@/domain/billing/pricing.types";
import type {
  AdaptiveCreditPolicy,
  ConversionRule,
  FlexBudget,
  FlexCaps,
  ReallocationProposal,
  ProposedConversion,
  ReallocationEntry,
  UsageProfile,
  DominantMode,
} from "@/domain/billing/adaptiveCredits.types";
import { getPlanQuota } from "./planResolver.service";

// ---------- Static Policies ----------

const FLEX_POLICIES: Record<PlanKey, { budget: FlexBudget; caps: FlexCaps; rules: ConversionRule[] }> = {
  free: {
    budget: { total_flex_units: 0, allocatable_to: {} },
    caps: { max_reallocation_pct: 0, video_ai_never_reallocatable: true, per_feature_caps: {} },
    rules: [],
  },
  core: {
    budget: {
      total_flex_units: 15,
      allocatable_to: {
        music_generation: 8,
        escape_game_generation: 5,
        dynamic_sheet_generation: 10,
        animated_story_generation: 8,
      },
    },
    caps: {
      max_reallocation_pct: 30,
      video_ai_never_reallocatable: true,
      per_feature_caps: { music_generation: 8, escape_game_generation: 5 },
    },
    rules: [
      { from: "video_template_render", to: "music_generation", ratio: 2, max_convertible_pct: 60 },
      { from: "video_template_render", to: "escape_game_generation", ratio: 1.5, max_convertible_pct: 60 },
      { from: "video_generation_ai_seconds", to: "music_generation", ratio: 3, max_convertible_pct: 40 },
      { from: "music_generation", to: "escape_game_generation", ratio: 0.8, max_convertible_pct: 30 },
      { from: "escape_game_generation", to: "music_generation", ratio: 1.2, max_convertible_pct: 30 },
    ],
  },
  plus: {
    budget: {
      total_flex_units: 30,
      allocatable_to: {
        music_generation: 15,
        escape_game_generation: 10,
        dynamic_sheet_generation: 20,
        animated_story_generation: 15,
        video_template_render: 5,
      },
    },
    caps: {
      max_reallocation_pct: 40,
      video_ai_never_reallocatable: true,
      per_feature_caps: { music_generation: 15, escape_game_generation: 10, video_template_render: 5 },
    },
    rules: [
      { from: "video_template_render", to: "music_generation", ratio: 2, max_convertible_pct: 60 },
      { from: "video_template_render", to: "escape_game_generation", ratio: 1.5, max_convertible_pct: 60 },
      { from: "video_generation_ai_seconds", to: "music_generation", ratio: 3, max_convertible_pct: 50 },
      { from: "video_generation_ai_seconds", to: "escape_game_generation", ratio: 2, max_convertible_pct: 50 },
      { from: "music_generation", to: "escape_game_generation", ratio: 0.8, max_convertible_pct: 40 },
      { from: "escape_game_generation", to: "music_generation", ratio: 1.2, max_convertible_pct: 40 },
    ],
  },
  premium_family: {
    budget: {
      total_flex_units: 50,
      allocatable_to: {
        music_generation: 25,
        escape_game_generation: 20,
        dynamic_sheet_generation: 30,
        animated_story_generation: 25,
        video_template_render: 10,
      },
    },
    caps: {
      max_reallocation_pct: 50,
      video_ai_never_reallocatable: true,
      per_feature_caps: { music_generation: 25, escape_game_generation: 20, video_template_render: 10 },
    },
    rules: [
      { from: "video_template_render", to: "music_generation", ratio: 2, max_convertible_pct: 70 },
      { from: "video_template_render", to: "escape_game_generation", ratio: 1.5, max_convertible_pct: 70 },
      { from: "video_generation_ai_seconds", to: "music_generation", ratio: 3, max_convertible_pct: 50 },
      { from: "video_generation_ai_seconds", to: "escape_game_generation", ratio: 2, max_convertible_pct: 50 },
      { from: "music_generation", to: "escape_game_generation", ratio: 0.8, max_convertible_pct: 50 },
      { from: "escape_game_generation", to: "music_generation", ratio: 1.2, max_convertible_pct: 50 },
    ],
  },
  family_plus: {
    budget: {
      total_flex_units: 80,
      allocatable_to: {
        music_generation: 40,
        escape_game_generation: 30,
        dynamic_sheet_generation: 50,
        animated_story_generation: 40,
        video_template_render: 20,
      },
    },
    caps: {
      max_reallocation_pct: 60,
      video_ai_never_reallocatable: true,
      per_feature_caps: { music_generation: 40, escape_game_generation: 30, video_template_render: 20 },
    },
    rules: [
      { from: "video_template_render", to: "music_generation", ratio: 2, max_convertible_pct: 70 },
      { from: "video_template_render", to: "escape_game_generation", ratio: 1.5, max_convertible_pct: 70 },
      { from: "video_generation_ai_seconds", to: "music_generation", ratio: 3, max_convertible_pct: 50 },
      { from: "video_generation_ai_seconds", to: "escape_game_generation", ratio: 2, max_convertible_pct: 50 },
      { from: "music_generation", to: "escape_game_generation", ratio: 0.8, max_convertible_pct: 50 },
      { from: "escape_game_generation", to: "music_generation", ratio: 1.2, max_convertible_pct: 50 },
    ],
  },
  school: {
    budget: {
      total_flex_units: 100,
      allocatable_to: {
        music_generation: 50,
        escape_game_generation: 40,
        dynamic_sheet_generation: 60,
        animated_story_generation: 50,
        video_template_render: 30,
      },
    },
    caps: {
      max_reallocation_pct: 60,
      video_ai_never_reallocatable: true,
      per_feature_caps: { music_generation: 50, escape_game_generation: 40, video_template_render: 30 },
    },
    rules: [
      { from: "video_template_render", to: "music_generation", ratio: 2, max_convertible_pct: 70 },
      { from: "video_template_render", to: "escape_game_generation", ratio: 1.5, max_convertible_pct: 70 },
      { from: "video_generation_ai_seconds", to: "music_generation", ratio: 3, max_convertible_pct: 50 },
      { from: "music_generation", to: "escape_game_generation", ratio: 0.8, max_convertible_pct: 60 },
      { from: "escape_game_generation", to: "music_generation", ratio: 1.2, max_convertible_pct: 60 },
    ],
  },
};

// ---------- Get Policy ----------

export function getFlexPolicy(plan: PlanKey) {
  return FLEX_POLICIES[plan] ?? FLEX_POLICIES.free;
}

export function getFlexBudget(plan: PlanKey): FlexBudget {
  return getFlexPolicy(plan).budget;
}

export function getFlexCaps(plan: PlanKey): FlexCaps {
  return getFlexPolicy(plan).caps;
}

export function getConversionRules(plan: PlanKey): ConversionRule[] {
  return getFlexPolicy(plan).rules;
}

// ---------- Compute available flex credits ----------

export function computeAvailableFlexCredits(
  plan: PlanKey,
  currentUsage: Partial<Record<FeatureKey, number>>,
): Partial<Record<FeatureKey, number>> {
  const policy = getFlexPolicy(plan);
  if (policy.budget.total_flex_units === 0) return {};

  const available: Partial<Record<FeatureKey, number>> = {};

  for (const rule of policy.rules) {
    const quota = getPlanQuota(plan, rule.from);
    if (quota <= 0) continue; // skip unlimited or disabled

    const used = currentUsage[rule.from] ?? 0;
    const unused = Math.max(0, quota - used);
    const convertible = Math.floor(unused * (rule.max_convertible_pct / 100));

    if (convertible <= 0) continue;

    const gained = Math.floor(convertible * rule.ratio);
    const cap = policy.caps.per_feature_caps[rule.to] ?? Infinity;
    const currentExtra = available[rule.to] ?? 0;
    const canAdd = Math.min(gained, cap - currentExtra);

    if (canAdd > 0) {
      available[rule.to] = currentExtra + canAdd;
    }
  }

  return available;
}

// ---------- Check flex credit availability ----------

export function checkFlexCredit(
  plan: PlanKey,
  feature: FeatureKey,
  currentUsage: Partial<Record<FeatureKey, number>>,
  amount: number = 1,
): { available: boolean; flexRemaining: number } {
  if (feature === "video_generation_ai_seconds") {
    return { available: false, flexRemaining: 0 };
  }

  const flexCredits = computeAvailableFlexCredits(plan, currentUsage);
  const flexForFeature = flexCredits[feature] ?? 0;

  return {
    available: flexForFeature >= amount,
    flexRemaining: flexForFeature,
  };
}

// ---------- Consume flex credit ----------

export async function consumeFlexCredit(
  userId: string,
  plan: PlanKey,
  feature: FeatureKey,
  currentUsage: Partial<Record<FeatureKey, number>>,
  amount: number = 1,
): Promise<boolean> {
  const check = checkFlexCredit(plan, feature, currentUsage, amount);
  if (!check.available) return false;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Find which conversion rule applies
  const rules = getConversionRules(plan);
  const applicableRule = rules.find((r) => r.to === feature);
  if (!applicableRule) return false;

  const entry: ReallocationEntry = {
    from_feature: applicableRule.from,
    to_feature: feature,
    units_converted: amount,
    ratio_applied: applicableRule.ratio,
    timestamp: now.toISOString(),
  };

  // Upsert adaptive credit balance
  const { data: existing } = await supabase
    .from("adaptive_credit_balances")
    .select("id, consumed_flex_credits_json, reallocation_log_json")
    .eq("user_id", userId)
    .eq("billing_period_start", periodStart)
    .single();

  if (existing) {
    const consumed = existing.consumed_flex_credits_json as Record<string, number>;
    consumed[feature] = (consumed[feature] ?? 0) + amount;
    const log = existing.reallocation_log_json as ReallocationEntry[];
    log.push(entry);

    await supabase
      .from("adaptive_credit_balances")
      .update({
        consumed_flex_credits_json: consumed,
        reallocation_log_json: log,
        updated_at: now.toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("adaptive_credit_balances").insert({
      user_id: userId,
      billing_period_start: periodStart,
      billing_period_end: periodEnd,
      available_flex_credits_json: computeAvailableFlexCredits(plan, currentUsage),
      consumed_flex_credits_json: { [feature]: amount },
      reallocation_log_json: [entry],
    });
  }

  return true;
}

// ---------- Generate reallocation proposal ----------

export function generateReallocationProposal(
  plan: PlanKey,
  profile: UsageProfile,
  currentUsage: Partial<Record<FeatureKey, number>>,
): ReallocationProposal {
  const dominantMode = profileToDominantMode(profile);
  const availableConversions: ProposedConversion[] = [];
  const rules = getConversionRules(plan);
  const caps = getFlexCaps(plan);

  for (const rule of rules) {
    const quota = getPlanQuota(plan, rule.from);
    if (quota <= 0) continue;

    const used = currentUsage[rule.from] ?? 0;
    const unused = Math.max(0, quota - used);
    const convertible = Math.floor(unused * (rule.max_convertible_pct / 100));

    if (convertible <= 0) continue;

    const gained = Math.floor(convertible * rule.ratio);
    const cap = caps.per_feature_caps[rule.to] ?? Infinity;
    const actualGain = Math.min(gained, cap);

    if (actualGain > 0) {
      availableConversions.push({
        from_feature: rule.from,
        to_feature: rule.to,
        from_unused: unused,
        to_gained: actualGain,
        ratio: rule.ratio,
      });
    }
  }

  // Sort by relevance to dominant mode
  const targetFeature = dominantModeToFeature(dominantMode);
  availableConversions.sort((a, b) => {
    if (a.to_feature === targetFeature && b.to_feature !== targetFeature) return -1;
    if (b.to_feature === targetFeature && a.to_feature !== targetFeature) return 1;
    return b.to_gained - a.to_gained;
  });

  const messageKey = availableConversions.length > 0
    ? `adaptive.proposal_${dominantMode}`
    : "adaptive.no_reallocation";

  return { profile, dominant_mode: dominantMode, available_conversions: availableConversions, message_key: messageKey };
}

// ---------- Helpers ----------

function profileToDominantMode(profile: UsageProfile): DominantMode {
  switch (profile) {
    case "music_first": return "songs";
    case "mission_first": return "missions";
    case "sheet_first": return "sheets";
    case "video_light":
    case "video_heavy": return "video";
    default: return "mixed";
  }
}

function dominantModeToFeature(mode: DominantMode): FeatureKey {
  switch (mode) {
    case "songs": return "music_generation";
    case "missions": return "escape_game_generation";
    case "sheets": return "dynamic_sheet_generation";
    case "video": return "video_template_render";
    case "mixed": return "music_generation";
  }
}
