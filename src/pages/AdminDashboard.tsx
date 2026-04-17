// ============================================================
// AdminDashboard — Internal metrics & ops overview
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { BarChart3, Brain, Shield, AlertTriangle, Loader2, RefreshCw, Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { usePageSEO } from "@/hooks/usePageSEO";
import {
  getFunnelMetrics,
  getPedagogicalMetrics,
  getOpsMetrics,
  evaluateAlerts,
  type FunnelMetrics,
  type PedagogicalMetrics,
  type OpsMetrics,
  type Alert,
} from "@/services/product/dashboardAggregation.service";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

type TimeRange = "24h" | "7d" | "30d";

function getSince(range: TimeRange): string {
  const now = new Date();
  switch (range) {
    case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageSEO({ title: "Admin Dashboard", description: "Tableau de bord administrateur", noindex: true });
  const [range, setRange] = useState<TimeRange>("7d");
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
  const [pedagogical, setPedagogical] = useState<PedagogicalMetrics | null>(null);
  const [ops, setOps] = useState<OpsMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const since = getSince(range);
    try {
      const [f, p, o] = await Promise.all([
        getFunnelMetrics(since),
        getPedagogicalMetrics(since),
        getOpsMetrics(since),
      ]);
      setFunnel(f);
      setPedagogical(p);
      setOps(o);
      setAlerts(evaluateAlerts(o, p));
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" /> {t("admin.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("admin.subtitle")}</p>
          </div>

          <div className="flex items-center gap-2">
            {(["24h", "7d", "30d"] as TimeRange[]).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "outline"}
                className="text-xs"
                onClick={() => setRange(r)}
              >
                {r}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={refresh}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick links */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate("/admin/observability")}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border/30 bg-card/40 hover:bg-card/70 hover:border-primary/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Observabilité système</p>
                  <p className="text-xs text-muted-foreground">Coûts, quotas, providers, alertes</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </motion.button>

            {/* Alerts */}
            {alerts.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      alert.severity === "critical"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-orange-200 bg-orange-50 text-orange-800"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium">{alert.message}</span>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Product Funnel */}
            {funnel && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> {t("admin.funnel_title")}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label={t("admin.funnel_landing")} value={funnel.landing_views} />
                  <MetricCard label={t("admin.funnel_onboarding")} value={funnel.onboarding_started} />
                  <MetricCard label={t("admin.funnel_upload")} value={funnel.upload_started} />
                  <MetricCard label={t("admin.funnel_transformation")} value={funnel.transformation_generated} />
                  <MetricCard label={t("admin.funnel_final_test")} value={funnel.final_test_completed} />
                  <MetricCard label={t("admin.funnel_debrief")} value={funnel.debrief_viewed} />
                  <MetricCard label={t("admin.funnel_review_queue")} value={funnel.review_queue_viewed} />
                  <MetricCard label={t("admin.funnel_onboarding_ok")} value={funnel.onboarding_completed} />
                </div>
              </motion.div>
            )}

            {/* Pedagogical */}
            {pedagogical && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="border rounded-xl p-5 space-y-4"
              >
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" /> {t("admin.pedagogical_title")}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label={t("admin.metric_avg_raw")} value={pedagogical.avg_raw_score !== null ? `${Math.round(pedagogical.avg_raw_score * 100)}%` : "—"} />
                  <MetricCard label={t("admin.metric_avg_composite")} value={pedagogical.avg_composite_score !== null ? `${Math.round(pedagogical.avg_composite_score * 100)}%` : "—"} />
                  <MetricCard label={t("admin.metric_calibration_gap")} value={pedagogical.avg_calibration_gap !== null ? `${Math.round(Math.abs(pedagogical.avg_calibration_gap) * 100)}%` : "—"} />
                  <MetricCard label={t("admin.metric_tests_done")} value={pedagogical.total_recall_tests} />
                  <MetricCard label={t("admin.metric_j1_retention")} value={pedagogical.j1_completion_rate !== null ? `${Math.round(pedagogical.j1_completion_rate * 100)}%` : "—"} />
                  <MetricCard label={t("admin.metric_j7_retention")} value={pedagogical.j7_completion_rate !== null ? `${Math.round(pedagogical.j7_completion_rate * 100)}%` : "—"} />
                </div>

                {pedagogical.format_effectiveness.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-xs font-medium text-muted-foreground">{t("admin.format_effectiveness")}</p>
                    {pedagogical.format_effectiveness.map((f) => (
                      <div key={f.format} className="flex items-center justify-between text-xs">
                        <span className="font-medium">{f.format}</span>
                        <span className="text-muted-foreground">
                          {t("admin.retention_label", { value: (f.avg_retention * 100).toFixed(0), count: f.count })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Ops */}
            {ops && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="border rounded-xl p-5 space-y-4"
              >
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> {t("admin.ops_title")}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label={t("admin.ops_qa_pass")} value={ops.qa_pass} color="text-green-600" />
                  <MetricCard label={t("admin.ops_qa_warn")} value={ops.qa_warn} color="text-orange-600" />
                  <MetricCard label={t("admin.ops_qa_block")} value={ops.qa_block} color="text-red-600" />
                  <MetricCard label={t("admin.ops_block_rate")} value={`${(ops.qa_block_rate * 100).toFixed(0)}%`} color={ops.qa_block_rate > 0.2 ? "text-red-600" : undefined} />
                  <MetricCard label={t("admin.ops_errors")} value={ops.error_count} color={ops.error_count > 0 ? "text-red-600" : undefined} />
                  <MetricCard label={t("admin.ops_transformations")} value={ops.total_transformations} />
                  <MetricCard label={t("admin.ops_seeds_started")} value={ops.seed_transformations_started} />
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color ?? ""}`}>{value}</p>
    </div>
  );
}
