import { describe, it, expect, vi } from "vitest";
import { generateDynamicSheetLocally } from "./dynamic-sheet.service";
import type { M5_Input } from "@/domain/cognitio/generation.contracts";
import type { M2_Output, AnalyzedConcept, AnalyzedConfusionPair } from "@/domain/cognitio/contracts";
import type { M3_Output } from "@/domain/cognitio/memory.contracts";
import type { M4_Output } from "@/domain/cognitio/format.contracts";

// ---------- Fixtures ----------

function makeConcept(key: string, criticality: 1 | 2 | 3 = 1, uncertain = false): AnalyzedConcept {
  return {
    stable_key: key,
    label: `Label ${key}`,
    definition: `Definition of ${key} which is an important concept`,
    type: "core",
    criticality,
    criticality_score: criticality === 1 ? 0.9 : 0.5,
    bloom_target: "apply",
    relations: [],
    prerequisites: [],
    source_confidence: uncertain ? 0.3 : 0.9,
    source_trace: [],
    uncertain,
  };
}

function makeM2(overrides: Partial<M2_Output> = {}): M2_Output {
  return {
    course_profile_id: "profile-1",
    main_topic: "Test Topic",
    learning_objectives: ["Learn X"],
    key_concepts: [
      makeConcept("c1", 1),
      makeConcept("c2", 1),
      makeConcept("c3", 2),
    ],
    traps: [],
    confusion_pairs: [{
      concept_a_key: "c1",
      concept_b_key: "c2",
      distinction_key: "c1 differs from c2 in scope",
      frequency: 3,
    }],
    reasoning_type: "declaratif",
    density: "medium",
    recommended_template: "fiche_dynamique",
    confidence: { concepts: 0.8, logic: 0.8, traps: 0.7, structure: 0.8, ambiguous_zones: [] },
    prerequis: [],
    structure_type: "prose",
    source_issues: [],
    total_concepts: 3,
    critical_count: 2,
    estimated_complexity: 5,
    ...overrides,
  };
}

function makeM3(overrides: Partial<M3_Output> = {}): M3_Output {
  return {
    architecture_id: "arch-1",
    document_id: "doc-1",
    course_profile_id: "profile-1",
    segments: [
      { segment_index: 0, concept_keys: ["c1", "c2"], new_element_count: 2, reinforcement_keys: [], dominant_function: "encoding", estimated_duration_sec: 120, bloom_targets: ["apply"] },
      { segment_index: 1, concept_keys: ["c3"], new_element_count: 1, reinforcement_keys: ["c1"], dominant_function: "consolidation", estimated_duration_sec: 60, bloom_targets: ["apply"] },
    ],
    concept_order: ["c1", "c2", "c3"],
    repetition_plan: [
      { concept_key: "c1", moments: ["inline", "final_test"], total_appearances: 3, is_critical: true },
    ],
    mnemonics: [{ concept_keys: ["c1"], mnemonic: "C1 = Core One", type: "acronym" }],
    visual_anchors: [{ concept_key: "c1", content: "A tree representing c1", anchor_type: "image_desc" }],
    cognitive_budget: { total_concepts: 3, max_per_segment: 5, segment_count: 2, total_new_introductions: 3, total_reinforcements: 1, budget_utilization: 0.6 },
    pedagogical_contract: {
      total_concepts: 3,
      critical_concepts: 2,
      segment_count: 2,
      estimated_duration_sec: 180,
      cognitive_budget: { total_concepts: 3, max_per_segment: 5, segment_count: 2, total_new_introductions: 3, total_reinforcements: 1, budget_utilization: 0.6 },
      repetition_summary: { inline_recall_count: 1, final_test_questions: 3, j1_questions: 1, j7_questions: 1 },
      guarantees: ["All critical concepts covered"],
    },
    total_duration_sec: 180,
    needs_splitting: false,
    reasoning_type: "declaratif",
    objective: "discovery",
    ...overrides,
  };
}

