// ============================================================
// COGNITIO Format Selector Validators — M4
// User intent priority: user choice > feasibility > system heuristic
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
export const FORMAT_MIN_CONCEPTS_MISSION = 3;   // mission light needs at least 3 concepts
export const FORMAT_MIN_QUALITY_MISSION = 0.40;  // lower threshold for mission light

// ---------- Zod Schemas ----------

const chosenFormatEnum = z.enum(["fiche_dynamique", "histoire_animee", "mission_interactive"]);

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
  user_selected_format: chosenFormatEnum.optional(),
});

export const m4OutputSchema = z.object({
  decision_id: z.string(),
  architecture_id: z.string(),
  chosen_format: chosenFormatEnum,
  justification: z.string(),
  matrix_reasoning: z.string(),
  estimated_duration_sec: z.number().min(0),
  needs_split: z.boolean(),
  split_count: z.number().int().min(1).optional(),
  modules: z.array(z.object({
    module_index: z.number().int().min(0),
    concept_keys: z.array(z.string()),
    chosen_format: chosenFormatEnum,
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
    original_format: chosenFormatEnum,
    forced_format: chosenFormatEnum,
    message: z.string(),
  })),
  cost_level: z.enum(["low", "medium", "high"]),
  user_selected_format: chosenFormatEnum.optional(),
  system_recommended_format: chosenFormatEnum,
  fallback_candidates: z.array(chosenFormatEnum),
  override_reason: z.string().optional(),
  override_requires_confirmation: z.boolean(),
  decision_trace: z.object({
    reasoning_type: z.enum(["declaratif", "procedural", "conditionnel", "causal", "metacognitif"]),
    objective: z.enum(["discovery", "revision", "exam", "consolidation"]),
    matrix_result: chosenFormatEnum,
    overrides_checked: z.array(z.string()),
    final_format: chosenFormatEnum,
    user_intent_respected: z.boolean(),
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

// ---------- Feasibility Assessment ----------

/**
 * Feasibility result for a specific format given the document characteristics.
 * feasible=true means the format CAN be generated (possibly in degraded mode).
 */
export interface FormatFeasibility {
  format: ChosenFormat;
  feasible: boolean;
  degraded: boolean;          // true if only a lighter version is possible
  degraded_label?: string;    // e.g. "mission light", "histoire guidée"
  blocking_reasons: string[];
  warnings: string[];
}

/**
 * Assess feasibility of a format for the given document input.
 * Less aggressive than before — allows degraded versions.
 */
export function assessFormatFeasibility(
  format: ChosenFormat,
  input: M4_Input,
): FormatFeasibility {
  const blocking: string[] = [];
  const warnings: string[] = [];

  if (format === "histoire_animee") {
    // Hard block: absolutely no content
    if (input.total_concepts < 2) {
      blocking.push(`Seulement ${input.total_concepts} concept(s) — minimum 2 requis pour une histoire animée.`);
    }
    // Soft warnings (degraded but still feasible)
    if (input.total_concepts < FORMAT_MIN_CONCEPTS_NARRATIVE) {
      warnings.push(`${input.total_concepts} concepts — une histoire guidée simplifiée sera générée (min ${FORMAT_MIN_CONCEPTS_NARRATIVE} pour version complète).`);
    }
    if (input.quality_score < FORMAT_MIN_QUALITY) {
      warnings.push(`Qualité source (${Math.round(input.quality_score * 100)}%) faible — l'histoire s'appuiera sur les concepts les plus fiables.`);
    }
    if (input.structure_type === "minimal") {
      warnings.push("Structure minimale — une histoire guidée simplifiée sera générée.");
    }
    if (input.total_duration_sec < FORMAT_DURATION_MIN) {
      warnings.push(`Durée courte (${input.total_duration_sec}s) — l'histoire sera concise.`);
    }

    const degraded = warnings.length > 0 && blocking.length === 0;
    return {
      format,
      feasible: blocking.length === 0,
      degraded,
      degraded_label: degraded ? "histoire guidée simplifiée" : undefined,
      blocking_reasons: blocking,
      warnings,
    };
  }

  if (format === "mission_interactive") {
    // Hard block: extremely low content
    if (input.total_concepts < 2) {
      blocking.push(`Seulement ${input.total_concepts} concept(s) — minimum 2 requis pour une mission interactive.`);
    }
    if (input.quality_score < 0.25) {
      blocking.push(`Qualité source (${Math.round(input.quality_score * 100)}%) trop faible pour générer une mission.`);
    }
    // Soft warnings
    if (input.total_concepts < FORMAT_MIN_CONCEPTS_MISSION) {
      warnings.push(`${input.total_concepts} concepts — une mission light (2 salles) sera générée.`);
    }
    if (input.quality_score < FORMAT_MIN_QUALITY_MISSION) {
      warnings.push(`Qualité source (${Math.round(input.quality_score * 100)}%) limitée — la mission couvrira les concepts les plus fiables.`);
    }
    if (input.structure_type === "minimal") {
      warnings.push("Structure minimale — une mission light sera générée.");
    }
    if (input.total_duration_sec < FORMAT_DURATION_MIN) {
      warnings.push(`Durée courte — mission réduite (2 salles sans boss).`);
    }

    const degraded = warnings.length > 0 && blocking.length === 0;
    return {
      format,
      feasible: blocking.length === 0,
      degraded,
      degraded_label: degraded ? "mission light" : undefined,
      blocking_reasons: blocking,
      warnings,
    };
  }

  // fiche_dynamique: always feasible
  return {
    format,
    feasible: true,
    degraded: false,
    blocking_reasons: [],
    warnings: input.quality_score < 0.3
      ? ["Qualité source très faible — la fiche sera basée sur les éléments identifiables."]
      : [],
  };
}

// ---------- Override Checks ----------

/**
 * Check all override conditions and return any that apply.
 * IMPORTANT: These overrides are ONLY applied to system-recommended formats.
 * If the user explicitly chose a format, overrides produce WARNINGS, not forces.
 */
export function checkOverrides(
  input: M4_Input,
  matrixFormat: ChosenFormat
): FormatOverride[] {
  const overrides: FormatOverride[] = [];
  const targetFormat = matrixFormat;

  // Override 1: Duration too short → force fiche_dynamique
  if (input.total_duration_sec < FORMAT_DURATION_MIN && targetFormat !== "fiche_dynamique") {
    overrides.push({
      reason: "duration_too_short",
      original_format: targetFormat,
      forced_format: "fiche_dynamique",
      message: `Durée estimée (${input.total_duration_sec}s) trop courte pour ${formatLabel(targetFormat)} (min ${FORMAT_DURATION_MIN}s)`,
    });
  }

  // Override 2: Low quality → force fiche_dynamique
  if (input.quality_score < FORMAT_MIN_QUALITY && targetFormat !== "fiche_dynamique") {
    overrides.push({
      reason: "low_quality",
      original_format: targetFormat,
      forced_format: "fiche_dynamique",
      message: `Qualité source (${(input.quality_score * 100).toFixed(0)}%) insuffisante pour ${formatLabel(targetFormat)} (min ${FORMAT_MIN_QUALITY * 100}%)`,
    });
  }

  // Override 3: Too few concepts → force fiche_dynamique
  if (input.total_concepts < FORMAT_MIN_CONCEPTS_NARRATIVE && targetFormat !== "fiche_dynamique") {
    overrides.push({
      reason: "too_few_concepts",
      original_format: targetFormat,
      forced_format: "fiche_dynamique",
      message: `Seulement ${input.total_concepts} concepts (min ${FORMAT_MIN_CONCEPTS_NARRATIVE} pour ${formatLabel(targetFormat)})`,
    });
  }

  // Override 4: Minimal structure → force fiche_dynamique
  if (input.structure_type === "minimal" && targetFormat !== "fiche_dynamique") {
    overrides.push({
      reason: "insufficient_structure",
      original_format: targetFormat,
      forced_format: "fiche_dynamique",
      message: `Structure minimale détectée — insuffisante pour construire ${formatLabel(targetFormat)}`,
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

/**
 * Resolve the final format respecting user intent priority:
 * 1. User explicit choice
 * 2. Feasibility check
 * 3. If infeasible, explain and propose fallback (but do NOT silently switch)
 * 4. System matrix recommendation as fallback
 */
export function resolveFormatWithUserIntent(
  input: M4_Input,
  matrixFormat: ChosenFormat,
  overrides: FormatOverride[],
): {
  finalFormat: ChosenFormat;
  userIntentRespected: boolean;
  overrideReason?: string;
  overrideRequiresConfirmation: boolean;
  fallbackCandidates: ChosenFormat[];
  systemRecommended: ChosenFormat;
} {
  const systemRecommended = applyOverrides(matrixFormat, overrides);
  const allFormats: ChosenFormat[] = ["fiche_dynamique", "histoire_animee", "mission_interactive"];

  // No user choice → use system recommendation
  if (!input.user_selected_format) {
    return {
      finalFormat: systemRecommended,
      userIntentRespected: true, // no intent to respect
      overrideRequiresConfirmation: false,
      fallbackCandidates: allFormats.filter(f => f !== systemRecommended),
      systemRecommended,
    };
  }

  const userChoice = input.user_selected_format;

  // Check feasibility of user's chosen format
  const feasibility = assessFormatFeasibility(userChoice, input);

  if (feasibility.feasible) {
    // User's choice IS feasible (possibly in degraded mode) → RESPECT IT
    return {
      finalFormat: userChoice,
      userIntentRespected: true,
      overrideReason: feasibility.degraded
        ? `Format demandé généré en version allégée : ${feasibility.degraded_label}. ${feasibility.warnings.join(" ")}`
        : undefined,
      overrideRequiresConfirmation: false,
      fallbackCandidates: allFormats.filter(f => f !== userChoice),
      systemRecommended,
    };
  }

  // User's choice is NOT feasible → explain WHY and propose fallback
  // BUT the system should NOT silently switch. It marks override_requires_confirmation.
  const reason = `Le format « ${formatLabel(userChoice)} » ne peut pas être généré pour ce document : ${feasibility.blocking_reasons.join(" ")}`;
  const candidates = allFormats
    .filter(f => f !== userChoice)
    .filter(f => assessFormatFeasibility(f, input).feasible);

  return {
    finalFormat: candidates.length > 0 ? candidates[0] : "fiche_dynamique",
    userIntentRespected: false,
    overrideReason: reason,
    overrideRequiresConfirmation: true,
    fallbackCandidates: candidates,
    systemRecommended,
  };
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

  // User intent not respected without confirmation flag
  if (!output.decision_trace.user_intent_respected && !output.override_requires_confirmation) {
    warnings.push("User intent was overridden without requiring confirmation");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ---------- Helpers ----------

function formatLabel(format: ChosenFormat): string {
  switch (format) {
    case "fiche_dynamique": return "une fiche dynamique";
    case "histoire_animee": return "une histoire animée";
    case "mission_interactive": return "une mission interactive";
  }
}
