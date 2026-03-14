// ============================================================
// ConceptList — Displays extracted concepts with criticality,
// bloom level, confidence, and source trace
// ============================================================

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, AlertTriangle, BookOpen, Eye } from "lucide-react";
import type { AnalyzedConcept } from "@/domain/cognitio/contracts";
import { formatCriticality, getCriticalityColor, getCriticalityBg, formatBloomShort, formatConfidence, getConfidenceColor } from "@/lib/cognitio-formatters";

interface ConceptListProps {
  concepts: AnalyzedConcept[];
  showAll?: boolean;
  maxDisplay?: number;
}

export function ConceptList({ concepts, showAll = false, maxDisplay = 10 }: ConceptListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showMore, setShowMore] = useState(showAll);

  const displayed = showMore ? concepts : concepts.slice(0, maxDisplay);
  const hasMore = concepts.length > maxDisplay && !showMore;

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Concepts extraits ({concepts.length})
        </h3>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="text-red-500">{concepts.filter((c) => c.criticality === 1).length} critiques</span>
          <span className="text-orange-500">{concepts.filter((c) => c.criticality === 2).length} majeurs</span>
        </div>
      </div>

      <div className="space-y-1">
        {displayed.map((concept) => {
          const isExpanded = expanded.has(concept.stable_key);

          return (
            <div
              key={concept.stable_key}
              className={`border rounded-md transition-colors ${getCriticalityBg(concept.criticality)}`}
            >
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm"
                onClick={() => toggle(concept.stable_key)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 flex-shrink-0" />
                )}

                <span className={`font-medium flex-1 ${concept.uncertain ? "italic text-muted-foreground" : ""}`}>
                  {concept.label}
                  {concept.uncertain && (
                    <AlertTriangle className="inline h-3 w-3 ml-1 text-yellow-500" />
                  )}
                </span>

                <Badge variant="outline" className={`text-xs ${getCriticalityColor(concept.criticality)}`}>
                  {formatCriticality(concept.criticality)}
                </Badge>

                <Badge variant="secondary" className="text-xs font-mono">
                  {formatBloomShort(concept.bloom_target)}
                </Badge>

                <span className={`text-xs ${getConfidenceColor(concept.source_confidence)}`}>
                  {formatConfidence(concept.source_confidence)}
                </span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 text-xs">
                  <p className="text-muted-foreground">{concept.definition}</p>

                  {concept.source_trace.length > 0 && (
                    <div className="space-y-1">
                      <span className="font-medium flex items-center gap-1">
                        <Eye className="h-3 w-3" /> Source :
                      </span>
                      {concept.source_trace.map((trace, i) => (
                        <blockquote key={i} className="border-l-2 border-blue-300 pl-2 text-muted-foreground italic">
                          "{trace.excerpt}"
                          <span className="text-xs text-muted-foreground ml-1">(segment {trace.segment_index})</span>
                        </blockquote>
                      ))}
                    </div>
                  )}

                  {concept.prerequisites.length > 0 && (
                    <div>
                      <span className="font-medium">Prérequis : </span>
                      <span className="text-muted-foreground">{concept.prerequisites.join(", ")}</span>
                    </div>
                  )}

                  {concept.relations.length > 0 && (
                    <div>
                      <span className="font-medium">Relations : </span>
                      <span className="text-muted-foreground">
                        {concept.relations.map((r) => `${r.target_key} (${r.relation_type})`).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          className="text-xs text-blue-500 hover:underline"
          onClick={() => setShowMore(true)}
        >
          Voir les {concepts.length - maxDisplay} concepts restants
        </button>
      )}
    </div>
  );
}
