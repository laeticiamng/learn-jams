import { describe, it, expect } from "vitest";
import {
  getMatrixFormat,
  checkOverrides,
  applyOverrides,
  validateM4Output,
} from "./format.validators";
import type { M4_Input, M4_Output } from "./format.contracts";

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

// ---------- Matrix Tests ----------

describe("getMatrixFormat", () => {
  it("declaratif → fiche_dynamique for all objectives", () => {
    expect(getMatrixFormat("declaratif", "discovery")).toBe("fiche_dynamique");
    expect(getMatrixFormat("declaratif", "revision")).toBe("fiche_dynamique");
    expect(getMatrixFormat("declaratif", "exam")).toBe("fiche_dynamique");
    expect(getMatrixFormat("declaratif", "consolidation")).toBe("fiche_dynamique");
  });

  it("causal + discovery/exam → histoire_animee", () => {
    expect(getMatrixFormat("causal", "discovery")).toBe("histoire_animee");
    expect(getMatrixFormat("causal", "exam")).toBe("histoire_animee");
  });

  it("causal + revision/consolidation → fiche_dynamique", () => {
    expect(getMatrixFormat("causal", "revision")).toBe("fiche_dynamique");
    expect(getMatrixFormat("causal", "consolidation")).toBe("fiche_dynamique");
  });

  it("procedural + discovery/exam → histoire_animee", () => {
    expect(getMatrixFormat("procedural", "discovery")).toBe("histoire_animee");
    expect(getMatrixFormat("procedural", "exam")).toBe("histoire_animee");
  });

  it("procedural + revision/consolidation → fiche_dynamique", () => {
    expect(getMatrixFormat("procedural", "revision")).toBe("fiche_dynamique");
    expect(getMatrixFormat("procedural", "consolidation")).toBe("fiche_dynamique");
  });

  it("conditionnel → histoire_animee for all objectives", () => {
    expect(getMatrixFormat("conditionnel", "discovery")).toBe("histoire_animee");
    expect(getMatrixFormat("conditionnel", "revision")).toBe("histoire_animee");
    expect(getMatrixFormat("conditionnel", "exam")).toBe("histoire_animee");
    expect(getMatrixFormat("conditionnel", "consolidation")).toBe("histoire_animee");
  });

  it("metacognitif → histoire_animee for all objectives", () => {
    expect(getMatrixFormat("metacognitif", "discovery")).toBe("histoire_animee");
    expect(getMatrixFormat("metacognitif", "revision")).toBe("histoire_animee");
    expect(getMatrixFormat("metacognitif", "exam")).toBe("histoire_animee");
    expect(getMatrixFormat("metacognitif", "consolidation")).toBe("histoire_animee");
  });
});

// ---------- Override Tests ----------

describe("checkOverrides", () => {
  it("returns duration_too_short override when < 180s", () => {
    const overrides = checkOverrides(
      makeInput({ total_duration_sec: 100 }),
      "histoire_animee"
    );
    expect(overrides.some(o => o.reason === "duration_too_short")).toBe(true);
  });

  it("returns no duration override for fiche_dynamique", () => {
    const overrides = checkOverrides(
      makeInput({ total_duration_sec: 100 }),
      "fiche_dynamique"
    );
    expect(overrides.some(o => o.reason === "duration_too_short")).toBe(false);
  });

  it("returns low_quality override when < 0.55", () => {
    const overrides = checkOverrides(
      makeInput({ quality_score: 0.4 }),
      "histoire_animee"
    );
    expect(overrides.some(o => o.reason === "low_quality")).toBe(true);
  });

  it("returns too_few_concepts override when < 5", () => {
    const overrides = checkOverrides(
      makeInput({ total_concepts: 3 }),
      "histoire_animee"
    );
    expect(overrides.some(o => o.reason === "too_few_concepts")).toBe(true);
  });

  it("returns insufficient_structure override for minimal", () => {
    const overrides = checkOverrides(
      makeInput({ structure_type: "minimal" }),
      "histoire_animee"
    );
    expect(overrides.some(o => o.reason === "insufficient_structure")).toBe(true);
  });

  it("returns empty when no overrides needed", () => {
    const overrides = checkOverrides(
      makeInput({ quality_score: 0.8, total_concepts: 10, total_duration_sec: 300 }),
      "histoire_animee"
    );
    expect(overrides.length).toBe(0);
  });

  it("can return multiple overrides", () => {
    const overrides = checkOverrides(
      makeInput({ quality_score: 0.3, total_concepts: 2, total_duration_sec: 50, structure_type: "minimal" }),
      "histoire_animee"
    );
    expect(overrides.length).toBe(4);
  });
});

describe("applyOverrides", () => {
  it("returns original format when no overrides", () => {
    expect(applyOverrides("histoire_animee", [])).toBe("histoire_animee");
  });

  it("forces fiche_dynamique when override forces it", () => {
    expect(applyOverrides("histoire_animee", [
      { reason: "low_quality", original_format: "histoire_animee", forced_format: "fiche_dynamique", message: "test" },
    ])).toBe("fiche_dynamique");
  });
});

// ---------- Validation ----------

describe("validateM4Output", () => {
  function makeDecision(overrides: Partial<M4_Output> = {}): M4_Output {
    return {
      decision_id: "d1",
      architecture_id: "arch-1",
      chosen_format: "fiche_dynamique",
      justification: "test",
      matrix_reasoning: "test",
      estimated_duration_sec: 300,
      needs_split: false,
      overrides_applied: [],
      cost_level: "low",
      decision_trace: {
        reasoning_type: "declaratif",
        objective: "discovery",
        matrix_result: "fiche_dynamique",
        overrides_checked: [],
        final_format: "fiche_dynamique",
      },
      ...overrides,
    };
  }

  it("validates correct output", () => {
    const result = validateM4Output(makeDecision());
    expect(result.valid).toBe(true);
  });

  it("fails when duration > 600 without split", () => {
    const result = validateM4Output(makeDecision({ estimated_duration_sec: 800, needs_split: false }));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("600");
  });

  it("fails when split declared but no modules", () => {
    const result = validateM4Output(makeDecision({ needs_split: true }));
    expect(result.valid).toBe(false);
  });

  it("fails when trace doesn't match chosen format", () => {
    const result = validateM4Output(makeDecision({
      chosen_format: "histoire_animee",
      decision_trace: {
        reasoning_type: "declaratif",
        objective: "discovery",
        matrix_result: "fiche_dynamique",
        overrides_checked: [],
        final_format: "fiche_dynamique",
      },
    }));
    expect(result.valid).toBe(false);
  });
});
