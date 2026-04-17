// ============================================================
// BackupVerificationCard — affiche les 7 derniers runs de
// public.run_backup_verification() (cron quotidien 04:00 UTC).
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, RefreshCw, ShieldCheck, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Run {
  id: string;
  run_at: string;
  status: "healthy" | "warning" | "failed";
  metrics_json: Record<string, unknown> | null;
  notes: string | null;
}

const STATUS_META: Record<Run["status"], { label: string; icon: typeof ShieldCheck; cls: string }> = {
  healthy: { label: "OK", icon: ShieldCheck, cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  warning: { label: "Warning", icon: AlertTriangle, cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  failed: { label: "Échec", icon: XCircle, cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function BackupVerificationCard() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("backup_verification_runs" as never)
      .select("*")
      .order("run_at", { ascending: false })
      .limit(7);
    if (error) toast.error("Backup runs: " + error.message);
    else setRuns((data ?? []) as unknown as Run[]);
    setLoading(false);
  };

  const triggerNow = async () => {
    setLoading(true);
    const { error } = await supabase.rpc("run_backup_verification" as never);
    if (error) toast.error("Vérif manuelle: " + error.message);
    else {
      toast.success("Vérification lancée");
      await load();
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const last = runs[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Vérification sauvegardes (DR)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={triggerNow} disabled={loading}>
            Lancer maintenant
          </Button>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!last && <p className="text-sm text-muted-foreground">Aucune vérification enregistrée.</p>}
        {last && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Dernière exécution</span>
              <Badge variant="outline" className={STATUS_META[last.status].cls}>
                {STATUS_META[last.status].label}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(last.run_at), { addSuffix: true, locale: fr })}
              {last.notes && ` — ${last.notes}`}
            </p>
            {last.metrics_json && (
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {Object.entries(last.metrics_json).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="tabular-nums">{String(v ?? "—")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {runs.length > 1 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Historique 7j</p>
            {runs.slice(1).map((r) => {
              const Icon = STATUS_META[r.status].icon;
              return (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <Icon className="h-3 w-3" />
                    {new Date(r.run_at).toLocaleString("fr-FR")}
                  </span>
                  <span className="text-muted-foreground">{r.notes}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
