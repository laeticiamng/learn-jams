// ============================================================
// Tests: Product Domain Validators
// ============================================================

import { describe, it, expect } from "vitest";
import {
  isValidEventName,
  validateTrackEventInput,
  isValidFeatureFlagKey,
  validateSeedTransformation,
  computeReadinessReport,
} from "./validators";

describe("isValidEventName", () => {
  it("accepts known event names", () => {
    expect(isValidEventName("landing_viewed")).toBe(true);
    expect(isValidEventName("final_test_completed")).toBe(true);
    expect(isValidEventName("qa_pass")).toBe(true);
  });

  it("rejects unknown event names", () => {
    expect(isValidEventName("unknown_event")).toBe(false);
    expect(isValidEventName("")).toBe(false);
  });
});

describe("validateTrackEventInput", () => {
  it("returns no errors for valid input", () => {
    const errors = validateTrackEventInput({ event_name: "landing_viewed" });
    expect(errors).toHaveLength(0);
  });

  it("returns error for missing event_name", () => {
    const errors = validateTrackEventInput({ event_name: "" as any });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns error for unknown event_name", () => {
    const errors = validateTrackEventInput({ event_name: "fake_event" as any });
    expect(errors.some((e) => e.includes("Unknown event"))).toBe(true);
  });
});

describe("isValidFeatureFlagKey", () => {
  it("accepts known flag keys", () => {
    expect(isValidFeatureFlagKey("ff_dynamic_sheet_enabled")).toBe(true);
    expect(isValidFeatureFlagKey("ff_seed_library_enabled")).toBe(true);
  });

  it("rejects unknown flag keys", () => {
    expect(isValidFeatureFlagKey("ff_unknown")).toBe(false);
  });
});

describe("validateSeedTransformation", () => {
  it("returns no errors for valid seed", () => {
    const errors = validateSeedTransformation({
      title: "Test",
      subject: "Math",
      audience_level: "lycee",
      format: "fiche_dynamique",
      transformation_json: {},
      recall_tests_json: {},
    });
    expect(errors).toHaveLength(0);
  });

  it("returns errors for missing fields", () => {
    const errors = validateSeedTransformation({});
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });

  it("returns error for non-string title", () => {
    const errors = validateSeedTransformation({
      title: 123,
      subject: "Math",
      audience_level: "lycee",
      format: "fiche_dynamique",
      transformation_json: {},
      recall_tests_json: {},
    });
    expect(errors.some((e) => e.includes("title"))).toBe(true);
  });
});

describe("computeReadinessReport", () => {
  it("returns all-ok for good checks", () => {
    const report = computeReadinessReport({
      coreLoopErrors: 0,
      seedCount: 4,
      qaBlockRate: 0.05,
      eventsCount: 100,
      experimentsConfigured: true,
      avgLatencyMs: 5000,
      avgCostPerSession: 0.1,
    });
    expect(report.core_loop_ok).toBe(true);
    expect(report.seed_library_ok).toBe(true);
    expect(report.qa_blocking_ok).toBe(true);
    expect(report.tracking_ok).toBe(true);
    expect(report.experiments_ready).toBe(true);
    expect(report.latency_ok).toBe(true);
    expect(report.cost_ok).toBe(true);
    expect(report.critical_risks).toHaveLength(0);
  });

  it("flags core loop errors", () => {
    const report = computeReadinessReport({
      coreLoopErrors: 3,
      seedCount: 4,
      qaBlockRate: 0.05,
      eventsCount: 100,
      experimentsConfigured: true,
      avgLatencyMs: 5000,
      avgCostPerSession: 0.1,
    });
    expect(report.core_loop_ok).toBe(false);
    expect(report.critical_risks.some((r) => r.includes("boucle principale"))).toBe(true);
  });

  it("flags insufficient seeds", () => {
    const report = computeReadinessReport({
      coreLoopErrors: 0,
      seedCount: 1,
      qaBlockRate: 0.05,
      eventsCount: 100,
      experimentsConfigured: true,
      avgLatencyMs: 5000,
      avgCostPerSession: 0.1,
    });
    expect(report.seed_library_ok).toBe(false);
  });

  it("flags high QA block rate", () => {
    const report = computeReadinessReport({
      coreLoopErrors: 0,
      seedCount: 4,
      qaBlockRate: 0.35,
      eventsCount: 100,
      experimentsConfigured: true,
      avgLatencyMs: 5000,
      avgCostPerSession: 0.1,
    });
    expect(report.qa_blocking_ok).toBe(false);
  });

  it("flags no events", () => {
    const report = computeReadinessReport({
      coreLoopErrors: 0,
      seedCount: 4,
      qaBlockRate: 0.05,
      eventsCount: 0,
      experimentsConfigured: true,
      avgLatencyMs: 5000,
      avgCostPerSession: 0.1,
    });
    expect(report.tracking_ok).toBe(false);
  });

  it("flags high latency", () => {
    const report = computeReadinessReport({
      coreLoopErrors: 0,
      seedCount: 4,
      qaBlockRate: 0.05,
      eventsCount: 100,
      experimentsConfigured: true,
      avgLatencyMs: 45000,
      avgCostPerSession: 0.1,
    });
    expect(report.latency_ok).toBe(false);
  });

  it("flags high cost", () => {
    const report = computeReadinessReport({
      coreLoopErrors: 0,
      seedCount: 4,
      qaBlockRate: 0.05,
      eventsCount: 100,
      experimentsConfigured: true,
      avgLatencyMs: 5000,
      avgCostPerSession: 2.5,
    });
    expect(report.cost_ok).toBe(false);
  });
});
