// ============================================================
// MissionIntroScreen — Rich intro screen with context, objectives,
// rules, room overview, and start button
// ============================================================

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
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
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MissionContent } from "@/domain/cognitio/types";
import { getBrickLabel } from "@/lib/cognitio-ui";
import { MissionBriefingMap } from "@/experience/MissionBriefingMap";
import { useImmersionLevel } from "@/experience";

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
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const totalItems =
    mission.rooms.reduce((sum, r) => sum + r.items.length, 0) +
    (mission.boss?.items.length ?? 0);
  const estimatedMinutes = Math.ceil(totalItems * 0.5);
  const conceptCount = new Set(
    mission.rooms.flatMap((r) => r.target_concepts)
  ).size;

  // Experience Layer: immersive intro mood
  useImmersionLevel(2, { mood: "tension" });

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

      {/* Room overview — Immersive briefing map */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Structure de la mission
        </h2>
        <MissionBriefingMap
          rooms={mission.rooms.map((r) => ({
            title: r.title,
            itemsCount: r.items.length,
            brickType: r.brick_type,
          }))}
          hasBoss={!!mission.boss}
          bossTitle={mission.boss?.title}
          bossItemsCount={mission.boss?.items.length}
        />
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

      {/* Start buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="pt-2 space-y-3"
      >
        <Button
          onClick={onStart}
          size="lg"
          className="w-full gradient-bg-premium rounded-xl gap-3 text-base py-6"
        >
          <Play className="w-5 h-5" />
          Mode classique
        </Button>
        {id && (
          <Button
            onClick={() => navigate(`/mission/${id}/escape`)}
            size="lg"
            variant="outline"
            className="w-full rounded-xl gap-3 text-base py-6 border-primary/20 hover:bg-primary/5"
          >
            <KeyRound className="w-5 h-5 text-primary" />
            Mode Escape Game
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}

const StatCard = forwardRef<HTMLDivElement, {
  icon: typeof DoorOpen;
  value: string | number;
  label: string;
  delay: number;
}>(({ icon: Icon, value, label, delay }, ref) => {
  return (
    <motion.div
      ref={ref}
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
});

StatCard.displayName = "StatCard";
