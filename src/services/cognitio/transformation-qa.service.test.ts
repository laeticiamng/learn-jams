import { describe, it, expect } from "vitest";
import { runLocalTransformationQA } from "./transformation-qa.service";
import type { M7_Input } from "@/domain/cognitio/qa.contracts";
import type { M5_Output } from "@/domain/cognitio/generation.contracts";
import type { ContentBlock, FinalTestItem, SourceDisclaimer, BloomNumeric } from "@/domain/cognitio/generation.types";
import type { M2_Output, AnalyzedConcept } from "@/domain/cognitio/contracts";
import type { M3_Output } from "@/domain/cognitio/memory.contracts";
import type { M4_Output } from "@/domain/cognitio/format.contracts";

function makeConcept(key: string, criticality: 1 | 2 | 3 = 1): AnalyzedConcept {
  return {
    stable_key: key,
    label: `Concept ${key}`,
    definition: `Definition of ${key}`,
    type: "general",
    criticality,
    criticality_score: 1 - criticality * 0.2,
    bloom_target: "understand",
    relations: [],
    prerequisites: [],
    source_confidence: 0.8,
    source_trace: [{ segment_index: 0, excerpt: `About ${key}` }],
    uncertain: false,
  };
}

function makeBlock(type: string, conceptsCovered: string[], opts: Partial<ContentBlock> = {}): ContentBlock {
  return {
    block_id: crypto.randomUUID(),
    type: type as ContentBlock["type"],
    title: `Block ${type}`,
    content: `Content for ${type}`,
    concepts_covered: conceptsCovered,
    visual_anchor: null,
    contrast_box: null,
    mnemonic: null,
    recall_event: null,
    position: 0,
    ...opts,
  } as ContentBlock;
}

function makeTestItem(bloom: BloomNumeric, concepts: string[] = ["c0"]): FinalTestItem {
  return {
    id: crypto.randomUUID(),
    type: "qcu",
    prompt: "Question?",
    choices: ["A", "B", "C"],
    expected_answer: "A",
    concepts_tested: concepts,
    bloom_level: bloom,
  };
}

function makeM5Output(): M5_Output {
  const blocks: ContentBlock[] = [
    makeBlock("contract", ["c0"]),
    makeBlock("hook", ["c0"]),
    makeBlock("anchor_map", ["c0", "c1"]),
    makeBlock("pedagogical", ["c0", "c1"], {
      recall_event: { type: "question", prompt: "What?", expected_concepts: ["c0"], bloom_level: 2 },
    }),
    makeBlock("reactivation", ["c0"]),
    makeBlock("clarity_peak", ["c0"]),
    makeBlock("consolidation", ["c0", "c1"]),
    makeBlock("final_test", []),
  ];

  // Give sequential positions
  blocks.forEach((b, i) => { b.position = i; });

  const finalTest: FinalTestItem[] = [
    makeTestItem(1, ["c0"]),
    makeTestItem(2, ["c1"]),
    makeTestItem(3, ["c0"]),
    makeTestItem(4, ["c0", "c1"]),
    makeTestItem(5, ["c1"]),
  ];

  return {
    transformation_id: "trans-1",
    format: "fiche_dynamique",
    content_blocks: blocks,
    final_test: finalTest,
    source_disclaimer: {
      confidence_level: 0.9,
      uncertain_concepts: [],
      contradictions: [],
      ambiguities: [],
    },
    internal_summary: {
      learning_objective: "Learn A and B",
      dominant_knowledge_type: {
        dominant: "declaratif",
        distribution: { declaratif: 1, procedural: 0, conditionnel: 0, causal: 0, metacognitif: 0 },
      },
      critical_concepts: ["c0", "c1"],
      confusions: [],
      cognitive_structure: "linear",
      cognitive_budget: { segments: 1, max_new_elements: 5, total_duration_sec: 300 },
      pedagogical_format: "fiche_dynamique",
      reactivation_plan: ["c0"],
      active_recall_plan: ["c0", "c1"],
      mnemonics: [],
    },
    metadata: {
      document_id: "doc-1",
      course_profile_id: "cp-1",
      memory_architecture_id: "ma-1",
      format_decision_id: "fd-1",
      estimated_duration_sec: 300,
      quality_flags: [],
      coverage: { critical_total: 2, critical_covered: 2, major_total: 0, major_covered: 0 },
    },
  } as M5_Output;
}

