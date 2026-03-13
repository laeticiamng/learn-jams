// ============================================================
// FormatDecisionCard — Display M4 format decision
// ============================================================

import { FileText, BookOpen, AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { M4_Output } from "@/domain/cognitio/format.contracts";

interface FormatDecisionCardProps {
  decision: M4_Output;
}

export function FormatDecisionCard({ decision }: FormatDecisionCardProps) {
  const isFiche = decision.chosen_format === "fiche_dynamique";

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        {isFiche ? <FileText className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
        Format sélectionné
      </h3>

      {/* Format badge */}
      <div className="flex items-center gap-3">
        <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${
          isFiche
            ? "bg-blue-50 text-blue-800 border border-blue-200"
            : "bg-purple-50 text-purple-800 border border-purple-200"
        }`}>
          {isFiche ? "Fiche Dynamique" : "Histoire Animée"}
        </div>
        <Badge variant="outline" className="text-xs">
          Coût: {decision.cost_level}
        </Badge>
      </div>

      {/* Justification */}
      <p className="text-sm text-muted-foreground">{decision.justification}</p>

      {/* Decision trace */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-1">
        <p className="text-xs font-medium">Trace de décision</p>
        <p className="text-xs text-muted-foreground">
          {decision.matrix_reasoning}
        </p>
        {decision.overrides_applied.length > 0 && (
          <div className="space-y-1 mt-2">
            <p className="text-xs font-medium text-yellow-700">Overrides appliqués :</p>
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
