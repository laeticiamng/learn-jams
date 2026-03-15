import { describe, it, expect } from "vitest";
import {
  validateM5BInput,
  validateM5BOutput,
  m5bOutputSchema,
  storySceneSchema,
  MIN_SCENES,
  MAX_SCENES,
  MAX_CONCEPTS_PER_SCENE,
} from "./story.validators";
import type { M5B_Input, M5B_Output } from "./story.contracts";
import type { StoryScene } from "./story.types";
import type { M2_Output, AnalyzedConcept, AnalyzedConfusionPair } from "./contracts";
import type { M3_Output } from "./memory.contracts";
import type { M4_Output } from "./format.contracts";

// ---------- Helpers ----------

function makeConcept(key: string, criticality: 1 | 2 | 3 | 4 = 3): AnalyzedConcept {
  return {
    stable_key: key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
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

function makeM2Output(concepts: AnalyzedConcept[], confusions: AnalyzedConfusionPair[] = []): M2_Output {
  return {
    course_profile_id: "profile-1",
    main_topic: "Test Topic",
    learning_objectives: ["Learn test topic"],
    key_concepts: concepts,
    traps: [],
    confusion_pairs: confusions,
    reasoning_type: "declaratif",
    density: "medium",
    recommended_template: "histoire_animee",
    confidence: { concepts: 0.8, logic: 0.8, traps: 0.7, structure: 0.8, ambiguous_zones: [] },
    prerequis: [],
    structure_type: "mixed",
    source_issues: [],
    total_concepts: concepts.length,
    critical_count: concepts.filter(c => c.criticality === 1).length,
    estimated_complexity: 5,
  };
}

function makeM3Output(): M3_Output {
  return {
    architecture_id: "arch-1",
    document_id: "doc-1",
    course_profile_id: "profile-1",
    segments: [
      {
        segment_index: 0,
        concept_keys: ["c0", "c1"],
        new_element_count: 2,
        reinforcement_keys: [],
        dominant_function: "encoding",
        estimated_duration_sec: 60,
        bloom_targets: ["understand"],
      },
    ],
    concept_order: ["c0", "c1"],
    repetition_plan: [],
    mnemonics: [],
    visual_anchors: [],
    cognitive_budget: {
      total_concepts: 2,
      max_per_segment: 4,
      segment_count: 1,
      total_new_introductions: 2,
      total_reinforcements: 0,
      budget_utilization: 0.5,
    },
    pedagogical_contract: {
      total_concepts: 2,
      critical_concepts: 1,
      estimated_duration_sec: 120,
      segment_count: 1,
      cognitive_budget: {
        total_concepts: 2,
        max_per_segment: 4,
        segment_count: 1,
        total_new_introductions: 2,
        total_reinforcements: 0,
        budget_utilization: 0.5,
      },
      guarantees: ["All critical concepts covered"],
      repetition_summary: {
        inline_recall_count: 1,
        final_test_questions: 3,
        j1_questions: 1,
        j7_questions: 1,
      },
    },
    total_duration_sec: 120,
    needs_splitting: false,
    reasoning_type: "declaratif",
    objective: "discovery",
  };
}

function makeM4Output(): M4_Output {
  return {
    decision_id: "decision-1",
    architecture_id: "arch-1",
    chosen_format: "histoire_animee",
    justification: "Narrative format selected",
    matrix_reasoning: "Matrix cell for histoire_animee",
    estimated_duration_sec: 180,
    needs_split: false,
    overrides_applied: [],
    cost_level: "medium",
    decision_trace: {
      reasoning_type: "declaratif",
      objective: "discovery",
      matrix_result: "histoire_animee",
      overrides_checked: [],
      final_format: "histoire_animee",
    },
  };
}

function makeScene(type: string, position: number, overrides: Partial<StoryScene> = {}): StoryScene {
  return {
    scene_id: `scene-${position}`,
    position,
    type: type as StoryScene["type"],
    title: `Scene ${position}`,
    visual_direction: "Visual direction here",
    narration: "Narration content here",
    dialogue: null,
    concepts_covered: [],
    visual_anchor: null,
    confusion_event: null,
    choice_widget: null,
    feedback_reveal: null,
    emotion_tag: null,
    ...overrides,
  };
}

function makeValidOutput(): M5B_Output {
  return {
    transformation_id: "transform-1",
    format: "histoire_animee",
    render_mode: "interactive_storyboard_v1",
    scenes: [
      makeScene("contract_hook", 0, { concepts_covered: ["c0"] }),
      makeScene("anchoring", 1),
      makeScene("narrative_core", 2, { concepts_covered: ["c0", "c1"] }),
      makeScene("active_pause", 3, {
        choice_widget: {
          prompt: "Question?",
          options: [
            { id: "o1", label: "Correct", is_best: true },
            { id: "o2", label: "Wrong", is_best: false },
          ],
        },
      }),
      makeScene("clarity_peak", 4, { concepts_covered: ["c0"] }),
      makeScene("consolidation", 5, { concepts_covered: ["c0"] }),
    ],
    narrative_necessity: { is_necessary: true, reason: "Justified", revert_candidate: false },
    audience_adaptation: {
      vocabulary_level: "intermediate",
      sentence_style: "balanced",
      abstraction_level: "mixed",
      guidance_level: "medium",
      narrative_universe_style: "school",
      adaptation_notes: [],
    },
    disclaimer: {
      confidence_level: 0.8,
      uncertain_concepts: [],
      contradictions: [],
      ambiguities: [],
    },
    metadata: {
      document_id: "doc-1",
      course_profile_id: "profile-1",
      memory_architecture_id: "arch-1",
      format_decision_id: "decision-1",
      estimated_duration_sec: 180,
      quality_flags: ["full_critical_coverage"],
      audience_profile_used: "high_school",
      document_difficulty_level: null,
      audience_mismatch_risk: null,
    },
  };
}

function makeInput(): M5B_Input {
  const concepts = [makeConcept("c0", 1), makeConcept("c1", 2)];
  return {
    m2_output: makeM2Output(concepts),
    m3_output: makeM3Output(),
    m4_output: makeM4Output(),
    source_document: {
      document_id: "doc-1",
      word_count: 1000,
      source_type: "pdf",
      confidence_level: 0.8,
      source_issues: [],
    },
    user_objective: "discovery",
  };
}

// ---------- Tests ----------

describe("validateM5BInput", () => {
  it("valid input passes", () => {
    const result = validateM5BInput(makeInput());
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("rejects wrong format", () => {
    const input = makeInput();
    (input.m4_output as any).chosen_format = "fiche_dynamique";
    const result = validateM5BInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "FORMAT_MISMATCH")).toBe(true);
  });

  it("rejects empty concepts", () => {
    const input = makeInput();
    input.m2_output.key_concepts = [];
    const result = validateM5BInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "NO_CONCEPTS")).toBe(true);
  });

  it("rejects empty segments", () => {
    const input = makeInput();
    input.m3_output.segments = [];
    const result = validateM5BInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === "NO_SEGMENTS")).toBe(true);
  });

  it("warns on low confidence", () => {
    const input = makeInput();
    input.source_document.confidence_level = 0.2;
    const result = validateM5BInput(input);
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.code === "LOW_SOURCE_CONFIDENCE")).toBe(true);
  });
});

