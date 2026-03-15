// ============================================================
// MissionPlay — Interactive escape game mission gameplay
// Phases: loading → intro → playing → completed
// ============================================================

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  ArrowLeft,
  Trophy,
  RotateCcw,
  Play,
  DoorOpen,
  Crown,
  Clock,
  Target,
  Lightbulb,
  Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MissionRoom from "@/components/cognitio/MissionRoom";
import MissionBoss from "@/components/cognitio/MissionBoss";
import MissionProgress from "@/components/cognitio/MissionProgress";
import { useMissionPlay } from "@/hooks/useMissionPlay";
import { useAuth } from "@/hooks/useAuth";
import { getBrickLabel } from "@/lib/cognitio-ui";
import type { MissionContent } from "@/domain/cognitio/types";

export default function MissionPlay() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    mission,
    phase,
    state,
    currentRoom,
    currentItem,
    totalRooms,
    progress,
    loading,
    timerEnabled,
    loadMission,
    startMission,
    submitAnswer,
    useHint,
    nextItem,
  } = useMissionPlay(id ?? "", user?.id ?? "");

  useEffect(() => {
    if (id && user?.id) {
      loadMission();
    }
  }, [id, user?.id, loadMission]);

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 className="w-8 h-8 text-primary" />
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  // Mission not found
  if (!mission) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">{t("mission.not_found", { defaultValue: "Mission introuvable." })}</p>
            <Button variant="outline" onClick={() => navigate("/cognitio-library")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("mission.back_library", { defaultValue: "Retour à la bibliothèque" })}
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ===================== INTRO SCREEN =====================
  if (phase === "intro") {
    const totalItems = mission.rooms.reduce((sum, r) => sum + r.items.length, 0) + (mission.boss?.items.length ?? 0);
    const estimatedMinutes = Math.ceil(totalItems * 0.5);

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-8 pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/cognitio-library")}
              className="gap-2 text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("mission.back_library", { defaultValue: "Retour à la bibliothèque" })}
            </Button>

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
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card p-4 rounded-xl text-center">
                <DoorOpen className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <p className="text-lg font-bold">{mission.rooms.length}</p>
                <p className="text-xs text-muted-foreground">
                  {t("mission.intro_rooms", { defaultValue: "Salles" })}
                </p>
              </div>
              <div className="glass-card p-4 rounded-xl text-center">
                <Target className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <p className="text-lg font-bold">{totalItems}</p>
                <p className="text-xs text-muted-foreground">
                  {t("mission.intro_challenges", { defaultValue: "Épreuves" })}
                </p>
              </div>
              <div className="glass-card p-4 rounded-xl text-center">
                <Clock className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <p className="text-lg font-bold">~{estimatedMinutes}</p>
                <p className="text-xs text-muted-foreground">
                  {t("mission.intro_minutes", { defaultValue: "Minutes" })}
                </p>
              </div>
            </div>

            {/* Room overview */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t("mission.intro_structure", { defaultValue: "Structure de la mission" })}
              </h2>
              {mission.rooms.map((room, i) => (
                <motion.div
                  key={room.room_index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-background"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{room.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {getBrickLabel(room.brick_type)} — {room.items.length} épreuve{room.items.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </motion.div>
              ))}
              {mission.boss && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + mission.rooms.length * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-red-500/20 bg-red-500/5"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <Crown className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400 truncate">{mission.boss.title}</p>
                    <p className="text-xs text-red-600/70">
                      {mission.boss.items.length} épreuves — {Math.ceil(mission.boss.time_limit_sec / 60)} min
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Rules */}
            <div className="glass-card p-5 rounded-xl space-y-3">
              <h2 className="text-sm font-semibold">
                {t("mission.intro_rules_title", { defaultValue: "Règles" })}
              </h2>
              <ul className="space-y-2">
                {[
                  t("mission.intro_rule_1", { defaultValue: "Répondez à chaque épreuve en sélectionnant la bonne réponse." }),
                  t("mission.intro_rule_2", { defaultValue: "Indiquez votre niveau de confiance pour calibrer votre apprentissage." }),
                  t("mission.intro_rule_3", { defaultValue: "Utilisez les indices si vous êtes bloqué (impact sur le score)." }),
                  t("mission.intro_rule_4", { defaultValue: "Progressez de salle en salle jusqu'au boss final." }),
                  t("mission.intro_rule_5", { defaultValue: "Un débrief complet vous attend à la fin de la mission." }),
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
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
                onClick={startMission}
                size="lg"
                className="w-full gradient-bg-premium rounded-xl gap-3 text-base py-6"
              >
                <Play className="w-5 h-5" />
                {t("mission.start_button", { defaultValue: "Commencer la mission" })}
              </Button>
            </motion.div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // ===================== COMPLETED SCREEN =====================
  if (phase === "completed") {
    const correctCount = state.events.filter((e) => e.is_correct).length;
    const totalCount = state.events.length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const hintsUsedCount = state.hintsUsed.size;

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-8 pt-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
            >
              <Trophy className="w-10 h-10 text-primary" />
            </motion.div>

            <h1 className="text-2xl font-bold">
              {t("mission.completed_title", { defaultValue: "Mission accomplie !" })}
            </h1>

            {/* Score summary */}
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              <div className="glass-card p-3 rounded-xl">
                <p className="text-2xl font-bold text-primary">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Précision</p>
              </div>
              <div className="glass-card p-3 rounded-xl">
                <p className="text-2xl font-bold text-green-600">{correctCount}/{totalCount}</p>
                <p className="text-xs text-muted-foreground">Correctes</p>
              </div>
              <div className="glass-card p-3 rounded-xl">
                <p className="text-2xl font-bold text-yellow-600">{hintsUsedCount}</p>
                <p className="text-xs text-muted-foreground">Indices</p>
              </div>
            </div>

            {/* Error summary */}
            {state.events.some((e) => !e.is_correct) && (
              <div className="glass-card p-4 rounded-xl text-left space-y-2 max-w-sm mx-auto">
                <p className="text-sm font-semibold">
                  {t("mission.errors_title", { defaultValue: "Notions à revoir" })}
                </p>
                {state.events
                  .filter((e) => !e.is_correct)
                  .slice(0, 5)
                  .map((e, i) => {
                    const conceptLabel = resolveConceptFromEvents(e.item_id, mission);
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        {conceptLabel}
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <Button onClick={() => navigate(`/mission/${id}/debrief`)} className="gap-2">
                {t("mission.view_debrief", { defaultValue: "Voir le débrief complet" })}
              </Button>
              <Button variant="outline" onClick={() => navigate("/cognitio-library")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                {t("mission.back_library", { defaultValue: "Retour à la bibliothèque" })}
              </Button>
              <Button variant="ghost" onClick={() => window.location.reload()} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                {t("mission.replay", { defaultValue: "Rejouer" })}
              </Button>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // ===================== PLAYING SCREEN =====================
  const roomBricks = mission.rooms.map((r) => r.items[0]?.type ?? "TRI");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 pt-24">
        {/* Mission Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/cognitio-library")}
            className="gap-2 mb-3 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("mission.quit", { defaultValue: "Quitter la mission" })}
          </Button>

          <h1 className="text-lg font-bold">{mission.title}</h1>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <MissionProgress
            currentRoomIndex={state.currentRoomIndex}
            totalRooms={totalRooms}
            isBoss={state.isBoss}
            progress={progress}
            roomBricks={roomBricks}
          />
        </div>

        {/* Gameplay */}
        <AnimatePresence mode="wait">
          {state.isBoss && mission.boss ? (
            <motion.div
              key="boss"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MissionBoss
                boss={mission.boss}
                currentItemIndex={state.currentItemIndex}
                timerEnabled={timerEnabled}
                onSubmit={submitAnswer}
                onHint={useHint}
                onNext={nextItem}
              />
            </motion.div>
          ) : currentRoom && currentItem ? (
            <motion.div
              key={`room-${state.currentRoomIndex}-item-${state.currentItemIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MissionRoom
                roomTitle={currentRoom.title}
                brickType={currentItem.type}
                narrativeContext={currentRoom.narrative_context}
                item={currentItem}
                itemIndex={state.currentItemIndex}
                totalItems={currentRoom.items.length}
                timerEnabled={timerEnabled}
                timeLimitSec={currentRoom.time_limit_sec}
                onSubmit={submitAnswer}
                onHint={useHint}
                onNext={nextItem}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

function resolveConceptFromEvents(itemId: string, mission: MissionContent | null): string {
  if (!mission) return itemId;
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
