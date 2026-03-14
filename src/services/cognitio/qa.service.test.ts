import { describe, it, expect } from "vitest";
import { runLocalQA } from "./qa.service";
import type { QAInput } from "@/domain/cognitio/contracts";

function makeQAInput(overrides: Partial<QAInput> = {}): QAInput {
  return {
    mission_id: "test-mission",
    mission_json: {
      rooms: [
        {
          room_index: 0,
          brick_type: "OBSERVATION",
          title: "Salle 1",
          narrative_intro: "Bienvenue",
          items: [
            {
              item_index: 0,
              concept_key: "concept_a",
              bloom_level: "remember",
              question_text: "Question 1?",
              options: [
                { label: "A", is_correct: true },
                { label: "B", is_correct: false },
              ],
              explanation: "This is a detailed explanation of the answer.",
              hint: "Think about it",
              discrimination_flag: false,
              source_trace: { segment_index: 0, excerpt: "..." },
            },
          ],
        },
        {
          room_index: 1,
          brick_type: "TRI",
          title: "Salle 2",
          narrative_intro: "Continue",
          items: [
            {
              item_index: 0,
              concept_key: "concept_b",
              bloom_level: "understand",
              question_text: "Question 2?",
              options: [
                { label: "A", is_correct: false },
                { label: "B", is_correct: true },
              ],
              explanation: "This is a detailed explanation of the second answer.",
              hint: "Reflect",
              discrimination_flag: false,
              source_trace: { segment_index: 0, excerpt: "..." },
            },
            {
              item_index: 1,
              concept_key: "concept_c",
              bloom_level: "apply",
              question_text: "Question 3?",
              options: [
                { label: "A", is_correct: true },
                { label: "B", is_correct: false },
              ],
              explanation: "This is a detailed explanation of the third answer.",
              hint: "Apply it",
              discrimination_flag: false,
              source_trace: { segment_index: 1, excerpt: "..." },
            },
          ],
        },
        {
          room_index: 2,
          brick_type: "DECISION",
          title: "Salle 3",
          narrative_intro: "Final",
          items: [
            {
              item_index: 0,
              concept_key: "concept_a",
              bloom_level: "analyze",
              question_text: "Question 4?",
              options: [
                { label: "A", is_correct: true },
                { label: "B", is_correct: false },
              ],
              explanation: "This is a detailed explanation of the fourth answer.",
              hint: "Analyze",
              discrimination_flag: false,
              source_trace: { segment_index: 0, excerpt: "..." },
            },
          ],
        },
      ],
      boss: null,
      synthesis: "Synthèse du contenu",
      total_rooms: 3,
    },
    concepts: [
      { stable_key: "concept_a", label: "A", criticality: 1, bloom_target: "remember" },
      { stable_key: "concept_b", label: "B", criticality: 2, bloom_target: "understand" },
      { stable_key: "concept_c", label: "C", criticality: 3, bloom_target: "apply" },
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
      { stable_key: "concept_a", label: "A", criticality: 1, bloom_target: "remember" },
      { stable_key: "concept_b", label: "B", criticality: 2, bloom_target: "understand" },
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
      item_index: i,
      concept_key: "concept_a",
      bloom_level: "remember" as const,
      question_text: `Q${i}?`,
      options: [{ label: "A", is_correct: true }, { label: "B", is_correct: false }],
      explanation: "Detailed explanation here for this item.",
      hint: "Hint",
      discrimination_flag: false,
      source_trace: { segment_index: 0, excerpt: "..." },
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
      items: r.items.map(i => ({ ...i, bloom_level: "remember" })),
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
      items: r.items.map(i => ({ ...i, bloom_level: "remember" })),
    }));
    const result = runLocalQA(input);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("scores 100 when all checks pass", () => {
    const result = runLocalQA(makeQAInput());
    expect(result.qa_score).toBe(100);
  });
});
