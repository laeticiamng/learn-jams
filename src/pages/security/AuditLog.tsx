// ============================================================
// AuditLog — User-facing RGPD activity log
// ============================================================
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditRow {
  id: string;
  event_type: string;
  severity: string;
  created_at: string;
  public_details: Record<string, unknown>;
}

const EVENT_LABELS: Record<string, string> = {
  auth_login: "Connexion",
  auth_logout: "Déconnexion",
  rate_limit_hit: "Limite de débit atteinte",
  cost_anomaly: "Anomalie de coût",
  rgpd_export: "Export de données RGPD",
  account_deletion: "Suppression de compte",
  circuit_breaker_opened: "Circuit-breaker activé",
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  error: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  critical: "bg-rose-600/10 text-rose-700 border-rose-600/30",
};

export default function AuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("user_audit_view" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data as any) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour au profil
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Mon historique d'activité</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Conformément au RGPD, voici l'historique des événements de sécurité liés à votre compte sur les 30 derniers jours.
        </p>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            Aucun événement enregistré sur les 30 derniers jours.
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <Card key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{EVENT_LABELS[r.event_type] ?? r.event_type}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </div>
                </div>
                <Badge variant="outline" className={SEVERITY_STYLES[r.severity] ?? ""}>
                  {r.severity}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
