// ============================================================
// IncidentTimeline — public read-only timeline of incidents
// (used on /status and reusable in admin)
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertOctagon, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: "minor" | "major" | "critical";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  affected_components: string[] | null;
  started_at: string;
  resolved_at: string | null;
}

interface IncidentUpdate {
  id: string;
  incident_id: string;
  message: string;
  status_at_post: string;
  posted_at: string;
}

const SEVERITY_META = {
  minor: { icon: Info, color: "text-sky-500 bg-sky-500/10", label: "Mineur" },
  major: { icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10", label: "Majeur" },
  critical: { icon: AlertOctagon, color: "text-rose-500 bg-rose-500/10", label: "Critique" },
} as const;

const STATUS_LABELS: Record<string, string> = {
  investigating: "En investigation",
  identified: "Identifié",
  monitoring: "Surveillance",
  resolved: "Résolu",
};

interface Props {
  windowDays?: number;
  emptyMessage?: string;
}

export default function IncidentTimeline({ windowDays = 30, emptyMessage = "Aucun incident sur la période." }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [updates, setUpdates] = useState<IncidentUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
      const { data: inc } = await supabase
        .from("incidents")
        .select("*")
        .gte("started_at", since)
        .order("started_at", { ascending: false });

      const ids = (inc ?? []).map((i) => i.id);
      let upd: IncidentUpdate[] = [];
      if (ids.length > 0) {
        const { data: u } = await supabase
          .from("incident_updates")
          .select("*")
          .in("incident_id", ids)
          .order("posted_at", { ascending: false });
        upd = (u ?? []) as IncidentUpdate[];
      }

      if (!cancelled) {
        setIncidents((inc ?? []) as Incident[]);
        setUpdates(upd);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [windowDays]);

  if (loading) {
    return <Card className="p-5 text-sm text-muted-foreground">Chargement…</Card>;
  }

  if (incidents.length === 0) {
    return (
      <Card className="p-5 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        <div className="text-sm">{emptyMessage}</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {incidents.map((inc) => {
        const meta = SEVERITY_META[inc.severity] ?? SEVERITY_META.minor;
        const Icon = meta.icon;
        const incUpdates = updates.filter((u) => u.incident_id === inc.id);
        const isResolved = inc.status === "resolved";

        return (
          <Card key={inc.id} className="p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 ${meta.color.split(" ")[0]}`} />
                <div>
                  <div className="font-medium">{inc.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Démarré {new Date(inc.started_at).toLocaleString("fr-FR")}
                    {inc.resolved_at && ` · Résolu ${new Date(inc.resolved_at).toLocaleString("fr-FR")}`}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className={`${meta.color} border-transparent`}>
                  {meta.label}
                </Badge>
                <Badge variant={isResolved ? "outline" : "secondary"}>{STATUS_LABELS[inc.status]}</Badge>
              </div>
            </div>

            {inc.description && (
              <p className="text-sm text-muted-foreground mb-3">{inc.description}</p>
            )}

            {(inc.affected_components ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {inc.affected_components!.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">
                    {c}
                  </Badge>
                ))}
              </div>
            )}

            {incUpdates.length > 0 && (
              <div className="border-l-2 border-border pl-3 mt-3 space-y-2">
                {incUpdates.map((u) => (
                  <div key={u.id} className="text-sm">
                    <div className="text-xs text-muted-foreground">
                      {new Date(u.posted_at).toLocaleString("fr-FR")} · {STATUS_LABELS[u.status_at_post]}
                    </div>
                    <div>{u.message}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
