// ============================================================
// Video Domain Types — Video generation kernel
// ============================================================

export const VIDEO_PROJECT_TYPES = ["clip", "film", "pedagogical_video", "music_video"] as const;
export type VideoProjectType = (typeof VIDEO_PROJECT_TYPES)[number];

export const VIDEO_PROJECT_STATUSES = [
  "draft", "planning", "estimating", "ready",
  "generating", "rendering", "completed", "failed", "cancelled",
] as const;
export type VideoProjectStatus = (typeof VIDEO_PROJECT_STATUSES)[number];

export const VIDEO_MODES = [
  "pedagogical_template_video",
  "ai_generated_video",
  "hybrid_video",
] as const;
export type VideoMode = (typeof VIDEO_MODES)[number];

export const VIDEO_ASSET_TYPES = [
  "source_audio", "face_ref", "visual_ref", "image_asset",
  "subtitle_asset", "music_asset", "voice_asset", "generated_clip",
  "rendered_output",
] as const;
export type VideoAssetType = (typeof VIDEO_ASSET_TYPES)[number];

export const VIDEO_RUN_TYPES = [
  "generate_clip", "generate_image", "render_template", "composite", "tts",
] as const;
export type VideoRunType = (typeof VIDEO_RUN_TYPES)[number];

export const VIDEO_RUN_STATUSES = ["pending", "running", "completed", "failed"] as const;
export type VideoRunStatus = (typeof VIDEO_RUN_STATUSES)[number];

// ── Core Entities ──────────────────────────────────────────

export interface VideoProject {
  id: string;
  user_id: string;
  project_type: VideoProjectType;
  title: string;
  synopsis: string | null;
  enriched_synopsis_json: EnrichedSynopsis;
  status: VideoProjectStatus;
  provider_requested: string | null;
  provider_used: string | null;
  mode: VideoMode;
  estimated_duration_sec: number | null;
  estimated_shots: number | null;
  estimated_credits: number | null;
  created_at: string;
  updated_at: string;
}

export interface VideoAsset {
  id: string;
  project_id: string;
  asset_type: VideoAssetType;
  storage_path: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface VideoGenerationPlan {
  id: string;
  project_id: string;
  scenes_json: SceneDefinition[];
  shot_list_json: ShotDefinition[];
  visual_direction_json: VisualDirection;
  subtitle_plan_json: SubtitlePlan;
  fallback_render_plan_json: FallbackRenderPlan;
  created_at: string;
}

export interface VideoProviderRun {
  id: string;
  project_id: string;
  provider_key: string;
  run_type: VideoRunType;
  status: VideoRunStatus;
  request_json: Record<string, unknown>;
  response_json: Record<string, unknown>;
  error_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Enriched Synopsis ──────────────────────────────────────

export interface EnrichedSynopsis {
  logline?: string;
  synopsis?: string;
  narrative_structure?: string;
  characters?: SynopsisCharacter[];
  ambiance?: string;
  visual_tone?: string;
  pedagogical_constraints?: string[];
}

export interface SynopsisCharacter {
  name: string;
  role: string;
  description?: string;
}

// ── Scene / Shot Planning ──────────────────────────────────

export interface SceneDefinition {
  scene_index: number;
  title: string;
  description: string;
  duration_sec: number;
  visual_style?: string;
  audio_cue?: string;
  narration?: string;
}

export interface ShotDefinition {
  shot_index: number;
  scene_index: number;
  shot_type: string;
  description: string;
  duration_sec: number;
  prompt?: string;
  asset_refs?: string[];
}

export interface VisualDirection {
  style?: string;
  color_palette?: string[];
  aspect_ratio?: string;
  resolution?: string;
  frame_rate?: number;
}

export interface SubtitlePlan {
  language?: string;
  segments?: SubtitleSegment[];
}

export interface SubtitleSegment {
  start_sec: number;
  end_sec: number;
  text: string;
}

export interface FallbackRenderPlan {
  slides?: FallbackSlide[];
  transitions?: string;
  waveform_enabled?: boolean;
  overlay_enabled?: boolean;
}

export interface FallbackSlide {
  slide_index: number;
  image_path?: string;
  text?: string;
  duration_sec: number;
  caption?: string;
}

// ── Estimate ───────────────────────────────────────────────

export interface VideoEstimate {
  estimated_shots: number;
  estimated_duration_sec: number;
  estimated_credits: number;
  provider_recommendation: string;
  fallback_recommendation: string;
  mode_recommendation: VideoMode;
  breakdown: EstimateBreakdown[];
}

export interface EstimateBreakdown {
  component: string;
  credits: number;
  provider: string;
}

// ── Create Input ───────────────────────────────────────────

export interface CreateVideoProjectInput {
  user_id: string;
  project_type: VideoProjectType;
  title: string;
  synopsis?: string;
  mode?: VideoMode;
  provider_requested?: string;
}
