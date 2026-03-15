// ============================================================
// Dashboard Aggregation Service — Internal metrics
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { ProductEventName } from "@/domain/product/events.types";

// ---------- Product Dashboard ----------

export interface FunnelMetrics {
  landing_views: number;
  onboarding_started: number;
  onboarding_completed: number;
  upload_started: number;
  transformation_generated: number;
  final_test_completed: number;
  debrief_viewed: number;
  review_queue_viewed: number;
}

export async function getFunnelMetrics(since: string): Promise<FunnelMetrics> {
  const { data } = await supabase
    .from("product_events")
    .select("event_name")
    .gte("created_at", since);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const name = row.event_name as string;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return {
    landing_views: counts.get("landing_viewed") ?? 0,
    onboarding_started: counts.get("onboarding_started") ?? 0,
    onboarding_completed: counts.get("onboarding_completed") ?? 0,
    upload_started: counts.get("upload_started") ?? 0,
    transformation_generated: counts.get("transformation_generated") ?? 0,
    final_test_completed: counts.get("final_test_completed") ?? 0,
    debrief_viewed: counts.get("debrief_viewed") ?? 0,
    review_queue_viewed: counts.get("review_queue_viewed") ?? 0,
  };
}

// ---------- Pedagogical Dashboard ----------

export interface PedagogicalMetrics {
  avg_raw_score: number | null;
  avg_composite_score: number | null;
  avg_calibration_gap: number | null;
  total_recall_tests: number;
  j1_completion_rate: number | null;
  j7_completion_rate: number | null;
  format_effectiveness: Array<{ format: string; avg_retention: number; count: number }>;
}

export async function getPedagogicalMetrics(since: string): Promise<PedagogicalMetrics> {
  // Recall test events
  const { data: events } = await supabase
    .from("product_events")
    .select("event_name, metadata_json")
    .in("event_name", ["final_test_completed", "j1_retest_completed", "j7_retest_completed"])
    .gte("created_at", since);

  const rows = (events ?? []) as Record<string, unknown>[];
  const finals = rows.filter((r) => r.event_name === "final_test_completed");
  const j1s = rows.filter((r) => r.event_name === "j1_retest_completed");
  const j7s = rows.filter((r) => r.event_name === "j7_retest_completed");

  const extractScore = (r: Record<string, unknown>, key: string): number | null => {
    const meta = r.metadata_json as Record<string, unknown> | null;
    if (!meta) return null;
    const val = meta[key];
    return typeof val === "number" ? val : null;
  };

  const avgOf = (arr: (number | null)[]): number | null => {
    const valid = arr.filter((v): v is number => v !== null);
    return valid.length > 0 ? valid.reduce((s, v) => s + v, 0) / valid.length : null;
  };

  const rawScores = finals.map((r) => extractScore(r, "raw_score"));
  const compositeScores = finals.map((r) => extractScore(r, "composite_score"));
  const calGaps = finals.map((r) => extractScore(r, "calibration_gap"));

  // Format effectiveness from learner_format_effectiveness
  const { data: formatData } = await supabase
    .from("learner_format_effectiveness")
    .select("format, retention_signal");

  const formatMap = new Map<string, { total: number; count: number }>();
  for (const row of (formatData ?? []) as Record<string, unknown>[]) {
    const f = row.format as string;
    const existing = formatMap.get(f) ?? { total: 0, count: 0 };
    existing.total += (row.retention_signal as number) ?? 0;
    existing.count += 1;
    formatMap.set(f, existing);
  }

  return {
    avg_raw_score: avgOf(rawScores),
    avg_composite_score: avgOf(compositeScores),
    avg_calibration_gap: avgOf(calGaps),
    total_recall_tests: finals.length,
    j1_completion_rate: finals.length > 0 ? j1s.length / finals.length : null,
    j7_completion_rate: finals.length > 0 ? j7s.length / finals.length : null,
    format_effectiveness: [...formatMap.entries()].map(([format, d]) => ({
      format,
      avg_retention: d.count > 0 ? d.total / d.count : 0,
      count: d.count,
    })),
  };
}

// ---------- Ops Dashboard ----------

export interface OpsMetrics {
  qa_pass: number;
  qa_warn: number;
  qa_block: number;
  qa_block_rate: number;
  error_count: number;
  total_transformations: number;
  seed_transformations_started: number;
}

export async function getOpsMetrics(since: string): Promise<OpsMetrics> {
  const { data } = await supabase
    .from("product_events")
    .select("event_name")
    .in("event_name", ["qa_pass", "qa_warn", "qa_block", "error_occurred", "transformation_generated", "seed_transformation_started"])
    .gte("created_at", since);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const name = row.event_name as string;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const qaTotal = (counts.get("qa_pass") ?? 0) + (counts.get("qa_warn") ?? 0) + (counts.get("qa_block") ?? 0);

  return {
    qa_pass: counts.get("qa_pass") ?? 0,
    qa_warn: counts.get("qa_warn") ?? 0,
    qa_block: counts.get("qa_block") ?? 0,
    qa_block_rate: qaTotal > 0 ? (counts.get("qa_block") ?? 0) / qaTotal : 0,
    error_count: counts.get("error_occurred") ?? 0,
    total_transformations: counts.get("transformation_generated") ?? 0,
    seed_transformations_started: counts.get("seed_transformation_started") ?? 0,
  };
}

// ---------- Alerts ----------

export interface Alert {
  key: string;
  severity: "warning" | "critical";
  message: string;
}

export function evaluateAlerts(ops: OpsMetrics, ped: PedagogicalMetrics): Alert[] {
  const alerts: Alert[] = [];

  if (ops.qa_block_rate > 0.2) {
    alerts.push({ key: "qa_block_high", severity: "critical", message: `Taux QA block élevé : ${(ops.qa_block_rate * 100).toFixed(0)}%` });
  }

  if (ops.error_count > 10) {
    alerts.push({ key: "errors_high", severity: "warning", message: `${ops.error_count} erreurs détectées` });
  }

  if (ped.avg_calibration_gap !== null && Math.abs(ped.avg_calibration_gap) > 0.3) {
    alerts.push({ key: "calibration_drift", severity: "warning", message: `Écart de calibration moyen élevé : ${(ped.avg_calibration_gap * 100).toFixed(0)}%` });
  }

  if (ped.j1_completion_rate !== null && ped.j1_completion_rate < 0.1) {
    alerts.push({ key: "j1_retention_low", severity: "warning", message: `Taux de rétention J+1 très bas : ${(ped.j1_completion_rate * 100).toFixed(0)}%` });
  }

  return alerts;
}
