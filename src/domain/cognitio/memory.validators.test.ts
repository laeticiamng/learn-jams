import { describe, it, expect } from "vitest";
import { validateM3Output, validateSegmentLoad, validateCriticalRepetitions } from "./memory.validators";
import type { M3_Output } from "./memory.contracts";
import type { M3_Segment, RepetitionPlanItem } from "./memory.types";

function makeSegment(index: number, newCount: number, keys?: string[]): M3_Segment {
  const conceptKeys = keys ?? Array.from({ length: newCount }, (_, i) => `c${index}_${i}`);
  return {
    segment_index: index,
    concept_keys: conceptKeys,
    new_element_count: newCount,
    reinforcement_keys: [],
    dominant_function: "encoding",
    estimated_duration_sec: newCount * 30,
    bloom_targets: ["understand"],
  };
}

function makeOutput(overrides: Partial<M3_Output> = {}): M3_Output {
  const segments = overrides.segments ?? [makeSegment(0, 3), makeSegment(1, 4)];
  const allKeys = segments.flatMap(s => s.concept_keys);

  return {
    architecture_id: "arch-1",
    document_id: "doc-1",
    course_profile_id: "profile-1",
    segments,
    concept_order: allKeys,
    repetition_plan: allKeys.map(key => ({
      concept_key: key,
      moments: ["inline", "final_test"] as RepetitionPlanItem["moments"],
      total_appearances: 2,
      is_critical: false,
    })),
    mnemonics: [],
    visual_anchors: [],
    cognitive_budget: {
      total_concepts: allKeys.length,
      max_per_segment: 5,
      segment_count: segments.length,
      total_new_introductions: segments.reduce((s, seg) => s + seg.new_element_count, 0),
      total_reinforcements: 0,
      budget_utilization: 0.7,
    },
    pedagogical_contract: {
      total_concepts: allKeys.length,
      critical_concepts: 0,
      estimated_duration_sec: 300,
      segment_count: segments.length,
      cognitive_budget: {
        total_concepts: allKeys.length,
        max_per_segment: 5,
        segment_count: segments.length,
        total_new_introductions: segments.reduce((s, seg) => s + seg.new_element_count, 0),
        total_reinforcements: 0,
        budget_utilization: 0.7,
      },
      repetition_summary: {
        inline_recall_count: 5,
        final_test_questions: 5,
        j1_questions: 3,
        j7_questions: 5,
      },
      guarantees: [],
    },
    total_duration_sec: 300,
    needs_splitting: false,
    reasoning_type: "declaratif",
    objective: "discovery",
    ...overrides,
  };
}

describe("validateM3Output", () => {
  it("passes for valid output", () => {
    const result = validateM3Output(makeOutput());
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("fails FATAL when segment exceeds 5 new elements", () => {
    const result = validateM3Output(makeOutput({
      segments: [makeSegment(0, 6), makeSegment(1, 3)],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "SEGMENT_OVERLOAD" && e.severity === "fatal")).toBe(true);
  });

  it("fails when critical concept has < 3 appearances", () => {
    const output = makeOutput();
    output.repetition_plan = [
      { concept_key: "critical_1", moments: ["inline", "j1", "j7"], total_appearances: 2, is_critical: true },
      { concept_key: "other", moments: ["inline"], total_appearances: 1, is_critical: false },
    ];
    const result = validateM3Output(output);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "CRITICAL_UNDERREPRESENTED")).toBe(true);
  });

  it("fails when duration > 600 without splitting", () => {
    const result = validateM3Output(makeOutput({
      total_duration_sec: 700,
      needs_splitting: false,
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "DURATION_EXCEEDS_LIMIT")).toBe(true);
  });

  it("passes when duration > 600 with splitting", () => {
    const result = validateM3Output(makeOutput({
      total_duration_sec: 700,
      needs_splitting: true,
      split_modules: [
        { module_index: 0, segment_indices: [0], concept_keys: ["c0_0"], estimated_duration_sec: 350, title_suggestion: "M1" },
        { module_index: 1, segment_indices: [1], concept_keys: ["c1_0"], estimated_duration_sec: 350, title_suggestion: "M2" },
      ],
    }));
    const durationErrors = result.errors.filter(e => e.code === "DURATION_EXCEEDS_LIMIT");
    expect(durationErrors.length).toBe(0);
  });

  it("fails when too many concepts", () => {
    const output = makeOutput();
    output.cognitive_budget.total_concepts = 35;
    const result = validateM3Output(output);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "TOO_MANY_CONCEPTS")).toBe(true);
  });

  it("warns when concept missing from order", () => {
    const output = makeOutput();
    output.concept_order = ["c0_0"]; // Missing other keys
    const result = validateM3Output(output);
    expect(result.warnings.some(w => w.code === "MISSING_FROM_ORDER")).toBe(true);
  });
});

describe("validateSegmentLoad", () => {
  it("passes for segment with <= 5 items", () => {
    const result = validateSegmentLoad(makeSegment(0, 5));
    expect(result.valid).toBe(true);
    expect(result.overloaded).toBe(false);
  });

  it("fails for overloaded segment", () => {
    const result = validateSegmentLoad(makeSegment(0, 7));
    expect(result.valid).toBe(false);
    expect(result.overloaded).toBe(true);
  });
});

describe("validateCriticalRepetitions", () => {
  it("passes when all critical have >= 3 appearances", () => {
    const plan: RepetitionPlanItem[] = [
      { concept_key: "c1", moments: ["inline", "j1", "j7"], total_appearances: 4, is_critical: true },
      { concept_key: "c2", moments: ["inline"], total_appearances: 1, is_critical: false },
    ];
    const result = validateCriticalRepetitions(plan);
    expect(result.valid).toBe(true);
    expect(result.underrepresented).toEqual([]);
  });

  it("fails when critical has < 3 appearances", () => {
    const plan: RepetitionPlanItem[] = [
      { concept_key: "c1", moments: ["inline"], total_appearances: 1, is_critical: true },
    ];
    const result = validateCriticalRepetitions(plan);
    expect(result.valid).toBe(false);
    expect(result.underrepresented).toContain("c1");
  });
});
