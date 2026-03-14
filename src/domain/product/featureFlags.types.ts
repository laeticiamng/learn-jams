// ============================================================
// Feature Flags — Runtime feature gating
// ============================================================

export const FEATURE_FLAG_KEYS = [
  "ff_dynamic_sheet_enabled",
  "ff_animated_story_enabled",
  "ff_seed_library_enabled",
  "ff_guardian_loop_enabled",
  "ff_institution_mode_enabled",
  "ff_lyrics_adaptive_enabled",
  "ff_audio_safe_lyrics_split_enabled",
  "ff_experiments_enabled",
  "ff_admin_dashboards_enabled",
  "ff_extended_disclaimers_enabled",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export interface FeatureFlag {
  id: string;
  flag_key: FeatureFlagKey;
  enabled: boolean;
  rules_json: FeatureFlagRules;
  updated_at: string;
}

export interface FeatureFlagRules {
  /** User IDs that always see this flag enabled */
  allowlist?: string[];
  /** User IDs that always see this flag disabled */
  blocklist?: string[];
  /** Environment-level override: 'production' | 'staging' | 'development' */
  environments?: string[];
  /** Percentage rollout (0-100) */
  rollout_percentage?: number;
}

export type ResolvedFlags = Record<FeatureFlagKey, boolean>;

/** Default flags when DB is unreachable */
export const DEFAULT_FLAGS: ResolvedFlags = {
  ff_dynamic_sheet_enabled: true,
  ff_animated_story_enabled: true,
  ff_seed_library_enabled: true,
  ff_guardian_loop_enabled: false,
  ff_institution_mode_enabled: false,
  ff_lyrics_adaptive_enabled: false,
  ff_audio_safe_lyrics_split_enabled: false,
  ff_experiments_enabled: false,
  ff_admin_dashboards_enabled: false,
  ff_extended_disclaimers_enabled: true,
};
