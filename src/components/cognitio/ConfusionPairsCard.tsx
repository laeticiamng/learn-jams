// ============================================================
// ConfusionPairsCard — Displays detected confusion pairs
// ============================================================

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AnalyzedConfusionPair, AnalyzedTrap } from "@/domain/cognitio/contracts";

interface ConfusionPairsCardProps {
  confusionPairs: AnalyzedConfusionPair[];
  traps?: AnalyzedTrap[];
}

export function ConfusionPairsCard({ confusionPairs, traps = [] }: ConfusionPairsCardProps) {
  if (confusionPairs.length === 0 && traps.length === 0) return null;

  return (
    <div className="space-y-3">
      {confusionPairs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Confusions potentielles ({confusionPairs.length})
          </h3>
          <div className="space-y-2">
            {confusionPairs.map((pair, i) => (
              <div key={i} className="border border-orange-200 bg-orange-50/50 rounded-md p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{pair.concept_a_key}</Badge>
                  <span className="text-muted-foreground">vs</span>
                  <Badge variant="outline" className="text-xs">{pair.concept_b_key}</Badge>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    fréquence: {pair.frequency}/5
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ce qui les distingue : <span className="font-medium text-foreground">{pair.distinction_key}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {traps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Pièges détectés ({traps.length})
          </h3>
          <div className="space-y-2">
            {traps.map((trap, i) => (
              <div key={i} className="border border-red-200 bg-red-50/50 rounded-md p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{trap.concept_key}</Badge>
                  <Badge variant="secondary" className="text-xs capitalize">{trap.trap_type.replace("_", " ")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{trap.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
