// ============================================================
// Tests: FFmpeg Fallback Renderer
// ============================================================

import { describe, it, expect } from "vitest";
import { buildFFmpegRenderJob, generateSRT } from "./ffmpegVideoFallbackRenderer.service";

describe("buildFFmpegRenderJob", () => {
  it("builds a valid render job from a basic plan", () => {
    const job = buildFFmpegRenderJob(
      "project-123",
      {
        slides: [
          { slide_index: 0, image_path: "/img/slide0.png", duration_sec: 5, text: "Intro" },
          { slide_index: 1, image_path: "/img/slide1.png", duration_sec: 8, text: "Main" },
        ],
        transitions: "fade",
        waveform_enabled: true,
        overlay_enabled: false,
      },
      { language: "fr", segments: [] },
      { resolution: "1920x1080", frame_rate: 30 },
    );

    expect(job.project_id).toBe("project-123");
    expect(job.input_files.length).toBe(2);
    expect(job.input_files[0].type).toBe("image");
    expect(job.estimated_duration_sec).toBe(13);
    expect(job.output_path).toContain("project-123");
    expect(job.metadata.resolution).toBe("1920x1080");
    expect(job.metadata.slide_count).toBe(2);
    expect(job.metadata.has_audio).toBe(false);
    expect(job.metadata.waveform_enabled).toBe(true);
  });

  it("includes audio input when provided", () => {
    const job = buildFFmpegRenderJob(
      "project-456",
      {
        slides: [{ slide_index: 0, text: "Hello", duration_sec: 5 }],
      },
      { language: "fr", segments: [] },
      {},
      "/audio/narration.mp3",
    );

    expect(job.input_files.some(f => f.type === "audio")).toBe(true);
    expect(job.metadata.has_audio).toBe(true);
  });

  it("handles empty slides", () => {
    const job = buildFFmpegRenderJob(
      "project-789",
      { slides: [] },
      { language: "fr" },
      {},
    );

    expect(job.input_files).toHaveLength(0);
    expect(job.estimated_duration_sec).toBe(0);
  });
});

describe("generateSRT", () => {
  it("generates valid SRT format", () => {
    const srt = generateSRT({
      language: "fr",
      segments: [
        { start_sec: 0, end_sec: 5, text: "Bonjour le monde" },
        { start_sec: 5, end_sec: 12.5, text: "Bienvenue dans cette vidéo" },
      ],
    });

    expect(srt).toContain("1\n00:00:00,000 --> 00:00:05,000\nBonjour le monde");
    expect(srt).toContain("2\n00:00:05,000 --> 00:00:12,500\nBienvenue dans cette vidéo");
  });

  it("returns empty string for no segments", () => {
    expect(generateSRT({ language: "fr", segments: [] })).toBe("");
    expect(generateSRT({ language: "fr" })).toBe("");
  });

  it("handles hour-long timestamps", () => {
    const srt = generateSRT({
      segments: [{ start_sec: 3661, end_sec: 3665, text: "One hour in" }],
    });
    expect(srt).toContain("01:01:01");
  });
});
