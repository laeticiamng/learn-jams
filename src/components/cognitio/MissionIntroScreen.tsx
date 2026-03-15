// ============================================================
// MissionIntroScreen — Rich intro screen with context, objectives,
// rules, room overview, and start button
// ============================================================

import { motion } from "framer-motion";
import {
  Play,
  DoorOpen,
  Crown,
  Clock,
  Target,
  Lightbulb,
  Swords,
  Shield,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MissionContent } from "@/domain/cognitio/types";
import { getBrickLabel } from "@/lib/cognitio-ui";

interface MissionIntroScreenProps {
  mission: MissionContent;
  onStart: () => void;
  universeTone?: string;
}

export default function MissionIntroScreen({
  mission,
  onStart,
  universeTone,
}: MissionIntroScreenProps) {
  const totalItems =
    mission.rooms.reduce((sum, r) => sum + r.items.length, 0) +
    (mission.boss?.items.length ?? 0);
  const estimatedMinutes = Math.ceil(totalItems * 0.5);
  const conceptCount = new Set(
    mission.rooms.flatMap((r) => r.target_concepts)
  ).size;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Title */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto"
        >
          <Swords className="w-8 h-8 text-primary" />
        </motion.div>
        <h1 className="text-2xl font-bold">{mission.title}</h1>
      </div>

      {/* Narrative intro */}
      <div className="glass-card p-5 rounded-xl">
        <p className="text-sm text-muted-foreground leading-relaxed italic">
          {mission.narrative_intro}
        </p>
      </div>

      {/* Mission stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={DoorOpen} value={mission.rooms.length} label="Salles" delay={0.1} />
        <StatCard icon={Target} value={totalItems} label="Épreuves" delay={0.15} />
        <StatCard icon={Clock} value={`~${estimatedMinutes}`} label="Minutes" delay={0.2} />
        <StatCard icon={BookOpen} value={conceptCount} label="Concepts" delay={0.25} />
      </div>

      {/* Room overview */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Structure de la mission
        </h2>
        {mission.rooms.map((room, i) => (
          <motion.div
            key={room.room_index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="flex items-center gap-3 p-3 rounded-xl border bg-background"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{room.title}</p>
              <p className="text-xs text-muted-foreground">
                {getBrickLabel(room.brick_type)} — {room.items.length}{" "}
                épreuve{room.items.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {room.time_limit_sec
                ? `${Math.ceil(room.time_limit_sec / 60)} min`
                : ""}
            </div>
          </motion.div>
        ))}

        {/* Boss room */}
        {mission.boss && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + mission.rooms.length * 0.08 }}
            className="flex items-center gap-3 p-3 rounded-xl border-2 border-red-500/20 bg-red-500/5"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-700 dark:text-red-400 truncate">
                {mission.boss.title}
              </p>
              <p className="text-xs text-red-600/70">
                {mission.boss.items.length} épreuves —{" "}
                {Math.ceil((mission.boss.time_limit_sec ?? 180) / 60)} min
              </p>
            </div>
            <Shield className="w-4 h-4 text-red-400 shrink-0" />
          </motion.div>
        )}
      </div>

      {/* Rules */}
      <div className="glass-card p-5 rounded-xl space-y-3">
        <h2 className="text-sm font-semibold">Règles de la mission</h2>
        <ul className="space-y-2">
          {[
            "Répondez à chaque épreuve en sélectionnant la bonne réponse.",
            "Indiquez votre niveau de confiance pour calibrer votre apprentissage.",
            "Utilisez les indices si vous êtes bloqué (3 niveaux, impact sur le score).",
            "Progressez de salle en salle jusqu'au boss final.",
            "Un débrief complet vous attend à la fin de la mission.",
          ].map((rule, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Start button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="pt-2"
      >
        <Button
          onClick={onStart}
          size="lg"
          className="w-full gradient-bg-premium rounded-xl gap-3 text-base py-6"
        >
          <Play className="w-5 h-5" />
          Commencer la mission
        </Button>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  delay,
}: {
  icon: typeof DoorOpen;
  value: string | number;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-3 rounded-xl text-center"
    >
      <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </motion.div>
  );
}
