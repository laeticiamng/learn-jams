// ============================================================
// InlineRecallCard — Reactivation / active recall block
// ============================================================

import { useState } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContentBlock } from "@/domain/cognitio/generation.types";

interface Props {
  block: ContentBlock;
}

export function InlineRecallCard({ block }: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="border-2 border-green-300 bg-green-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-green-700" />
        <span className="text-xs font-semibold text-green-800 uppercase">Rappel actif</span>
      </div>

      <p className="text-sm font-medium text-green-900">
        {block.recall_event?.prompt ?? block.content}
      </p>

      {block.recall_event && (
        <div>
          <Button
            variant="outline"
            size="sm"
            className="text-green-700 border-green-300 hover:bg-green-100"
            onClick={() => setRevealed(!revealed)}
          >
            {revealed ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
            {revealed ? "Masquer" : "Voir la réponse"}
          </Button>

          {revealed && (
            <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-800">
              Concepts attendus : {block.recall_event.expected_concepts.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
