// ============================================================
// Tests: Mastery Engine Service (M8)
// ============================================================

import { describe, it, expect } from "vitest";
import {
  updateMasteryScore,
  classifyMasteryStatus,
  computeNextReviewDate,
  updateRunningMean,
  applyTestResultToNode,
} from "./mastery-engine.service";

describe("updateMasteryScore", () => {
  it("increases score on correct answer", () => {
    const score = updateMasteryScore(0.5, 0, true);
    expect(score).toBeGreaterThan(0.5);
  });

  it("decreases score on incorrect answer", () => {
    const score = updateMasteryScore(0.5, 0, false);
    expect(score).toBeLessThan(0.5);
  });

  it("clamps score between 0 and 1", () => {
    const high = updateMasteryScore(0.99, 0, true);
    expect(high).toBeLessThanOrEqual(1);

    const low = updateMasteryScore(0.01, 0, false);
    expect(low).toBeGreaterThanOrEqual(0);
  });

  it("applies smaller updates with more observations (decaying alpha)", () => {
    const deltaEarly = Math.abs(updateMasteryScore(0.5, 1, true) - 0.5);
    const deltaLate = Math.abs(updateMasteryScore(0.5, 100, true) - 0.5);
    expect(deltaEarly).toBeGreaterThan(deltaLate);
  });

  it("alpha never goes below 0.05", () => {
    // With 10000 observations, alpha = max(0.05, 0.3/sqrt(10001)) ≈ 0.05
    const score = updateMasteryScore(0.5, 10000, true);
    const expectedDelta = 0.05 * (1 - 0.5); // alpha * (1 - currentScore)
    expect(Math.abs(score - 0.5 - expectedDelta)).toBeLessThan(0.01);
  });
});

describe("classifyMasteryStatus", () => {
  it("returns unknown for 0 observations", () => {
    expect(classifyMasteryStatus(0, 0, 0, 0, 0, 0, 0, null, null)).toBe("unknown");
  });

  it("returns aging when score >= 0.6 and not seen in > 14 days", () => {
    const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    expect(classifyMasteryStatus(0.7, 5, 4, 1, 3, 0, 0, oldDate, oldDate)).toBe("aging");
  });

  it("returns strong with high score, many observations, low calibration gap", () => {
    const recent = new Date().toISOString();
    expect(classifyMasteryStatus(0.9, 8, 7, 1, 3, 0.1, 0, recent, recent)).toBe("strong");
  });

  it("returns stable with good score and >= 3 observations", () => {
    const recent = new Date().toISOString();
    expect(classifyMasteryStatus(0.75, 3, 3, 0, 3, 0, 0, recent, recent)).toBe("stable");
  });

  it("returns fragile with low score", () => {
    const recent = new Date().toISOString();
    expect(classifyMasteryStatus(0.2, 3, 1, 2, 2, 0, 0, recent, recent)).toBe("fragile");
  });

  it("returns fragile with high confusion hits", () => {
    const recent = new Date().toISOString();
    expect(classifyMasteryStatus(0.5, 5, 3, 2, 3, 0, 3, recent, recent)).toBe("fragile");
  });

  it("returns fragile when overconfident (high cal gap + incorrect)", () => {
    const recent = new Date().toISOString();
    expect(classifyMasteryStatus(0.5, 5, 3, 2, 4, 0.4, 0, recent, recent)).toBe("fragile");
  });

  it("returns emerging with <= 2 observations and moderate score", () => {
    const recent = new Date().toISOString();
    expect(classifyMasteryStatus(0.5, 2, 1, 1, 3, 0.1, 0, recent, recent)).toBe("emerging");
  });

  it("returns learning with moderate score and > 2 observations", () => {
    const recent = new Date().toISOString();
    expect(classifyMasteryStatus(0.55, 4, 3, 1, 3, 0.1, 0, recent, recent)).toBe("learning");
  });
});

describe("computeNextReviewDate", () => {
  it("returns 1 day for fragile", () => {
    const date = new Date(computeNextReviewDate("fragile"));
    const diff = (date.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(diff).toBeCloseTo(1, 0);
  });

  it("returns 3 days for learning", () => {
    const date = new Date(computeNextReviewDate("learning"));
    const diff = (date.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(diff).toBeCloseTo(3, 0);
  });

  it("returns 7 days for stable", () => {
    const date = new Date(computeNextReviewDate("stable"));
    const diff = (date.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(diff).toBeCloseTo(7, 0);
  });

  it("returns 14 days for strong", () => {
    const date = new Date(computeNextReviewDate("strong"));
    const diff = (date.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(diff).toBeCloseTo(14, 0);
  });

  it("returns 1 day for aging", () => {
    const date = new Date(computeNextReviewDate("aging"));
    const diff = (date.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(diff).toBeCloseTo(1, 0);
  });
});

describe("updateRunningMean", () => {
  it("returns new value when current is null", () => {
    expect(updateRunningMean(null, 0, 5)).toBe(5);
  });

  it("computes correct running mean", () => {
    expect(updateRunningMean(3, 2, 6)).toBe((3 * 2 + 6) / 3);
  });

  it("works for single previous observation", () => {
    expect(updateRunningMean(4, 1, 6)).toBe(5);
  });
});

describe("applyTestResultToNode", () => {
  it("creates a new node from null", () => {
    const result = applyTestResultToNode(null, {
      concept_key: "concept_1",
      is_correct: true,
      confidence: 4,
      calibration_gap: 0.1,
    });
    expect(result.observationsCount).toBe(1);
    expect(result.correctCount).toBe(1);
    expect(result.incorrectCount).toBe(0);
    expect(result.score).toBeGreaterThan(0);
    expect(result.previousStatus).toBe("unknown");
  });

  it("increments correct count on correct answer", () => {
    const result = applyTestResultToNode(
      { mastery_score: 0.5, observations_count: 3, correct_count: 2, incorrect_count: 1, mastery_status: "learning" },
      { concept_key: "c", is_correct: true, confidence: 4, calibration_gap: 0.05 },
    );
    expect(result.correctCount).toBe(3);
    expect(result.incorrectCount).toBe(1);
    expect(result.observationsCount).toBe(4);
  });

  it("increments incorrect count on incorrect answer", () => {
    const result = applyTestResultToNode(
      { mastery_score: 0.5, observations_count: 3, correct_count: 2, incorrect_count: 1, mastery_status: "learning" },
      { concept_key: "c", is_correct: false, confidence: 2, calibration_gap: -0.3 },
    );
    expect(result.correctCount).toBe(2);
    expect(result.incorrectCount).toBe(2);
  });

  it("preserves previous status for transition tracking", () => {
    const result = applyTestResultToNode(
      { mastery_score: 0.3, observations_count: 2, correct_count: 1, incorrect_count: 1, mastery_status: "fragile" },
      { concept_key: "c", is_correct: true, confidence: 5, calibration_gap: 0 },
    );
    expect(result.previousStatus).toBe("fragile");
  });

  it("updates confidence and calibration gap means", () => {
    const result = applyTestResultToNode(
      { mastery_score: 0.5, observations_count: 1, correct_count: 1, incorrect_count: 0, confidence_mean: 3, calibration_gap_mean: 0.2, mastery_status: "emerging" },
      { concept_key: "c", is_correct: true, confidence: 5, calibration_gap: 0.0 },
    );
    // Running mean of (3*1 + 5) / 2 = 4
    expect(result.confidenceMean).toBe(4);
    // Running mean of (0.2*1 + 0) / 2 = 0.1
    expect(result.calibrationGapMean).toBe(0.1);
  });
});
