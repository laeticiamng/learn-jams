// ============================================================
// CognitiveBudgetCard — Display cognitive budget from M3
// ============================================================

import { Gauge } from "lucide-react";
import type { CognitiveBudget } from "@/domain/cognitio/memory.types";

interface CognitiveBudgetCardProps {
  budget: CognitiveBudget;
}

export function CognitiveBudgetCard({ budget }: CognitiveBudgetCardProps) {
  const utilPercent = Math.round(budget.budget_utilization * 100);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Gauge className="h-4 w-4" />
        Budget cognitif
      </h3>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">Concepts totaux</span>
          <p className="font-semibold">{budget.total_concepts}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Max par segment</span>
          <p className="font-semibold">{budget.max_per_segment}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Nouvelles introductions</span>
          <p className="font-semibold">{budget.total_new_introductions}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Renforcements</span>
          <p className="font-semibold">{budget.total_reinforcements}</p>
        </div>
      </div>

      {/* Utilization bar */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Utilisation du budget</span>
          <span>{utilPercent}%</span>
        </div>
        <div className="w-full bg-muted/30 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              utilPercent > 90 ? "bg-red-500" : utilPercent > 70 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${Math.min(100, utilPercent)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
