// ============================================================
// Video Estimate Service — Cost/duration/shots estimation
// ============================================================

import type {
  VideoProject, VideoEstimate, VideoMode, EstimateBreakdown,
} from "@/domain/video/video.types";

// ── Cost Constants ─────────────────────────────────────────

const CREDITS_PER_SORA_SHOT = 0.50;
const CREDITS_PER_IMAGE = 0.08;
const CREDITS_PER_TTS_MINUTE = 0.02;
const CREDITS_FFmpeg_RENDER = 0.00;
const AVG_SHOT_DURATION_SEC = 5;
const AVG_SCENE_SHOTS = 3;

// ── Estimate Logic ─────────────────────────────────────────

export function estimateVideoProject(
  project: Pick<VideoProject, "project_type" | "mode" | "synopsis">,
  sceneCount?: number,
): VideoEstimate {
  const scenes = sceneCount ?? estimateSceneCount(project.synopsis ?? "");
  const shots = scenes * AVG_SCENE_SHOTS;
  const durationSec = shots * AVG_SHOT_DURATION_SEC;

  const breakdown: EstimateBreakdown[] = [];
  let totalCredits = 0;

  if (project.mode === "ai_generated_video") {
    // Full AI generation
    const shotCredits = shots * CREDITS_PER_SORA_SHOT;
    breakdown.push({ component: "ai_video_shots", credits: shotCredits, provider: "openai_sora" });
    totalCredits += shotCredits;

    const ttsCredits = (durationSec / 60) * CREDITS_PER_TTS_MINUTE;
    breakdown.push({ component: "tts_narration", credits: ttsCredits, provider: "openai_audio" });
    totalCredits += ttsCredits;
  } else if (project.mode === "hybrid_video") {
    // Half AI, half template
    const aiShots = Math.ceil(shots / 2);
    const templateShots = shots - aiShots;

    const aiCredits = aiShots * CREDITS_PER_SORA_SHOT;
    breakdown.push({ component: "ai_video_shots", credits: aiCredits, provider: "openai_sora" });
    totalCredits += aiCredits;

    const imageCredits = templateShots * CREDITS_PER_IMAGE;
    breakdown.push({ component: "template_images", credits: imageCredits, provider: "openai_gpt_image" });
    totalCredits += imageCredits;

    breakdown.push({ component: "ffmpeg_render", credits: CREDITS_FFmpeg_RENDER, provider: "internal_ffmpeg" });
  } else {
    // pedagogical_template_video — all internal
    const imageCredits = scenes * CREDITS_PER_IMAGE;
    breakdown.push({ component: "slide_images", credits: imageCredits, provider: "openai_gpt_image" });
    totalCredits += imageCredits;

    const ttsCredits = (durationSec / 60) * CREDITS_PER_TTS_MINUTE;
    breakdown.push({ component: "tts_narration", credits: ttsCredits, provider: "openai_audio" });
    totalCredits += ttsCredits;

    breakdown.push({ component: "ffmpeg_render", credits: CREDITS_FFmpeg_RENDER, provider: "internal_ffmpeg" });
  }

  return {
    estimated_shots: shots,
    estimated_duration_sec: durationSec,
    estimated_credits: Math.round(totalCredits * 100) / 100,
    provider_recommendation: recommendProvider(project.mode),
    fallback_recommendation: "internal_ffmpeg",
    mode_recommendation: recommendMode(totalCredits),
    breakdown,
  };
}

function estimateSceneCount(synopsis: string): number {
  if (!synopsis) return 3;
  // Rough heuristic: ~1 scene per 50 words
  const words = synopsis.split(/\s+/).length;
  return Math.max(3, Math.min(20, Math.ceil(words / 50)));
}

function recommendProvider(mode: VideoMode): string {
  switch (mode) {
    case "ai_generated_video": return "openai_sora";
    case "hybrid_video": return "openai_sora";
    case "pedagogical_template_video": return "internal_ffmpeg";
  }
}

function recommendMode(totalCredits: number): VideoMode {
  if (totalCredits > 3.0) return "hybrid_video";
  if (totalCredits > 1.0) return "ai_generated_video";
  return "pedagogical_template_video";
}
