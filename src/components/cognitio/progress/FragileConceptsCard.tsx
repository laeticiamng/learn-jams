// ============================================================
// FragileConceptsCard — List of fragile/emerging concepts
// ============================================================

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { LearnerKnowledgeNode } from "@/domain/cognitio/types";

interface FragileConceptsCardProps {
  concepts: LearnerKnowledgeNode[];
}

export function FragileConceptsCard({ concepts }: FragileConceptsCardProps) {
  if (concepts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border rounded-lg p-5"
      >
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-muted-foreground" /> Concepts fragiles
        </h3>
        <p className="text-xs text-muted-foreground">Aucun concept fragile pour le moment.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-red-200 bg-red-50/50 rounded-lg p-5 space-y-3"
    >
      <h3 className="text-sm font-semibold flex items-center gap-2 text-red-700">
        <AlertTriangle className="w-4 h-4" /> Concepts fragiles ({concepts.length})
      </h3>

      <div className="space-y-2">
        {concepts.slice(0, 8).map((c) => (
          <div key={c.concept_stable_key} className="flex items-center justify-between text-xs">
            <span className="font-medium text-red-800 truncate max-w-[60%]">
              {c.concept_stable_key}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-red-600">
                {Math.round(c.mastery_score * 100)}%
              </span>
              {c.confusion_hits > 0 && (
                <span className="text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded text-[10px]">
                  {c.confusion_hits} confusion(s)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {concepts.length > 8 && (
        <p className="text-[10px] text-red-600">+ {concepts.length - 8} autre(s)</p>
      )}
    </motion.div>
  );
}