describe("validateM5BOutput", () => {
  const criticalKeys = ["c0"];

  it("valid output passes", () => {
    const result = validateM5BOutput(makeValidOutput(), criticalKeys, 0);
    expect(result.valid).toBe(true);
  });

  it("rejects wrong format", () => {
    const output = makeValidOutput();
    (output as any).format = "fiche_dynamique";
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "FORMAT_MISMATCH")).toBe(true);
  });

  it("rejects too few scenes", () => {
    const output = makeValidOutput();
    output.scenes = output.scenes.slice(0, 2);
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "TOO_FEW_SCENES")).toBe(true);
  });

  it("rejects too many scenes", () => {
    const output = makeValidOutput();
    for (let i = output.scenes.length; i <= MAX_SCENES; i++) {
      output.scenes.push(makeScene("narrative_core", i));
    }
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "TOO_MANY_SCENES")).toBe(true);
  });

  it("rejects missing mandatory scene types", () => {
    const output = makeValidOutput();
    // Remove consolidation
    output.scenes = output.scenes.filter(s => s.type !== "consolidation");
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "MISSING_SCENE_CONSOLIDATION")).toBe(true);
  });

  it("rejects wrong first scene type", () => {
    const output = makeValidOutput();
    output.scenes[0] = makeScene("narrative_core", 0);
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "WRONG_FIRST_SCENE")).toBe(true);
  });

  it("rejects missing critical concepts", () => {
    const output = makeValidOutput();
    // Remove all concept coverage
    for (const scene of output.scenes) {
      scene.concepts_covered = [];
    }
    const result = validateM5BOutput(output, ["c0"], 0);
    expect(result.errors.some(e => e.code === "MISSING_CRITICAL_CONCEPTS")).toBe(true);
  });

  it("rejects scene overload (> 3 concepts)", () => {
    const output = makeValidOutput();
    output.scenes[2].concepts_covered = ["a", "b", "c", "d"];
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "SCENE_OVERLOAD")).toBe(true);
  });

  it("rejects pause without choice widget", () => {
    const output = makeValidOutput();
    const pause = output.scenes.find(s => s.type === "active_pause")!;
    pause.choice_widget = null;
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "PAUSE_MISSING_CHOICE")).toBe(true);
  });

  it("rejects choice with zero best options", () => {
    const output = makeValidOutput();
    const pause = output.scenes.find(s => s.type === "active_pause")!;
    for (const opt of pause.choice_widget!.options) {
      opt.is_best = false;
    }
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "CHOICE_BEST_COUNT")).toBe(true);
  });

  it("rejects choice with multiple best options", () => {
    const output = makeValidOutput();
    const pause = output.scenes.find(s => s.type === "active_pause")!;
    for (const opt of pause.choice_widget!.options) {
      opt.is_best = true;
    }
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "CHOICE_BEST_COUNT")).toBe(true);
  });

  it("rejects non-sequential positions", () => {
    const output = makeValidOutput();
    output.scenes[2].position = 99;
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "POSITION_MISMATCH")).toBe(true);
  });

  it("rejects empty narration", () => {
    const output = makeValidOutput();
    output.scenes[1].narration = "";
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "EMPTY_NARRATION")).toBe(true);
  });

  it("rejects duplicate scene IDs", () => {
    const output = makeValidOutput();
    output.scenes[1].scene_id = output.scenes[0].scene_id;
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "DUPLICATE_SCENE_IDS")).toBe(true);
  });

  it("warns when confusion pairs exist but no confusion events", () => {
    const output = makeValidOutput();
    const result = validateM5BOutput(output, criticalKeys, 2);
    expect(result.warnings.some(w => w.code === "NO_CONFUSION_EVENTS")).toBe(true);
  });

  it("pause cadence: allows up to 3 consecutive narrative scenes", () => {
    const output = makeValidOutput();
    // Insert 3 narrative scenes without a pause
    const newScenes = [
      makeScene("contract_hook", 0, { concepts_covered: ["c0"] }),
      makeScene("anchoring", 1),
      makeScene("narrative_core", 2, { concepts_covered: ["c0"] }),
      makeScene("narrative_core", 3),
      makeScene("narrative_core", 4),
      makeScene("active_pause", 5, {
        choice_widget: {
          prompt: "Q?",
          options: [
            { id: "o1", label: "A", is_best: true },
            { id: "o2", label: "B", is_best: false },
          ],
        },
      }),
      makeScene("clarity_peak", 6, { concepts_covered: ["c0"] }),
      makeScene("consolidation", 7, { concepts_covered: ["c0"] }),
    ];
    output.scenes = newScenes;
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "PAUSE_CADENCE_VIOLATED")).toBe(false);
  });

  it("pause cadence: rejects > 3 consecutive narrative scenes", () => {
    const output = makeValidOutput();
    const newScenes = [
      makeScene("contract_hook", 0, { concepts_covered: ["c0"] }),
      makeScene("anchoring", 1),
      makeScene("narrative_core", 2, { concepts_covered: ["c0"] }),
      makeScene("narrative_core", 3),
      makeScene("narrative_core", 4),
      makeScene("narrative_core", 5),
      makeScene("active_pause", 6, {
        choice_widget: {
          prompt: "Q?",
          options: [
            { id: "o1", label: "A", is_best: true },
            { id: "o2", label: "B", is_best: false },
          ],
        },
      }),
      makeScene("clarity_peak", 7, { concepts_covered: ["c0"] }),
      makeScene("consolidation", 8, { concepts_covered: ["c0"] }),
    ];
    output.scenes = newScenes;
    const result = validateM5BOutput(output, criticalKeys, 0);
    expect(result.errors.some(e => e.code === "PAUSE_CADENCE_VIOLATED")).toBe(true);
  });
});

describe("m5bOutputSchema (Zod)", () => {
  it("accepts valid output", () => {
    const output = makeValidOutput();
    const result = m5bOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it("rejects output missing required fields", () => {
    const result = m5bOutputSchema.safeParse({ transformation_id: "x" });
    expect(result.success).toBe(false);
  });
});

describe("storySceneSchema (Zod)", () => {
  it("accepts valid scene", () => {
    const scene = makeScene("narrative_core", 0);
    const result = storySceneSchema.safeParse(scene);
    expect(result.success).toBe(true);
  });

  it("rejects invalid scene type", () => {
    const scene = makeScene("invalid_type", 0);
    const result = storySceneSchema.safeParse(scene);
    expect(result.success).toBe(false);
  });
});
