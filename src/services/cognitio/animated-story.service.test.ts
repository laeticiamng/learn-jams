import { describe, it, expect } from "vitest";
import { generateAnimatedStoryLocally } from "./animated-story.service";
import type { M5B_Input } from "@/domain/cognitio/story.contracts";
import type { AnalyzedConcept, AnalyzedConfusionPair, M2_Output } from "@/domain/cognitio/contracts";
import type { M3_Output } from "@/domain/cognitio/memory.contracts";
import type { M3_Segment } from "@/domain/cognitio/memory.types";
import type { M4_Output } from "@/domain/cognitio/format.contracts";
import type { LearnerAudienceProfile } from "@/domain/cognitio/learner-profile.types";
import { MANDATORY_SCENE_TYPES } from "@/domain/cognitio/story.types";

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

function makeInput(conceptCount: number = 6, overrides: Partial<M5B_Input> = {}): M5B_Input {
  const concepts: AnalyzedConcept[] = [];
  for (let i = 0; i < conceptCount; i++) {
    const crit: 1 | 2 | 3 = i < 2 ? 1 : i < 4 ? 2 : 3;
    concepts.push(makeConcept(`c${i}`, crit));
  }

  const segmentCount = Math.max(1, Math.ceil(conceptCount / 3));
  const segments: M3_Segment[] = [];
  for (let s = 0; s < segmentCount; s++) {
    const start = s * 3;
    const end = Math.min(start + 3, conceptCount);
    segments.push({
      segment_index: s,
      concept_keys: concepts.slice(start, end).map(c => c.stable_key),
      new_element_count: end - start,
      reinforcement_keys: [],
      dominant_function: "encoding" as const,
      estimated_duration_sec: 60,
      bloom_targets: ["understand"],
    });
  }

  return {
    m2_output: {
      course_profile_id: "profile-1",
      main_topic: "Test Topic",
      learning_objectives: ["Learn test topic"],
      key_concepts: concepts,
      traps: [],
      confusion_pairs: [],
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
    },
    m3_output: {
      architecture_id: "arch-1",
      document_id: "doc-1",
      course_profile_id: "profile-1",
      segments,
      concept_order: concepts.map(c => c.stable_key),
      repetition_plan: [],
      mnemonics: [],
      visual_anchors: [],
      cognitive_budget: {
        total_concepts: concepts.length,
        max_per_segment: 4,
        segment_count: segments.length,
        total_new_introductions: concepts.length,
        total_reinforcements: 0,
        budget_utilization: 0.5,
      },
      pedagogical_contract: {
        total_concepts: concepts.length,
        critical_concepts: 2,
        estimated_duration_sec: 120,
        segment_count: segments.length,
        cognitive_budget: {
          total_concepts: concepts.length,
          max_per_segment: 4,
          segment_count: segments.length,
          total_new_introductions: concepts.length,
          total_reinforcements: 0,
          budget_utilization: 0.5,
        },
        guarantees: ["All critical concepts covered"],
        repetition_summary: { inline_recall_count: 1, final_test_questions: 3, j1_questions: 1, j7_questions: 1 },
      },
      total_duration_sec: 120,
      needs_splitting: false,
      reasoning_type: "declaratif",
      objective: "discovery",
    },
    m4_output: {
      decision_id: "decision-1",
      architecture_id: "arch-1",
      chosen_format: "histoire_animee",
      justification: "Narrative format selected",
      matrix_reasoning: "Matrix cell",
      estimated_duration_sec: 180,
      needs_split: false,
      overrides_applied: [],
      cost_level: "medium",
      system_recommended_format: "histoire_animee",
      fallback_candidates: [],
      override_requires_confirmation: false,
      decision_trace: {
        reasoning_type: "declaratif",
        objective: "discovery",
        matrix_result: "histoire_animee",
        overrides_checked: [],
        final_format: "histoire_animee",
        user_intent_respected: true,
      },
    },
    source_document: {
      document_id: "doc-1",
      word_count: 1000,
      source_type: "pdf",
      confidence_level: 0.8,
      source_issues: [],
    },
    user_objective: "discovery",
    ...overrides,
  };
}

// ---------- Tests ----------

