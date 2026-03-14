// ============================================================
// Tests: Format Effectiveness Service (M8)
// ============================================================

import { describe, it, expect } from "vitest";
import { computeUpdatedFormatRecord, determineBestFormat } from "./format-effectiveness.service";
import type { FormatEffectivenessRecord } from "@/domain/cognitio/longitudinal.types";

function makeRecord(overrides: Partial<FormatEffectivenessRecord> = {}): FormatEffectivenessRecord {
  return {
    id: "rec-1",
    user_id: "user-1",
    format: "fiche_dynamique",
    objective: "discovery",
    audience_level: null,
    attempts_count: 3,
    avg_raw_score: 0.7,
    avg_composite_score: 0.65,
    avg_calibration_gap: 0.1,
    retention_signal: 0.585,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("computeUpdatedFormatRecord", () => {
  it("creates first record from null", () => {
    const result = computeUpdatedFormatRecord(null, 0.8, 75, 0.1);
    expect(result.attempts_count).toBe(1);
    expect(result.avg_raw_score).toBe(0.8);
    expect(result.avg_composite_score).toBe(75);
    expect(result.avg_calibration_gap).toBe(0.1);
    expect(result.retention_signal).toBeGreaterThan(0);
  });

  it("updates running averages correctly", () => {
    const existing = makeRecord({ attempts_count: 2, avg_raw_score: 0.6, avg_composite_score: 0.5, avg_calibration_gap: 0.2 });
    const result = computeUpdatedFormatRecord(existing, 0.9, 0.8, 0.1);

    expect(result.attempts_count).toBe(3);
    // Running avg: (0.6*2 + 0.9) / 3 = 0.7
    expect(result.avg_raw_score).toBeCloseTo(0.7, 5);
    // Running avg: (0.5*2 + 0.8) / 3 ≈ 0.6
    expect(result.avg_composite_score).toBeCloseTo(0.6, 5);
  });

  it("computes retention_signal as composite * calibration quality", () => {
    const result = computeUpdatedFormatRecord(null, 0.8, 0.9, 0.1);
    // calQuality = 1 - |0.1| = 0.9, retention = 0.9 * 0.9 = 0.81
    expect(result.retention_signal).toBeCloseTo(0.81, 2);
  });

  it("lower retention when calibration gap is high", () => {
    const good = computeUpdatedFormatRecord(null, 0.8, 0.9, 0.1);
    const bad = computeUpdatedFormatRecord(null, 0.8, 0.9, 0.5);
    expect(good.retention_signal!).toBeGreaterThan(bad.retention_signal!);
  });
});

describe("determineBestFormat", () => {
  it("returns unknown for empty records", () => {
    expect(determineBestFormat([])).toBe("unknown");
  });

  it("returns unknown when no format has >= 2 attempts", () => {
    const records = [makeRecord({ attempts_count: 1 })];
    expect(determineBestFormat(records)).toBe("unknown");
  });

  it("returns best format by retention signal", () => {
    const records = [
      makeRecord({ format: "fiche_dynamique", retention_signal: 0.6, attempts_count: 3 }),
      makeRecord({ format: "histoire_animee", retention_signal: 0.8, attempts_count: 2, id: "rec-2" }),
    ];
    expect(determineBestFormat(records)).toBe("histoire_animee");
  });

  it("ignores records with null retention", () => {
    const records = [
      makeRecord({ format: "fiche_dynamique", retention_signal: null, attempts_count: 5 }),
      makeRecord({ format: "histoire_animee", retention_signal: 0.5, attempts_count: 2, id: "rec-2" }),
    ];
    expect(determineBestFormat(records)).toBe("histoire_animee");
  });
});
