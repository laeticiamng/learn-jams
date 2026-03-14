// ============================================================
// FFmpeg Video Fallback Renderer — Internal template-based rendering
// ============================================================

import type {
  FallbackRenderPlan, FallbackSlide, SubtitlePlan, VisualDirection,
} from "@/domain/video/video.types";

/**
 * FFmpeg render plan builder.
 * In production, this generates an FFmpeg command string or
 * a structured render job for the compute plane.
 *
 * The control plane creates the plan; the compute plane executes it.
 */

export interface FFmpegRenderJob {
  project_id: string;
  command_parts: string[];
  input_files: FFmpegInputFile[];
  output_path: string;
  estimated_duration_sec: number;
  metadata: Record<string, unknown>;
}

export interface FFmpegInputFile {
  path: string;
  type: "image" | "audio" | "video" | "subtitle";
  label: string;
}

// ── Render Plan to FFmpeg Command ──────────────────────────

export function buildFFmpegRenderJob(
  projectId: string,
  plan: FallbackRenderPlan,
  subtitles: SubtitlePlan,
  visual: VisualDirection,
  audioPath?: string,
): FFmpegRenderJob {
  const inputFiles: FFmpegInputFile[] = [];
  const commandParts: string[] = [];
  let totalDuration = 0;

  // Add slide images
  const slides = plan.slides ?? [];
  for (const slide of slides) {
    if (slide.image_path) {
      inputFiles.push({
        path: slide.image_path,
        type: "image",
        label: `slide_${slide.slide_index}`,
      });
    }
    totalDuration += slide.duration_sec;
  }

  // Add audio if provided
  if (audioPath) {
    inputFiles.push({ path: audioPath, type: "audio", label: "main_audio" });
  }

  // Build filter complex for slideshow
  const resolution = visual.resolution ?? "1920x1080";
  const [width, height] = resolution.split("x").map(Number);
  const fps = visual.frame_rate ?? 30;

  commandParts.push("-y"); // Overwrite output

  // Input files
  for (const input of inputFiles) {
    if (input.type === "image") {
      commandParts.push(`-loop 1 -t ${getSlideDuration(slides, input.label)} -i "${input.path}"`);
    } else {
      commandParts.push(`-i "${input.path}"`);
    }
  }

  // Filter for concatenation + scaling
  const imageCount = inputFiles.filter(f => f.type === "image").length;
  if (imageCount > 0) {
    const filterParts = [];
    for (let i = 0; i < imageCount; i++) {
      filterParts.push(`[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`);
    }
    const concatInputs = Array.from({ length: imageCount }, (_, i) => `[v${i}]`).join("");
    filterParts.push(`${concatInputs}concat=n=${imageCount}:v=1:a=0[outv]`);

    commandParts.push(`-filter_complex "${filterParts.join(";")}"`);
    commandParts.push("-map [outv]");
  }

  // Audio mapping
  if (audioPath) {
    const audioIdx = inputFiles.findIndex(f => f.type === "audio");
    if (audioIdx >= 0) {
      commandParts.push(`-map ${audioIdx}:a`);
    }
  }

  // Subtitle overlay
  if (subtitles.segments && subtitles.segments.length > 0) {
    commandParts.push("-vf subtitles=subs.srt");
  }

  // Output settings
  commandParts.push(
    `-c:v libx264 -preset medium -crf 23`,
    `-c:a aac -b:a 128k`,
    `-r ${fps}`,
    `-t ${totalDuration}`,
  );

  const outputPath = `${projectId}/output/rendered_video.mp4`;
  commandParts.push(`"${outputPath}"`);

  return {
    project_id: projectId,
    command_parts: commandParts,
    input_files: inputFiles,
    output_path: outputPath,
    estimated_duration_sec: totalDuration,
    metadata: {
      resolution,
      fps,
      slide_count: slides.length,
      has_audio: !!audioPath,
      has_subtitles: (subtitles.segments?.length ?? 0) > 0,
      waveform_enabled: plan.waveform_enabled ?? false,
      overlay_enabled: plan.overlay_enabled ?? false,
    },
  };
}

// ── Subtitle File Generator (SRT format) ───────────────────

export function generateSRT(subtitles: SubtitlePlan): string {
  if (!subtitles.segments || subtitles.segments.length === 0) return "";

  return subtitles.segments.map((seg, i) => {
    const start = formatSRTTime(seg.start_sec);
    const end = formatSRTTime(seg.end_sec);
    return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`;
  }).join("\n");
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad3(ms)}`;
}

function pad(n: number): string { return n.toString().padStart(2, "0"); }
function pad3(n: number): string { return n.toString().padStart(3, "0"); }

function getSlideDuration(slides: FallbackSlide[], label: string): number {
  const idx = parseInt(label.replace("slide_", ""), 10);
  return slides[idx]?.duration_sec ?? 5;
}
