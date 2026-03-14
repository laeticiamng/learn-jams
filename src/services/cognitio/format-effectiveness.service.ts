// ============================================================
// COGNITIO M8 Format Effectiveness — Track what works per user
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { FormatEffectivenessRecord, BestFormat } from "@/domain/cognitio/longitudinal.types";
import type { LearningObjective } from "@/domain/cognitio/types";

// ---------- Update Format Effectiveness ----------

export function computeUpdatedFormatRecord(
  existing: FormatEffectivenessRecord | null,
  rawScore: number,
  compositeScore: number,
  calibrationGap: number,
): Partial<FormatEffectivenessRecord> {
  const prevCount = existing?.attempts_count ?? 0;
  const newCount = prevCount + 1;

  // Running averages
  const avgRaw = runningAvg(existing?.avg_raw_score ?? null, prevCount, rawScore);
  const avgComposite = runningAvg(existing?.avg_composite_score ?? null, prevCount, compositeScore);
  const avgCalGap = runningAvg(existing?.avg_calibration_gap ?? null, prevCount, calibrationGap);

  // Retention signal: composite weighted by calibration quality
  const calQuality = 1 - Math.abs(avgCalGap);
  const retentionSignal = avgComposite * calQuality;

  return {
    attempts_count: newCount,
    avg_raw_score: avgRaw,
    avg_composite_score: avgComposite,
    avg_calibration_gap: avgCalGap,
    retention_signal: retentionSignal,
  };
}

// ---------- Determine Best Format ----------

export function determineBestFormat(
  records: FormatEffectivenessRecord[],
): BestFormat {
  if (records.length === 0) return "unknown";

  // Need at least 2 attempts to have confidence
  const qualified = records.filter((r) => r.attempts_count >= 2 && r.retention_signal !== null);
  if (qualified.length === 0) return "unknown";

  const best = qualified.sort((a, b) => (b.retention_signal ?? 0) - (a.retention_signal ?? 0))[0];
  return best.format as BestFormat;
}

// ---------- Persistence ----------

export async function upsertFormatEffectiveness(
  userId: string,
  format: string,
  objective: LearningObjective,
  audienceLevel: string | null,
  rawScore: number,
  compositeScore: number,
  calibrationGap: number,
): Promise<FormatEffectivenessRecord> {
  // Fetch existing
  const { data: existing } = await supabase
    .from("learner_format_effectiveness")
    .select("*")
    .eq("user_id", userId)
    .eq("format", format)
    .eq("objective", objective)
    .maybeSingle();

  const updates = computeUpdatedFormatRecord(
    existing as unknown as FormatEffectivenessRecord | null,
    rawScore,
    compositeScore,
    calibrationGap,
  );

  if (existing) {
    const { data, error } = await supabase
      .from("learner_format_effectiveness")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", (existing as Record<string, unknown>).id)
      .select("*")
      .single();
    if (error) throw new Error(`Format effectiveness update failed: ${error.message}`);
    return data as unknown as FormatEffectivenessRecord;
  } else {
    const { data, error } = await supabase
      .from("learner_format_effectiveness")
      .insert({
        user_id: userId,
        format,
        objective,
        audience_level: audienceLevel,
        ...updates,
      })
      .select("*")
      .single();
    if (error) throw new Error(`Format effectiveness insert failed: ${error.message}`);
    return data as unknown as FormatEffectivenessRecord;
  }
}

export async function getFormatEffectiveness(userId: string): Promise<FormatEffectivenessRecord[]> {
  const { data, error } = await supabase
    .from("learner_format_effectiveness")
    .select("*")
    .eq("user_id", userId)
    .order("retention_signal", { ascending: false });

  if (error) return [];
  return (data ?? []) as unknown as FormatEffectivenessRecord[];
}

// ---------- Helpers ----------

function runningAvg(current: number | null, count: number, newValue: number): number {
  if (current === null || count === 0) return newValue;
  return (current * count + newValue) / (count + 1);
}
