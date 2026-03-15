// ============================================================
// Experiments Service — A/B testing & proof protocol
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type {
  ExperimentAssignment,
  ExperimentVariant,
  ExperimentRun,
  RecordMeasurementInput,
  AssignExperimentInput,
} from "@/domain/product/experiments.types";

const VARIANTS: ExperimentVariant[] = ["control", "baseline_summary", "dynamic_sheet", "animated_story"];

export async function assignExperiment(input: AssignExperimentInput): Promise<ExperimentAssignment> {
  // Check existing assignment
  let query = supabase
    .from("experiment_assignments")
    .select("*")
    .eq("experiment_key", input.experiment_key);

  if (input.user_id) query = query.eq("user_id", input.user_id);
  else if (input.anonymous_id) query = query.eq("anonymous_id", input.anonymous_id);

  const { data: existing } = await query.maybeSingle();
  if (existing) return existing as unknown as ExperimentAssignment;

  // Random assignment
  const variant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];

  const { data, error } = await supabase
    .from("experiment_assignments")
    .insert([{
      user_id: input.user_id ?? '',
      experiment_key: input.experiment_key,
      variant,
    }])
    .select("*")
    .single();

  if (error) throw new Error(`Experiment assignment failed: ${error.message}`);
  return data as unknown as ExperimentAssignment;
}

export async function startExperimentRun(
  assignmentId: string,
  transformationId?: string | null,
): Promise<ExperimentRun> {
  const { data, error } = await supabase
    .from("experiment_runs")
    .insert([{
      assignment_id: assignmentId,
      experiment_key: '',
      transformation_id: transformationId ?? null,
      status: "started",
    }])
    .select("*")
    .single();

  if (error) throw new Error(`Experiment run start failed: ${error.message}`);
  return data as unknown as ExperimentRun;
}

export async function completeExperimentRun(runId: string): Promise<void> {
  await supabase
    .from("experiment_runs")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", runId);
}

export async function recordMeasurement(input: RecordMeasurementInput): Promise<void> {
  const row: Record<string, unknown> = {
    experiment_run_id: input.experiment_run_id,
    experiment_key: (input as Record<string, unknown>).experiment_key ?? '',
    metric_key: input.measure_key ?? '',
    measure_value_numeric: input.value_numeric ?? null,
    measure_value_text: input.value_text ?? null,
  };
  const { error } = await supabase
    .from("experiment_measurements")
    .insert([row] as any);

  if (error) throw new Error(`Measurement recording failed: ${error.message}`);
}

export async function getAssignment(
  experimentKey: string,
  userId?: string | null,
): Promise<ExperimentAssignment | null> {
  let query = supabase
    .from("experiment_assignments")
    .select("*")
    .eq("experiment_key", experimentKey);

  if (userId) query = query.eq("user_id", userId);

  const { data } = await query.maybeSingle();
  return data ? (data as unknown as ExperimentAssignment) : null;
}

/** Deterministic assignment for local-only usage */
export function assignVariantLocally(
  experimentKey: string,
  userId: string,
): ExperimentVariant {
  let hash = 0;
  const seed = userId + experimentKey;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return VARIANTS[Math.abs(hash) % VARIANTS.length];
}
