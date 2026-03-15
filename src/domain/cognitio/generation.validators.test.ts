import { describe, it, expect } from "vitest";
import {
  validateM5Input,
  validateM5Output,
  MIN_FINAL_TEST_QUESTIONS,
  MIN_BLOOM_LEVELS_IN_TEST,
  MAX_NEW_ELEMENTS_PER_BLOCK,
  MAX_OUTPUT_WORD_RATIO,
} from "./generation.validators";
import type { M5_Input, M5_Output } from "./generation.contracts";
import type { ContentBlock, FinalTestItem, BloomNumeric } from "./generation.types";
import type { M2_Output, AnalyzedConcept, AnalyzedConfusionPair } from "./contracts";
import type { M3_Output } from "./memory.contracts";
import type { M4_Output } from "./format.contracts";

// ---------- Fixtures ----------

function makeConcept(key: string, criticality: 1 | 2 | 3 = 1, uncertain = false): AnalyzedConcept {
  return {
    stable_key: key,
    label: `Label ${key}`,
    definition: `Definition of ${key}`,
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

function makeM2Output(overrides: Partial<M2_Output> = {}): M2_Output {
  return {
    course_profile_id: "profile-1",
    main_topic: "Test Topic",
    learning_objectives: ["Learn X"],
    key_concepts: [makeConcept("c1"), makeConcept("c2"), makeConcept("c3", 2)],
    traps: [],
    confusion_pairs: [{
      concept_a_key: "c1",
      concept_b_key: "c2",
      distinction_key: "c1 is not c2",
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

function makeM3Output(overrides: Partial<M3_Output> = {}): M3_Output {
  return {
    architecture_id: "arch-1",
    document_id: "doc-1",
    course_profile_id: "profile-1",
    segments: [
      { segment_index: 0, concept_keys: ["c1", "c2"], new_element_count: 2, reinforcement_keys: [], dominant_function: "encoding", estimated_duration_sec: 120, bloom_targets: ["understand"] },
      { segment_index: 1, concept_keys: ["c3"], new_element_count: 1, reinforcement_keys: [], dominant_function: "consolidation", estimated_duration_sec: 60, bloom_targets: ["remember"] },
    ],
    concept_order: ["c1", "c2", "c3"],
    repetition_plan: [
      { concept_key: "c1", moments: ["inline", "end_of_segment", "final_test"], is_critical: true, total_appearances: 3 },
    ],
    mnemonics: [{ concept_keys: ["c1"], mnemonic: "Remember C1", type: "acronym" }],
    visual_anchors: [{ concept_key: "c1", content: "Visualize c1 as a tree", anchor_type: "image_desc" }],
    cognitive_budget: { total_concepts: 3, max_per_segment: 5, segment_count: 2, total_new_introductions: 3, total_reinforcements: 0, budget_utilization: 0.6 },
    pedagogical_contract: {
      total_concepts: 3,
      critical_concepts: 2,
      segment_count: 2,
      estimated_duration_sec: 180,
      cognitive_budget: { total_concepts: 3, max_per_segment: 5, segment_count: 2, total_new_introductions: 3, total_reinforcements: 0, budget_utilization: 0.6 },
      repetition_summary: {
        inline_recall_count: 1,
        final_test_questions: 3,
        j1_questions: 1,
        j7_questions: 1,
      },
      guarantees: ["All critical concepts covered"],
    },
    total_duration_sec: 180,
    needs_splitting: false,
    reasoning_type: "declaratif",
    objective: "discovery",
    ...overrides,
  };
}

function makeM4Output(overrides: Partial<M4_Output> = {}): M4_Output {
  return {
    decision_id: "dec-1",
    architecture_id: "arch-1",
    chosen_format: "fiche_dynamique",
    justification: "Format sélectionné",
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

function makeM5Input(overrides: Partial<M5_Input> = {}): M5_Input {
  return {
    m2_output: makeM2Output(),
    m3_output: makeM3Output(),
    m4_output: makeM4Output(),
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

function makeBlock(type: ContentBlock["type"], conceptsCovered: string[] = [], overrides: Partial<ContentBlock> = {}): ContentBlock {
  return {
    block_id: crypto.randomUUID(),
    type,
    title: `Block ${type}`,
    content: "Some content here for the block.",
    concepts_covered: conceptsCovered,
    visual_anchor: null,
    contrast_box: null,
    mnemonic: null,
    recall_event: null,
    position: 0,
    ...overrides,
  };
}

function makeTestItem(bloom: BloomNumeric, conceptsTested: string[] = ["c1"]): FinalTestItem {
  return {
    id: crypto.randomUUID(),
    type: "qcu",
    prompt: "Question?",
    choices: ["A", "B"],
    expected_answer: "A",
    concepts_tested: conceptsTested,
    bloom_level: bloom,
  };
}

function makeM5Output(overrides: Partial<M5_Output> = {}): M5_Output {
  return {
    transformation_id: "t-1",
    format: "fiche_dynamique",
    metadata: {
      document_id: "doc-1",
      course_profile_id: "profile-1",
      memory_architecture_id: "arch-1",
      format_decision_id: "dec-1",
      estimated_duration_sec: 180,
      quality_flags: ["full_critical_coverage"],
      coverage: {
        critical_total: 2,
        critical_covered: 2,
        major_total: 1,
        major_covered: 1,
      },
    },
    internal_summary: {
      learning_objective: "Learn X",
      dominant_knowledge_type: {
        dominant: "declaratif",
        distribution: { declaratif: 1, procedural: 0, conditionnel: 0, causal: 0, metacognitif: 0 },
      },
      critical_concepts: ["c1", "c2"],
      confusions: ["c1 ↔ c2"],
      cognitive_structure: "2 segments, 3 concepts",
      cognitive_budget: { segments: 2, max_new_elements: 5, total_duration_sec: 180 },
      pedagogical_format: "fiche_dynamique",
      reactivation_plan: [],
      active_recall_plan: [],
      mnemonics: [],
    },
    content_blocks: [
      makeBlock("contract"),
      makeBlock("hook", ["c1"]),
      makeBlock("anchor_map"),
      makeBlock("pedagogical", ["c1", "c2"], {
        visual_anchor: { image_desc: "tree", verbal_formula: "c1 is a tree" },
        recall_event: { type: "question", prompt: "What is c1?", expected_concepts: ["c1"], bloom_level: 1 },
      }),
      makeBlock("reactivation", ["c1"], {
        recall_event: { type: "reformulation", prompt: "Restate c1", expected_concepts: ["c1"], bloom_level: 2 },
      }),
      makeBlock("clarity_peak", ["c1", "c2"]),
      makeBlock("consolidation", ["c1", "c2"]),
      makeBlock("final_test"),
    ],
    final_test: [
      makeTestItem(1, ["c1"]),
      makeTestItem(2, ["c2"]),
      makeTestItem(4, ["c1", "c2"]),
    ],
    source_disclaimer: {
      confidence_level: 0.85,
      uncertain_concepts: [],
      contradictions: [],
      ambiguities: [],
    },
    ...overrides,
  };
}

// ============================================================
// Input Validation
// ============================================================

describe("validateM5Input", () => {
  it("accepts valid input", () => {
    const result = validateM5Input(makeM5Input());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects format mismatch", () => {
    const input = makeM5Input({
      m4_output: makeM4Output({ chosen_format: "histoire_animee" as any }),
    });
    const result = validateM5Input(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "FORMAT_MISMATCH")).toBe(true);
  });

  it("rejects when no concepts", () => {
    const input = makeM5Input({
      m2_output: makeM2Output({ key_concepts: [] }),
    });
    const result = validateM5Input(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "NO_CONCEPTS")).toBe(true);
  });

  it("warns when no segments (fallback segment will be created)", () => {
    const input = makeM5Input({
      m3_output: makeM3Output({ segments: [] }),
    });
    const result = validateM5Input(input);
    expect(result.valid).toBe(true);
    expect(result.warnings.some(e => e.code === "NO_SEGMENTS")).toBe(true);
  });
});

// ============================================================
// Output Validation
// ============================================================

describe("validateM5Output", () => {
  it("accepts a valid output", () => {
    const result = validateM5Output(makeM5Output(), 1000);
    expect(result.valid).toBe(true);
  });

  it("rejects missing contract block (fatal)", () => {
    const output = makeM5Output({
      content_blocks: makeM5Output().content_blocks.filter(b => b.type !== "contract"),
    });
    const result = validateM5Output(output, 1000);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "MISSING_BLOCK_CONTRACT" && e.severity === "fatal")).toBe(true);
  });

  it("rejects missing consolidation block (fatal)", () => {
    const output = makeM5Output({
      content_blocks: makeM5Output().content_blocks.filter(b => b.type !== "consolidation"),
    });
    const result = validateM5Output(output, 1000);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "MISSING_BLOCK_CONSOLIDATION" && e.severity === "fatal")).toBe(true);
  });

  it("reports missing hook block (error, not fatal)", () => {
    const output = makeM5Output({
      content_blocks: makeM5Output().content_blocks.filter(b => b.type !== "hook"),
    });
    const result = validateM5Output(output, 1000);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "MISSING_BLOCK_HOOK" && e.severity === "error")).toBe(true);
  });

  it("rejects insufficient final test questions", () => {
    const output = makeM5Output({
      final_test: [makeTestItem(1), makeTestItem(2)], // only 2, need 3
    });
    const result = validateM5Output(output, 1000);
    expect(result.errors.some(e => e.code === "INSUFFICIENT_FINAL_TEST")).toBe(true);
  });

  it("rejects insufficient Bloom diversity", () => {
    const output = makeM5Output({
      final_test: [makeTestItem(1), makeTestItem(1), makeTestItem(1)], // only 1 bloom level
    });
    const result = validateM5Output(output, 1000);
    expect(result.errors.some(e => e.code === "INSUFFICIENT_BLOOM_DIVERSITY")).toBe(true);
  });

  it("accepts Bloom diversity ≥ 3", () => {
    const output = makeM5Output({
      final_test: [makeTestItem(1), makeTestItem(3), makeTestItem(5)],
    });
    const result = validateM5Output(output, 1000);
    expect(result.errors.some(e => e.code === "INSUFFICIENT_BLOOM_DIVERSITY")).toBe(false);
  });

  it("reports missing critical concept coverage (fatal)", () => {
    const output = makeM5Output();
    output.metadata.coverage = {
      critical_total: 3,
      critical_covered: 2,
      major_total: 1,
      major_covered: 1,
    };
    const result = validateM5Output(output, 1000);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "MISSING_CRITICAL_CONCEPT")).toBe(true);
  });

  it("accepts full critical coverage", () => {
    const output = makeM5Output();
    output.metadata.coverage.critical_total = 2;
    output.metadata.coverage.critical_covered = 2;
    const result = validateM5Output(output, 1000);
    expect(result.errors.some(e => e.code === "MISSING_CRITICAL_CONCEPT")).toBe(false);
  });

  it("reports output too verbose", () => {
    const longContent = Array(500).fill("word").join(" ");
    const output = makeM5Output({
      content_blocks: makeM5Output().content_blocks.map(b => ({ ...b, content: longContent })),
    });
    // 8 blocks × 500 words = 4000 words, source = 1000 → ratio 4.0 > 2.0
    const result = validateM5Output(output, 1000);
    expect(result.errors.some(e => e.code === "OUTPUT_TOO_VERBOSE")).toBe(true);
  });

  it("does not flag verbosity when within ratio", () => {
    const result = validateM5Output(makeM5Output(), 10000);
    expect(result.errors.some(e => e.code === "OUTPUT_TOO_VERBOSE")).toBe(false);
  });

  it("reports block overload for pedagogical blocks", () => {
    const overloadedBlock = makeBlock("pedagogical", ["c1", "c2", "c3", "c4", "c5", "c6"]);
    const output = makeM5Output();
    output.content_blocks.push(overloadedBlock);
    const result = validateM5Output(output, 10000);
    expect(result.errors.some(e => e.code === "BLOCK_OVERLOAD")).toBe(true);
  });

  it("does not flag block overload when within limit", () => {
    const output = makeM5Output();
    const result = validateM5Output(output, 10000);
    expect(result.errors.some(e => e.code === "BLOCK_OVERLOAD")).toBe(false);
  });

  it("warns about low recall density", () => {
    // Make output verbose with no recall events
    const longContent = Array(300).fill("word").join(" ");
    const output = makeM5Output({
      content_blocks: makeM5Output().content_blocks.map(b => ({
        ...b,
        content: longContent,
        recall_event: null,
      })),
    });
    const result = validateM5Output(output, 100000);
    expect(result.warnings.some(w => w.code === "LOW_RECALL_DENSITY")).toBe(true);
  });

  it("warns about unanchored critical concepts", () => {
    const output = makeM5Output({
      content_blocks: makeM5Output().content_blocks.map(b => ({
        ...b,
        visual_anchor: null,
      })),
    });
    const result = validateM5Output(output, 10000);
    expect(result.warnings.some(w => w.code === "UNANCHORED_CRITICAL")).toBe(true);
  });
});
