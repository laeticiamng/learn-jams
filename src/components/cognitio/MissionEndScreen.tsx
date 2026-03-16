// ============================================================
// MissionEndScreen — Final debrief with score, error summary,
// concepts to review, and action buttons
// ============================================================

import { motion } from "framer-motion";
import {
  Trophy,
  Target,
  AlertTriangle,
  BookOpen,
  ArrowLeft,
  RotateCcw,
  BarChart2,
  Lightbulb,
  Percent,
  Clock,
  Zap,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CompositeScore, RoomEvent, MissionContent } from "@/domain/cognitio/types";
import type { RoomProgress } from "@/services/cognitio/missionRunService";

interface MissionEndScreenProps {
  mission: MissionContent;
  events: RoomEvent[];
  score: CompositeScore;
  roomProgress: RoomProgress[];
  totalTimeSec: number;
  hintsUsedCount: number;
  onViewDebrief: () => void;
  onBackToLibrary: () => void;
  onReplay: () => void;
  onEscapeGame?: () => void;
}

export default function MissionEndScreen({
  mission,
  events,
  score,
  roomProgress,
  totalTimeSec,
  hintsUsedCount,
  onViewDebrief,
  onBackToLibrary,
  onReplay,
  onEscapeGame,
}: MissionEndScreenProps) {
  const correctCount = events.filter((e) => e.is_correct).length;
  const totalCount = events.length;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const incorrectEvents = events.filter((e) => !e.is_correct);

  // Determine performance level
  const performanceLevel = getPerformanceLevel(score.total);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Trophy + Title */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
            performanceLevel === "excellent"
              ? "bg-yellow-500/10"
              : performanceLevel === "good"
                ? "bg-green-500/10"
                : performanceLevel === "medium"
                  ? "bg-blue-500/10"
                  : "bg-orange-500/10"
          }`}
        >
          <Trophy
            className={`w-10 h-10 ${
              performanceLevel === "excellent"
                ? "text-yellow-500"
                : performanceLevel === "good"
                  ? "text-green-500"
                  : performanceLevel === "medium"
                    ? "text-blue-500"
                    : "text-orange-500"
            }`}
          />
        </motion.div>
        <h1 className="text-2xl font-bold">Mission accomplie !</h1>
        <p className="text-sm text-muted-foreground">
          {getPerformanceMessage(performanceLevel)}
        </p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 gap-3">
        <ScoreCard
          icon={Percent}
          label="Précision"
          value={`${accuracy}%`}
          color={accuracy >= 80 ? "green" : accuracy >= 60 ? "yellow" : "red"}
          delay={0.1}
        />
        <ScoreCard
          icon={Target}
          label="Correctes"
          value={`${correctCount}/${totalCount}`}
          color="blue"
          delay={0.15}
        />
        <ScoreCard
          icon={Lightbulb}
          label="Indices"
          value={String(hintsUsedCount)}
          color="yellow"
          delay={0.2}
        />
        <ScoreCard
          icon={Clock}
          label="Temps"
          value={formatDuration(totalTimeSec)}
          color="purple"
          delay={0.25}
        />
      </div>

      {/* Score breakdown */}
      <div className="glass-card p-5 rounded-xl space-y-3">
        <h2 className="text-sm font-semibold">Score détaillé</h2>
        <div className="space-y-2">
          <ScoreBar label="Précision" value={score.accuracy} />
          <ScoreBar label="Calibration confiance" value={score.confidence_calibration} />
          <ScoreBar label="Couverture Bloom" value={score.bloom_coverage} />
          <ScoreBar label="Détection des pièges" value={score.trap_detection} />
        </div>
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Score total</span>
            <span className="text-lg font-bold text-primary">{score.total}/100</span>
          </div>
        </div>
      </div>

      {/* Room progress */}
      <div className="glass-card p-5 rounded-xl space-y-3">
        <h2 className="text-sm font-semibold">Progression par salle</h2>
        {roomProgress.map((room) => (
          <div key={room.room_index} className="flex items-center gap-3 text-sm">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                room.correct_count === room.items_total
                  ? "bg-green-500 text-white"
                  : room.correct_count > 0
                    ? "bg-yellow-500 text-white"
                    : "bg-red-500 text-white"
              }`}
            >
              {room.room_index === -1 ? "B" : room.room_index + 1}
            </div>
            <span className="flex-1 truncate">{room.room_title}</span>
            <span className="text-muted-foreground tabular-nums">
              {room.correct_count}/{room.items_total}
            </span>
          </div>
        ))}
      </div>

      {/* Errors / concepts to review */}
      {incorrectEvents.length > 0 && (
        <div className="glass-card p-5 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold">Notions à revoir</h2>
          </div>
          {incorrectEvents.slice(0, 8).map((e, i) => {
            const conceptLabel = findConceptLabel(e.item_id, mission);
            return (
              <div
                key={i}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="truncate">{conceptLabel}</span>
                {e.confidence > 0.7 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 shrink-0">
                    surconfiance
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recall plan */}
      <div className="glass-card p-5 rounded-xl space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Plan de rappel</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Un rappel J+1 vous sera proposé demain pour consolider les notions fragiles.
          Un second rappel J+7 renforcera votre mémoire à long terme.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        {onEscapeGame && (
          <Button onClick={onEscapeGame} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Compass className="w-4 h-4" />
            Escape Game immersif
          </Button>
        )}
        <Button onClick={onViewDebrief} className="gap-2">
          <BarChart2 className="w-4 h-4" />
          Débrief complet
        </Button>
        <Button variant="outline" onClick={onBackToLibrary} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Bibliothèque
        </Button>
        <Button variant="ghost" onClick={onReplay} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Rejouer
        </Button>
      </div>
    </motion.div>
  );
}

// ---------- Sub-components ----------

function ScoreCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  const colorClasses: Record<string, string> = {
    green: "text-green-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-4 rounded-xl text-center"
    >
      <Icon className={`w-4 h-4 ${colorClasses[color] ?? "text-primary"} mx-auto mb-1`} />
      <p className={`text-xl font-bold ${colorClasses[color] ?? "text-primary"}`}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </motion.div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{percent}%</span>
      </div>
      <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            percent >= 80
              ? "bg-green-500"
              : percent >= 60
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />
      </div>
    </div>
  );
}

// ---------- Helpers ----------

function getPerformanceLevel(totalScore: number): "excellent" | "good" | "medium" | "needs_work" {
  if (totalScore >= 85) return "excellent";
  if (totalScore >= 70) return "good";
  if (totalScore >= 50) return "medium";
  return "needs_work";
}

function getPerformanceMessage(level: string): string {
  switch (level) {
    case "excellent":
      return "Performance exceptionnelle ! Vous maîtrisez ce sujet.";
    case "good":
      return "Bon travail ! Quelques points restent à consolider.";
    case "medium":
      return "Résultat encourageant. Continuez vos efforts !";
    default:
      return "Des bases à renforcer. Le débrief vous guidera.";
  }
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

function findConceptLabel(itemId: string, mission: MissionContent): string {
  for (const room of mission.rooms) {
    const item = room.items.find((i) => i.id === itemId);
    if (item) return item.concept_key;
  }
  if (mission.boss) {
    const item = mission.boss.items.find((i) => i.id === itemId);
    if (item) return item.concept_key;
  }
  return itemId;
}
