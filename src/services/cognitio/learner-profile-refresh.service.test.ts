// ============================================================
// Tests: Learner Profile Refresh Service (M8)
// ============================================================

import { describe, it, expect } from "vitest";
import { computeRefreshedProfile } from "./learner-profile-refresh.service";
import type { ConceptMemoryNode, FormatEffectivenessRecord } from "@/domain/cognitio/longitudinal.types";

function makeNode(overrides: Partial<ConceptMemoryNode> = {}): ConceptMemoryNode {
  return {
    id: crypto.randomUUID(),
    user_id: "user-1",
    concept_stable_key: "concept",
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
    calibration_gap_mean: 0.1,
    confusion_hits: 0,
    format_efficacy: { fiche_dynamique: null, histoire_animee: null, music: null },
    archived: false,
    metadata_json: {},
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeFormatRecord(overrides: Partial<FormatEffectivenessRecord> = {}): FormatEffectivenessRecord {
  return {
    id: "fr-1",
    user_id: "user-1",
    format: "fiche_dynamique",
    objective: "discovery",
    audience_level: null,
    attempts_count: 5,
    avg_raw_score: 0.7,
    avg_composite_score: 70,
    avg_calibration_gap: 0.1,
    retention_signal: 0.63,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("computeRefreshedProfile", () => {
  it("classifies estimated when few observations", () => {
    const nodes = [makeNode({ observations_count: 2 })];
    const result = computeRefreshedProfile(nodes, [], {}, "user-1");
    expect(result.profile.profile_status).toBe("estimated");
  });

  it("classifies calibrated with moderate observations", () => {
    const nodes = Array.from({ length: 3 }, (_, i) =>
      makeNode({ concept_stable_key: `c_${i}`, observations_count: 3 }),
    );
    // total obs = 9, >= 5
    const result = computeRefreshedProfile(nodes, [], {}, "user-1");
    expect(result.profile.profile_status).toBe("calibrated");
  });

  it("classifies stable with many observations", () => {
    const nodes = Array.from({ length: 5 }, (_, i) =>
      makeNode({ concept_stable_key: `c_${i}`, observations_count: 5 }),
    );
    // total obs = 25, >= 20
    const result = computeRefreshedProfile(nodes, [], {}, "user-1");
    expect(result.profile.profile_status).toBe("stable");
  });

  it("computes calibration quality high for low gaps", () => {
    const nodes = [
      makeNode({ calibration_gap_mean: 0.1, observations_count: 3 }),
      makeNode({ calibration_gap_mean: 0.05, observations_count: 3, concept_stable_key: "c2" }),
    ];
    const result = computeRefreshedProfile(nodes, [], {}, "user-1");
    expect(result.profile.confidence_calibration_quality).toBe("high");
  });

  it("computes calibration quality low for high gaps", () => {
    const nodes = [
      makeNode({ calibration_gap_mean: 0.5, observations_count: 3 }),
      makeNode({ calibration_gap_mean: 0.4, observations_count: 3, concept_stable_key: "c2" }),
    ];
    const result = computeRefreshedProfile(nodes, [], {}, "user-1");
    expect(result.profile.confidence_calibration_quality).toBe("low");
  });

  it("infers high guidance need when many fragile concepts", () => {
    const nodes = [
      makeNode({ mastery_status: "fragile", concept_stable_key: "f1" }),
      makeNode({ mastery_status: "fragile", concept_stable_key: "f2" }),
      makeNode({ mastery_status: "stable", mastery_score: 0.8, concept_stable_key: "s1" }),
    ];
    // fragile ratio = 2/3 > 0.5
    const result = computeRefreshedProfile(nodes, [], {}, "user-1");
    expect(result.profile.guidance_need).toBe("high");
  });

  it("infers low guidance need when most concepts are stable", () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      makeNode({ mastery_status: "stable", mastery_score: 0.8, calibration_gap_mean: 0.1, observations_count: 3, concept_stable_key: `s_${i}` }),
    );
    const result = computeRefreshedProfile(nodes, [], {}, "user-1");
    expect(result.profile.guidance_need).toBe("low");
  });

  it("generates correct snapshot counts", () => {
    const nodes = [
      makeNode({ mastery_status: "stable", concept_stable_key: "s1" }),
      makeNode({ mastery_status: "fragile", concept_stable_key: "f1" }),
      makeNode({ mastery_status: "aging", concept_stable_key: "a1" }),
    ];
    const result = computeRefreshedProfile(nodes, [], {}, "user-1");
    expect(result.snapshot.concepts_known).toBe(1);
    expect(result.snapshot.concepts_fragile).toBe(1);
    expect(result.snapshot.concepts_aging).toBe(1);
  });

  it("skips archived nodes", () => {
    const nodes = [
      makeNode({ mastery_status: "fragile", archived: true, concept_stable_key: "arch" }),
      makeNode({ mastery_status: "stable", concept_stable_key: "active" }),
    ];
    const result = computeRefreshedProfile(nodes, [], {}, "user-1");
    expect(result.snapshot.concepts_known).toBe(1);
    expect(result.snapshot.concepts_fragile).toBe(0);
  });

  it("determines best format from records", () => {
    const records = [
      makeFormatRecord({ format: "fiche_dynamique", retention_signal: 0.5, attempts_count: 3 }),
      makeFormatRecord({ format: "histoire_animee", retention_signal: 0.8, attempts_count: 3, id: "fr-2" }),
    ];
    const result = computeRefreshedProfile([makeNode()], records, {}, "user-1");
    expect(result.profile.best_format).toBe("histoire_animee");
  });
});
