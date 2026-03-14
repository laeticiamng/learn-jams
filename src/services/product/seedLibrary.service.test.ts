// ============================================================
// Tests: Seed Library Service
// ============================================================

import { describe, it, expect } from "vitest";
import { getLocalSeedTransformations, getLocalSeedById } from "./seedLibrary.service";

describe("getLocalSeedTransformations", () => {
  it("returns non-empty array of seeds", () => {
    const seeds = getLocalSeedTransformations();
    expect(seeds.length).toBeGreaterThanOrEqual(3);
  });

  it("each seed has required fields", () => {
    const seeds = getLocalSeedTransformations();
    for (const seed of seeds) {
      expect(seed.id).toBeTruthy();
      expect(seed.title).toBeTruthy();
      expect(seed.subject).toBeTruthy();
      expect(seed.audience_level).toBeTruthy();
      expect(seed.format).toBeTruthy();
    }
  });

  it("includes both fiche_dynamique and histoire_animee formats", () => {
    const seeds = getLocalSeedTransformations();
    const formats = new Set(seeds.map((s) => s.format));
    expect(formats.has("fiche_dynamique")).toBe(true);
    expect(formats.has("histoire_animee")).toBe(true);
  });

  it("includes multiple audience levels", () => {
    const seeds = getLocalSeedTransformations();
    const levels = new Set(seeds.map((s) => s.audience_level));
    expect(levels.size).toBeGreaterThanOrEqual(2);
  });
});

describe("getLocalSeedById", () => {
  it("finds a seed by ID", () => {
    const seed = getLocalSeedById("seed-lycee-bio-fiche");
    expect(seed).not.toBeNull();
    expect(seed!.title).toBe("La mitose cellulaire");
  });

  it("returns null for unknown ID", () => {
    const seed = getLocalSeedById("nonexistent");
    expect(seed).toBeNull();
  });

  it("returned seed has full transformation_json and recall_tests_json", () => {
    const seed = getLocalSeedById("seed-lycee-bio-fiche");
    expect(seed!.transformation_json).toBeTruthy();
    expect(seed!.recall_tests_json).toBeTruthy();
    expect((seed!.recall_tests_json as any).items.length).toBeGreaterThan(0);
  });
});

describe("dashboardAggregation.evaluateAlerts", () => {
  // Import inline to avoid supabase dependency issues
  it("module loads without error", async () => {
    const mod = await import("./dashboardAggregation.service");
    expect(typeof mod.evaluateAlerts).toBe("function");
  });

  it("returns alerts for bad metrics", async () => {
    const { evaluateAlerts } = await import("./dashboardAggregation.service");
    const alerts = evaluateAlerts(
      {
        qa_pass: 5,
        qa_warn: 2,
        qa_block: 8,
        qa_block_rate: 0.5,
        error_count: 15,
        total_transformations: 10,
        seed_transformations_started: 3,
      },
      {
        avg_raw_score: 0.6,
        avg_composite_score: 0.5,
        avg_calibration_gap: 0.4,
        total_recall_tests: 10,
        j1_completion_rate: 0.05,
        j7_completion_rate: null,
        format_effectiveness: [],
      },
    );
    expect(alerts.length).toBeGreaterThanOrEqual(3);
    expect(alerts.some((a) => a.key === "qa_block_high")).toBe(true);
    expect(alerts.some((a) => a.key === "errors_high")).toBe(true);
  });

  it("returns no alerts for good metrics", async () => {
    const { evaluateAlerts } = await import("./dashboardAggregation.service");
    const alerts = evaluateAlerts(
      {
        qa_pass: 50,
        qa_warn: 2,
        qa_block: 1,
        qa_block_rate: 0.02,
        error_count: 0,
        total_transformations: 50,
        seed_transformations_started: 10,
      },
      {
        avg_raw_score: 0.8,
        avg_composite_score: 0.75,
        avg_calibration_gap: 0.1,
        total_recall_tests: 50,
        j1_completion_rate: 0.6,
        j7_completion_rate: 0.4,
        format_effectiveness: [],
      },
    );
    expect(alerts).toHaveLength(0);
  });
});
