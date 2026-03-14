// ============================================================
// ReviewQueueCard — Actionable review queue
// ============================================================

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ListChecks, ArrowRight } from "lucide-react";
import type { ReviewQueueItem, ReviewReason, ReviewAction } from "@/domain/cognitio/longitudinal.types";

interface ReviewQueueCardProps {
  queue: ReviewQueueItem[];
  onStartReview?: (item: ReviewQueueItem) => void;
}

const REASON_LABELS: Record<ReviewReason, string> = {
  fragile: "Encore fragile",
  aging: "A revoir",
  high_confusion: "Confusions frequentes",
  low_calibration: "Surconfiance detectee",
  missed_recently: "Rate recemment",
};

const ACTION_LABELS: Record<ReviewAction, string> = {
  quick_review: "Revision rapide",
  retest: "Retester",
  full_regeneration: "Regenerer le contenu",
  contrast_drill: "Exercice de distinction",
};

const REASON_COLORS: Record<ReviewReason, string> = {
  fragile: "bg-red-100 text-red-700",
  aging: "bg-orange-100 text-orange-700",
  high_confusion: "bg-amber-100 text-amber-700",
  low_calibration: "bg-purple-100 text-purple-700",
  missed_recently: "bg-pink-100 text-pink-700",
};

export function ReviewQueueCard({ queue, onStartReview }: ReviewQueueCardProps) {
  if (queue.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border rounded-lg p-5"
      >
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
          <ListChecks className="w-4 h-4 text-muted-foreground" /> File de revision
        </h3>
        <p className="text-xs text-muted-foreground">Pas de revision en attente. Continuez !</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" /> File de revision
        </h3>
        <span className="text-xs text-muted-foreground">{queue.length} concept(s)</span>
      </div>

      <div className="space-y-2">
        {queue.slice(0, 6).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/30 bg-card/40"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{item.concept_stable_key}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${REASON_COLORS[item.reason]}`}>
                  {REASON_LABELS[item.reason]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {ACTION_LABELS[item.recommended_action]}
                </span>
              </div>
            </div>

            {onStartReview && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onStartReview(item)}
              >
                <ArrowRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {queue.length > 6 && (
        <p className="text-[10px] text-muted-foreground text-center">
          + {queue.length - 6} autre(s) concept(s) a revoir
        </p>
      )}
    </motion.div>
  );
}
