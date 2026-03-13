import { describe, it, expect } from "vitest";
import { selectFormatLocally, selectFormatLegacy } from "./format-selector.service";
import type { M4_Input } from "@/domain/cognitio/format.contracts";

function makeInput(overrides: Partial<M4_Input> = {}): M4_Input {
  return {
    architecture_id: "arch-1",
    course_profile_id: "profile-1",
    document_id: "doc-1",
    total_concepts: 10,
    critical_count: 2,
    segment_count: 3,
    total_duration_sec: 300,
    needs_splitting: false,
    reasoning_type: "declaratif",
    density: "medium",
    estimated_complexity: 5,
    structure_type: "prose",
    quality_score: 0.8,
    objective: "discovery",
    ...overrides,
  };
}

describe("selectFormatLocally (M4)", () => {
  // ---------- Matrix Tests ----------

  it("declaratif always selects fiche_dynamique", () => {
    const result = selectFormatLocally(makeInput({ reasoning_type: "declaratif", objective: "discovery" }));
    expect(result.chosen_format).toBe("fiche_dynamique");
    expect(result.decision_trace.matrix_result).toBe("fiche_dynamique");
  });

  it("declaratif + exam still selects fiche_dynamique", () => {
    const result = selectFormatLocally(makeInput({ reasoning_type: "declaratif", objective: "exam" }));
    expect(result.chosen_format).toBe("fiche_dynamique");
  });

  it("causal + discovery selects histoire_animee", () => {
    const result = selectFormatLocally(makeInput({ reasoning_type: "causal", objective: "discovery" }));
    expect(result.chosen_format).toBe("histoire_animee");
  });

  it("causal + revision selects fiche_dynamique", () => {
    const result = selectFormatLocally(makeInput({ reasoning_type: "causal", objective: "revision" }));
    expect(result.chosen_format).toBe("fiche_dynamique");
  });

  it("procedural + exam selects histoire_animee", () => {
    const result = selectFormatLocally(makeInput({ reasoning_type: "procedural", objective: "exam" }));
    expect(result.chosen_format).toBe("histoire_animee");
  });

  it("procedural + consolidation selects fiche_dynamique", () => {
    const result = selectFormatLocally(makeInput({ reasoning_type: "procedural", objective: "consolidation" }));
    expect(result.chosen_format).toBe("fiche_dynamique");
  });

  it("conditionnel always selects histoire_animee", () => {
    const result = selectFormatLocally(makeInput({ reasoning_type: "conditionnel", objective: "revision" }));
    expect(result.chosen_format).toBe("histoire_animee");
  });

  it("metacognitif always selects histoire_animee", () => {
    const result = selectFormatLocally(makeInput({ reasoning_type: "metacognitif", objective: "consolidation" }));
    expect(result.chosen_format).toBe("histoire_animee");
  });

  // ---------- Override Tests ----------

  it("overrides to fiche_dynamique when duration < 180s", () => {
    const result = selectFormatLocally(makeInput({
      reasoning_type: "conditionnel",
      total_duration_sec: 100,
    }));
    expect(result.chosen_format).toBe("fiche_dynamique");
    expect(result.overrides_applied.some(o => o.reason === "duration_too_short")).toBe(true);
  });

  it("overrides to fiche_dynamique when quality < 0.55", () => {
    const result = selectFormatLocally(makeInput({
      reasoning_type: "metacognitif",
      quality_score: 0.4,
    }));
    expect(result.chosen_format).toBe("fiche_dynamique");
    expect(result.overrides_applied.some(o => o.reason === "low_quality")).toBe(true);
  });

  it("overrides to fiche_dynamique when < 5 concepts", () => {
    const result = selectFormatLocally(makeInput({
      reasoning_type: "conditionnel",
      total_concepts: 3,
    }));
    expect(result.chosen_format).toBe("fiche_dynamique");
    expect(result.overrides_applied.some(o => o.reason === "too_few_concepts")).toBe(true);
  });

  it("overrides to fiche_dynamique when structure is minimal", () => {
    const result = selectFormatLocally(makeInput({
      reasoning_type: "metacognitif",
      structure_type: "minimal",
    }));
    expect(result.chosen_format).toBe("fiche_dynamique");
    expect(result.overrides_applied.some(o => o.reason === "insufficient_structure")).toBe(true);
  });

  it("no override when fiche_dynamique is already selected", () => {
    const result = selectFormatLocally(makeInput({
      reasoning_type: "declaratif",
      quality_score: 0.3,
    }));
    expect(result.chosen_format).toBe("fiche_dynamique");
    expect(result.overrides_applied.length).toBe(0);
  });

  // ---------- Splitting Tests ----------

  it("needs split when duration > 600s", () => {
    const result = selectFormatLocally(makeInput({ total_duration_sec: 800 }));
    expect(result.needs_split).toBe(true);
    expect(result.split_count).toBe(2);
  });

  it("no split when duration <= 600s", () => {
    const result = selectFormatLocally(makeInput({ total_duration_sec: 500 }));
    expect(result.needs_split).toBe(false);
    expect(result.split_count).toBeUndefined();
  });

  // ---------- Decision Trace ----------

  it("includes complete decision trace", () => {
    const result = selectFormatLocally(makeInput({ reasoning_type: "causal", objective: "discovery" }));
    expect(result.decision_trace.reasoning_type).toBe("causal");
    expect(result.decision_trace.objective).toBe("discovery");
    expect(result.decision_trace.matrix_result).toBe("histoire_animee");
    expect(result.decision_trace.final_format).toBe("histoire_animee");
    expect(result.decision_trace.overrides_checked.length).toBeGreaterThan(0);
  });

  // ---------- Cost Level ----------

  it("returns low cost for fiche_dynamique", () => {
    const result = selectFormatLocally(makeInput({ reasoning_type: "declaratif" }));
    expect(result.cost_level).toBe("low");
  });

  it("returns high cost for split content", () => {
    const result = selectFormatLocally(makeInput({
      reasoning_type: "conditionnel",
      total_duration_sec: 800,
    }));
    // Override kicks in because duration_too_short doesn't apply (800 > 180)
    // conditionnel → histoire_animee, 800 > 600 → split → high
    expect(result.cost_level).toBe("high");
  });
});

describe("selectFormatLegacy", () => {
  it("maps legacy input and returns valid output", () => {
    const result = selectFormatLegacy({
      course_profile_id: "p1",
      total_concepts: 5,
      critical_count: 1,
      knowledge_type: "factual",
      estimated_complexity: 3,
      quality_score: 0.8,
      objective: "discovery",
    });
    expect(result.chosen_format).toBe("fiche_dynamique");
    expect(result.cost_level).toBeDefined();
  });
});
