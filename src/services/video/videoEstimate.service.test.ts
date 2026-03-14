// ============================================================
// Tests: Video Estimate Service
// ============================================================

import { describe, it, expect } from "vitest";
import { estimateVideoProject } from "./videoEstimate.service";

describe("estimateVideoProject", () => {
  it("estimates pedagogical_template_video with low credits", () => {
    const estimate = estimateVideoProject({
      project_type: "pedagogical_video",
      mode: "pedagogical_template_video",
      synopsis: "A simple intro to biology.",
    });

    expect(estimate.estimated_shots).toBeGreaterThan(0);
    expect(estimate.estimated_duration_sec).toBeGreaterThan(0);
    expect(estimate.estimated_credits).toBeGreaterThanOrEqual(0);
    expect(estimate.provider_recommendation).toBe("internal_ffmpeg");
    expect(estimate.fallback_recommendation).toBe("internal_ffmpeg");
    expect(estimate.breakdown.length).toBeGreaterThan(0);
  });

  it("estimates ai_generated_video with higher credits", () => {
    const estimate = estimateVideoProject({
      project_type: "clip",
      mode: "ai_generated_video",
      synopsis: "A dramatic visualization of photosynthesis showing light energy absorbed by chlorophyll.",
    });

    expect(estimate.estimated_credits).toBeGreaterThan(0);
    expect(estimate.provider_recommendation).toBe("openai_sora");
    expect(estimate.breakdown.some(b => b.provider === "openai_sora")).toBe(true);
  });

  it("estimates hybrid_video with mixed providers", () => {
    const estimate = estimateVideoProject({
      project_type: "pedagogical_video",
      mode: "hybrid_video",
      synopsis: "This is a multi-paragraph synopsis. It covers several topics in depth. Each topic gets its own scene.",
    });

    expect(estimate.breakdown.some(b => b.provider === "openai_sora")).toBe(true);
    expect(estimate.breakdown.some(b => b.provider === "internal_ffmpeg")).toBe(true);
  });

  it("handles empty synopsis", () => {
    const estimate = estimateVideoProject({
      project_type: "clip",
      mode: "pedagogical_template_video",
      synopsis: "",
    });

    // Should default to 3 scenes minimum
    expect(estimate.estimated_shots).toBe(9); // 3 scenes * 3 shots
  });

  it("respects explicit scene count", () => {
    const estimate = estimateVideoProject(
      { project_type: "clip", mode: "pedagogical_template_video", synopsis: "Short." },
      5,
    );

    expect(estimate.estimated_shots).toBe(15); // 5 scenes * 3 shots
  });

  it("returns breakdown for each cost component", () => {
    const estimate = estimateVideoProject({
      project_type: "pedagogical_video",
      mode: "ai_generated_video",
      synopsis: "Test.",
    });

    for (const item of estimate.breakdown) {
      expect(item.component).toBeDefined();
      expect(item.credits).toBeGreaterThanOrEqual(0);
      expect(item.provider).toBeDefined();
    }
  });

  it("recommends mode based on cost", () => {
    const lowCost = estimateVideoProject({
      project_type: "clip",
      mode: "pedagogical_template_video",
      synopsis: "Short clip.",
    });
    expect(lowCost.mode_recommendation).toBeDefined();
  });
});
