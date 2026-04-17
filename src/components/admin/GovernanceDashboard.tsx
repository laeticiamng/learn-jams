// ============================================================
// GovernanceDashboard — vue unifiée gouvernance / conformité
// Lien rapide vers tous les artefacts ops + statut RGPD/secrets/DR.
// ============================================================
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, FileText, Lock, Database, AlertTriangle, BookOpen, ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";

interface GovernanceItem {
  key: string;
  title: string;
  status: "ok" | "todo" | "scheduled";
  icon: typeof Shield;
  href?: string;
  external?: boolean;
  description: string;
}

const ITEMS: GovernanceItem[] = [
  {
    key: "rls",
    title: "RLS sur toutes les tables",
    status: "ok",
    icon: Shield,
    description: "Toutes les tables sensibles sont protégées par Row-Level Security et auditées par le linter.",
  },
  {
    key: "ip-min",
    title: "Minimisation IP (RGPD)",
    status: "ok",
    icon: Lock,
    description: "Aucune IP brute en base. Seules des empreintes anonymes (ip_hash) sont conservées.",
  },
  {
    key: "secrets",
    title: "Politique rotation secrets",
    status: "scheduled",
    icon: FileText,
    href: "/docs/SECRET_ROTATION_POLICY.md",
    description: "Calendrier de rotation 6/12/24 mois selon criticité. Audit trimestriel CTO.",
  },
  {
    key: "incidents",
    title: "Runbook incidents",
    status: "ok",
    icon: BookOpen,
    href: "/docs/INCIDENT_RUNBOOK.md",
    description: "Procédures d'astreinte avec matrice de sévérité et playbooks par fournisseur.",
  },
  {
    key: "dr",
    title: "Disaster Recovery (RPO 24h)",
    status: "ok",
    icon: Database,
    href: "/docs/DR_MULTIREGION.md",
    description: "Vérif sauvegarde automatisée (cron 04:00 UTC). Cible RTO 4h. Test trimestriel.",
  },
  {
    key: "slo",
    title: "SLO/SLI mesurés",
    status: "ok",
    icon: AlertTriangle,
    href: "/admin/observability",
    description: "3 SLO actifs : génération musicale, latence API, livraison webhooks. Error budget visible.",
  },
  {
    key: "idem",
    title: "Idempotency anti double-billing",
    status: "ok",
    icon: Shield,
    description: "5 endpoints mutants protégés (generate-music, generate-quiz, create-checkout, export-user-data, extract-document).",
  },
  {
    key: "consent",
    title: "Audit trail consentement",
    status: "ok",
    icon: FileText,
    description: "Table consent_events immutable, lecture par owner + admin, conservation 5 ans (obligation RGPD).",
  },
];

const STATUS_META = {
  ok: { label: "Conforme", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  scheduled: { label: "Calendaire", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  todo: { label: "À faire", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function GovernanceDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Tableau de gouvernance
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Vue d'ensemble des engagements de conformité (RGPD, sécurité, continuité). Liens vers les
          procédures opérationnelles.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const meta = STATUS_META[item.status];
            const content = (
              <div className="flex h-full flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                  <Badge variant="outline" className={meta.cls}>
                    {meta.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
                {item.href && (
                  <span className="mt-auto inline-flex items-center gap-1 text-xs text-primary">
                    Consulter <ExternalLink className="h-3 w-3" />
                  </span>
                )}
              </div>
            );
            if (item.href?.startsWith("/admin")) {
              return (
                <Link key={item.key} to={item.href}>
                  {content}
                </Link>
              );
            }
            if (item.href) {
              return (
                <a key={item.key} href={item.href} target="_blank" rel="noreferrer">
                  {content}
                </a>
              );
            }
            return <div key={item.key}>{content}</div>;
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/admin/incidents">
            <Button size="sm" variant="outline">Gérer les incidents</Button>
          </Link>
          <Link to="/status">
            <Button size="sm" variant="outline">Statut public</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
