// ============================================================
// RepetitionPlanCard — Display repetition plan from M3
// ============================================================

import { Repeat, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RepetitionPlanItem } from "@/domain/cognitio/memory.types";

interface RepetitionPlanCardProps {
  plan: RepetitionPlanItem[];
}

export function RepetitionPlanCard({ plan }: RepetitionPlanCardProps) {
  const critical = plan.filter(r => r.is_critical);
  const regular = plan.filter(r => !r.is_critical);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Repeat className="h-4 w-4" />
        Plan de répétition espacée
      </h3>

      {critical.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-red-700">Concepts critiques ({critical.length})</p>
          {critical.map((item) => (
            <RepetitionRow key={item.concept_key} item={item} />
          ))}
        </div>
      )}

      {regular.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Autres concepts ({regular.length})</p>
          {regular.slice(0, 10).map((item) => (
            <RepetitionRow key={item.concept_key} item={item} />
          ))}
          {regular.length > 10 && (
            <p className="text-xs text-muted-foreground text-center">
              +{regular.length - 10} concept(s)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RepetitionRow({ item }: { item: RepetitionPlanItem }) {
  const momentLabels: Record<string, string> = {
    inline: "En ligne",
    end_of_segment: "Fin segment",
    final_test: "Test final",
    j1: "J+1",
    j7: "J+7",
  };

  const underRepresented = item.is_critical && item.total_appearances < 3;

  return (
    <div className={`flex items-center justify-between p-2 rounded text-xs ${
      underRepresented ? "bg-red-50 border border-red-200" : "bg-muted/30"
    }`}>
      <div className="flex items-center gap-2">
        {underRepresented && <AlertTriangle className="h-3 w-3 text-red-500" />}
        <span className="font-medium">{item.concept_key}</span>
      </div>
      <div className="flex items-center gap-1">
        {item.moments.map((m) => (
          <Badge key={m} variant="outline" className="text-[10px] px-1 py-0">
            {momentLabels[m] ?? m}
          </Badge>
        ))}
        <span className="text-muted-foreground ml-1">×{item.total_appearances}</span>
      </div>
    </div>
  );
}
