// ============================================================
// SLODashboard — admin view of SLO compliance + error budget
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";

interface SLOStatus {
  slo_key: string;
  display_name: string;
  target_pct: number;
  comparator: "gte" | "lte";
  unit: "percent" | "ms";
  window_days: number;
  avg_value: number;
  compliance_pct: number;
  error_budget_pct: number;
  sample_count: number;
  status: "healthy" | "warning" | "breached" | "unknown";
  recent: Array<{ t: string; v: number; met: boolean }>;
}

const STATUS_META = {
  healthy: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Conforme" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", label: "Marge faible" },
  breached: { icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/10", label: "Dépassé" },
  unknown: { icon: HelpCircle, color: "text-muted-foreground", bg: "bg-muted/30", label: "Inconnu" },
} as const;

export default function SLODashboard() {
  const [slos, setSlos] = useState<SLOStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: defs } = await supabase.from("slo_definitions").select("slo_key").eq("enabled", true);
      if (!defs) {
        setLoading(false);
        return;
      }
      const results: SLOStatus[] = [];
      for (const d of defs) {
        const { data } = await supabase.rpc("compute_slo_status", { p_slo_key: d.slo_key });
        if (data) results.push(data as unknown as SLOStatus);
      }
      if (!cancelled) {
        setSlos(results);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Chargement des SLO…</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">SLO & Error Budget</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {slos.map((s) => {
          const meta = STATUS_META[s.status];
          const Icon = meta.icon;
          return (
            <Card key={s.slo_key} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-medium">{s.display_name}</div>
                  <div className="text-xs text-muted-foreground">
                    Cible {s.comparator === "gte" ? "≥" : "≤"} {s.target_pct}
                    {s.unit === "percent" ? "%" : " ms"} · {s.window_days}j
                  </div>
                </div>
                <Badge variant="outline" className={`${meta.bg} ${meta.color} border-transparent`}>
                  <Icon className="w-3 h-3 mr-1" />
                  {meta.label}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Valeur moyenne</span>
                  <span className="font-mono text-sm">
                    {s.unit === "percent" ? `${s.avg_value.toFixed(1)}%` : `${Math.round(s.avg_value)} ms`}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Compliance</span>
                  <span className="font-mono text-sm">{s.compliance_pct.toFixed(1)}%</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Error budget</span>
                  <span className={`font-mono text-sm ${s.error_budget_pct < 1 ? "text-rose-500" : ""}`}>
                    {s.error_budget_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground pt-1">
                  {s.sample_count} mesures
                </div>

                {/* Mini sparkline */}
                {s.recent.length > 1 && (
                  <div className="flex items-end gap-0.5 h-8 mt-2">
                    {s.recent.slice(-32).map((m, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm ${m.met ? "bg-emerald-500/60" : "bg-rose-500/60"}`}
                        style={{
                          height: `${Math.max(
                            10,
                            Math.min(100, s.unit === "percent" ? m.v : 100 - Math.min(100, (m.v / 6000) * 100)),
                          )}%`,
                        }}
                        title={`${new Date(m.t).toLocaleString("fr-FR")} — ${m.v.toFixed(1)}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
