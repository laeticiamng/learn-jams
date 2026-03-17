// ============================================================
// Edge Function: cognitio-format-selector (M4)
// Deterministic format selection based on matrix + overrides
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FORMAT_DURATION_MIN = 180;
const FORMAT_DURATION_MAX = 600;
const FORMAT_MIN_QUALITY = 0.55;
const FORMAT_MIN_CONCEPTS_NARRATIVE = 5;

// ---------- Types ----------

interface FormatSelectorRequest {
  architecture_id: string;
  course_profile_id: string;
  document_id: string;
  total_concepts: number;
  critical_count: number;
  segment_count: number;
  total_duration_sec: number;
  needs_splitting: boolean;
  split_modules?: SplitModule[];
  reasoning_type: string;
  density: string;
  estimated_complexity: number;
  structure_type: string;
  quality_score: number;
  objective: string;
}

interface SplitModule {
  module_index: number;
  segment_indices: number[];
  concept_keys: string[];
  estimated_duration_sec: number;
  title_suggestion: string;
}

interface FormatOverride {
  reason: string;
  original_format: string;
  forced_format: string;
  message: string;
}

// ---------- Main ----------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const input: FormatSelectorRequest = await req.json();
    const startTime = Date.now();

    // Auth
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log start
    await logOps(supabase, "format_selector_started", "info", input.document_id, user.id, {
      reasoning_type: input.reasoning_type,
      objective: input.objective,
      total_concepts: input.total_concepts,
      quality_score: input.quality_score,
    });

    // Run deterministic matrix
    const matrixResult = getMatrixFormat(input.reasoning_type, input.objective);

    // Check overrides
    const overrides = checkOverrides(input, matrixResult);
    const finalFormat = overrides.some(o => o.forced_format === "fiche_dynamique")
      ? "fiche_dynamique"
      : matrixResult;

    // Build result
    const needsSplit = input.total_duration_sec > FORMAT_DURATION_MAX;
    const splitCount = needsSplit ? Math.ceil(input.total_duration_sec / FORMAT_DURATION_MAX) : undefined;

    let modules;
    if (needsSplit && input.split_modules) {
      modules = input.split_modules.map((m, i) => ({
        module_index: m.module_index,
        concept_keys: m.concept_keys,
        chosen_format: finalFormat,
        estimated_duration_sec: m.estimated_duration_sec,
        justification: `Module ${i + 1}: ${finalFormat}`,
      }));
    }

    const costLevel = finalFormat === "fiche_dynamique" ? "low"
      : needsSplit ? "high"
      : input.total_duration_sec > 400 ? "high"
      : "medium";

    const result = {
      decision_id: crypto.randomUUID(),
      architecture_id: input.architecture_id,
      chosen_format: finalFormat,
      justification: overrides.length > 0
        ? `Matrice: ${matrixResult}. Override: ${overrides.map(o => o.message).join(". ")}. Final: ${finalFormat}.`
        : `[${input.reasoning_type}][${input.objective}] → ${finalFormat}`,
      matrix_reasoning: `Cellule [${input.reasoning_type}][${input.objective}] → ${matrixResult}`,
      estimated_duration_sec: input.total_duration_sec,
      needs_split: needsSplit,
      split_count: splitCount,
      modules,
      overrides_applied: overrides,
      cost_level: costLevel,
      decision_trace: {
        reasoning_type: input.reasoning_type,
        objective: input.objective,
        matrix_result: matrixResult,
        overrides_checked: ["duration_too_short", "low_quality", "too_few_concepts", "insufficient_structure"],
        final_format: finalFormat,
      },
    };

    // Persist
    const { error: insertError } = await supabase
      .from("format_decisions")
      .insert([{
        id: result.decision_id,
        architecture_id: input.architecture_id,
        document_id: input.document_id,
        course_profile_id: input.course_profile_id,
        user_id: user.id,
        chosen_format: result.chosen_format,
        justification: result.justification,
        matrix_reasoning: result.matrix_reasoning,
        estimated_duration_sec: result.estimated_duration_sec,
        needs_split: result.needs_split,
        split_count: result.split_count ?? null,
        modules_json: result.modules ?? null,
        overrides_applied_json: result.overrides_applied,
        cost_level: result.cost_level,
        decision_trace_json: result.decision_trace,
      }]);

    if (insertError) {
      console.error("DB insert error:", insertError);
    }

    const latency = Date.now() - startTime;
    await logOps(supabase, "format_selector_completed", "info", input.document_id, user.id, {
      decision_id: result.decision_id,
      chosen_format: result.chosen_format,
      overrides_count: overrides.length,
      needs_split: result.needs_split,
      latency_ms: latency,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Format selector error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---------- Matrix ----------

function getMatrixFormat(reasoningType: string, objective: string): string {
  switch (reasoningType) {
    case "declaratif":
      return "fiche_dynamique";
    case "causal":
    case "procedural":
      return (objective === "discovery" || objective === "exam") ? "histoire_animee" : "fiche_dynamique";
    case "conditionnel":
    case "metacognitif":
      return "histoire_animee";
    default:
      return "fiche_dynamique";
  }
}

// ---------- Overrides ----------

function checkOverrides(input: FormatSelectorRequest, matrixFormat: string): FormatOverride[] {
  const overrides: FormatOverride[] = [];

  if (input.total_duration_sec < FORMAT_DURATION_MIN && matrixFormat === "histoire_animee") {
    overrides.push({
      reason: "duration_too_short",
      original_format: matrixFormat,
      forced_format: "fiche_dynamique",
      message: `Durée ${input.total_duration_sec}s < ${FORMAT_DURATION_MIN}s`,
    });
  }

  if (input.quality_score < FORMAT_MIN_QUALITY && matrixFormat === "histoire_animee") {
    overrides.push({
      reason: "low_quality",
      original_format: matrixFormat,
      forced_format: "fiche_dynamique",
      message: `Qualité ${(input.quality_score * 100).toFixed(0)}% < ${FORMAT_MIN_QUALITY * 100}%`,
    });
  }

  if (input.total_concepts < FORMAT_MIN_CONCEPTS_NARRATIVE && matrixFormat === "histoire_animee") {
    overrides.push({
      reason: "too_few_concepts",
      original_format: matrixFormat,
      forced_format: "fiche_dynamique",
      message: `${input.total_concepts} concepts < ${FORMAT_MIN_CONCEPTS_NARRATIVE}`,
    });
  }

  if (input.structure_type === "minimal" && matrixFormat === "histoire_animee") {
    overrides.push({
      reason: "insufficient_structure",
      original_format: matrixFormat,
      forced_format: "fiche_dynamique",
      message: "Structure minimale",
    });
  }

  return overrides;
}

// ---------- Ops ----------

async function logOps(supabase: any, eventType: string, severity: string, documentId: string, userId: string, payload: any) {
  try {
    await supabase.from("ops_events").insert([{
      event_type: eventType,
      severity,
      document_id: documentId,
      user_id: userId,
      payload_json: payload,
    }]);
  } catch (e) {
    console.error("Ops log failed:", e);
  }
}
