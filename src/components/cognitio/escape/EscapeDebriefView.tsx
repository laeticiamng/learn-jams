// ============================================================
// EscapeDebriefView — End-of-mission debrief showing score,
// achievements, concept results, and next actions.
// ============================================================

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Trophy, Star, Brain, Clock, Target, ArrowRight,
  RotateCcw, BookOpen, Shield, Package,
} from "lucide-react";
import type { EscapeDebrief, Achievement, NextAction } from "@/domain/cognitio/escapeEngine.types";

interface EscapeDebriefViewProps {
  debrief: EscapeDebrief;
  missionTitle: string;
  onBackToLibrary: () => void;
  onReplay: () => void;
  onNextAction?: (action: NextAction) => void;
}

export default function EscapeDebriefView({
  debrief,
  missionTitle,
  onBackToLibrary,
  onReplay,
  onNextAction,
}: EscapeDebriefViewProps) {
  const scorePercentage = Math.round(debrief.accuracy * 100);
  const scoreColor = scorePercentage >= 80
    ? "text-green-500"
    : scorePercentage >= 60
      ? "text-amber-500"
      : "text-red-500";

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10"
        >
          <Trophy className="w-8 h-8 text-primary" />
        </motion.div>
        <h1 className="text-2xl font-bold">Mission terminée</h1>
        <p className="text-sm text-muted-foreground">{missionTitle}</p>
      </motion.div>

      {/* Score card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card-elevated p-6 rounded-2xl"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className={`text-3xl font-bold ${scoreColor}`}>{scorePercentage}%</p>
            <p className="text-xs text-muted-foreground mt-1">Précision</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{debrief.rooms_completed}/{debrief.total_rooms}</p>
            <p className="text-xs text-muted-foreground mt-1">Salles</p>
          </div>
          <div>
            <p className="text-3xl font-bold">
              {Math.floor(debrief.completion_time_sec / 60)}m
            </p>
            <p className="text-xs text-muted-foreground mt-1">Temps</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{debrief.achievements.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Succès</p>
          </div>
        </div>
      </motion.div>

      {/* Inventory summary */}
      {debrief.inventory_summary && debrief.inventory_summary.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-4 rounded-xl"
        >
          <h3 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground mb-3">
            <Package className="w-3.5 h-3.5" /> Collection
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold">
                {debrief.inventory_summary.collected}/{debrief.inventory_summary.total}
              </p>
              <p className="text-[10px] text-muted-foreground">Objets</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-500">
                {debrief.inventory_summary.key_items_collected}/{debrief.inventory_summary.key_items_total}
              </p>
              <p className="text-[10px] text-muted-foreground">Objets clés</p>
            </div>
            <div>
              <p className="text-lg font-bold text-orange-500">
                {debrief.inventory_summary.badges_earned}
              </p>
              <p className="text-[10px] text-muted-foreground">Badges</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Narrative */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-5 rounded-xl"
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {debrief.resolution_narrative}
        </p>
      </motion.div>

      {/* Achievements */}
      {debrief.achievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" /> Succès débloqués
          </h2>
          <div className="grid gap-2">
            {debrief.achievements.map((achievement, i) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/20 bg-accent/30"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRarityBg(achievement.rarity)}`}>
                  {getAchievementIcon(achievement.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{achievement.name}</p>
                  <p className="text-[10px] text-muted-foreground">{achievement.description}</p>
                </div>
                <span className={`text-[10px] font-medium ${getRarityColor(achievement.rarity)}`}>
                  {getRarityLabel(achievement.rarity)}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Concept results */}
      {debrief.concept_results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> Résultats par concept
          </h2>
          <div className="space-y-1.5">
            {debrief.concept_results.map((result) => (
              <div
                key={result.concept_key}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-border/10"
              >
                <div className={`w-2 h-2 rounded-full ${result.was_correct ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm flex-1 truncate">{result.concept_label}</span>
                <span className={`text-xs ${result.mastery_delta >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {result.mastery_delta >= 0 ? "+" : ""}{Math.round(result.mastery_delta * 100)}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Spaced repetition preview */}
      {debrief.spaced_repetition_items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-4 rounded-xl space-y-2"
        >
          <h3 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" /> Prochaines révisions planifiées
          </h3>
          <div className="space-y-1">
            {debrief.spaced_repetition_items.slice(0, 5).map((item) => (
              <div key={item.concept_key} className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">{item.concept_key}</span>
                <span className="text-muted-foreground/60 shrink-0 ml-2">
                  {formatReviewDate(item.next_review_at)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Next actions */}
      {debrief.next_actions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Target className="w-4 h-4" /> Actions recommandées
          </h2>
          <div className="space-y-2">
            {debrief.next_actions.map((action, i) => (
              <button
                key={i}
                onClick={() => onNextAction?.(action)}
                className="w-full text-left p-3 rounded-xl border border-border/20 hover:border-border/40 transition-all flex items-center gap-3"
              >
                {getActionIcon(action.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground">{action.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex items-center gap-3 pt-4"
      >
        <Button
          variant="outline"
          onClick={onReplay}
          className="gap-2 rounded-xl"
        >
          <RotateCcw className="w-4 h-4" /> Rejouer
        </Button>
        <Button
          onClick={onBackToLibrary}
          className="flex-1 gap-2 gradient-bg-premium rounded-xl"
        >
          Retour à la bibliothèque <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}

// ---------- Helpers ----------

function getRarityBg(rarity: Achievement["rarity"]): string {
  const map = {
    common: "bg-gray-200 dark:bg-gray-700",
    uncommon: "bg-green-100 dark:bg-green-900",
    rare: "bg-blue-100 dark:bg-blue-900",
    epic: "bg-purple-100 dark:bg-purple-900",
    legendary: "bg-amber-100 dark:bg-amber-900",
  };
  return map[rarity] ?? map.common;
}

function getRarityColor(rarity: Achievement["rarity"]): string {
  const map = {
    common: "text-gray-500",
    uncommon: "text-green-500",
    rare: "text-blue-500",
    epic: "text-purple-500",
    legendary: "text-amber-500",
  };
  return map[rarity] ?? map.common;
}

function getRarityLabel(rarity: Achievement["rarity"]): string {
  const map = {
    common: "Commun",
    uncommon: "Peu commun",
    rare: "Rare",
    epic: "Épique",
    legendary: "Légendaire",
  };
  return map[rarity] ?? "Commun";
}

function getAchievementIcon(icon: string) {
  const icons: Record<string, JSX.Element> = {
    trophy: <Trophy className="w-4 h-4 text-amber-500" />,
    brain: <Brain className="w-4 h-4 text-purple-500" />,
    star: <Star className="w-4 h-4 text-yellow-500" />,
    map: <Target className="w-4 h-4 text-blue-500" />,
    archive: <BookOpen className="w-4 h-4 text-emerald-500" />,
    zap: <Shield className="w-4 h-4 text-orange-500" />,
  };
  return icons[icon] ?? <Star className="w-4 h-4" />;
}

function getActionIcon(type: NextAction["type"]) {
  const icons: Record<string, JSX.Element> = {
    review: <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />,
    new_mission: <ArrowRight className="w-4 h-4 text-primary shrink-0" />,
    boss_challenge: <Shield className="w-4 h-4 text-purple-500 shrink-0" />,
    practice: <Brain className="w-4 h-4 text-blue-500 shrink-0" />,
  };
  return icons[type] ?? <ArrowRight className="w-4 h-4 shrink-0" />;
}

function formatReviewDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return "Demain";
  if (diffDays <= 7) return `Dans ${diffDays}j`;
  return `Dans ${Math.ceil(diffDays / 7)} sem.`;
}
