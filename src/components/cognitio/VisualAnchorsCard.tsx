// ============================================================
// VisualAnchorsCard — Display visual anchors from M3
// ============================================================

import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { M3_VisualAnchor } from "@/domain/cognitio/memory.types";

interface VisualAnchorsCardProps {
  anchors: M3_VisualAnchor[];
}

export function VisualAnchorsCard({ anchors }: VisualAnchorsCardProps) {
  if (anchors.length === 0) return null;

  const typeLabels: Record<string, string> = {
    metaphor: "Métaphore",
    comparison: "Comparaison",
    mnemonic: "Mnémonique",
    image_desc: "Image",
    diagram_desc: "Diagramme",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Eye className="h-4 w-4" />
        Ancrages visuels
      </h3>

      {anchors.map((a, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">{a.concept_key}</Badge>
            <span className="text-xs text-muted-foreground">
              {typeLabels[a.anchor_type] ?? a.anchor_type}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{a.content}</p>
          {a.related_concepts && a.related_concepts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {a.related_concepts.map((key) => (
                <span key={key} className="text-[10px] text-muted-foreground bg-muted/50 px-1 py-0.5 rounded">
                  ↔ {key}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
