// ============================================================
// ConfusionMapCard — Detected confusion pairs from grading
// ============================================================

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { ConfusionMapEntry } from "@/domain/cognitio/recall.types";

interface ConfusionMapCardProps {
  entries: ConfusionMapEntry[];
}

export function ConfusionMapCard({ entries }: ConfusionMapCardProps) {
  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-amber-200 bg-amber-50 rounded-lg p-5 space-y-3"
    >
      <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-800">
        <AlertTriangle className="w-4 h-4" /> Confusions détectées
      </h3>

      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className="font-medium text-amber-900">{entry.concept_a}</span>
            <span className="text-amber-600">&#8596;</span>
            <span className="font-medium text-amber-900">{entry.concept_b}</span>
            <span className="text-[10px] text-amber-600 ml-auto">
              {entry.confusion_count} erreur(s)
            </span>
          </div>
        ))}
      </div>

      {entries[0]?.distinction_key && (
        <p className="text-xs text-amber-700 mt-2">
          Clé de distinction : {entries[0].distinction_key}
        </p>
      )}
    </motion.div>
  );
}
