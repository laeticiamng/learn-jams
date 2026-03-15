import { describe, it, expect } from "vitest";
import { runLocalQA } from "./qa.service";
import type { QAInput } from "@/domain/cognitio/contracts";

function makeQAInput(overrides: Partial<QAInput> = {}): QAInput {
  return {
    mission_id: "test-mission",
    mission_json: {
      title: "Test Mission",
      narrative_intro: "Bienvenue dans cette mission",
      rooms: [
        {
          room_index: 0,
          brick_type: "OBSERVATION",
          title: "Salle 1",
          narrative_context: "Bienvenue",
          items: [
            {
              id: "item-1",
              type: "OBSERVATION",
              prompt: "Question 1?",
              options: ["A", "B"],
              correct_answer: "A",
              explanation: "This is a detailed explanation of the answer.",
              concept_key: "concept_a",
              bloom_level: "remember",
              difficulty: 2,
            },
          ],
          hints: ["Think about it"],
          target_concepts: ["concept_a"],
        },
        {
          room_index: 1,
          brick_type: "TRI",
          title: "Salle 2",
          narrative_context: "Continue",
          items: [
            {
              id: "item-2",
              type: "TRI",
              prompt: "Question 2?",
              options: ["A", "B"],
              correct_answer: "B",
              explanation: "This is a detailed explanation of the second answer.",
              concept_key: "concept_b",
              bloom_level: "understand",
              difficulty: 3,
            },
            {
              id: "item-3",
              type: "TRI",
              prompt: "Question 3?",
              options: ["A", "B"],
              correct_answer: "A",
              explanation: "This is a detailed explanation of the third answer.",
              concept_key: "concept_c",
              bloom_level: "apply",
              difficulty: 3,
            },
          ],
          hints: ["Reflect"],
          target_concepts: ["concept_b", "concept_c"],
        },
        {
          room_index: 2,
          brick_type: "DECISION",
          title: "Salle 3",
          narrative_context: "Final",
          items: [
            {
              id: "item-4",
              type: "DECISION",
              prompt: "Question 4?",
              options: ["A", "B"],
              correct_answer: "A",
              explanation: "This is a detailed explanation of the fourth answer.",
              concept_key: "concept_a",
              bloom_level: "analyze",
              difficulty: 4,
            },
          ],
          hints: ["Analyze"],
          target_concepts: ["concept_a"],
        },
      ],
      learning_contract: {
        total_concepts: 3,
        critical_concepts: 1,
        estimated_duration_sec: 120,
        cognitive_budget: 5,
        segments: [
          { segment_index: 0, concept_keys: ["concept_a", "concept_b"], max_new_items: 3, reinforcement_items: [] },
          { segment_index: 1, concept_keys: ["concept_c"], max_new_items: 3, reinforcement_items: [] },
        ],
        repetition_plan: { inline_recall_count: 2, final_test_questions: 3, j1_questions: 1, j7_questions: 1 },
      },
      visual_anchors: [],
    },
    concepts: [
      { stable_key: "concept_a", label: "Pneumonie aiguë communautaire", definition: "Infection du parenchyme pulmonaire acquise en milieu extrahospitalier, causée principalement par Streptococcus pneumoniae.", type: "general", criticality: 1, criticality_score: 0.9, bloom_target: "remember", relations: [], prerequisites: [], source_confidence: 0.8, source_trace: [{ segment_index: 0, excerpt: "About pneumonie" }], uncertain: false },
      { stable_key: "concept_b", label: "Score de Fine", definition: "Score pronostique permettant de stratifier la gravité des pneumonies communautaires et de guider la décision d'hospitalisation.", type: "general", criticality: 2, criticality_score: 0.7, bloom_target: "understand", relations: [], prerequisites: [], source_confidence: 0.8, source_trace: [{ segment_index: 0, excerpt: "About Score de Fine" }], uncertain: false },
      { stable_key: "concept_c", label: "Antibiothérapie probabiliste", definition: "Traitement antibiotique initial prescrit avant identification du germe, basé sur les données épidémiologiques locales.", type: "general", criticality: 3, criticality_score: 0.5, bloom_target: "apply", relations: [], prerequisites: [], source_confidence: 0.8, source_trace: [{ segment_index: 1, excerpt: "About antibiothérapie" }], uncertain: false },
    ],
    quality_score: 0.8,
    source_text: "This is a test source text with enough words to pass the quality checks and provide adequate context for the mission generation process.",
    ...overrides,
  };
}

