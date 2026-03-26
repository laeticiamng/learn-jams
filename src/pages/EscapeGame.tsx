// ============================================================
// EscapeGame Page — Loads a mission and converts it to an
// escape game session, then renders the full escape game
// experience.
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EscapeGamePlayerLayout from "@/components/cognitio/escape/EscapeGamePlayerLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { MissionContent } from "@/domain/cognitio/types";
import type { EscapeGameSession } from "@/domain/cognitio/escapeEngine.types";
import { convertMissionToEscapeGame } from "@/services/cognitio/escapeGameBuilder";
import { selectMissionFamily, selectUniverseProfile } from "@/domain/cognitio/escapeGame.types";
import { usePageSEO } from "@/hooks/usePageSEO";

/** Derive a document domain key from mission family for immersive profile lookup */
function missionFamilyToDomain(family: string, topic: string): string {
  switch (family) {
    case "clinical_simulation": return "medical_clinical";
    case "legal_reasoning": return "law";
    case "scientific_discovery": return "fundamental_science";
    case "logic_sequencing": return "computer_science";
    case "investigation": return "history";
    default: return "general";
  }
}

export default function EscapeGame() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  usePageSEO({ title: "Escape Game", description: "Mission d'apprentissage interactive", noindex: true });
  const [session, setSession] = useState<EscapeGameSession | null>(null);
  const [domain, setDomain] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user?.id) return;

    async function loadAndConvert() {
      setLoading(true);
      setError(null);

      try {
        // Load mission
        const { data: missionData, error: missionError } = await supabase
          .from("generated_missions")
          .select("mission_json, generation_mode")
          .eq("id", id!)
          .single();

        if (missionError) throw missionError;

        const missionContent = (typeof missionData.mission_json === "string"
          ? JSON.parse(missionData.mission_json)
          : missionData.mission_json) as MissionContent;

        // Load course profile for topic info
        const { data: profileData } = await supabase
          .from("generated_missions")
          .select("course_profile_id")
          .eq("id", id!)
          .single();

        let mainTopic = missionContent.title.replace(/^Mission:\s*/i, "");

        if (profileData?.course_profile_id) {
          const { data: courseData } = await supabase
            .from("course_profiles")
            .select("main_topic")
            .eq("id", profileData.course_profile_id)
            .single();
          if (courseData?.main_topic) {
            mainTopic = courseData.main_topic;
          }
        }

        // Determine mission family and universe from topic
        const missionFamily = selectMissionFamily(mainTopic, "university");
        const universeProfile = selectUniverseProfile("university");
        const resolvedDomain = missionFamilyToDomain(missionFamily, mainTopic);

        // Convert to escape game session (enriched with immersive universe profiles)
        const escapeSession = await convertMissionToEscapeGame(
          missionContent,
          id!,
          user!.id,
          missionFamily,
          universeProfile,
          mainTopic,
          resolvedDomain,
        );

        setDomain(resolvedDomain);
        setSession(escapeSession);
      } catch (err: unknown) {
        console.error("Failed to load escape game:", err);
        setError("Impossible de charger la mission. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    }

    loadAndConvert();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when user id changes, not the full user object
  }, [id, user?.id]);

  // Loading — cinematic establishing shot for the escape world
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {/* Background pulse */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 40%, hsl(265 90% 60% / 0.04), transparent 60%)" }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-6 relative z-10"
          >
            {/* Orbital loader */}
            <div className="relative w-24 h-24 mx-auto">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/10 border-t-primary/40"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-3 rounded-full border border-primary/5 border-b-primary/20"
                animate={{ rotate: -360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-6 rounded-full"
                style={{ background: "radial-gradient(circle, hsl(265 90% 60% / 0.12), transparent 70%)" }}
                animate={{ scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Loader2 className="w-5 h-5 text-primary/60" />
                </motion.div>
              </div>
            </div>
            <div className="space-y-2">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm font-medium text-foreground/80 tracking-wide"
              >
                Préparation de l'escape game
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xs text-muted-foreground/50"
              >
                Construction du monde immersif...
              </motion.p>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error
  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md px-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              {error ?? "Session introuvable."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate("/cognitio-library")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Bibliothèque
              </Button>
              <Button
                onClick={() => id && navigate(`/mission/${id}/play`)}
              >
                Mode classique
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Main escape game
  return (
    <EscapeGamePlayerLayout
      session={session}
      missionId={id ?? ""}
      domain={domain}
    />
  );
}
