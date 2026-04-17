// ============================================================
// Admin Observability — providers, costs, alerts, rate limits, audit
// ============================================================

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert, DollarSign, Activity, Bell } from "lucide-react";
import Navbar from "@/components/Navbar";
import { usePageSEO } from "@/hooks/usePageSEO";
import { toast } from "sonner";
import { FeatureFlagsPanel } from "@/components/admin/FeatureFlagsPanel";
import SLODashboard from "@/components/admin/SLODashboard";
import { Link } from "react-router-dom";

interface ProviderHealth {
  provider_key: string;
  state: string;
  consecutive_failures: number;
  last_failure_at: string | null;
  last_success_at: string | null;
  opened_at: string | null;
}

interface RateLimitRow {
  user_id: string;
  bucket_key: string;
  request_count: number;
  window_start: string;
}

interface AuditEvent {
  id: string;
  event_type: string;
  severity: string;
  user_id: string | null;
  details_json: Record<string, unknown> | null;
  created_at: string;
}

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  status: string;
  title: string;
  description: string | null;
  user_id: string | null;
  details_json: Record<string, unknown> | null;
  created_at: string;
}

interface ObsSummary {
  providers_open: number;
  providers_total: number;
  alerts_open: number;
  alerts_critical_open: number;
  cost_24h_usd: number;
  cost_events_24h: number;
  rate_limit_hits_24h: number;
  top_consumers_24h: Array<{ user_id: string; cost_usd: number; events: number }>;
  generated_at: string;
}

const stateBadge = (state: string) => {
  if (state === "open") return <Badge variant="destructive">OPEN</Badge>;
  if (state === "half_open") return <Badge variant="secondary">HALF</Badge>;
  return <Badge variant="default">CLOSED</Badge>;
};

const severityIcon = (sev: string) => {
  if (sev === "critical" || sev === "error") return <ShieldAlert className="h-4 w-4 text-destructive" />;
  if (sev === "warning") return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
};

const severityBadge = (sev: string) => {
  if (sev === "critical") return <Badge variant="destructive">CRITIQUE</Badge>;
  if (sev === "warning") return <Badge variant="secondary">WARNING</Badge>;
  return <Badge variant="outline">INFO</Badge>;
};

