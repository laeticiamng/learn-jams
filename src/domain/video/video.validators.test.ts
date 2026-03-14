// ============================================================
// Tests: Video Domain Validators
// ============================================================

import { describe, it, expect } from "vitest";
import {
  isValidVideoProjectType,
  isValidVideoProjectStatus,
  isValidVideoMode,
  isValidVideoAssetType,
  isValidVideoRunType,
  validateCreateVideoProject,
  validateEnrichedSynopsis,
  validateFallbackRenderPlan,
} from "./video.validators";

describe("video type guards", () => {
  it("validates project types", () => {
    expect(isValidVideoProjectType("clip")).toBe(true);
    expect(isValidVideoProjectType("film")).toBe(true);
    expect(isValidVideoProjectType("pedagogical_video")).toBe(true);
    expect(isValidVideoProjectType("music_video")).toBe(true);
    expect(isValidVideoProjectType("documentary")).toBe(false);
  });

  it("validates project statuses", () => {
    expect(isValidVideoProjectStatus("draft")).toBe(true);
    expect(isValidVideoProjectStatus("generating")).toBe(true);
    expect(isValidVideoProjectStatus("completed")).toBe(true);
    expect(isValidVideoProjectStatus("unknown")).toBe(false);
  });

  it("validates video modes", () => {
    expect(isValidVideoMode("pedagogical_template_video")).toBe(true);
    expect(isValidVideoMode("ai_generated_video")).toBe(true);
    expect(isValidVideoMode("hybrid_video")).toBe(true);
    expect(isValidVideoMode("magic")).toBe(false);
  });

  it("validates asset types", () => {
    expect(isValidVideoAssetType("source_audio")).toBe(true);
    expect(isValidVideoAssetType("face_ref")).toBe(true);
    expect(isValidVideoAssetType("rendered_output")).toBe(true);
    expect(isValidVideoAssetType("blockchain_nft")).toBe(false);
  });

  it("validates run types", () => {
    expect(isValidVideoRunType("generate_clip")).toBe(true);
    expect(isValidVideoRunType("render_template")).toBe(true);
    expect(isValidVideoRunType("tts")).toBe(true);
    expect(isValidVideoRunType("mine_crypto")).toBe(false);
  });
});

describe("validateCreateVideoProject", () => {
  it("accepts valid input", () => {
    const errors = validateCreateVideoProject({
      user_id: "user-123",
      project_type: "pedagogical_video",
      title: "Learn Photosynthesis",
    });
    expect(errors).toHaveLength(0);
  });

  it("accepts valid input with optional fields", () => {
    const errors = validateCreateVideoProject({
      user_id: "user-123",
      project_type: "clip",
      title: "Quick intro",
      synopsis: "A short clip about cells",
      mode: "hybrid_video",
      provider_requested: "openai_sora",
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects missing user_id", () => {
    const errors = validateCreateVideoProject({
      user_id: "",
      project_type: "clip",
      title: "Test",
    });
    expect(errors.some(e => e.includes("user_id"))).toBe(true);
  });

  it("rejects missing title", () => {
    const errors = validateCreateVideoProject({
      user_id: "user-123",
      project_type: "clip",
      title: "",
    });
    expect(errors.some(e => e.includes("title"))).toBe(true);
  });

  it("rejects invalid project_type", () => {
    const errors = validateCreateVideoProject({
      user_id: "user-123",
      project_type: "tiktok" as any,
      title: "Test",
    });
    expect(errors.some(e => e.includes("project_type"))).toBe(true);
  });

  it("rejects invalid mode", () => {
    const errors = validateCreateVideoProject({
      user_id: "user-123",
      project_type: "clip",
      title: "Test",
      mode: "magic" as any,
    });
    expect(errors.some(e => e.includes("mode"))).toBe(true);
  });
});

describe("validateEnrichedSynopsis", () => {
  it("accepts valid synopsis with logline", () => {
    expect(validateEnrichedSynopsis({ logline: "A story about cells" })).toHaveLength(0);
  });

  it("accepts valid synopsis with full content", () => {
    expect(validateEnrichedSynopsis({
      logline: "A story",
      synopsis: "Detailed story...",
      characters: [{ name: "Cell", role: "protagonist" }],
    })).toHaveLength(0);
  });

  it("rejects empty synopsis", () => {
    const errors = validateEnrichedSynopsis({});
    expect(errors.some(e => e.includes("logline"))).toBe(true);
  });

  it("rejects character without name", () => {
    const errors = validateEnrichedSynopsis({
      logline: "Test",
      characters: [{ name: "", role: "hero" }],
    });
    expect(errors.some(e => e.includes("name"))).toBe(true);
  });

  it("rejects character without role", () => {
    const errors = validateEnrichedSynopsis({
      logline: "Test",
      characters: [{ name: "Hero", role: "" }],
    });
    expect(errors.some(e => e.includes("role"))).toBe(true);
  });
});

describe("validateFallbackRenderPlan", () => {
  it("accepts valid plan", () => {
    const errors = validateFallbackRenderPlan({
      slides: [{ slide_index: 0, text: "Hello", duration_sec: 5 }],
      transitions: "fade",
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects empty slides", () => {
    const errors = validateFallbackRenderPlan({ slides: [] });
    expect(errors.some(e => e.includes("slide"))).toBe(true);
  });

  it("rejects slide with zero duration", () => {
    const errors = validateFallbackRenderPlan({
      slides: [{ slide_index: 0, text: "Hi", duration_sec: 0 }],
    });
    expect(errors.some(e => e.includes("duration"))).toBe(true);
  });

  it("rejects slide without image or text", () => {
    const errors = validateFallbackRenderPlan({
      slides: [{ slide_index: 0, duration_sec: 5 }],
    });
    expect(errors.some(e => e.includes("image_path or text"))).toBe(true);
  });
});
