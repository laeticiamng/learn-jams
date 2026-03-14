import { describe, it, expect } from "vitest";
import { evaluateMarginAlerts, ANOMALY_THRESHOLDS } from "./marginCalculator.service";
import type { MarginReport } from "@/domain/billing/pricing.types";

function makeReport(overrides: Partial<MarginReport> = {}): MarginReport {
  return {
    id: "test-id",
    period_key: "2026-03",
    plan_key: "core",
    revenue_total_usd: 1000,
    provider_cost_total_usd: 300,
    gross_margin_usd: 700,
    gross_margin_pct: 0.70,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("marginCalculator", () => {
  describe("evaluateMarginAlerts", () => {
    it("returns no alerts when margin meets target", () => {
      const reports = [makeReport({ plan_key: "core", gross_margin_pct: 0.75 })];
      expect(evaluateMarginAlerts(reports)).toEqual([]);
    });

    it("returns warning when margin is slightly below target", () => {
      const reports = [makeReport({ plan_key: "core", gross_margin_pct: 0.65 })];
      const alerts = evaluateMarginAlerts(reports);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe("warning");
      expect(alerts[0].plan_key).toBe("core");
    });

    it("returns critical when margin is far below target", () => {
      // core target = 0.70, critical = below 0.55 (target - 0.15)
      const reports = [makeReport({ plan_key: "core", gross_margin_pct: 0.50 })];
      const alerts = evaluateMarginAlerts(reports);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe("critical");
    });

    it("skips free plan (target=0)", () => {
      const reports = [makeReport({ plan_key: "free", gross_margin_pct: -0.5 })];
      expect(evaluateMarginAlerts(reports)).toEqual([]);
    });

    it("handles multiple reports", () => {
      const reports = [
        makeReport({ plan_key: "core", gross_margin_pct: 0.50 }),
        makeReport({ plan_key: "plus", gross_margin_pct: 0.60 }),
        makeReport({ plan_key: "premium_family", gross_margin_pct: 0.80 }),
      ];
      const alerts = evaluateMarginAlerts(reports);
      expect(alerts).toHaveLength(2); // core critical, plus warning
    });
  });

  describe("ANOMALY_THRESHOLDS", () => {
    it("has expected threshold values", () => {
      expect(ANOMALY_THRESHOLDS.minimum_gross_margin_pct_target).toBe(0.70);
      expect(ANOMALY_THRESHOLDS.feature_cost_alert_threshold_usd).toBe(5.0);
      expect(ANOMALY_THRESHOLDS.user_cost_anomaly_threshold_usd).toBe(50.0);
    });
  });
});
