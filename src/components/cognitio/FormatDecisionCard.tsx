// ============================================================
// FormatDecisionCard — Display M4 format decision with override transparency
// ============================================================

import { FileText, BookOpen, Gamepad2, AlertTriangle, ArrowRight, Info, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { M4_Output } from "@/domain/cognitio/format.contracts";

interface FormatDecisionCardProps {
  decision: M4_Output;
}

const FORMAT_LABELS: Record<string, string> = {
  fiche_dynamique: "Fiche Dynamique",
  histoire_animee: "Histoire Animée",
  mission_interactive: "Mission Interactive",
};

const FORMAT_ICONS: Record<string, React.ElementType> = {
  fiche_dynamique: FileText,
  histoire_animee: BookOpen,
  mission_interactive: Gamepad2,
};

const FORMAT_COLORS: Record<string, string> = {
  fiche_dynamique: "bg-blue-50 text-blue-800 border border-blue-200",
  histoire_animee: "bg-purple-50 text-purple-800 border border-purple-200",
  mission_interactive: "bg-emerald-50 text-emerald-800 border border-emerald-200",
};

export function FormatDecisionCard({ decision }: FormatDecisionCardProps) {
  const Icon = FORMAT_ICONS[decision.chosen_format] ?? FileText;
  const label = FORMAT_LABELS[decision.chosen_format] ?? decision.chosen_format;
  const color = FORMAT_COLORS[decision.chosen_format] ?? FORMAT_COLORS.fiche_dynamique;
  const userIntentRespected = decision.decision_trace.user_intent_respected;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Icon className="h-4 w-4" />
        Format sélectionné
      </h3>

      {/* User intent override warning */}
      {decision.user_selected_format && !userIntentRespected && (
        <div className="p-3 rounded-lg border-l-4 border-orange-500/50 bg-orange-500/5">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800">
                Format demandé non disponible
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Vous avez choisi « {FORMAT_LABELS[decision.user_selected_format] ?? decision.user_selected_format} » mais ce format n'a pas pu être généré pour ce document.
              </p>
              {decision.override_reason && (
                <p className="text-xs text-orange-600 mt-1">
                  {decision.override_reason}
                </p>
              )}
              {decision.fallback_candidates.length > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  Alternatives disponibles : {decision.fallback_candidates.map(f => FORMAT_LABELS[f] ?? f).join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User intent respected with degraded mode info */}
      {decision.user_selected_format && userIntentRespected && decision.override_reason && (
        <div className="p-3 rounded-lg border-l-4 border-blue-500/50 bg-blue-500/5">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Format généré en version adaptée
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {decision.override_reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Format badge */}
      <div className="flex items-center gap-3">
        <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${color}`}>
          {label}
        </div>
        <Badge variant="outline" className="text-xs">
          Coût: {decision.cost_level}
        </Badge>
        {decision.user_selected_format && userIntentRespected && (
          <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
            Choix respecté
          </Badge>
        )}
      </div>

      {/* Justification */}
      <p className="text-sm text-muted-foreground">{decision.justification}</p>

      {/* Decision trace */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-1">
        <p className="text-xs font-medium">Trace de décision</p>
        <p className="text-xs text-muted-foreground">
          {decision.matrix_reasoning}
        </p>
        {decision.user_selected_format && (
          <p className="text-xs text-muted-foreground">
            Choix utilisateur : {FORMAT_LABELS[decision.user_selected_format] ?? decision.user_selected_format}
            {" → "}
            Recommandation système : {FORMAT_LABELS[decision.system_recommended_format] ?? decision.system_recommended_format}
          </p>
        )}
        {decision.overrides_applied.length > 0 && (
          <div className="space-y-1 mt-2">
            <p className="text-xs font-medium text-yellow-700">Contraintes détectées :</p>
            {decision.overrides_applied.map((o, i) => (
              <div key={i} className="flex items-start gap-1 text-xs text-yellow-600">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{o.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duration & split info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Durée: ~{Math.ceil(decision.estimated_duration_sec / 60)} min</span>
        {decision.needs_split && (
          <span className="text-yellow-600">
            {decision.split_count} module(s) requis
          </span>
        )}
      </div>
    </div>
  );
}
