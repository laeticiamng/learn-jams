// ============================================================
// FragilityMapCard — Visual map of concept fragility statuses
// ============================================================

import { motion } from "framer-motion";
import type { FragilityNode } from "@/domain/cognitio/recall.types";

interface FragilityMapCardProps {
  nodes: FragilityNode[];
}

const STATUS_CONFIG: Record<FragilityNode["status"], { label: string; color: string; bg: string }> = {
  mastered: { label: "Maîtrisé", color: "text-green-700", bg: "bg-green-100 border-green-300" },
  fragile: { label: "Fragile", color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-300" },
  failed: { label: "Non maîtrisé", color: "text-red-700", bg: "bg-red-100 border-red-300" },
  overconfident: { label: "Surconfiance", color: "text-orange-700", bg: "bg-orange-100 border-orange-300" },
  underconfident: { label: "Sous-confiance", color: "text-blue-700", bg: "bg-blue-100 border-blue-300" },
};

export function FragilityMapCard({ nodes }: FragilityMapCardProps) {
  if (nodes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-5 space-y-3"
    >
      <h3 className="text-sm font-semibold">Carte de fragilité</h3>

      <div className="grid gap-2">
        {nodes.map((node) => {
          const config = STATUS_CONFIG[node.status];
          return (
            <div
              key={node.concept_key}
              className={`flex items-center justify-between p-3 rounded-lg border ${config.bg}`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${config.color} truncate`}>{node.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {node.correct_count}/{node.total_count} correct
                  {" | "}
                  confiance moy. {node.avg_confidence.toFixed(1)}/5
                </p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${config.color}`}>
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
