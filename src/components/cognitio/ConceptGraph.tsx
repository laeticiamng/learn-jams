// ============================================================
// ConceptGraph — Visual concept map showing relations
// Nodes = concepts, colored by criticality.
// Links = relations (prerequisite, related, part_of, contrasts).
// ============================================================

import { forwardRef, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Network,
  Circle,
  ArrowRight,
  Layers,
  AlertTriangle,
  GitBranch,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AnalyzedConcept, AnalyzedConfusionPair, ConceptRelation } from "@/domain/cognitio/contracts";

interface ConceptGraphProps {
  concepts: AnalyzedConcept[];
  confusionPairs?: AnalyzedConfusionPair[];
}

type ViewMode = "graph" | "matrix";

const RELATION_LABELS: Record<string, { label: string; color: string }> = {
  prerequisite: { label: "Prérequis", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  related: { label: "Lié", color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
  part_of: { label: "Partie de", color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" },
  contrasts_with: { label: "Contraste", color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30" },
};

const CRITICALITY_COLORS: Record<number, string> = {
  1: "border-red-400 bg-red-50 dark:bg-red-950/20",
  2: "border-orange-400 bg-orange-50 dark:bg-orange-950/20",
  3: "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20",
  4: "border-blue-400 bg-blue-50 dark:bg-blue-950/20",
  5: "border-gray-300 bg-gray-50 dark:bg-gray-950/20",
};

export function ConceptGraph({ concepts, confusionPairs = [] }: ConceptGraphProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

  const conceptMap = useMemo(
    () => new Map(concepts.map(c => [c.stable_key, c])),
    [concepts],
  );

  // Build edge list
  const edges = useMemo(() => {
    const result: { from: string; to: string; type: string }[] = [];
    const seen = new Set<string>();
    for (const concept of concepts) {
      for (const rel of concept.relations) {
        const edgeKey = `${concept.stable_key}→${rel.target_key}→${rel.relation_type}`;
        if (!seen.has(edgeKey) && conceptMap.has(rel.target_key)) {
          seen.add(edgeKey);
          result.push({ from: concept.stable_key, to: rel.target_key, type: rel.relation_type });
        }
      }
    }
    return result;
  }, [concepts, conceptMap]);

  // Build confusion edge list
  const confusionEdges = useMemo(
    () => confusionPairs.filter(cp => conceptMap.has(cp.concept_a_key) && conceptMap.has(cp.concept_b_key)),
    [confusionPairs, conceptMap],
  );

  const totalRelations = edges.length + confusionEdges.length;

  if (concepts.length === 0) return null;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Network className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">
            {t("concept_graph.title", "Carte conceptuelle")}
          </span>
          <span className="text-xs text-muted-foreground">
            {concepts.length} {t("concept_graph.concepts", "concepts")} &middot; {totalRelations} {t("concept_graph.relations", "relations")}
          </span>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="px-4 pb-4"
        >
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
            {Object.entries(RELATION_LABELS).map(([type, config]) => (
              <span key={type} className={`px-1.5 py-0.5 rounded ${config.color}`}>
                {config.label}
              </span>
            ))}
            {confusionEdges.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-red-600 bg-red-100 dark:bg-red-900/30">
                Confusion
              </span>
            )}
          </div>

          {/* Concept nodes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {concepts.map((concept) => (
              <ConceptNode
                key={concept.stable_key}
                concept={concept}
                edges={edges.filter(e => e.from === concept.stable_key || e.to === concept.stable_key)}
                confusions={confusionEdges.filter(
                  cp => cp.concept_a_key === concept.stable_key || cp.concept_b_key === concept.stable_key,
                )}
                conceptMap={conceptMap}
                isSelected={selectedConcept === concept.stable_key}
                onSelect={() => setSelectedConcept(
                  selectedConcept === concept.stable_key ? null : concept.stable_key,
                )}
              />
            ))}
          </div>

          {/* Relation matrix (compact summary) */}
          {edges.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/20">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {t("concept_graph.relations_summary", "Résumé des relations")}
              </h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {edges.map((edge, i) => {
                  const from = conceptMap.get(edge.from);
                  const to = conceptMap.get(edge.to);
                  if (!from || !to) return null;
                  const config = RELATION_LABELS[edge.type] ?? RELATION_LABELS.related;
                  return (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <span className="font-medium truncate max-w-[120px]">{from.label}</span>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${config.color}`}>
                        {config.label}
                      </Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate max-w-[120px]">{to.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function ConceptNode({
  concept,
  edges,
  confusions,
  conceptMap,
  isSelected,
  onSelect,
}: {
  concept: AnalyzedConcept;
  edges: { from: string; to: string; type: string }[];
  confusions: AnalyzedConfusionPair[];
  conceptMap: Map<string, AnalyzedConcept>;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const critColor = CRITICALITY_COLORS[concept.criticality] ?? CRITICALITY_COLORS[5];
  const connectionCount = edges.length + confusions.length;

  return (
    <motion.button
      onClick={onSelect}
      className={`text-left p-3 rounded-lg border-2 transition-all ${critColor} ${
        isSelected ? "ring-2 ring-primary/40 shadow-md" : "hover:shadow-sm"
      }`}
      layout
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold block truncate">{concept.label}</span>
          <span className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
            {concept.definition}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <Badge variant="outline" className="text-[9px] px-1 py-0">
            C{concept.criticality}
          </Badge>
          {connectionCount > 0 && (
            <span className="text-[9px] text-muted-foreground">{connectionCount} liens</span>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-2 pt-2 border-t border-border/30 space-y-1.5"
        >
          <div className="flex flex-wrap gap-1">
            <span className="text-[9px] text-muted-foreground">Bloom: {concept.bloom_target}</span>
            <span className="text-[9px] text-muted-foreground">&middot; Conf: {Math.round(concept.source_confidence * 100)}%</span>
            {concept.uncertain && (
              <span className="text-[9px] text-orange-600 flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" /> Incertain
              </span>
            )}
          </div>

          {/* Relations from this node */}
          {edges.length > 0 && (
            <div className="space-y-0.5">
              {edges.map((edge, i) => {
                const targetKey = edge.from === concept.stable_key ? edge.to : edge.from;
                const target = conceptMap.get(targetKey);
                const direction = edge.from === concept.stable_key ? "→" : "←";
                const config = RELATION_LABELS[edge.type] ?? RELATION_LABELS.related;
                return (
                  <div key={i} className="text-[10px] flex items-center gap-1">
                    <span className={`px-1 rounded ${config.color}`}>{config.label}</span>
                    <span>{direction}</span>
                    <span className="font-medium truncate">{target?.label ?? targetKey}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Confusion pairs */}
          {confusions.length > 0 && (
            <div className="space-y-0.5">
              {confusions.map((cp, i) => {
                const otherKey = cp.concept_a_key === concept.stable_key ? cp.concept_b_key : cp.concept_a_key;
                const other = conceptMap.get(otherKey);
                return (
                  <div key={i} className="text-[10px] flex items-center gap-1 text-red-600">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>Confusion avec</span>
                    <span className="font-medium">{other?.label ?? otherKey}</span>
                    <span className="text-muted-foreground">(freq: {cp.frequency})</span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </motion.button>
  );
}
