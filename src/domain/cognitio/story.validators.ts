// ============================================================
// COGNITIO M5-B Story Validators — All Invariants
// ============================================================

import { z } from "zod";
import type { M5B_Input, M5B_Output } from "./story.contracts";
import type { StoryScene, StorySceneType } from "./story.types";
import { MANDATORY_SCENE_TYPES } from "./story.types";

// ---------- Constants ----------

export const MIN_SCENES = 4;
export const MAX_SCENES = 12;
export const MAX_CONCEPTS_PER_SCENE = 3;
export const ACTIVE_PAUSE_MAX_INTERVAL = 3; // pause every 2-3 narrative scenes
export const MIN_CHOICE_OPTIONS = 2;
export const MAX_CHOICE_OPTIONS = 4;

// ---------- Zod Schemas ----------

export const sceneChoiceOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  is_best: z.boolean(),
});

export const sceneChoiceWidgetSchema = z.object({
  prompt: z.string(),
  options: z.array(sceneChoiceOptionSchema).min(MIN_CHOICE_OPTIONS).max(MAX_CHOICE_OPTIONS),
});

export const confusionEventSchema = z.object({
  concept_a: z.string(),
  concept_b: z.string(),
  error_made: z.string(),
  correction: z.string(),
  distinction_key: z.string(),
});

export const narrativeAnchorSchema = z.object({
  image_desc: z.string(),
  verbal_formula: z.string(),
});

export const sceneFeedbackRevealSchema = z.object({
  corrective_explanation: z.string(),
  concept_reinforced: z.array(z.string()),
});

export const storySceneSchema = z.object({
  scene_id: z.string(),
  position: z.number().int().min(0),
  type: z.enum([
    "contract_hook",
    "anchoring",
    "narrative_core",
    "active_pause",
    "clarity_peak",
    "consolidation",
    "disclaimer",
  ]),
  title: z.string(),
  visual_direction: z.string(),
  narration: z.string(),
  dialogue: z.array(z.string()).nullable(),
  concepts_covered: z.array(z.string()),
  visual_anchor: narrativeAnchorSchema.nullable(),
  confusion_event: confusionEventSchema.nullable(),
  choice_widget: sceneChoiceWidgetSchema.nullable(),
  feedback_reveal: sceneFeedbackRevealSchema.nullable(),
  emotion_tag: z.enum(["tension", "surprise", "identification", "clarity"]).nullable(),
});

export const narrativeNecessitySchema = z.object({
  is_necessary: z.boolean(),
  reason: z.string(),
  revert_candidate: z.boolean(),
});

export const audienceAdaptationReportSchema = z.object({
  vocabulary_level: z.enum(["simple", "intermediate", "academic", "technical"]),
  sentence_style: z.enum(["short", "balanced", "dense"]),
  abstraction_level: z.enum(["concrete", "mixed", "abstract"]),
  guidance_level: z.enum(["high", "medium", "light"]),
  narrative_universe_style: z.enum(["school", "daily_life", "academic", "professional", "clinical"]),
  adaptation_notes: z.array(z.string()),
});

export const storyDisclaimerSchema = z.object({
  confidence_level: z.number().min(0).max(1),
  uncertain_concepts: z.array(z.string()),
  contradictions: z.array(z.string()),
  ambiguities: z.array(z.string()),
});

export const storyMetadataSchema = z.object({
  document_id: z.string(),
  course_profile_id: z.string(),
  memory_architecture_id: z.string(),
  format_decision_id: z.string(),
  estimated_duration_sec: z.number().min(0),
  quality_flags: z.array(z.string()),
  audience_profile_used: z.string(),
  document_difficulty_level: z.string().nullable(),
  audience_mismatch_risk: z.number().nullable(),
});

export const m5bOutputSchema = z.object({
  transformation_id: z.string(),
  format: z.literal("histoire_animee"),
  render_mode: z.literal("interactive_storyboard_v1"),
  scenes: z.array(storySceneSchema).min(MIN_SCENES).max(MAX_SCENES),
  narrative_necessity: narrativeNecessitySchema,
  audience_adaptation: audienceAdaptationReportSchema,
  disclaimer: storyDisclaimerSchema,
  metadata: storyMetadataSchema,
});

// ---------- Validation Result ----------

export interface M5BValidationError {
  code: string;
  message: string;
  severity: "fatal" | "error" | "warning";
}

export interface M5BValidationResult {
  valid: boolean;
  errors: M5BValidationError[];
  warnings: M5BValidationError[];
}

// ---------- Input Validation ----------

