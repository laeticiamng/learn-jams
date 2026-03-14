// ============================================================
// FeatureFlagGuard — Conditionally render children based on flag
// ============================================================

import type { ReactNode } from "react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import type { FeatureFlagKey } from "@/domain/product/featureFlags.types";

interface FeatureFlagGuardProps {
  flag: FeatureFlagKey;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureFlagGuard({ flag, children, fallback = null }: FeatureFlagGuardProps) {
  const { isEnabled, loading } = useFeatureFlags();

  if (loading) return null;
  if (!isEnabled(flag)) return <>{fallback}</>;
  return <>{children}</>;
}
