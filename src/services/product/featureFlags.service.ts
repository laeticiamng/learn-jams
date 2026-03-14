// ============================================================
// Feature Flags Service — Resolve flags from DB with fallback
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_FLAGS,
  type FeatureFlag,
  type FeatureFlagKey,
  type ResolvedFlags,
} from "@/domain/product/featureFlags.types";

let cachedFlags: ResolvedFlags | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function resolveFeatureFlags(userId?: string | null): Promise<ResolvedFlags> {
  const now = Date.now();
  if (cachedFlags && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedFlags;
  }

  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("*");

    if (error || !data) return { ...DEFAULT_FLAGS };

    const flags = { ...DEFAULT_FLAGS };
    for (const row of data as unknown as FeatureFlag[]) {
      const key = row.flag_key as FeatureFlagKey;
      if (key in flags) {
        flags[key] = evaluateFlag(row, userId);
      }
    }

    cachedFlags = flags;
    cacheTimestamp = now;
    return flags;
  } catch {
    return { ...DEFAULT_FLAGS };
  }
}

function evaluateFlag(flag: FeatureFlag, userId?: string | null): boolean {
  if (!flag.enabled) return false;

  const rules = flag.rules_json;
  if (!rules || Object.keys(rules).length === 0) return flag.enabled;

  // Blocklist check
  if (userId && rules.blocklist?.includes(userId)) return false;

  // Allowlist check
  if (userId && rules.allowlist?.includes(userId)) return true;

  // Rollout percentage
  if (rules.rollout_percentage !== undefined && rules.rollout_percentage < 100) {
    if (!userId) return false;
    const hash = simpleHash(userId + flag.flag_key);
    return (hash % 100) < rules.rollout_percentage;
  }

  return flag.enabled;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function isFeatureEnabled(flags: ResolvedFlags, key: FeatureFlagKey): boolean {
  return flags[key] ?? DEFAULT_FLAGS[key] ?? false;
}

/** Invalidate cache to force re-fetch */
export function invalidateFlagCache(): void {
  cachedFlags = null;
  cacheTimestamp = 0;
}
