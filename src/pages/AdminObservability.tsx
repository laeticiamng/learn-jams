// ============================================================
// Admin Observability — rate limits, circuit breakers, audit log
// ============================================================

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import Navbar from "@/components/Navbar";
import { usePageSEO } from "@/hooks/usePageSEO";

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

const stateBadge = (state: string) => {
  if (state === "open") return <Badge variant="destructive">OPEN</Badge>;
  if (state === "half_open") return <Badge className="bg-amber-500">HALF</Badge>;
  return <Badge className="bg-emerald-600">CLOSED</Badge>;
};

const severityIcon = (sev: string) => {
  if (sev === "critical" || sev === "error") return <ShieldAlert className="h-4 w-4 text-destructive" />;
  if (sev === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
};

export default function AdminObservability() {
  usePageSEO({ title: "Observability — Admin", description: "Rate limits, circuit breakers, security audit." });
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimitRow[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const [p, r, a] = await Promise.all([
      supabase.from("provider_health").select("*").order("provider_key"),
      supabase.from("rate_limit_buckets").select("*").order("window_start", { ascending: false }).limit(50),
      supabase.from("security_audit_events").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (p.data) setProviders(p.data as ProviderHealth[]);
    if (r.data) setRateLimits(r.data as RateLimitRow[]);
    if (a.data) setAudit(a.data as AuditEvent[]);
    setLoading(false);
  };

  useEffect(() => { void loadAll(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Observabilité</h1>
            <p className="text-sm text-muted-foreground">Santé des providers, quotas, audit de sécurité.</p>
          </div>
          <Button onClick={loadAll} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
        </header>

        {/* Provider Health */}
        <Card>
          <CardHeader><CardTitle>Circuit breakers (providers)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {providers.map((p) => (
                <div key={p.provider_key} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-mono font-semibold">{p.provider_key}</p>
                    <p className="text-xs text-muted-foreground">
                      Échecs consécutifs : {p.consecutive_failures}
                      {p.last_failure_at && ` · dernier KO : ${new Date(p.last_failure_at).toLocaleTimeString()}`}
                    </p>
                  </div>
                  {stateBadge(p.state)}
                </div>
              ))}
              {providers.length === 0 && <p className="text-sm text-muted-foreground">Aucun provider enregistré.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Rate limits */}
        <Card>
          <CardHeader><CardTitle>Rate limits (50 dernières fenêtres)</CardTitle></CardHeader>
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
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(r.window_start).toLocaleString()}
                      </td>
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

        {/* Audit events */}
        <Card>
          <CardHeader><CardTitle>Audit de sécurité (50 derniers évènements)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {audit.map((e) => (
                <div key={e.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                  {severityIcon(e.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold">{e.event_type}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </span>
                    </div>
                    {e.details_json && (
                      <pre className="mt-1 truncate text-xs text-muted-foreground">
                        {JSON.stringify(e.details_json)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
              {audit.length === 0 && <p className="text-sm text-muted-foreground">Aucun évènement.</p>}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
