// ============================================================
// SourceDisclaimerBlock — Source confidence disclaimer
// ============================================================

import { AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SourceDisclaimer } from "@/domain/cognitio/generation.types";

interface Props {
  disclaimer: SourceDisclaimer;
}

export function SourceDisclaimerBlock({ disclaimer }: Props) {
  const hasIssues = disclaimer.uncertain_concepts.length > 0 ||
    disclaimer.contradictions.length > 0 ||
    disclaimer.ambiguities.length > 0;

  if (!hasIssues && disclaimer.confidence_level >= 0.7) return null;

  const isLowConfidence = disclaimer.confidence_level < 0.55;

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${
      isLowConfidence
        ? "border-red-200 bg-red-50"
        : "border-yellow-200 bg-yellow-50"
    }`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className={`h-4 w-4 ${isLowConfidence ? "text-red-600" : "text-yellow-600"}`} />
        <span className={`text-xs font-semibold uppercase ${isLowConfidence ? "text-red-800" : "text-yellow-800"}`}>
          Avertissement source
        </span>
        <Badge variant="outline" className="text-[10px]">
          Confiance : {Math.round(disclaimer.confidence_level * 100)}%
        </Badge>
      </div>

      {disclaimer.uncertain_concepts.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Concepts incertains ({disclaimer.uncertain_concepts.length}) :
          </p>
          <div className="flex flex-wrap gap-1">
            {disclaimer.uncertain_concepts.map(key => (
              <Badge key={key} variant="outline" className="text-xs border-yellow-300 text-yellow-700">
                {key}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ces notions n'ont pas pu être pleinement tracées dans le document source.
          </p>
        </div>
      )}

      {disclaimer.contradictions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-red-700">Contradictions :</p>
          <ul className="text-xs text-red-600 list-disc list-inside">
            {disclaimer.contradictions.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {disclaimer.ambiguities.length > 0 && (
        <div>
          <p className="text-xs font-medium text-yellow-700">Zones ambiguës :</p>
          <ul className="text-xs text-yellow-600 list-disc list-inside">
            {disclaimer.ambiguities.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
