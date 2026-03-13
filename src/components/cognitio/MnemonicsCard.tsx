// ============================================================
// MnemonicsCard — Display mnemonics from M3
// ============================================================

import { Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MnemonicItem } from "@/domain/cognitio/memory.types";

interface MnemonicsCardProps {
  mnemonics: MnemonicItem[];
}

export function MnemonicsCard({ mnemonics }: MnemonicsCardProps) {
  if (mnemonics.length === 0) return null;

  const typeLabels: Record<string, string> = {
    acronym: "Acronyme",
    story: "Histoire",
    association: "Association",
    rhyme: "Rime",
    visual: "Visuel",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Lightbulb className="h-4 w-4" />
        Mnémoniques
      </h3>

      {mnemonics.map((m, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-bold text-primary">{m.mnemonic}</span>
            <Badge variant="outline" className="text-xs">
              {typeLabels[m.type] ?? m.type}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-1">
            {m.concept_keys.map((key) => (
              <Badge key={key} variant="secondary" className="text-xs">
                {key}
              </Badge>
            ))}
          </div>

          {m.effectiveness_hint && (
            <p className="text-xs text-muted-foreground">{m.effectiveness_hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}
