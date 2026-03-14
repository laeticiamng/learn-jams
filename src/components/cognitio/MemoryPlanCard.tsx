// ============================================================
// MemoryPlanCard — Overview of the M3 memory architecture
// ============================================================

import { Brain, Clock, Layers, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { M3_Output } from "@/domain/cognitio/memory.contracts";

interface MemoryPlanCardProps {
  output: M3_Output;
}

export function MemoryPlanCard({ output }: MemoryPlanCardProps) {
  const { pedagogical_contract: contract, cognitive_budget: budget } = output;
  const criticalPlan = output.repetition_plan.filter(r => r.is_critical);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" />
        Architecture mémoire
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBlock
          icon={<Layers className="h-4 w-4" />}
          label="Segments"
          value={contract.segment_count}
        />
        <StatBlock
          icon={<Brain className="h-4 w-4" />}
          label="Concepts"
          value={`${contract.total_concepts} (${contract.critical_concepts} crit.)`}
        />
        <StatBlock
          icon={<Clock className="h-4 w-4" />}
          label="Durée estimée"
          value={`${Math.ceil(contract.estimated_duration_sec / 60)} min`}
        />
        <StatBlock
          icon={<Repeat className="h-4 w-4" />}
          label="Rappels planifiés"
          value={`J+1: ${contract.repetition_summary.j1_questions}, J+7: ${contract.repetition_summary.j7_questions}`}
        />
      </div>

      {output.needs_splitting && output.split_modules && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3">
          <p className="text-sm font-medium text-yellow-800">
            Découpage requis : {output.split_modules.length} module(s)
          </p>
          <p className="text-xs text-yellow-600">
            La durée totale dépasse 10 minutes. Le contenu sera découpé en modules.
          </p>
        </div>
      )}

      {contract.guarantees.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {contract.guarantees.map((g, i) => (
            <p key={i}>✓ {g}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="border rounded-lg p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
