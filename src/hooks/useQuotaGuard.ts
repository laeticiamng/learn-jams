// ============================================================
// useQuotaGuard — Pre-generation credit guard
// Checks user quota before pipeline execution and provides
// paywall state when credits are insufficient.
// ============================================================

import { useState, useCallback } from "react";
import { checkQuota } from "@/services/billing/quotaEngine.service";
import { getFormatFeatureKey } from "@/lib/create-format-config";
import type { CreateFormat } from "@/lib/create-format-config";
import type { PlanKey, FeatureKey, ConsumeResult } from "@/domain/billing/pricing.types";

export interface QuotaGuardResult {
  allowed: boolean;
  reason?: "quota_exceeded" | "feature_disabled";
  upgrade_to?: PlanKey;
  feature: FeatureKey;
  source?: "quota" | "flex" | "credit";
  remaining?: number;
}

interface UseQuotaGuardReturn {
  /** Check quota for a format before starting pipeline. Returns true if allowed. */
  checkBeforeGenerate: (format: CreateFormat) => Promise<boolean>;
  /** Current guard result (null before first check) */
  guardResult: QuotaGuardResult | null;
  /** Whether the check is in progress */
  checking: boolean;
  /** Clear the guard result (e.g. after dismissing paywall) */
  clearGuard: () => void;
}

export function useQuotaGuard(
  userId: string | null,
  plan: PlanKey,
): UseQuotaGuardReturn {
  const [guardResult, setGuardResult] = useState<QuotaGuardResult | null>(null);
  const [checking, setChecking] = useState(false);

  const checkBeforeGenerate = useCallback(async (format: CreateFormat): Promise<boolean> => {
    if (!userId) {
      setGuardResult({
        allowed: false,
        reason: "feature_disabled",
        feature: getFormatFeatureKey(format),
      });
      return false;
    }

    const featureKey = getFormatFeatureKey(format);
    setChecking(true);

    try {
      const result: ConsumeResult = await checkQuota(userId, plan, featureKey);

      if (result.allowed) {
        setGuardResult({
          allowed: true,
          feature: featureKey,
          source: result.source,
          remaining: result.remaining,
        });
        return true;
      } else {
        setGuardResult({
          allowed: false,
          reason: result.reason,
          upgrade_to: result.upgrade_to,
          feature: featureKey,
        });
        return false;
      }
    } catch (err: unknown) {
      // On network error, allow generation (fail open for UX)
      console.warn("[QuotaGuard] Check failed, allowing generation:", err);
      setGuardResult({
        allowed: true,
        feature: featureKey,
      });
      return true;
    } finally {
      setChecking(false);
    }
  }, [userId, plan]);

  const clearGuard = useCallback(() => {
    setGuardResult(null);
  }, []);

  return { checkBeforeGenerate, guardResult, checking, clearGuard };
}
