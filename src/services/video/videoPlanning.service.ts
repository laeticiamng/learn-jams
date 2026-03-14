// ============================================================
// Video Planning Service — Scene/shot plan generation
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type {
  VideoGenerationPlan, SceneDefinition, ShotDefinition,
  VisualDirection, SubtitlePlan, FallbackRenderPlan, FallbackSlide,
  EnrichedSynopsis,
} from "@/domain/video/video.types";

export async function createGenerationPlan(
  projectId: string,
  enrichedSynopsis: EnrichedSynopsis,
  durationSec: number,
): Promise<VideoGenerationPlan> {
  const scenes = buildScenes(enrichedSynopsis, durationSec);
  const shots = buildShotList(scenes);
  const visualDirection = buildVisualDirection(enrichedSynopsis);
  const subtitlePlan = buildSubtitlePlan(scenes);
  const fallbackPlan = buildFallbackRenderPlan(scenes);

  const { data, error } = await supabase
    .from("video_generation_plans")
    .insert({
      project_id: projectId,
      scenes_json: scenes,
      shot_list_json: shots,
      visual_direction_json: visualDirection,
      subtitle_plan_json: subtitlePlan,
      fallback_render_plan_json: fallbackPlan,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create generation plan: ${error.message}`);
  return data as unknown as VideoGenerationPlan;
}

export async function getGenerationPlan(projectId: string): Promise<VideoGenerationPlan | null> {
  const { data, error } = await supabase
    .from("video_generation_plans")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as VideoGenerationPlan;
}

// ── Internal builders ──────────────────────────────────────

function buildScenes(synopsis: EnrichedSynopsis, totalDurationSec: number): SceneDefinition[] {
  const synopsisText = synopsis.synopsis ?? synopsis.logline ?? "";
  const paragraphs = synopsisText.split(/\n\n|\n/).filter(p => p.trim());

  if (paragraphs.length === 0) {
    return [{
      scene_index: 0,
      title: "Main Scene",
      description: synopsisText || "Default scene",
      duration_sec: totalDurationSec,
    }];
  }

  const sceneDuration = Math.max(5, Math.floor(totalDurationSec / paragraphs.length));

  return paragraphs.map((p, i) => ({
    scene_index: i,
    title: `Scene ${i + 1}`,
    description: p.trim(),
    duration_sec: sceneDuration,
    visual_style: synopsis.visual_tone,
    narration: p.trim(),
  }));
}

function buildShotList(scenes: SceneDefinition[]): ShotDefinition[] {
  const shots: ShotDefinition[] = [];
  let shotIdx = 0;

  for (const scene of scenes) {
    const shotsPerScene = Math.max(1, Math.ceil(scene.duration_sec / 5));
    for (let i = 0; i < shotsPerScene; i++) {
      shots.push({
        shot_index: shotIdx++,
        scene_index: scene.scene_index,
        shot_type: i === 0 ? "establishing" : "detail",
        description: scene.description,
        duration_sec: Math.floor(scene.duration_sec / shotsPerScene),
      });
    }
  }

  return shots;
}

function buildVisualDirection(synopsis: EnrichedSynopsis): VisualDirection {
  return {
    style: synopsis.visual_tone ?? "clean, modern",
    color_palette: ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
    aspect_ratio: "16:9",
    resolution: "1920x1080",
    frame_rate: 30,
  };
}

function buildSubtitlePlan(scenes: SceneDefinition[]): SubtitlePlan {
  let currentTime = 0;
  const segments = scenes.map(scene => {
    const segment = {
      start_sec: currentTime,
      end_sec: currentTime + scene.duration_sec,
      text: scene.narration ?? scene.description,
    };
    currentTime += scene.duration_sec;
    return segment;
  });

  return { language: "fr", segments };
}

function buildFallbackRenderPlan(scenes: SceneDefinition[]): FallbackRenderPlan {
  const slides: FallbackSlide[] = scenes.map((scene, i) => ({
    slide_index: i,
    text: scene.description,
    duration_sec: scene.duration_sec,
    caption: scene.title,
  }));

  return {
    slides,
    transitions: "fade",
    waveform_enabled: true,
    overlay_enabled: true,
  };
}
