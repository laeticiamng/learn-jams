// ============================================================
// MissionPlay — Interactive escape game mission gameplay
// Uses the new MissionPlayerLayout for full interactive experience
// Phases: loading → intro → playing → boss → completed
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MissionPlayerLayout from "@/components/cognitio/MissionPlayerLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { MissionContent, RoomEvent, CompositeScore } from "@/domain/cognitio/types";
import {
  createMissionRun,
  completeMissionRun,
  saveMissionProgress,
  type MissionRunState,
} from "@/services/cognitio/missionRunService";

export default function MissionPlay() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mission, setMission] = useState<MissionContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [runId, setRunId] = useState<string | null>(null);

  // Load mission from database
  useEffect(() => {
    if (!id || !user?.id) return;

    async function loadMission() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("generated_missions")
          .select("mission_json")
          .eq("id", id!)
          .single();

        if (error) throw error;

        const missionContent = (typeof data.mission_json === "string"
          ? JSON.parse(data.mission_json)
          : data.mission_json) as MissionContent;

        setMission(missionContent);
      } catch (err: unknown) {
        console.error("Failed to load mission:", err);
      } finally {
        setLoading(false);
      }
    }

    loadMission();
  }, [id, user?.id]);

  // Handle mission started — create a run
  const handleMissionStarted = useCallback(async () => {
    if (!id || !user?.id) return;
    try {
      const newRunId = await createMissionRun(id, user.id);
      setRunId(newRunId);
    } catch (err: unknown) {
      console.error("Failed to create mission run:", err);
    }
  }, [id, user?.id]);

  // Handle mission completed — save final results
  const handleMissionCompleted = useCallback(
    async (events: RoomEvent[], score: CompositeScore) => {
      if (!runId || !mission || !user?.id) return;
      try {
        const state: MissionRunState = {
          run_id: runId,
          mission_id: id ?? "",
          user_id: user.id,
          current_room_index: mission.rooms.length,
          current_item_index: 0,
          is_boss: false,
          events,
          hint_records: new Map(),
          score_running: score.total,
          started_at: new Date().toISOString(),
          last_saved_at: null,
        };
        await completeMissionRun(state, mission);
      } catch (err: unknown) {
        console.error("Failed to complete mission run:", err);
      }
    },
    [runId, mission, id, user?.id]
  );

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
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
            <p className="text-muted-foreground">
              {t("mission.not_found", { defaultValue: "Mission introuvable." })}
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/cognitio-library")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("mission.back_library", {
                defaultValue: "Retour à la bibliothèque",
              })}
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Main player
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* CTA: Switch to immersive escape game mode */}
        <div className="max-w-3xl mx-auto px-4 pt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/mission/${id}/escape`)}
            className="gap-2"
          >
            <Gamepad2 className="w-4 h-4" />
            {t("mission.escape_mode", { defaultValue: "Mode Escape Game" })}
          </Button>
        </div>
        <MissionPlayerLayout
          mission={mission}
          missionId={id ?? ""}
          onMissionStarted={handleMissionStarted}
          onMissionCompleted={handleMissionCompleted}
        />
      </main>
      <Footer />
    </div>
  );
}