function makeM4(overrides: Partial<M4_Output> = {}): M4_Output {
  return {
    decision_id: "dec-1",
    architecture_id: "arch-1",
    chosen_format: "fiche_dynamique",
    justification: "Selected format",
    matrix_reasoning: "declaratif → fiche",
    estimated_duration_sec: 180,
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

function makeInput(overrides: Partial<M5_Input> = {}): M5_Input {
  return {
    m2_output: makeM2(),
    m3_output: makeM3(),
    m4_output: makeM4(),
    source_document: {
      document_id: "doc-1",
      word_count: 1000,
      source_type: "cours_pdf",
      confidence_level: 0.85,
      source_issues: [],
    },
    user_objective: "discovery",
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================

describe("generateDynamicSheetLocally", () => {
  it("produces a valid M5_Output", () => {
    const output = generateDynamicSheetLocally(makeInput());
    expect(output.format).toBe("fiche_dynamique");
    expect(output.transformation_id).toBeTruthy();
    expect(output.content_blocks.length).toBeGreaterThan(0);
    expect(output.final_test.length).toBeGreaterThanOrEqual(3);
  });

  it("includes all 8 mandatory block types", () => {
    const output = generateDynamicSheetLocally(makeInput());
    const types = new Set(output.content_blocks.map(b => b.type));
    expect(types.has("contract")).toBe(true);
    expect(types.has("hook")).toBe(true);
    expect(types.has("anchor_map")).toBe(true);
    expect(types.has("pedagogical")).toBe(true);
    expect(types.has("reactivation")).toBe(true);
    expect(types.has("clarity_peak")).toBe(true);
    expect(types.has("consolidation")).toBe(true);
    expect(types.has("final_test")).toBe(true);
  });

  it("blocks are ordered by position", () => {
    const output = generateDynamicSheetLocally(makeInput());
    for (let i = 1; i < output.content_blocks.length; i++) {
      expect(output.content_blocks[i].position).toBeGreaterThan(output.content_blocks[i - 1].position);
    }
  });

  it("covers all critical concepts", () => {
    const output = generateDynamicSheetLocally(makeInput());
    expect(output.metadata.coverage.critical_covered).toBe(output.metadata.coverage.critical_total);
  });

  it("produces at least 3 final test questions", () => {
    const output = generateDynamicSheetLocally(makeInput());
    expect(output.final_test.length).toBeGreaterThanOrEqual(3);
  });

  it("final test has at least 3 Bloom levels when enough concepts", () => {
    const input = makeInput({
      m2_output: makeM2({
        key_concepts: [
          makeConcept("c1", 1),
          makeConcept("c2", 1),
          makeConcept("c3", 2),
          makeConcept("c4", 2),
        ],
        confusion_pairs: [{
          concept_a_key: "c1",
          concept_b_key: "c2",
          distinction_key: "difference",
          frequency: 3,
        }],
      }),
    });
    const output = generateDynamicSheetLocally(input);
    const bloomLevels = new Set(output.final_test.map(q => q.bloom_level));
    expect(bloomLevels.size).toBeGreaterThanOrEqual(3);
  });

  it("rejects format mismatch", () => {
    const input = makeInput({
      m4_output: makeM4({ chosen_format: "histoire_animee" as any }),
    });
    expect(() => generateDynamicSheetLocally(input)).toThrow(/fiche_dynamique/i);
  });

  it("rejects empty concepts", () => {
    const input = makeInput({
      m2_output: makeM2({ key_concepts: [] }),
    });
    expect(() => generateDynamicSheetLocally(input)).toThrow(/concepts/i);
  });

  it("rejects empty segments", () => {
    const input = makeInput({
      m3_output: makeM3({ segments: [] }),
    });
    expect(() => generateDynamicSheetLocally(input)).toThrow(/segments/i);
  });

  it("creates visual anchors for pedagogical blocks with critical concepts", () => {
    const output = generateDynamicSheetLocally(makeInput());
    const pedagogicalBlocks = output.content_blocks.filter(b => b.type === "pedagogical");
    // At least one pedagogical block should have a visual anchor
    const withAnchor = pedagogicalBlocks.filter(b => b.visual_anchor !== null);
    expect(withAnchor.length).toBeGreaterThan(0);
  });

  it("creates contrast boxes when confusion pairs exist", () => {
    const output = generateDynamicSheetLocally(makeInput());
    const withContrast = output.content_blocks.filter(b => b.contrast_box !== null);
    expect(withContrast.length).toBeGreaterThan(0);
  });

  it("includes recall events in reactivation blocks", () => {
    const output = generateDynamicSheetLocally(makeInput());
    const reactivations = output.content_blocks.filter(b => b.type === "reactivation");
    for (const r of reactivations) {
      expect(r.recall_event).not.toBeNull();
    }
  });

  it("does not exceed 5 concepts per pedagogical block", () => {
    const output = generateDynamicSheetLocally(makeInput());
    const pedagogicalBlocks = output.content_blocks.filter(b => b.type === "pedagogical");
    for (const b of pedagogicalBlocks) {
      expect(b.concepts_covered.length).toBeLessThanOrEqual(5);
    }
  });

  it("includes mnemonic from M3 in pedagogical block", () => {
    const output = generateDynamicSheetLocally(makeInput());
    const withMnemonic = output.content_blocks.filter(b => b.mnemonic !== null);
    expect(withMnemonic.length).toBeGreaterThan(0);
  });

  it("builds source disclaimer for uncertain concepts", () => {
    const input = makeInput({
      m2_output: makeM2({
        key_concepts: [
          makeConcept("c1", 1, true),
          makeConcept("c2", 1),
          makeConcept("c3", 2),
        ],
      }),
    });
    const output = generateDynamicSheetLocally(input);
    expect(output.source_disclaimer.uncertain_concepts).toContain("c1");
    // Should have a disclaimer block
    const disclaimerBlock = output.content_blocks.find(b => b.type === "disclaimer");
    expect(disclaimerBlock).toBeDefined();
  });

  it("adds quality flag for uncertain concepts", () => {
    const input = makeInput({
      m2_output: makeM2({
        key_concepts: [
          makeConcept("c1", 1, true),
          makeConcept("c2", 1),
          makeConcept("c3", 2),
        ],
      }),
    });
    const output = generateDynamicSheetLocally(input);
    expect(output.metadata.quality_flags).toContain("uncertain_concepts_present");
  });

  it("adds full_critical_coverage flag when all critical covered", () => {
    const output = generateDynamicSheetLocally(makeInput());
    expect(output.metadata.quality_flags).toContain("full_critical_coverage");
  });

  it("internal_summary contains correct critical concepts", () => {
    const output = generateDynamicSheetLocally(makeInput());
    expect(output.internal_summary.critical_concepts).toContain("c1");
    expect(output.internal_summary.critical_concepts).toContain("c2");
  });

  it("internal_summary pedagogical_format is fiche_dynamique", () => {
    const output = generateDynamicSheetLocally(makeInput());
    expect(output.internal_summary.pedagogical_format).toBe("fiche_dynamique");
  });

  it("metadata references correct document and architecture IDs", () => {
    const output = generateDynamicSheetLocally(makeInput());
    expect(output.metadata.document_id).toBe("doc-1");
    expect(output.metadata.memory_architecture_id).toBe("arch-1");
    expect(output.metadata.format_decision_id).toBe("dec-1");
  });

  it("handles ambiguous zones in disclaimer", () => {
    const input = makeInput({
      m2_output: makeM2({
        confidence: {
          concepts: 0.7,
          logic: 0.7,
          traps: 0.6,
          structure: 0.7,
          ambiguous_zones: [{ zone_label: "Section 3", reason: "unclear", segment_refs: [2], severity: "medium" }],
        },
      }),
    });
    const output = generateDynamicSheetLocally(input);
    expect(output.source_disclaimer.ambiguities).toContain("Section 3");
  });
});
