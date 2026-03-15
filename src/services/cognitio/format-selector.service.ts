// ============================================================
// COGNITIO Format Selector Service — M4
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { M4_Input, M4_Output } from "@/domain/cognitio/format.contracts";
import type { FormatDecisionModule, FormatOverride, CostLevel } from "@/domain/cognitio/format.types";
import type { ChosenFormat } from "@/domain/cognitio/types";
import {
  getMatrixFormat,
  checkOverrides,
  applyOverrides,
  FORMAT_DURATION_MAX,
} from "@/domain/cognitio/format.validators";

// Keep backward compat
import type { FormatSelectorInput, FormatSelectorOutput } from "@/domain/cognitio/contracts";

// ---------- Edge Function Call ----------

export async function runFormatSelector(input: M4_Input): Promise<M4_Output> {
  try {
    const { data, error } = await supabase.functions.invoke("cognitio-format-selector", {
      body: input,
    });
    if (error) throw error;
    return data as M4_Output;
  } catch {
    // Fallback to local
    return selectFormatLocally(input);
  }
}

// ---------- Local Format Selector (Deterministic Matrix) ----------

export function selectFormatLocally(input: M4_Input): M4_Output {
  const { reasoning_type, objective, total_duration_sec, needs_splitting, split_modules } = input;

  // Step 1: Get matrix recommendation
  const matrixResult = getMatrixFormat(reasoning_type, objective);

  // Step 2: Check overrides
  const overrides = checkOverrides(input, matrixResult);
  const overridesChecked = [
    "duration_too_short",
    "low_quality",
    "too_few_concepts",
    "insufficient_structure",
  ];

  // Step 3: Apply overrides
  const finalFormat = applyOverrides(matrixResult, overrides);

  // Step 4: Build justification
  const justification = buildJustification(matrixResult, finalFormat, overrides, reasoning_type, objective);
  const matrixReasoning = buildMatrixReasoning(reasoning_type, objective, matrixResult);

  // Step 5: Handle splitting
  const needsSplit = total_duration_sec > FORMAT_DURATION_MAX;
  const splitCount = needsSplit ? Math.ceil(total_duration_sec / FORMAT_DURATION_MAX) : undefined;

  // Step 6: Build modules if splitting
  let modules: FormatDecisionModule[] | undefined;
  if (needsSplit && split_modules) {
    modules = split_modules.map((m, i) => ({
      module_index: m.module_index,
      concept_keys: m.concept_keys,
      chosen_format: finalFormat,
      estimated_duration_sec: m.estimated_duration_sec,
      justification: `Module ${i + 1}: ${finalFormat} — même format pour cohérence pédagogique`,
    }));
  }

  // Step 7: Determine cost level
  const costLevel = getCostLevel(finalFormat, total_duration_sec, needsSplit);

  return {
    decision_id: crypto.randomUUID(),
    architecture_id: input.architecture_id,
    chosen_format: finalFormat,
    justification,
    matrix_reasoning: matrixReasoning,
    estimated_duration_sec: total_duration_sec,
    needs_split: needsSplit,
    split_count: splitCount,
    modules,
    overrides_applied: overrides,
    cost_level: costLevel,
    decision_trace: {
      reasoning_type,
      objective,
      matrix_result: matrixResult,
      overrides_checked: overridesChecked,
      final_format: finalFormat,
    },
  };
}

// ---------- Legacy adapter ----------

export function selectFormatLegacy(input: FormatSelectorInput): FormatSelectorOutput {
  // Map legacy input to M4 input
  const m4Input: M4_Input = {
    architecture_id: "",
    course_profile_id: input.course_profile_id,
    document_id: "",
    total_concepts: input.total_concepts,
    critical_count: input.critical_count,
    segment_count: 1,
    total_duration_sec: input.total_concepts * 30,
    needs_splitting: false,
    reasoning_type: mapKnowledgeTypeToReasoning(input.knowledge_type),
    density: "medium",
    estimated_complexity: input.estimated_complexity,
    structure_type: "prose",
    quality_score: input.quality_score,
    objective: input.objective,
  };

  const result = selectFormatLocally(m4Input);

  return {
    chosen_format: result.chosen_format,
    justification: result.justification,
    estimated_duration_sec: result.estimated_duration_sec,
    cost_level: result.cost_level,
    needs_split: result.needs_split,
    split_count: result.split_count,
  };
}

// ---------- Helpers ----------

function buildJustification(
  matrixResult: ChosenFormat,
  finalFormat: ChosenFormat,
  overrides: FormatOverride[],
  reasoningType: string,
  objective: string
): string {
  if (overrides.length > 0) {
    const overrideReasons = overrides.map(o => o.message).join(". ");
    return `Matrice: ${matrixResult} (${reasoningType} × ${objective}). Override appliqué: ${overrideReasons}. Format final: ${finalFormat}.`;
  }
  return `Le type de raisonnement "${reasoningType}" combiné à l'objectif "${objective}" indique le format ${finalFormat}.`;
}

function buildMatrixReasoning(
  reasoningType: string,
  objective: string,
  result: ChosenFormat
): string {
  return `Cellule matrice [${reasoningType}][${objective}] → ${result}`;
}

function getCostLevel(format: ChosenFormat, duration: number, needsSplit: boolean): CostLevel {
  if (format === "fiche_dynamique") return "low";
  if (needsSplit) return "high";
  if (duration > 400) return "high";
  return "medium";
}

function mapKnowledgeTypeToReasoning(kt: string): M4_Input["reasoning_type"] {
  switch (kt) {
    case "procedural": return "procedural";
    case "metacognitive": return "metacognitif";
    case "conceptual": return "declaratif";
    case "factual": return "declaratif";
    default: return "declaratif";
  }
}

// ---------- Persistence ----------

export async function persistFormatDecision(
  output: M4_Output,
  documentId: string,
  courseProfileId: string,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("format_decisions")
    .insert({
      id: output.decision_id,
      architecture_id: output.architecture_id,
      document_id: documentId,
      course_profile_id: courseProfileId,
      user_id: userId,
      chosen_format: output.chosen_format,
      justification: output.justification,
      matrix_reasoning: output.matrix_reasoning,
      estimated_duration_sec: output.estimated_duration_sec,
      needs_split: output.needs_split,
      split_count: output.split_count ?? null,
      modules_json: (output.modules ?? null) as unknown as Json,
      overrides_applied_json: output.overrides_applied as unknown as Json,
      cost_level: output.cost_level,
      decision_trace_json: output.decision_trace as unknown as Json,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to persist format decision: ${error.message}`);
  return data.id;
}

export async function getFormatDecision(architectureId: string): Promise<M4_Output | null> {
  const { data, error } = await supabase
    .from("format_decisions")
    .select("*")
    .eq("architecture_id", architectureId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    decision_id: data.id,
    architecture_id: data.architecture_id,
    chosen_format: data.chosen_format as unknown as ChosenFormat,
    justification: data.justification,
    matrix_reasoning: data.matrix_reasoning,
    estimated_duration_sec: data.estimated_duration_sec,
    needs_split: data.needs_split,
    split_count: data.split_count ?? undefined,
    modules: data.modules_json as unknown as FormatDecisionModule[] | undefined,
    overrides_applied: data.overrides_applied_json as unknown as FormatOverride[],
    cost_level: data.cost_level as unknown as CostLevel,
    decision_trace: data.decision_trace_json as unknown as M4_Output["decision_trace"],
  };
}
