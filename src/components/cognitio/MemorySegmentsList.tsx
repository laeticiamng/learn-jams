// ============================================================
// MemorySegmentsList — Display cognitive segments from M3
// ============================================================

import { Badge } from "@/components/ui/badge";
import type { M3_Segment } from "@/domain/cognitio/memory.types";

interface MemorySegmentsListProps {
  segments: M3_Segment[];
  maxDisplay?: number;
}

export function MemorySegmentsList({ segments, maxDisplay = 10 }: MemorySegmentsListProps) {
  const displayed = segments.slice(0, maxDisplay);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Segments cognitifs</h3>

      {displayed.map((seg) => (
        <div
          key={seg.segment_index}
          className="border rounded-lg p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                #{seg.segment_index + 1}
              </span>
              <FunctionBadge fn={seg.dominant_function} />
            </div>
            <span className="text-xs text-muted-foreground">
              ~{Math.ceil(seg.estimated_duration_sec / 60)} min
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {seg.concept_keys.map((key) => (
              <Badge key={key} variant="secondary" className="text-xs">
                {key}
              </Badge>
            ))}
          </div>

          {seg.reinforcement_keys.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground mr-1">Renforcé :</span>
              {seg.reinforcement_keys.map((key) => (
                <Badge key={key} variant="outline" className="text-xs border-blue-200 text-blue-700">
                  ↻ {key}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {seg.bloom_targets.map((b) => (
              <span key={b} className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                {b}
              </span>
            ))}
          </div>
        </div>
      ))}

      {segments.length > maxDisplay && (
        <p className="text-xs text-muted-foreground text-center">
          +{segments.length - maxDisplay} segment(s) supplémentaire(s)
        </p>
      )}
    </div>
  );
}

function FunctionBadge({ fn }: { fn: string }) {
  const colors: Record<string, string> = {
    encoding: "bg-blue-100 text-blue-800",
    consolidation: "bg-green-100 text-green-800",
    retrieval: "bg-purple-100 text-purple-800",
    discrimination: "bg-orange-100 text-orange-800",
  };

  const labels: Record<string, string> = {
    encoding: "Encodage",
    consolidation: "Consolidation",
    retrieval: "Rappel",
    discrimination: "Discrimination",
  };

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colors[fn] ?? "bg-gray-100 text-gray-800"}`}>
      {labels[fn] ?? fn}
    </span>
  );
}