export default function AdminObservability() {
  usePageSEO({ title: "Observability — Admin", description: "Providers, coûts, alertes, audit, rate-limits." });
  const [summary, setSummary] = useState<ObsSummary | null>(null);
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimitRow[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, p, r, a, al] = await Promise.all([
        supabase.rpc("get_observability_summary"),
        supabase.from("provider_health").select("*").order("provider_key"),
        supabase.from("rate_limit_buckets").select("*").order("window_start", { ascending: false }).limit(50),
        supabase.from("security_audit_events").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("security_alerts").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      if (s.data) setSummary(s.data as unknown as ObsSummary);
      if (p.data) setProviders(p.data as ProviderHealth[]);
      if (r.data) setRateLimits(r.data as RateLimitRow[]);
      if (a.data) setAudit(a.data as AuditEvent[]);
      if (al.data) setAlerts(al.data as SecurityAlert[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (id: string) => {
    const { error } = await supabase.from("security_alerts")
      .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Alerte acquittée"); void loadAll(); }
  };

  const resolveAlert = async (id: string) => {
    const { error } = await supabase.from("security_alerts")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Alerte résolue"); void loadAll(); }
  };

  useEffect(() => { void loadAll(); }, []);

  const fmtUsd = (n: number) => `$${(n ?? 0).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Observabilité</h1>
            <p className="text-sm text-muted-foreground">
              Santé providers · Coûts · Alertes · Audit · Rate-limits
            </p>
          </div>
          <Button onClick={loadAll} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
        </header>

        {/* KPI summary */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />Providers</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.providers_open} / {summary.providers_total}</div>
                <p className="text-xs text-muted-foreground">circuits ouverts</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" />Alertes</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.alerts_open}</div>
                <p className="text-xs text-muted-foreground">{summary.alerts_critical_open} critique(s)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" />Coûts 24h</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmtUsd(summary.cost_24h_usd)}</div>
                <p className="text-xs text-muted-foreground">{summary.cost_events_24h} évènements</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Rate-limits 24h</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.rate_limit_hits_24h}</div>
                <p className="text-xs text-muted-foreground">requêtes bloquées</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="alerts">
          <TabsList>
            <TabsTrigger value="alerts">Alertes ({alerts.filter(a => a.status === "open").length})</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="costs">Top coûts</TabsTrigger>
            <TabsTrigger value="rate">Rate-limits</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="flags">Feature flags</TabsTrigger>
          </TabsList>

          {/* Alerts */}
          <TabsContent value="alerts" className="space-y-3">
            {alerts.length === 0 && <p className="text-sm text-muted-foreground">Aucune alerte.</p>}
            {alerts.map((a) => (
              <Card key={a.id} className={a.status === "open" && a.severity === "critical" ? "border-destructive" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {severityBadge(a.severity)}
                        <Badge variant="outline">{a.status}</Badge>
                        <span className="text-xs text-muted-foreground font-mono">{a.alert_type}</span>
                      </div>
                      <p className="font-semibold">{a.title}</p>
                      {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(a.created_at).toLocaleString()}
                        {a.user_id && ` · user ${a.user_id.slice(0, 8)}…`}
                      </p>
                    </div>
                    {a.status === "open" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(a.id)}>Acquitter</Button>
                        <Button size="sm" onClick={() => resolveAlert(a.id)}>Résoudre</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Providers */}
          <TabsContent value="providers">
            <Card>
              <CardHeader><CardTitle>Circuit breakers</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {providers.map((p) => (
                    <div key={p.provider_key} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-mono font-semibold">{p.provider_key}</p>
                        <p className="text-xs text-muted-foreground">
                          Échecs : {p.consecutive_failures}
                          {p.last_failure_at && ` · KO ${new Date(p.last_failure_at).toLocaleTimeString()}`}
                          {p.last_success_at && ` · OK ${new Date(p.last_success_at).toLocaleTimeString()}`}
                        </p>
                      </div>
                      {stateBadge(p.state)}
                    </div>
                  ))}
                  {providers.length === 0 && <p className="text-sm text-muted-foreground">Aucun provider enregistré.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Costs */}
          <TabsContent value="costs">
            <Card>
              <CardHeader><CardTitle>Top 10 consommateurs (24h)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary?.top_consumers_24h?.length ? summary.top_consumers_24h.map((c, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <span className="font-mono text-xs">{c.user_id.slice(0, 12)}…</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">{c.events} évts</span>
                        <span className="font-semibold">{fmtUsd(Number(c.cost_usd))}</span>
                      </div>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">Aucune donnée.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rate limits */}
          <TabsContent value="rate">
            <Card>
              <CardHeader><CardTitle>Rate-limits actifs (50 dernières fenêtres)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2">Bucket</th>
                        <th className="py-2">User</th>
                        <th className="py-2">Compteur</th>
                        <th className="py-2">Fenêtre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rateLimits.map((r, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 font-mono text-xs">{r.bucket_key}</td>
                          <td className="py-2 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                          <td className="py-2 font-semibold">{r.request_count}</td>
                          <td className="py-2 text-xs text-muted-foreground">{new Date(r.window_start).toLocaleString()}</td>
                        </tr>
                      ))}
                      {rateLimits.length === 0 && (
                        <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Aucune donnée.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit */}
          <TabsContent value="audit">
            <Card>
              <CardHeader><CardTitle>Audit de sécurité (50 derniers)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {audit.map((e) => (
                    <div key={e.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                      {severityIcon(e.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold">{e.event_type}</span>
                          <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                        </div>
                        {e.details_json && (
                          <pre className="mt-1 truncate text-xs text-muted-foreground">{JSON.stringify(e.details_json)}</pre>
                        )}
                      </div>
                    </div>
                  ))}
                  {audit.length === 0 && <p className="text-sm text-muted-foreground">Aucun évènement.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feature flags */}
          <TabsContent value="flags">
            <FeatureFlagsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