describe("generateAnimatedStoryLocally", () => {
  // Structure invariants

  it("returns format histoire_animee", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    expect(result.format).toBe("histoire_animee");
  });

  it("returns render_mode interactive_storyboard_v1", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    expect(result.render_mode).toBe("interactive_storyboard_v1");
  });

  it("generates 4-12 scenes", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    expect(result.scenes.length).toBeGreaterThanOrEqual(4);
    expect(result.scenes.length).toBeLessThanOrEqual(12);
  });

  it("first scene is contract_hook", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    expect(result.scenes[0].type).toBe("contract_hook");
  });

  it("last non-disclaimer scene is consolidation", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    const nonDisclaimer = result.scenes.filter(s => s.type !== "disclaimer");
    expect(nonDisclaimer[nonDisclaimer.length - 1].type).toBe("consolidation");
  });

  it("contains all mandatory scene types", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    const types = new Set(result.scenes.map(s => s.type));
    for (const required of MANDATORY_SCENE_TYPES) {
      expect(types.has(required)).toBe(true);
    }
  });

  it("scene positions are sequential", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    for (let i = 0; i < result.scenes.length; i++) {
      expect(result.scenes[i].position).toBe(i);
    }
  });

  it("scene IDs are unique", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    const ids = result.scenes.map(s => s.scene_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all scenes have non-empty narration", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    for (const scene of result.scenes) {
      expect(scene.narration.trim().length).toBeGreaterThan(0);
    }
  });

  // Critical concept coverage

  it("covers all critical concepts", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    const allCovered = new Set(result.scenes.flatMap(s => s.concepts_covered));
    expect(allCovered.has("c0")).toBe(true);
    expect(allCovered.has("c1")).toBe(true);
  });

  // Active pause

  it("has at least one active pause with choice widget", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    const pauses = result.scenes.filter(s => s.type === "active_pause");
    expect(pauses.length).toBeGreaterThanOrEqual(1);
    for (const pause of pauses) {
      expect(pause.choice_widget).not.toBeNull();
    }
  });

  it("choice widget has exactly one best option", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    const pauses = result.scenes.filter(s => s.type === "active_pause");
    for (const pause of pauses) {
      if (pause.choice_widget) {
        const bestCount = pause.choice_widget.options.filter(o => o.is_best).length;
        expect(bestCount).toBe(1);
      }
    }
  });

  it("choice widget has >= 2 options", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    const pauses = result.scenes.filter(s => s.type === "active_pause");
    for (const pause of pauses) {
      if (pause.choice_widget) {
        expect(pause.choice_widget.options.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  // Narrative necessity

  it("checks narrative necessity", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    expect(result.narrative_necessity).toBeDefined();
    expect(typeof result.narrative_necessity.is_necessary).toBe("boolean");
    expect(typeof result.narrative_necessity.revert_candidate).toBe("boolean");
  });

  it("flags revert candidate for purely procedural short content", () => {
    const input = makeInput(4, {
      m2_output: {
        ...makeInput(4).m2_output,
        reasoning_type: "procedural",
        confusion_pairs: [],
      },
    });
    const result = generateAnimatedStoryLocally(input);
    expect(result.narrative_necessity.revert_candidate).toBe(true);
  });

  it("narrative is necessary when confusion pairs + causal reasoning", () => {
    const concepts = [makeConcept("a", 1), makeConcept("b", 1), makeConcept("c", 2)];
    const confusions: AnalyzedConfusionPair[] = [
      { concept_a_key: "a", concept_b_key: "b", distinction_key: "key diff", frequency: 3 },
    ];
    const input = makeInput(3, {
      m2_output: {
        ...makeInput(3).m2_output,
        key_concepts: concepts,
        confusion_pairs: confusions,
        reasoning_type: "causal",
      },
    });
    const result = generateAnimatedStoryLocally(input);
    expect(result.narrative_necessity.is_necessary).toBe(true);
    expect(result.narrative_necessity.revert_candidate).toBe(false);
  });

  // Confusion events

  it("generates confusion events when confusion pairs exist", () => {
    // Use c0/c1 keys which match the segment concept_keys in makeInput
    const baseInput = makeInput(6);
    const confusions: AnalyzedConfusionPair[] = [
      { concept_a_key: "c0", concept_b_key: "c1", distinction_key: "key diff", frequency: 3 },
    ];
    const input: M5B_Input = {
      ...baseInput,
      m2_output: {
        ...baseInput.m2_output,
        confusion_pairs: confusions,
      },
    };
    const result = generateAnimatedStoryLocally(input);
    const hasConfusion = result.scenes.some(s => s.confusion_event !== null);
    expect(hasConfusion).toBe(true);
  });

  // Audience adaptation

  it("audience_adaptation is present and valid", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    expect(result.audience_adaptation).toBeDefined();
    expect(result.audience_adaptation.vocabulary_level).toBeDefined();
    expect(result.audience_adaptation.narrative_universe_style).toBeDefined();
    expect(result.audience_adaptation.guidance_level).toBeDefined();
  });

  it("adapts to middle_school profile with warm_guided tone", () => {
    const profile: LearnerAudienceProfile = {
      age_band: "preteen",
      education_stage: "middle_school",
      declared_level: "beginner",
      language_preference: "fr",
      explanation_style: "guided",
      needs_extra_simplification: false,
      confidence: 0.8,
    };
    const result = generateAnimatedStoryLocally(makeInput(6, { learner_profile: profile }));
    expect(result.audience_adaptation.vocabulary_level).toBe("simple");
    expect(result.audience_adaptation.guidance_level).toBe("high");
    expect(result.audience_adaptation.narrative_universe_style).toBe("daily_life");
  });

  it("adapts to graduate profile with direct_efficient tone", () => {
    const profile: LearnerAudienceProfile = {
      age_band: "adult",
      education_stage: "graduate",
      declared_level: "advanced",
      language_preference: "fr",
      explanation_style: "academic",
      needs_extra_simplification: false,
      confidence: 0.9,
    };
    const result = generateAnimatedStoryLocally(makeInput(6, { learner_profile: profile }));
    expect(result.audience_adaptation.vocabulary_level).toBe("technical");
    expect(result.audience_adaptation.guidance_level).toBe("light");
    expect(result.audience_adaptation.narrative_universe_style).toBe("professional");
  });

  // Disclaimer

  it("adds disclaimer scene when uncertain concepts exist", () => {
    const input = makeInput(6);
    input.m2_output.key_concepts[0].uncertain = true;
    const result = generateAnimatedStoryLocally(input);
    const hasDisclaimer = result.scenes.some(s => s.type === "disclaimer");
    expect(hasDisclaimer).toBe(true);
    expect(result.disclaimer.uncertain_concepts.length).toBeGreaterThan(0);
  });

  it("adds disclaimer scene when confidence is low", () => {
    const input = makeInput(6);
    input.source_document.confidence_level = 0.5;
    const result = generateAnimatedStoryLocally(input);
    const hasDisclaimer = result.scenes.some(s => s.type === "disclaimer");
    expect(hasDisclaimer).toBe(true);
  });

  // Quality flags

  it("quality_flags includes full_critical_coverage when all critical covered", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    expect(result.metadata.quality_flags).toContain("full_critical_coverage");
  });

  // Error handling

  it("throws on invalid format", () => {
    const input = makeInput();
    (input.m4_output as any).chosen_format = "fiche_dynamique";
    expect(() => generateAnimatedStoryLocally(input)).toThrow();
  });

  it("throws when no concepts", () => {
    const input = makeInput();
    input.m2_output.key_concepts = [];
    expect(() => generateAnimatedStoryLocally(input)).toThrow();
  });

  // Metadata

  it("metadata contains correct document and architecture IDs", () => {
    const result = generateAnimatedStoryLocally(makeInput());
    expect(result.metadata.document_id).toBe("doc-1");
    expect(result.metadata.memory_architecture_id).toBe("arch-1");
    expect(result.metadata.course_profile_id).toBe("profile-1");
  });

  it("generates unique transformation_id", () => {
    const r1 = generateAnimatedStoryLocally(makeInput());
    const r2 = generateAnimatedStoryLocally(makeInput());
    expect(r1.transformation_id).not.toBe(r2.transformation_id);
  });
});
