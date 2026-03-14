// ============================================================
// Homepage Feature Flags Hook
// ============================================================

import { useFeatureFlags } from "@/hooks/useFeatureFlags";

/**
 * Returns resolved homepage-relevant feature flags.
 * Wraps the generic hook and exposes named booleans for clarity.
 */
export function useHomeFeatureFlags() {
  const { flags, loading } = useFeatureFlags();

  return {
    loading,
    showSeedLibrary: flags.ff_seed_library_enabled,
    showVideoKernel: flags.ff_video_kernel_enabled,
    showGuardianLoop: flags.ff_guardian_loop_enabled,
    showAnimatedStory: flags.ff_animated_story_enabled,
    showDynamicSheet: flags.ff_dynamic_sheet_enabled,
  };
}
