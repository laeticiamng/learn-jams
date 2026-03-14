import { AlertTriangle, Brain, Clock, Lightbulb } from "lucide-react";
import type { ErrorNode, OverconfidenceZone, RevisionAction } from "@/domain/cognitio/types";

interface DebriefErrorTreeProps {
  errors: ErrorNode[];
  overconfidence: OverconfidenceZone[];
  revisionPlan: RevisionAction[];
  fragileConcepts: string[];
}

export default function DebriefErrorTree({
  errors,
  overconfidence,
  revisionPlan,
  fragileConcepts,
}: DebriefErrorTreeProps) {
  if (errors.length === 0 && overconfidence.length === 0) {
    return (
      <div className="glass-card p-6 rounded-xl text-center">
        <p className="text-green-600 dark:text-green-400 font-medium">
          Aucune erreur significative. Excellent travail !
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Errors */}
      {errors.length > 0 && (
        <div className="glass-card p-5 rounded-xl space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Erreurs ({errors.length})
          </h4>
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <ErrorTypeIcon type={err.error_type} />
              <div>
                <p className="text-sm font-medium">{err.concept_label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Salle {err.room_index + 1} — {getErrorTypeLabel(err.error_type)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overconfidence */}
      {overconfidence.length > 0 && (
        <div className="glass-card p-5 rounded-xl space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-orange-500" />
            Zones de surconfiance ({overconfidence.length})
          </h4>
          {overconfidence.map((zone, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
              <div className="flex-1">
                <p className="text-sm">{zone.concept_key}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confiance: {Math.round(zone.declared_confidence * 100)}% — Réalité: {Math.round(zone.actual_accuracy * 100)}%
                </p>
              </div>
              <span className="text-xs font-mono text-orange-500">
                écart {Math.round(zone.gap * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Revision plan */}
      {revisionPlan.length > 0 && (
        <div className="glass-card p-5 rounded-xl space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-blue-500" />
            Plan de révision
          </h4>
          {revisionPlan.map((action, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <span className={`w-2 h-2 rounded-full ${
                action.priority === "high" ? "bg-red-500" : action.priority === "medium" ? "bg-yellow-500" : "bg-blue-500"
              }`} />
              <span className="text-sm flex-1">{action.concept_key}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted/20 text-muted-foreground">
                {getActionLabel(action.action)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorTypeIcon({ type }: { type: ErrorNode["error_type"] }) {
  switch (type) {
    case "overconfident":
      return <Brain className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />;
    case "slow":
      return <Clock className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />;
  }
}

function getErrorTypeLabel(type: ErrorNode["error_type"]): string {
  switch (type) {
    case "wrong_answer": return "Réponse incorrecte";
    case "overconfident": return "Surconfiance";
    case "slow": return "Temps excessif";
    case "hint_needed": return "Indice utilisé";
  }
}

function getActionLabel(action: RevisionAction["action"]): string {
  switch (action) {
    case "review": return "Revoir";
    case "practice": return "Pratiquer";
    case "retest": return "Re-tester";
  }
}
