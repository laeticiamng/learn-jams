// ============================================================
// AdminDashboard — Internal metrics & ops overview
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { BarChart3, Brain, Shield, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
              <BarChart3 className="w-6 h-6 text-primary" /> Tableau de bord interne
            </h1>
            <p className="text-sm text-muted-foreground">Metriques produit, pedagogique et ops</p>
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
                  <BarChart3 className="w-4 h-4 text-primary" /> Funnel produit
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label="Landing" value={funnel.landing_views} />
                  <MetricCard label="Onboarding" value={funnel.onboarding_started} />
                  <MetricCard label="Upload" value={funnel.upload_started} />
                  <MetricCard label="Transformation" value={funnel.transformation_generated} />
                  <MetricCard label="Test final" value={funnel.final_test_completed} />
                  <MetricCard label="Debrief" value={funnel.debrief_viewed} />
                  <MetricCard label="Review queue" value={funnel.review_queue_viewed} />
                  <MetricCard label="Onboarding ok" value={funnel.onboarding_completed} />
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
                  <Brain className="w-4 h-4 text-primary" /> Metriques pedagogiques
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label="Score brut moy." value={pedagogical.avg_raw_score !== null ? `${Math.round(pedagogical.avg_raw_score * 100)}%` : "—"} />
                  <MetricCard label="Score composite moy." value={pedagogical.avg_composite_score !== null ? `${Math.round(pedagogical.avg_composite_score * 100)}%` : "—"} />
                  <MetricCard label="Ecart calibration" value={pedagogical.avg_calibration_gap !== null ? `${Math.round(Math.abs(pedagogical.avg_calibration_gap) * 100)}%` : "—"} />
                  <MetricCard label="Tests effectues" value={pedagogical.total_recall_tests} />
                  <MetricCard label="Retention J+1" value={pedagogical.j1_completion_rate !== null ? `${Math.round(pedagogical.j1_completion_rate * 100)}%` : "—"} />
                  <MetricCard label="Retention J+7" value={pedagogical.j7_completion_rate !== null ? `${Math.round(pedagogical.j7_completion_rate * 100)}%` : "—"} />
                </div>

                {pedagogical.format_effectiveness.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-xs font-medium text-muted-foreground">Efficacite par format</p>
                    {pedagogical.format_effectiveness.map((f) => (
                      <div key={f.format} className="flex items-center justify-between text-xs">
                        <span className="font-medium">{f.format}</span>
                        <span className="text-muted-foreground">
                          retention: {(f.avg_retention * 100).toFixed(0)}% ({f.count} utilisateur(s))
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
                  <Shield className="w-4 h-4 text-primary" /> Qualite / Ops
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label="QA pass" value={ops.qa_pass} color="text-green-600" />
                  <MetricCard label="QA warn" value={ops.qa_warn} color="text-orange-600" />
                  <MetricCard label="QA block" value={ops.qa_block} color="text-red-600" />
                  <MetricCard label="Block rate" value={`${(ops.qa_block_rate * 100).toFixed(0)}%`} color={ops.qa_block_rate > 0.2 ? "text-red-600" : undefined} />
                  <MetricCard label="Erreurs" value={ops.error_count} color={ops.error_count > 0 ? "text-red-600" : undefined} />
                  <MetricCard label="Transformations" value={ops.total_transformations} />
                  <MetricCard label="Seeds demarrees" value={ops.seed_transformations_started} />
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
