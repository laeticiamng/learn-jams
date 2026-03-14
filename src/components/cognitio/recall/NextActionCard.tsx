// ============================================================
// NextActionCard — Recommended next action after debrief
// ============================================================

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BookOpen, RotateCcw, Target, ArrowRight } from "lucide-react";
import type { DebriefReport } from "@/domain/cognitio/recall.types";

interface NextActionCardProps {
  nextAction: DebriefReport["next_action"];
  recommendations: string[];
  onAction?: (action: DebriefReport["next_action"]) => void;
}

const ACTION_CONFIG: Record<DebriefReport["next_action"], { label: string; description: string; icon: typeof BookOpen; color: string }> = {
  review_sheet: {
    label: "Relire la fiche",
    description: "Plusieurs notions ne sont pas maîtrisées. Relisez le contenu avant de retenter.",
    icon: BookOpen,
    color: "text-red-600",
  },
  review_fragile: {
    label: "Revoir les notions fragiles",
    description: "Certaines notions sont fragiles ou marquées par de la surconfiance. Ciblez votre révision.",
    icon: Target,
    color: "text-orange-600",
  },
  retest: {
    label: "Retenter le test",
    description: "Votre score est en progrès. Un nouveau test confirmera votre maîtrise.",
    icon: RotateCcw,
    color: "text-yellow-600",
  },
  continue: {
    label: "Continuer",
    description: "Vous maîtrisez bien le contenu. Passez à la suite !",
    icon: ArrowRight,
    color: "text-green-600",
  },
};

export function NextActionCard({ nextAction, recommendations, onAction }: NextActionCardProps) {
  const config = ACTION_CONFIG[nextAction];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-5 space-y-4"
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${config.color}`} />
        <div>
          <h3 className={`text-sm font-semibold ${config.color}`}>{config.label}</h3>
          <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
        </div>
      </div>

      {recommendations.length > 0 && (
        <ul className="space-y-1">
          {recommendations.map((rec, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <span className="text-primary mt-0.5">-</span>
              {rec}
            </li>
          ))}
        </ul>
      )}

      {onAction && (
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => onAction(nextAction)}
        >
          <Icon className="w-3.5 h-3.5 mr-1.5" />
          {config.label}
        </Button>
      )}
    </motion.div>
  );
}
