// ============================================================
// FinalTestBlock — Block type "final_test"
// ============================================================

import { useState } from "react";
import { ClipboardCheck, ChevronDown, ChevronRight, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContentBlock, FinalTestItem } from "@/domain/cognitio/generation.types";

interface Props {
  items: FinalTestItem[];
  block: ContentBlock;
}

const BLOOM_LABELS: Record<number, string> = {
  1: "Mémoriser",
  2: "Comprendre",
  3: "Appliquer",
  4: "Analyser",
  5: "Évaluer",
  6: "Créer",
};

export function FinalTestBlock({ items, block }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const revealAnswer = (id: string) => {
    setRevealed(prev => new Set(prev).add(id));
  };

  return (
    <div className="border-2 border-primary rounded-lg p-5 space-y-4">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-primary" />
        {block.title}
      </h2>
      <p className="text-xs text-muted-foreground">
        {items.length} question(s) — {new Set(items.map(q => q.bloom_level)).size} niveaux cognitifs
      </p>

      {items.map((item, idx) => (
        <div key={item.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Question {idx + 1}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {BLOOM_LABELS[item.bloom_level] ?? `Bloom ${item.bloom_level}`}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {item.type}
              </Badge>
            </div>
          </div>

          <p className="text-sm">{item.prompt}</p>

          {/* Choices for QCU/QCM */}
          {item.choices && (
            <div className="space-y-1">
              {item.choices.map((choice, ci) => (
                <button
                  key={ci}
                  className={`w-full text-left text-sm px-3 py-2 rounded border transition ${
                    answers[item.id] === choice
                      ? "border-primary bg-primary/10"
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                  onClick={() => setAnswers(prev => ({ ...prev, [item.id]: choice }))}
                >
                  {choice}
                </button>
              ))}
            </div>
          )}

          {/* Reveal answer */}
          {!revealed.has(item.id) ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => revealAnswer(item.id)}
              className="text-xs"
            >
              <ChevronRight className="h-3 w-3 mr-1" /> Voir la réponse
            </Button>
          ) : (
            <div className="bg-muted/30 rounded p-2 text-xs">
              <p className="font-medium mb-1">Réponse attendue :</p>
              <p>{Array.isArray(item.expected_answer) ? item.expected_answer.join(", ") : item.expected_answer}</p>
              <p className="text-muted-foreground mt-1">
                Concepts : {item.concepts_tested.join(", ")}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
