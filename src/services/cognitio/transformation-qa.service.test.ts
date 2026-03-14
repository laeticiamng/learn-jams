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
    criticality,
    uncertain: false,
    source_spans: [{ text: "test", start: 0, end: 4 }],
  } as AnalyzedConcept;
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
      recall_event: { id: "re1", type: "question", prompt: "What?", answer: "This", concept_key: "c0" },
    } as Partial<ContentBlock>),
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
      concept_count: 2,
      critical_covered: 2,
      critical_total: 2,
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
    document_id: "doc-1",
    key_concepts: [makeConcept("c0", 1), makeConcept("c1", 1)],
    confusion_pairs: [],
    traps: [],
    confidence: { global_score: 0.9, ambiguous_zones: [] },
    learning_objectives: ["Understand A and B"],
    bloom_taxonomy: { remember: 2, understand: 2, apply: 0, analyze: 0, evaluate: 0, create: 0 },
  } as unknown as M2_Output;
}

function makeM3Output(): M3_Output {
  return {
    document_id: "doc-1",
    segments: [{ segment_id: "seg-0", label: "Segment 1", concept_keys: ["c0", "c1"], cognitive_load: 3, ordering: 0 }],
    cognitive_budget: { total_load: 3, estimated_time_minutes: 10, overload_risk: false },
    pedagogical_contract: { learning_objective: "Learn A and B", total_concepts: 2, critical_count: 2, estimated_study_time: "10 min", disclaimer_required: false },
    repetition_plan: [],
    mnemonics: [],
    visual_anchors: [],
  } as unknown as M3_Output;
}

function makeM4Output(): M4_Output {
  return {
    document_id: "doc-1",
    chosen_format: "fiche_dynamique",
    format_scores: { fiche_dynamique: 0.9, histoire_animee: 0.3 },
    reasoning: "Best fit",
    constraints_applied: [],
  } as unknown as M4_Output;
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
