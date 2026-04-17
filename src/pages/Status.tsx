// ============================================================
// Public status page — provider health, trust signal
// ============================================================
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProviderStatus {
  key: string;
  label: string;
  state: "operational" | "degraded" | "outage";
  consecutive_failures: number;
  last_failure_at: string | null;
}

interface StatusPayload {
  overall: ProviderStatus["state"];
  providers: ProviderStatus[];
  generated_at: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const STATE_META = {
  operational: {
    label: "Opérationnel",
    icon: CheckCircle2,
    className: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  },
  degraded: {
    label: "Dégradé",
    icon: AlertTriangle,
    className: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  },
  outage: {
    label: "Indisponible",
    icon: XCircle,
    className: "text-rose-500 bg-rose-500/10 border-rose-500/30",
  },
} as const;

export default function Status() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/public-status`);
      const json = await res.json();
      setData(json);
    } catch {
      setData({ overall: "operational", providers: [], generated_at: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, []);

  const overall = data?.overall ?? "operational";
  const OverallIcon = STATE_META[overall].icon;

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">État du service</h1>
          <p className="text-muted-foreground">
            Visibilité temps réel sur la santé des composants Cognitio.
          </p>
        </div>

        <Card className={`p-8 mb-8 border-2 ${STATE_META[overall].className}`}>
          <div className="flex items-center gap-4">
            <OverallIcon className="w-12 h-12" />
            <div className="flex-1">
              <div className="text-2xl font-semibold">
                {overall === "operational" && "Tous les systèmes opérationnels"}
                {overall === "degraded" && "Dégradation partielle"}
                {overall === "outage" && "Incident en cours"}
              </div>
              {data?.generated_at && (
                <div className="text-sm opacity-70 mt-1">
                  Mis à jour {new Date(data.generated_at).toLocaleTimeString("fr-FR")}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={fetchStatus} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </Card>

        <div className="space-y-3">
          {(data?.providers ?? []).map((p) => {
            const meta = STATE_META[p.state];
            const Icon = meta.icon;
            return (
              <Card key={p.key} className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${meta.className.split(" ")[0]}`} />
                  <div>
                    <div className="font-medium">{p.label}</div>
                    {p.consecutive_failures > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {p.consecutive_failures} échec(s) consécutif(s)
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={meta.className}>
                  {meta.label}
                </Badge>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">← Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
