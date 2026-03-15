// ============================================================
// Margin Calculator — Margin reports + alerts
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { PlanKey, MarginReport } from "@/domain/billing/pricing.types";
import { MARGIN_TARGETS } from "@/domain/billing/pricing.types";
import { getCostSummary } from "./costTracker.service";

// ---------- Compute margin for a period ----------

export async function computeMarginReport(
  periodKey: string,
  planKey: PlanKey,
  revenueUsd: number,
): Promise<MarginReport> {
  const costSummary = await getCostSummary(periodKey);
  const totalCost = costSummary.reduce((s, c) => s + (c.total_actual || c.total_estimated), 0);
  const margin = revenueUsd - totalCost;
  const marginPct = revenueUsd > 0 ? margin / revenueUsd : 0;

  const report: MarginReport = {
    id: crypto.randomUUID(),
    period_key: periodKey,
    plan_key: planKey,
    revenue_total_usd: revenueUsd,
    provider_cost_total_usd: totalCost,
    gross_margin_usd: margin,
    gross_margin_pct: marginPct,
    created_at: new Date().toISOString(),
  };

  await (supabase as any).from("margin_reports").upsert(report, { onConflict: "period_key,plan_key" });
  return report;
}

// ---------- Check margin alerts ----------

export interface MarginAlert {
  plan_key: PlanKey;
  target_pct: number;
  actual_pct: number;
  severity: "warning" | "critical";
  message: string;
}

export function evaluateMarginAlerts(reports: MarginReport[]): MarginAlert[] {
  const alerts: MarginAlert[] = [];

  for (const report of reports) {
    const plan = report.plan_key as PlanKey;
    const target = MARGIN_TARGETS[plan];
    if (!target || target === 0) continue;

    if (report.gross_margin_pct < target) {
      const severity = report.gross_margin_pct < target - 0.15 ? "critical" : "warning";
      alerts.push({
        plan_key: plan,
        target_pct: target,
        actual_pct: report.gross_margin_pct,
        severity,
        message: `${plan}: margin ${(report.gross_margin_pct * 100).toFixed(1)}% below target ${(target * 100).toFixed(0)}%`,
      });
    }
  }

  return alerts;
}

// ---------- Get latest margin reports ----------

export async function getLatestMarginReports(): Promise<MarginReport[]> {
  const { data } = await (supabase as any)
    .from("margin_reports")
    .select("*")
    .neq("period_key", "config")
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []) as MarginReport[];
}

// ---------- Anomaly thresholds ----------

export const ANOMALY_THRESHOLDS = {
  minimum_gross_margin_pct_target: 0.70,
  feature_cost_alert_threshold_usd: 5.0,
  user_cost_anomaly_threshold_usd: 50.0,
} as const;
