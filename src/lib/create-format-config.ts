// ============================================================
// Create Format Configuration — Central registry for all
// COGNITIO output formats.
// ============================================================

import type { FeatureKey, PlanKey } from "@/domain/billing/pricing.types";
import { PLAN_ORDER } from "@/domain/billing/pricing.types";
import { isFeatureEnabled } from "@/services/billing/planResolver.service";

// ---------- Format Type ----------

export type CreateFormat =
  | "escape_game"
  | "music"
  | "dynamic_sheet"
  | "animated_story"
  | "video";

// ---------- Format Config Interface ----------

export interface FormatConfig {
  /** The CreateFormat key identifying this format. */
  key: CreateFormat;
  /** i18n translation key for the format label. */
  labelKey: string;
  /** i18n translation key for the format description. */
  descriptionKey: string;
  /** Icon name from lucide-react. */
  icon: string;
  /** Billing feature key associated with this format. */
  featureKey: FeatureKey;
  /** Tailwind color class (e.g. "purple", "pink"). */
  color: string;
  /** Minimum plan required to access this format. */
  minPlan: PlanKey;
  /** Estimated generation duration in seconds [min, max]. */
  estimatedDurationSec: [number, number];
  /** Descriptive tags for filtering / display. */
  tags: string[];
}

// ---------- Format Configs ----------

export const FORMAT_CONFIGS: Record<CreateFormat, FormatConfig> = {
  escape_game: {
    key: "escape_game",
    labelKey: "formats.escape_game.label",
    descriptionKey: "formats.escape_game.description",
    icon: "Gamepad2",
    featureKey: "escape_game_generation",
    color: "purple",
    minPlan: "free",
    estimatedDurationSec: [600, 1200], // 10–20 min
    tags: ["game", "interactive", "puzzle"],
  },
  music: {
    key: "music",
    labelKey: "formats.music.label",
    descriptionKey: "formats.music.description",
    icon: "Music",
    featureKey: "music_generation",
    color: "pink",
    minPlan: "free",
    estimatedDurationSec: [120, 240], // 2–4 min
    tags: ["audio", "creative", "song"],
  },
  dynamic_sheet: {
    key: "dynamic_sheet",
    labelKey: "formats.dynamic_sheet.label",
    descriptionKey: "formats.dynamic_sheet.description",
    icon: "FileText",
    featureKey: "dynamic_sheet_generation",
    color: "blue",
    minPlan: "free",
    estimatedDurationSec: [60, 180], // 1–3 min
    tags: ["worksheet", "document", "printable"],
  },
  animated_story: {
    key: "animated_story",
    labelKey: "formats.animated_story.label",
    descriptionKey: "formats.animated_story.description",
    icon: "BookOpen",
    featureKey: "animated_story_generation",
    color: "amber",
    minPlan: "core",
    estimatedDurationSec: [180, 480], // 3–8 min
    tags: ["story", "animation", "narrative"],
  },
  video: {
    key: "video",
    labelKey: "formats.video.label",
    descriptionKey: "formats.video.description",
    icon: "Video",
    featureKey: "video_template_render",
    color: "green",
    minPlan: "core",
    estimatedDurationSec: [300, 900], // 5–15 min
    tags: ["video", "template", "visual"],
  },
};

// ---------- Pipeline Integration Status ----------

/**
 * Formats that have full COGNITIO pipeline integration (M1→M5).
 * Music and video have providers but are not yet wired into the
 * M2→M4 analysis pipeline — they use separate generation flows.
 */
export const PIPELINE_INTEGRATED_FORMATS = new Set<CreateFormat>([
  "dynamic_sheet",
  "animated_story",
  "escape_game",
]);

/** Check if a format has full pipeline integration. */
export function isFormatPipelineIntegrated(format: CreateFormat): boolean {
  return PIPELINE_INTEGRATED_FORMATS.has(format);
}

/**
 * Formats that use a direct-generation flow (provider-based, not M2→M5 pipeline).
 * Music → lyrics generation + Suno provider
 * Video → video planning + OpenAI Sora provider
 */
export const DIRECT_GENERATION_FORMATS = new Set<CreateFormat>([
  "music",
  "video",
]);

/** Check if a format uses direct provider-based generation (not the M2→M5 pipeline). */
export function isDirectGenerationFormat(format: CreateFormat): boolean {
  return DIRECT_GENERATION_FORMATS.has(format);
}

/**
 * Formats that are coming soon (provider exists but not integrated).
 * Currently empty — music and video are now operational.
 */
export const COMING_SOON_FORMATS = new Set<CreateFormat>([]);

/** Check if a format is coming soon (has provider, not yet integrated). */
export function isFormatComingSoon(format: CreateFormat): boolean {
  return COMING_SOON_FORMATS.has(format);
}

// ---------- Helpers ----------

/**
 * Returns the list of CreateFormats accessible to the given plan.
 * A format is accessible when:
 *   1. The plan's order is >= the format's minPlan order, AND
 *   2. The billing feature is enabled (quota > 0) for that plan.
 */
export function getAvailableFormats(plan: PlanKey): CreateFormat[] {
  const planOrder = PLAN_ORDER[plan];
  return (Object.values(FORMAT_CONFIGS) as FormatConfig[])
    .filter((config) => {
      const meetsMinPlan = planOrder >= PLAN_ORDER[config.minPlan];
      const featureEnabled = isFeatureEnabled(plan, config.featureKey);
      return meetsMinPlan && featureEnabled;
    })
    .map((config) => config.key);
}

/**
 * Returns the FeatureKey associated with the given CreateFormat.
 */
export function getFormatFeatureKey(format: CreateFormat): FeatureKey {
  return FORMAT_CONFIGS[format].featureKey;
}