describe("runLocalQA", () => {
  it("passes all checks for valid mission", () => {
    const result = runLocalQA(makeQAInput());
    expect(result.qa_score).toBeGreaterThanOrEqual(80);
    expect(result.publish_blocked).toBe(false);
    expect(result.violations.length).toBe(0);
  });

  it("detects hallucination when concepts not in source", () => {
    const input = makeQAInput();
    // Remove concept_c from known concepts
    input.concepts = [
      { stable_key: "concept_a", label: "Pneumonie aiguë communautaire", definition: "Infection du parenchyme pulmonaire acquise en milieu extrahospitalier, causée principalement par Streptococcus pneumoniae.", type: "general", criticality: 1, criticality_score: 0.9, bloom_target: "remember", relations: [], prerequisites: [], source_confidence: 0.8, source_trace: [{ segment_index: 0, excerpt: "About pneumonie" }], uncertain: false },
      { stable_key: "concept_b", label: "Score de Fine", definition: "Score pronostique permettant de stratifier la gravité des pneumonies communautaires et de guider la décision d'hospitalisation.", type: "general", criticality: 2, criticality_score: 0.7, bloom_target: "understand", relations: [], prerequisites: [], source_confidence: 0.8, source_trace: [{ segment_index: 0, excerpt: "About Score de Fine" }], uncertain: false },
    ];
    const result = runLocalQA(input);
    expect(result.publish_blocked).toBe(true);
    expect(result.violations.some(v => v.violation_type === "hallucination")).toBe(true);
  });

  it("detects missing active recall", () => {
    const input = makeQAInput();
    input.mission_json.rooms = input.mission_json.rooms.map(r => ({
      ...r,
      items: [],
    }));
    const result = runLocalQA(input);
    expect(result.publish_blocked).toBe(true);
    expect(result.violations.some(v => v.violation_type === "missing_recall")).toBe(true);
  });

  it("detects cognitive overload", () => {
    const input = makeQAInput();
    // Add many items to one room
    const manyItems = Array.from({ length: 10 }, (_, i) => ({
      id: `overload-item-${i}`,
      type: "OBSERVATION" as const,
      prompt: `Q${i}?`,
      options: ["A", "B"],
      correct_answer: "A",
      explanation: "Detailed explanation here for this item.",
      concept_key: "concept_a",
      bloom_level: "remember" as const,
      difficulty: 2,
    }));
    input.mission_json.rooms[0].items = manyItems;
    const result = runLocalQA(input);
    expect(result.violations.some(v => v.violation_type === "overload")).toBe(true);
  });

  it("flags low bloom diversity", () => {
    const input = makeQAInput();
    // Make all items the same bloom level
    input.mission_json.rooms = input.mission_json.rooms.map(r => ({
      ...r,
      items: r.items.map(i => ({ ...i, bloom_level: "remember" as const })),
    }));
    const result = runLocalQA(input);
    const bloomCheck = result.checklist_results.find(c => c.check_id === "bloom_diversity");
    expect(bloomCheck?.passed).toBe(false);
  });

  it("blocks when quality score is low", () => {
    const result = runLocalQA(makeQAInput({ quality_score: 0.2 }));
    const qualityCheck = result.checklist_results.find(c => c.check_id === "quality_threshold");
    expect(qualityCheck?.passed).toBe(false);
  });

  it("provides recommendations for failed checks", () => {
    const input = makeQAInput();
    input.mission_json.rooms = input.mission_json.rooms.map(r => ({
      ...r,
      items: r.items.map(i => ({ ...i, bloom_level: "remember" as const })),
    }));
    const result = runLocalQA(input);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("scores 100 when all checks pass", () => {
    const result = runLocalQA(makeQAInput());
    expect(result.qa_score).toBe(100);
  });
});
