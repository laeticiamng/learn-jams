// ============================================================
// Tests: Review Queue Service (M8)
// ============================================================

import { describe, it, expect } from "vitest";
import { buildReviewQueue } from "./review-queue.service";
import type { ConceptMemoryNode } from "@/domain/cognitio/longitudinal.types";

function makeNode(overrides: Partial<ConceptMemoryNode> = {}): ConceptMemoryNode {
  return {
    id: crypto.randomUUID(),
    user_id: "user-1",
    concept_stable_key: "concept_test",
    mastery_score: 0.5,
    mastery_status: "learning",
    last_seen_at: new Date().toISOString(),
    last_correct_at: null,
    last_incorrect_at: null,
    next_review_at: null,
    observations_count: 3,
    correct_count: 2,
    incorrect_count: 1,
    confidence_mean: 3,
    calibration_gap_mean: 0,
    confusion_hits: 0,
    format_efficacy: { fiche_dynamique: null, histoire_animee: null, music: null },
    archived: false,
    metadata_json: {},
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("buildReviewQueue", () => {
  it("returns empty queue when no concepts need review", () => {
    const node = makeNode({ mastery_status: "stable", mastery_score: 0.8 });
    const queue = buildReviewQueue([node], []);
    expect(queue).toHaveLength(0);
  });

  it("includes fragile concepts", () => {
    const node = makeNode({ mastery_status: "fragile", mastery_score: 0.2, concept_stable_key: "fragile_1" });
    const queue = buildReviewQueue([node], []);
    expect(queue).toHaveLength(1);
    expect(queue[0].reason).toBe("fragile");
  });

  it("includes aging concepts", () => {
    const node = makeNode({ mastery_status: "aging", mastery_score: 0.7, concept_stable_key: "aging_1" });
    const queue = buildReviewQueue([node], []);
    expect(queue).toHaveLength(1);
    expect(queue[0].reason).toBe("aging");
  });

  it("includes concepts with high confusion", () => {
    const node = makeNode({
      mastery_status: "stable",
      mastery_score: 0.75,
      confusion_hits: 4,
      concept_stable_key: "confused_1",
    });
    const queue = buildReviewQueue([node], []);
    expect(queue).toHaveLength(1);
    expect(queue[0].reason).toBe("high_confusion");
  });

  it("includes concepts with low calibration", () => {
    const node = makeNode({
      mastery_status: "stable",
      mastery_score: 0.75,
      calibration_gap_mean: 0.4,
      concept_stable_key: "overconfident_1",
    });
    const queue = buildReviewQueue([node], []);
    expect(queue).toHaveLength(1);
    expect(queue[0].reason).toBe("low_calibration");
  });

  it("sorts by priority descending", () => {
    const fragile = makeNode({ mastery_status: "fragile", mastery_score: 0.1, concept_stable_key: "frag" });
    const aging = makeNode({ mastery_status: "aging", mastery_score: 0.7, concept_stable_key: "age" });
    const queue = buildReviewQueue([aging, fragile], []);
    expect(queue[0].concept_stable_key).toBe("frag");
    expect(queue[0].priority_score).toBeGreaterThan(queue[1].priority_score);
  });

  it("skips archived concepts", () => {
    const node = makeNode({ mastery_status: "fragile", mastery_score: 0.1, archived: true });
    const queue = buildReviewQueue([node], []);
    expect(queue).toHaveLength(0);
  });

  it("recommends contrast_drill for high confusion", () => {
    const node = makeNode({
      mastery_status: "stable",
      mastery_score: 0.75,
      confusion_hits: 5,
    });
    const queue = buildReviewQueue([node], []);
    expect(queue[0].recommended_action).toBe("contrast_drill");
  });

  it("recommends retest for fragile with enough observations", () => {
    const node = makeNode({
      mastery_status: "fragile",
      mastery_score: 0.3,
      observations_count: 5,
    });
    const queue = buildReviewQueue([node], []);
    expect(queue[0].recommended_action).toBe("retest");
  });

  it("recommends quick_review for fragile with few observations", () => {
    const node = makeNode({
      mastery_status: "fragile",
      mastery_score: 0.3,
      observations_count: 2,
    });
    const queue = buildReviewQueue([node], []);
    expect(queue[0].recommended_action).toBe("quick_review");
  });

  it("priority score stays within 0-100 range", () => {
    const node = makeNode({
      mastery_status: "fragile",
      mastery_score: 0.0,
      confusion_hits: 10,
    });
    const queue = buildReviewQueue([node], []);
    expect(queue[0].priority_score).toBeGreaterThanOrEqual(0);
    expect(queue[0].priority_score).toBeLessThanOrEqual(100);
  });
});
