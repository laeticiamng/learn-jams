// ============================================================
// COGNITIO Format Selector Validators — M4
// ============================================================

import { z } from "zod";
import type { ChosenFormat, ReasoningType, LearningObjective, DetectedStructureType } from "./types";
import type { M4_Input, M4_Output } from "./format.contracts";
import type { FormatOverride } from "./format.types";

// ---------- Constants ----------

export const FORMAT_DURATION_MIN = 180;    // below this → force fiche_dynamique
export const FORMAT_DURATION_MAX = 600;    // above this → needs split
export const FORMAT_MIN_QUALITY = 0.55;    // below this → force fiche_dynamique
export const FORMAT_MIN_CONCEPTS_NARRATIVE = 5; // need at least 5 concepts for histoire_animee

// ---------- Zod Schemas ----------

export const m4InputSchema = z.object({
  architecture_id: z.string(),
  course_profile_id: z.string(),
  document_id: z.string(),
  total_concepts: z.number().int().min(0),
  critical_count: z.number().int().min(0),
  segment_count: z.number().int().min(0),
  total_duration_sec: z.number().min(0),
  needs_splitting: z.boolean(),
  reasoning_type: z.enum(["declaratif", "procedural", "conditionnel", "causal", "metacognitif"]),
  density: z.enum(["low", "medium", "high"]),
  estimated_complexity: z.number().int().min(1).max(10),
  structure_type: z.enum(["prose", "bullets", "table", "mixed", "minimal"]),
  quality_score: z.number().min(0).max(1),
  objective: z.enum(["discovery", "revision", "exam", "consolidation"]),
});

export const m4OutputSchema = z.object({
  decision_id: z.string(),
  architecture_id: z.string(),
  chosen_format: z.enum(["fiche_dynamique", "histoire_animee"]),
  justification: z.string(),
  matrix_reasoning: z.string(),
  estimated_duration_sec: z.number().min(0),
  needs_split: z.boolean(),
  split_count: z.number().int().min(1).optional(),
  modules: z.array(z.object({
    module_index: z.number().int().min(0),
    concept_keys: z.array(z.string()),
    chosen_format: z.enum(["fiche_dynamique", "histoire_animee"]),
    estimated_duration_sec: z.number().min(0),
    justification: z.string(),
  })).optional(),
  overrides_applied: z.array(z.object({
    reason: z.enum([
      "duration_too_short",
      "duration_too_long",
      "low_quality",
      "too_few_concepts",
      "user_preference",
      "insufficient_structure",
    ]),
    original_format: z.enum(["fiche_dynamique", "histoire_animee"]),
    forced_format: z.enum(["fiche_dynamique", "histoire_animee"]),
    message: z.string(),
  })),
  cost_level: z.enum(["low", "medium", "high"]),
  decision_trace: z.object({
    reasoning_type: z.enum(["declaratif", "procedural", "conditionnel", "causal", "metacognitif"]),
    objective: z.enum(["discovery", "revision", "exam", "consolidation"]),
    matrix_result: z.enum(["fiche_dynamique", "histoire_animee"]),
    overrides_checked: z.array(z.string()),
    final_format: z.enum(["fiche_dynamique", "histoire_animee"]),
  }),
});

// ---------- Deterministic Format Decision Matrix ----------

/**
 * The M4 decision matrix. Format is chosen DETERMINISTICALLY based on
 * reasoning_type + objective. Overrides are applied AFTER.
 *
 * Matrix rules:
 * - declaratif → always fiche_dynamique
 * - causal + (discovery|exam) → histoire_animee
 * - causal + (revision|consolidation) → fiche_dynamique
 * - procedural + (discovery|exam) → histoire_animee
 * - procedural + (revision|consolidation) → fiche_dynamique
 * - conditionnel → always histoire_animee
 * - metacognitif → always histoire_animee
 */
export function getMatrixFormat(
  reasoningType: ReasoningType,
  objective: LearningObjective
): ChosenFormat {
  switch (reasoningType) {
    case "declaratif":
      return "fiche_dynamique";

    case "causal":
    case "procedural":
      if (objective === "discovery" || objective === "exam") {
        return "histoire_animee";
      }
      return "fiche_dynamique";

    case "conditionnel":
    case "metacognitif":
      return "histoire_animee";
  }
}

// ---------- Override Checks ----------

/**
 * Check all override conditions and return any that apply.
 * Overrides can FORCE a format change regardless of matrix decision.
 */
export function checkOverrides(
  input: M4_Input,
  matrixFormat: ChosenFormat
): FormatOverride[] {
  const overrides: FormatOverride[] = [];

  // Override 1: Duration too short → force fiche_dynamique
  if (input.total_duration_sec < FORMAT_DURATION_MIN && matrixFormat === "histoire_animee") {
    overrides.push({
      reason: "duration_too_short",
      original_format: matrixFormat,
      forced_format: "fiche_dynamique",
      message: `Durée estimée (${input.total_duration_sec}s) trop courte pour une histoire animée (min ${FORMAT_DURATION_MIN}s)`,
    });
  }

  // Override 2: Low quality → force fiche_dynamique
  if (input.quality_score < FORMAT_MIN_QUALITY && matrixFormat === "histoire_animee") {
    overrides.push({
      reason: "low_quality",
      original_format: matrixFormat,
      forced_format: "fiche_dynamique",
      message: `Qualité source (${(input.quality_score * 100).toFixed(0)}%) insuffisante pour histoire animée (min ${FORMAT_MIN_QUALITY * 100}%)`,
    });
  }

  // Override 3: Too few concepts → force fiche_dynamique
  if (input.total_concepts < FORMAT_MIN_CONCEPTS_NARRATIVE && matrixFormat === "histoire_animee") {
    overrides.push({
      reason: "too_few_concepts",
      original_format: matrixFormat,
      forced_format: "fiche_dynamique",
      message: `Seulement ${input.total_concepts} concepts (min ${FORMAT_MIN_CONCEPTS_NARRATIVE} pour histoire animée)`,
    });
  }

  // Override 4: Minimal structure → force fiche_dynamique
  if (input.structure_type === "minimal" && matrixFormat === "histoire_animee") {
    overrides.push({
      reason: "insufficient_structure",
      original_format: matrixFormat,
      forced_format: "fiche_dynamique",
      message: "Structure minimale détectée — insuffisante pour construire une histoire animée",
    });
  }

  return overrides;
}

/**
 * Apply overrides to determine the final format.
 * If any override forces fiche_dynamique, that wins.
 */
export function applyOverrides(
  matrixFormat: ChosenFormat,
  overrides: FormatOverride[]
): ChosenFormat {
  if (overrides.length === 0) return matrixFormat;
  // Any override forces fiche_dynamique
  return overrides.some(o => o.forced_format === "fiche_dynamique")
    ? "fiche_dynamique"
    : matrixFormat;
}

// ---------- Full M4 Validation ----------

export interface M4ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateM4Output(output: M4_Output): M4ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Duration > 600 without split
  if (output.estimated_duration_sec > FORMAT_DURATION_MAX && !output.needs_split) {
    errors.push(
      `Duration ${output.estimated_duration_sec}s exceeds ${FORMAT_DURATION_MAX}s without splitting`
    );
  }

  // Split declared but no modules
  if (output.needs_split && (!output.modules || output.modules.length === 0)) {
    errors.push("Split declared but no modules provided");
  }

  // Trace consistency
  if (output.decision_trace.final_format !== output.chosen_format) {
    errors.push(
      `Decision trace final_format (${output.decision_trace.final_format}) doesn't match chosen_format (${output.chosen_format})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