function makeM2Output(): M2_Output {
  return {
    course_profile_id: "cp-1",
    main_topic: "Test Topic",
    learning_objectives: ["Understand A and B"],
    key_concepts: [makeConcept("c0", 1), makeConcept("c1", 1)],
    traps: [],
    confusion_pairs: [],
    reasoning_type: "declaratif",
    density: "medium",
    recommended_template: "fiche_dynamique",
    confidence: { concepts: 0.9, logic: 0.9, traps: 0.8, structure: 0.9, ambiguous_zones: [] },
    prerequis: [],
    structure_type: "prose",
    source_issues: [],
    total_concepts: 2,
    critical_count: 2,
    estimated_complexity: 4,
  };
}

function makeM3Output(): M3_Output {
  return {
    architecture_id: "arch-1",
    document_id: "doc-1",
    course_profile_id: "cp-1",
    segments: [{ segment_index: 0, concept_keys: ["c0", "c1"], new_element_count: 2, reinforcement_keys: [], dominant_function: "encoding", estimated_duration_sec: 120, bloom_targets: ["understand"] }],
    concept_order: ["c0", "c1"],
    repetition_plan: [],
    mnemonics: [],
    visual_anchors: [],
    cognitive_budget: { total_concepts: 2, max_per_segment: 5, segment_count: 1, total_new_introductions: 2, total_reinforcements: 0, budget_utilization: 0.4 },
    pedagogical_contract: { total_concepts: 2, critical_concepts: 2, estimated_duration_sec: 120, segment_count: 1, cognitive_budget: { total_concepts: 2, max_per_segment: 5, segment_count: 1, total_new_introductions: 2, total_reinforcements: 0, budget_utilization: 0.4 }, repetition_summary: { inline_recall_count: 1, final_test_questions: 3, j1_questions: 1, j7_questions: 1 }, guarantees: ["All critical concepts covered"] },
    total_duration_sec: 120,
    needs_splitting: false,
    reasoning_type: "declaratif",
    objective: "discovery",
  };
}

function makeM4Output(): M4_Output {
  return {
    decision_id: "dec-1",
    architecture_id: "arch-1",
    chosen_format: "fiche_dynamique",
    justification: "Best fit",
    matrix_reasoning: "declaratif -> fiche",
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
  };
}

function makeQAInput(overrides: Partial<M7_Input> = {}): M7_Input {
  return {
    transformation_id: "trans-1",
    format: "fiche_dynamique",
    m5_output: makeM5Output(),
    m2_output: makeM2Output(),
    m3_output: makeM3Output(),
    m4_output: makeM4Output(),
    source_confidence: 0.9,
    word_count: 500,
    ...overrides,
  };
}

describe("runLocalTransformationQA", () => {
  it("returns a QA report and publish decision", () => {
    const result = runLocalTransformationQA(makeQAInput());
    expect(result.qa_report).toBeDefined();
    expect(result.publish_decision).toBeDefined();
    expect(result.qa_report.qa_score).toBeGreaterThanOrEqual(0);
    expect(result.qa_report.qa_score).toBeLessThanOrEqual(100);
  });

  it("returns pass for well-formed content", () => {
    const result = runLocalTransformationQA(makeQAInput());
    // All mandatory blocks present, inline recall present, final test with 5 Bloom levels
    expect(result.qa_report.qa_status).toBe("pass");
    expect(result.publish_decision.decision_status).not.toBe("blocked");
  });

  it("contains checklist results", () => {
    const result = runLocalTransformationQA(makeQAInput());
    expect(result.qa_report.checklist_results.length).toBeGreaterThan(0);
  });

  it("blocks when final test is missing", () => {
    const m5 = makeM5Output();
    m5.final_test = [];
    const result = runLocalTransformationQA(makeQAInput({ m5_output: m5 }));
    expect(result.qa_report.violations.some(v => v.type === "missing_final_test")).toBe(true);
  });

  it("blocks when inline recall is missing", () => {
    const m5 = makeM5Output();
    // Remove recall_event from all blocks
    m5.content_blocks.forEach(b => { b.recall_event = null; });
    const result = runLocalTransformationQA(makeQAInput({ m5_output: m5 }));
    expect(result.qa_report.violations.some(v => v.type === "missing_inline_recall")).toBe(true);
  });

  it("generates unique report IDs", () => {
    const r1 = runLocalTransformationQA(makeQAInput());
    const r2 = runLocalTransformationQA(makeQAInput());
    expect(r1.qa_report.id).not.toBe(r2.qa_report.id);
  });
});
