// ============================================================
// PedagogicalContractCard — Display the pedagogical contract
// ============================================================

import { Shield, Check } from "lucide-react";
import type { PedagogicalContract } from "@/domain/cognitio/memory.types";

interface PedagogicalContractCardProps {
  contract: PedagogicalContract;
}

export function PedagogicalContractCard({ contract }: PedagogicalContractCardProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Shield className="h-4 w-4" />
        Contrat pédagogique
      </h3>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">Concepts couverts</span>
          <p className="font-semibold">{contract.total_concepts}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Concepts critiques</span>
          <p className="font-semibold">{contract.critical_concepts}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Durée estimée</span>
          <p className="font-semibold">{Math.ceil(contract.estimated_duration_sec / 60)} min</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Segments</span>
          <p className="font-semibold">{contract.segment_count}</p>
        </div>
      </div>

      {/* Repetition summary */}
      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-xs font-medium mb-2">Plan de rappel</p>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <p className="font-semibold">{contract.repetition_summary.inline_recall_count}</p>
            <p className="text-muted-foreground">En ligne</p>
          </div>
          <div>
            <p className="font-semibold">{contract.repetition_summary.final_test_questions}</p>
            <p className="text-muted-foreground">Test final</p>
          </div>
          <div>
            <p className="font-semibold">{contract.repetition_summary.j1_questions}</p>
            <p className="text-muted-foreground">J+1</p>
          </div>
          <div>
            <p className="font-semibold">{contract.repetition_summary.j7_questions}</p>
            <p className="text-muted-foreground">J+7</p>
          </div>
        </div>
      </div>

      {/* Guarantees */}
      {contract.guarantees.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Garanties</p>
          {contract.guarantees.map((g, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-green-500 shrink-0" />
              <span>{g}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
