// ============================================================
// ResumeLastActionCard — Resume where user left off
// ============================================================

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, ListChecks, Brain } from "lucide-react";

export type ResumeAction =
  | { type: "transformation"; id: string; title: string; format: string }
  | { type: "review_queue"; count: number }
  | { type: "pending_test"; transformationId: string; title: string };

interface ResumeLastActionCardProps {
  action: ResumeAction;
  onResume: () => void;
}

export function ResumeLastActionCard({ action, onResume }: ResumeLastActionCardProps) {
  const config = getConfig(action);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-primary/20 bg-primary/5 rounded-xl p-4 flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <config.icon className="w-5 h-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{config.title}</p>
        <p className="text-xs text-muted-foreground">{config.subtitle}</p>
      </div>

      <Button size="sm" className="gap-1 shrink-0" onClick={onResume}>
        Reprendre <ArrowRight className="w-3 h-3" />
      </Button>
    </motion.div>
  );
}

function getConfig(action: ResumeAction) {
  switch (action.type) {
    case "transformation":
      return {
        icon: BookOpen,
        title: action.title,
        subtitle: `Continuer votre ${action.format === "histoire_animee" ? "histoire" : "fiche"}`,
      };
    case "review_queue":
      return {
        icon: ListChecks,
        title: `${action.count} concept(s) a revoir`,
        subtitle: "Votre file de revision vous attend",
      };
    case "pending_test":
      return {
        icon: Brain,
        title: action.title,
        subtitle: "Test en attente",
      };
  }
}
