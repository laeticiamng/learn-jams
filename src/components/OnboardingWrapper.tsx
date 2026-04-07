// ============================================================
// OnboardingWrapper — Global onboarding trigger
// ============================================================

import { OnboardingModal } from "@/components/OnboardingModal";
import { useOnboarding } from "@/hooks/useOnboarding";

export function OnboardingWrapper() {
  const { needsOnboarding, dismiss, userId, defaultName } = useOnboarding();

  if (!needsOnboarding || !userId) return null;

  return (
    <OnboardingModal
      open={needsOnboarding}
      onComplete={dismiss}
      userId={userId}
      defaultName={defaultName}
    />
  );
}
