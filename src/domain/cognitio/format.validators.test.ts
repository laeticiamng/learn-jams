import { describe, it, expect } from "vitest";
import {
  getMatrixFormat,
  checkOverrides,
  applyOverrides,
  validateM4Output,
  resolveFormatWithUserIntent,
  assessFormatFeasibility,
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
      system_recommended_format: "fiche_dynamique",
      fallback_candidates: [],
      override_requires_confirmation: false,
      decision_trace: {
        reasoning_type: "declaratif",
        objective: "discovery",
        matrix_result: "fiche_dynamique",
        overrides_checked: [],
        final_format: "fiche_dynamique",
        user_intent_respected: true,
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
        user_intent_respected: true,
      },
    }));
    expect(result.valid).toBe(false);
  });
});

// ---------- User Intent Priority Tests ----------

describe("resolveFormatWithUserIntent", () => {
  it("respects user choice when feasible", () => {
    const input = makeInput({ user_selected_format: "histoire_animee", total_concepts: 10, quality_score: 0.8 });
    const result = resolveFormatWithUserIntent(input, "fiche_dynamique", []);
    expect(result.finalFormat).toBe("histoire_animee");
    expect(result.userIntentRespected).toBe(true);
    expect(result.overrideRequiresConfirmation).toBe(false);
  });

  it("allows degraded mode when user chooses histoire_animee with minimal structure", () => {
    const input = makeInput({ user_selected_format: "histoire_animee", structure_type: "minimal", total_concepts: 5, quality_score: 0.8 });
    const result = resolveFormatWithUserIntent(input, "fiche_dynamique", []);
    expect(result.finalFormat).toBe("histoire_animee");
    expect(result.userIntentRespected).toBe(true);
    // Should have degraded info
    expect(result.overrideReason).toBeTruthy();
  });

  it("blocks user choice when truly infeasible and requires confirmation", () => {
    const input = makeInput({ user_selected_format: "histoire_animee", total_concepts: 1, quality_score: 0.1 });
    const result = resolveFormatWithUserIntent(input, "fiche_dynamique", []);
    expect(result.finalFormat).not.toBe("histoire_animee");
    expect(result.userIntentRespected).toBe(false);
    expect(result.overrideRequiresConfirmation).toBe(true);
    expect(result.overrideReason).toBeTruthy();
  });

  it("uses system recommendation when no user choice", () => {
    const input = makeInput({ total_concepts: 10, quality_score: 0.8 });
    const overrides = checkOverrides(input, "histoire_animee");
    const result = resolveFormatWithUserIntent(input, "histoire_animee", overrides);
    expect(result.userIntentRespected).toBe(true);
  });
});

describe("assessFormatFeasibility", () => {
  it("fiche_dynamique is always feasible", () => {
    const input = makeInput({ total_concepts: 1, quality_score: 0.1 });
    const result = assessFormatFeasibility("fiche_dynamique", input);
    expect(result.feasible).toBe(true);
  });

  it("mission_interactive is feasible with enough concepts", () => {
    const input = makeInput({ total_concepts: 5, quality_score: 0.6 });
    const result = assessFormatFeasibility("mission_interactive", input);
    expect(result.feasible).toBe(true);
  });

  it("mission_interactive is degraded with few concepts", () => {
    const input = makeInput({ total_concepts: 2, quality_score: 0.6 });
    const result = assessFormatFeasibility("mission_interactive", input);
    expect(result.feasible).toBe(true);
    expect(result.degraded).toBe(true);
  });

  it("mission_interactive is infeasible with very low quality", () => {
    const input = makeInput({ total_concepts: 5, quality_score: 0.2 });
    const result = assessFormatFeasibility("mission_interactive", input);
    expect(result.feasible).toBe(false);
  });
});
