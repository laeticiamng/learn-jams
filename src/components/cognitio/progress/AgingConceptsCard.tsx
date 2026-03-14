// ============================================================
// AgingConceptsCard — Concepts that need refreshing
// ============================================================

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import type { LearnerKnowledgeNode } from "@/domain/cognitio/types";

interface AgingConceptsCardProps {
  concepts: LearnerKnowledgeNode[];
}

export function AgingConceptsCard({ concepts }: AgingConceptsCardProps) {
  const aging = concepts.filter((c) => c.mastery_status === "aging");

  if (aging.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-orange-200 bg-orange-50/50 rounded-lg p-5 space-y-3"
    >
      <h3 className="text-sm font-semibold flex items-center gap-2 text-orange-700">
        <Clock className="w-4 h-4" /> A revoir bientot ({aging.length})
      </h3>

      <div className="space-y-2">
        {aging.slice(0, 6).map((c) => {
          const daysSince = c.last_seen_at
            ? Math.round((Date.now() - new Date(c.last_seen_at).getTime()) / (24 * 60 * 60 * 1000))
            : null;

          return (
            <div key={c.concept_stable_key} className="flex items-center justify-between text-xs">
              <span className="font-medium text-orange-800 truncate max-w-[60%]">
                {c.concept_stable_key}
              </span>
              <span className="text-orange-600">
                {daysSince !== null ? `${daysSince}j sans revision` : "Non vu"}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
