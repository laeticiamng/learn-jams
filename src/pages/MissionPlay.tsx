// ============================================================
// MissionPlay — Interactive escape game mission gameplay
// ============================================================

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MissionRoom from "@/components/cognitio/MissionRoom";
import MissionBoss from "@/components/cognitio/MissionBoss";
import MissionProgress from "@/components/cognitio/MissionProgress";
import { useMissionPlay } from "@/hooks/useMissionPlay";
import { useAuth } from "@/hooks/useAuth";

export default function MissionPlay() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    mission,
    state,
    currentRoom,
    currentItem,
    totalRooms,
    progress,
    loading,
    timerEnabled,
    loadMission,
    submitAnswer,
    useHint,
    nextItem,
  } = useMissionPlay(id ?? "", user?.id ?? "");

  useEffect(() => {
    if (id && user?.id) {
      loadMission();
    }
  }, [id, user?.id, loadMission]);

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

  // Mission completed — show completion screen
  if (state.isCompleted) {
    const correctCount = state.events.filter((e) => e.is_correct).length;
    const totalCount = state.events.length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

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
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">
              {t("mission.completed_title", { defaultValue: "Mission accomplie !" })}
            </h1>
            <p className="text-muted-foreground">
              {t("mission.completed_score", {
                defaultValue: "{{correct}}/{{total}} réponses correctes ({{accuracy}}%)",
                correct: correctCount,
                total: totalCount,
                accuracy,
              })}
            </p>

            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <Button onClick={() => navigate(`/mission/${id}/debrief`)} className="gap-2">
                {t("mission.view_debrief", { defaultValue: "Voir le débrief" })}
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
              key={`room-${state.currentRoomIndex}`}
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
