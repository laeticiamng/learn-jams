import { describe, it, expect } from "vitest";
import { selectFormatLocally } from "./format-selector.service";
import type { FormatSelectorInput } from "@/domain/cognitio/contracts";

function makeInput(overrides: Partial<FormatSelectorInput> = {}): FormatSelectorInput {
  return {
    total_concepts: 5,
    critical_count: 1,
    knowledge_type: "factual",
    estimated_complexity: 3,
    quality_score: 0.8,
    objective: "discovery",
    ...overrides,
  };
}

describe("selectFormatLocally", () => {
  it("selects fiche_dynamique for simple content", () => {
    const result = selectFormatLocally(makeInput());
    expect(result.chosen_format).toBe("fiche_dynamique");
    expect(result.cost_level).toBe("low");
  });

  it("selects histoire_animee for many concepts with good quality", () => {
    const result = selectFormatLocally(makeInput({ total_concepts: 12, quality_score: 0.7 }));
    expect(result.chosen_format).toBe("histoire_animee");
    expect(result.cost_level).toBe("medium");
  });

  it("selects histoire_animee for high complexity", () => {
    const result = selectFormatLocally(makeInput({ estimated_complexity: 7, quality_score: 0.6 }));
    expect(result.chosen_format).toBe("histoire_animee");
  });

  it("selects histoire_animee for procedural knowledge", () => {
    const result = selectFormatLocally(makeInput({ knowledge_type: "procedural", quality_score: 0.6 }));
    expect(result.chosen_format).toBe("histoire_animee");
  });

  it("selects histoire_animee for exam objective", () => {
    const result = selectFormatLocally(makeInput({ objective: "exam", quality_score: 0.6 }));
    expect(result.chosen_format).toBe("histoire_animee");
  });

  it("falls back to fiche_dynamique when quality is too low for narrative", () => {
    const result = selectFormatLocally(makeInput({
      total_concepts: 15,
      quality_score: 0.4,
    }));
    expect(result.chosen_format).toBe("fiche_dynamique");
    expect(result.justification).toContain("qualité");
  });

  it("does not signal split when duration is capped at max", () => {
    // histoire_animee: min(600, 20*40=800) = 600, which is NOT > 600 so no split
    const result = selectFormatLocally(makeInput({
      total_concepts: 20,
      quality_score: 0.8,
      estimated_complexity: 8,
    }));
    expect(result.chosen_format).toBe("histoire_animee");
    expect(result.needs_split).toBe(false);
    expect(result.estimated_duration_sec).toBe(600);
  });

  it("caps duration for histoire_animee at 600 seconds", () => {
    const result = selectFormatLocally(makeInput({
      total_concepts: 20,
      quality_score: 0.8,
      estimated_complexity: 8,
    }));
    expect(result.estimated_duration_sec).toBeLessThanOrEqual(600);
  });

  it("caps duration for fiche_dynamique at 300 seconds", () => {
    const result = selectFormatLocally(makeInput({
      total_concepts: 20,
      quality_score: 0.3,
    }));
    expect(result.estimated_duration_sec).toBeLessThanOrEqual(300);
  });

  it("does not need split for short content", () => {
    const result = selectFormatLocally(makeInput({ total_concepts: 3 }));
    expect(result.needs_split).toBe(false);
    expect(result.split_count).toBeUndefined();
  });
});