export function validateM5BInput(input: M5B_Input): M5BValidationResult {
  const errors: M5BValidationError[] = [];
  const warnings: M5BValidationError[] = [];

  if (input.m4_output.chosen_format !== "histoire_animee") {
    errors.push({
      code: "FORMAT_MISMATCH",
      message: `Expected histoire_animee, got ${input.m4_output.chosen_format}`,
      severity: "fatal",
    });
  }

  if (!input.m2_output.key_concepts || input.m2_output.key_concepts.length === 0) {
    errors.push({
      code: "NO_CONCEPTS",
      message: "No concepts available for story generation",
      severity: "fatal",
    });
  }

  if (!input.m3_output.segments || input.m3_output.segments.length === 0) {
    errors.push({
      code: "NO_SEGMENTS",
      message: "No memory segments available",
      severity: "fatal",
    });
  }

  if (input.source_document.confidence_level < 0.3) {
    warnings.push({
      code: "LOW_SOURCE_CONFIDENCE",
      message: `Source confidence ${input.source_document.confidence_level} is very low`,
      severity: "warning",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ---------- Output Validation ----------

export function validateM5BOutput(
  output: M5B_Output,
  criticalConceptKeys: string[],
  confusionPairCount: number,
): M5BValidationResult {
  const errors: M5BValidationError[] = [];
  const warnings: M5BValidationError[] = [];

  // INV-1: Format check
  if (output.format !== "histoire_animee") {
    errors.push({ code: "FORMAT_MISMATCH", message: "Format must be histoire_animee", severity: "fatal" });
  }

  // INV-2: Scene count
  if (output.scenes.length < MIN_SCENES) {
    errors.push({ code: "TOO_FEW_SCENES", message: `${output.scenes.length} scenes (min ${MIN_SCENES})`, severity: "fatal" });
  }
  if (output.scenes.length > MAX_SCENES) {
    errors.push({ code: "TOO_MANY_SCENES", message: `${output.scenes.length} scenes (max ${MAX_SCENES})`, severity: "error" });
  }

  // INV-3: Mandatory scene types present
  const sceneTypes = new Set(output.scenes.map(s => s.type));
  for (const required of MANDATORY_SCENE_TYPES) {
    if (!sceneTypes.has(required)) {
      errors.push({
        code: `MISSING_SCENE_${required.toUpperCase()}`,
        message: `Missing mandatory scene type: ${required}`,
        severity: "fatal",
      });
    }
  }

  // INV-4: Scene ordering — contract_hook first, consolidation last (before optional disclaimer)
  if (output.scenes.length > 0) {
    if (output.scenes[0].type !== "contract_hook") {
      errors.push({
        code: "WRONG_FIRST_SCENE",
        message: `First scene must be contract_hook, got ${output.scenes[0].type}`,
        severity: "fatal",
      });
    }
    const lastNonDisclaimer = [...output.scenes].reverse().find(s => s.type !== "disclaimer");
    if (lastNonDisclaimer && lastNonDisclaimer.type !== "consolidation") {
      errors.push({
        code: "WRONG_LAST_SCENE",
        message: `Last non-disclaimer scene must be consolidation, got ${lastNonDisclaimer.type}`,
        severity: "error",
      });
    }
  }

  // INV-5: 100% critical concept coverage
  const allCoveredConcepts = new Set(output.scenes.flatMap(s => s.concepts_covered));
  const missingCritical = criticalConceptKeys.filter(k => !allCoveredConcepts.has(k));
  if (missingCritical.length > 0) {
    errors.push({
      code: "MISSING_CRITICAL_CONCEPTS",
      message: `${missingCritical.length} critical concept(s) not covered: ${missingCritical.join(", ")}`,
      severity: "fatal",
    });
  }

  // INV-6: Max concepts per scene
  for (const scene of output.scenes) {
    if (scene.concepts_covered.length > MAX_CONCEPTS_PER_SCENE) {
      errors.push({
        code: "SCENE_OVERLOAD",
        message: `Scene "${scene.title}" has ${scene.concepts_covered.length} concepts (max ${MAX_CONCEPTS_PER_SCENE})`,
        severity: "error",
      });
    }
  }

  // INV-7: Active pause cadence — at least one pause every 3 narrative scenes
  const narrativeScenesBeforePause = countNarrativeScenesBeforePause(output.scenes);
  if (narrativeScenesBeforePause > ACTIVE_PAUSE_MAX_INTERVAL) {
    errors.push({
      code: "PAUSE_CADENCE_VIOLATED",
      message: `${narrativeScenesBeforePause} consecutive narrative scenes without pause (max ${ACTIVE_PAUSE_MAX_INTERVAL})`,
      severity: "error",
    });
  }

  // INV-8: Active pause scenes must have choice widget
  const pauseScenes = output.scenes.filter(s => s.type === "active_pause");
  for (const pause of pauseScenes) {
    if (!pause.choice_widget) {
      errors.push({
        code: "PAUSE_MISSING_CHOICE",
        message: `Active pause "${pause.title}" has no choice widget`,
        severity: "error",
      });
    }
  }

  // INV-9: Choice widgets must have exactly one best option
  for (const scene of output.scenes) {
    if (scene.choice_widget) {
      const bestCount = scene.choice_widget.options.filter(o => o.is_best).length;
      if (bestCount !== 1) {
        errors.push({
          code: "CHOICE_BEST_COUNT",
          message: `Scene "${scene.title}" choice has ${bestCount} best options (need exactly 1)`,
          severity: "error",
        });
      }
      if (scene.choice_widget.options.length < MIN_CHOICE_OPTIONS) {
        errors.push({
          code: "CHOICE_TOO_FEW_OPTIONS",
          message: `Scene "${scene.title}" choice has ${scene.choice_widget.options.length} options (min ${MIN_CHOICE_OPTIONS})`,
          severity: "error",
        });
      }
    }
  }

  // INV-10: Confusion events reference valid concepts
  for (const scene of output.scenes) {
    if (scene.confusion_event) {
      if (!scene.confusion_event.concept_a || !scene.confusion_event.concept_b) {
        errors.push({
          code: "CONFUSION_MISSING_CONCEPTS",
          message: `Scene "${scene.title}" confusion event missing concept references`,
          severity: "error",
        });
      }
    }
  }

  // INV-11: At least one confusion event if confusion pairs exist
  if (confusionPairCount > 0) {
    const hasConfusionEvent = output.scenes.some(s => s.confusion_event !== null);
    if (!hasConfusionEvent) {
      warnings.push({
        code: "NO_CONFUSION_EVENTS",
        message: `${confusionPairCount} confusion pair(s) but no confusion events in story`,
        severity: "warning",
      });
    }
  }

  // INV-12: Positions are sequential
  for (let i = 0; i < output.scenes.length; i++) {
    if (output.scenes[i].position !== i) {
      errors.push({
        code: "POSITION_MISMATCH",
        message: `Scene at index ${i} has position ${output.scenes[i].position}`,
        severity: "error",
      });
    }
  }

  // INV-13: All scenes have narration
  for (const scene of output.scenes) {
    if (!scene.narration || scene.narration.trim().length === 0) {
      errors.push({
        code: "EMPTY_NARRATION",
        message: `Scene "${scene.title}" has empty narration`,
        severity: "error",
      });
    }
  }

  // INV-14: Narrative necessity check present
  if (!output.narrative_necessity) {
    errors.push({
      code: "MISSING_NECESSITY_CHECK",
      message: "Missing narrative necessity check",
      severity: "fatal",
    });
  }

  // INV-15: Disclaimer scene present and has disclaimer data
  const disclaimerScene = output.scenes.find(s => s.type === "disclaimer");
  if (!disclaimerScene && output.disclaimer.uncertain_concepts.length > 0) {
    warnings.push({
      code: "MISSING_DISCLAIMER_SCENE",
      message: "Uncertain concepts exist but no disclaimer scene",
      severity: "warning",
    });
  }

  // INV-16: Audience adaptation report present
  if (!output.audience_adaptation) {
    errors.push({
      code: "MISSING_AUDIENCE_ADAPTATION",
      message: "Missing audience adaptation report",
      severity: "fatal",
    });
  }

  // INV-17: Scene IDs are unique
  const sceneIds = output.scenes.map(s => s.scene_id);
  if (new Set(sceneIds).size !== sceneIds.length) {
    errors.push({
      code: "DUPLICATE_SCENE_IDS",
      message: "Scene IDs are not unique",
      severity: "error",
    });
  }

  // INV-18: Visual anchors for critical concepts in narrative_core scenes
  const narrativeCoreScenes = output.scenes.filter(s => s.type === "narrative_core");
  const criticalInNarrative = new Set(
    narrativeCoreScenes.flatMap(s => s.concepts_covered).filter(k => criticalConceptKeys.includes(k))
  );
  const anchoredCritical = new Set(
    narrativeCoreScenes.filter(s => s.visual_anchor !== null).flatMap(s => s.concepts_covered).filter(k => criticalConceptKeys.includes(k))
  );
  const unanchored = [...criticalInNarrative].filter(k => !anchoredCritical.has(k));
  if (unanchored.length > 0) {
    warnings.push({
      code: "UNANCHORED_CRITICAL_NARRATIVE",
      message: `${unanchored.length} critical concept(s) in narrative without visual anchor`,
      severity: "warning",
    });
  }

  return {
    valid: errors.filter(e => e.severity === "fatal" || e.severity === "error").length === 0,
    errors: errors.filter(e => e.severity !== "warning"),
    warnings: [...warnings, ...errors.filter(e => e.severity === "warning")],
  };
}

// ---------- Helpers ----------

function countNarrativeScenesBeforePause(scenes: StoryScene[]): number {
  let maxConsecutive = 0;
  let current = 0;
  for (const scene of scenes) {
    if (scene.type === "narrative_core") {
      current++;
      maxConsecutive = Math.max(maxConsecutive, current);
    } else if (scene.type === "active_pause") {
      current = 0;
    }
  }
  return maxConsecutive;
}
