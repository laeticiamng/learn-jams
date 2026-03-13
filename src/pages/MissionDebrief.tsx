import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, BookOpen, ClipboardCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DebriefScoreCard from "@/components/cognitio/DebriefScoreCard";
import DebriefErrorTree from "@/components/cognitio/DebriefErrorTree";
import FallbackNotice from "@/components/cognitio/FallbackNotice";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageSEO } from "@/hooks/usePageSEO";
import type { MissionRun, CompositeScore, DebriefData, FallbackMode, QualityBand } from "@/domain/cognitio/types";
import { getQualityBand } from "@/domain/cognitio/validators";

export default function MissionDebrief() {
  usePageSEO({ title: "Débrief — COGNITIO", description: "Analyse de votre mission", noindex: true });
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [run, setRun] = useState<MissionRun | null>(null);
  const [missionData, setMissionData] = useState<{ fallback_mode: FallbackMode; quality_band: QualityBand; qa_score: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data: runData } = await supabase
          .from("mission_runs")
          .select("*, generated_missions (fallback_mode, quality_band, qa_score)")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (runData) {
          setRun(runData as unknown as MissionRun);
          const mission = (runData as Record<string, unknown>).generated_missions as Record<string, unknown> | null;
          if (mission) {
            setMissionData({
              fallback_mode: mission.fallback_mode as FallbackMode,
              quality_band: mission.quality_band as QualityBand,
              qa_score: mission.qa_score as number,
            });
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto pt-28 pb-16 px-4 max-w-3xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted/20 rounded-lg" />
            <div className="h-48 bg-muted/20 rounded-xl" />
            <div className="h-32 bg-muted/20 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto pt-28 pb-16 px-4 text-center">
          <p className="text-muted-foreground">Débrief introuvable</p>
          <Button onClick={() => navigate("/library")} className="mt-4">
            Retour à la bibliothèque
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const score = (typeof run.score_composite_json === "string"
    ? JSON.parse(run.score_composite_json)
    : run.score_composite_json) as CompositeScore;

  const debrief = (typeof run.debrief_json === "string"
    ? JSON.parse(run.debrief_json)
    : run.debrief_json) as DebriefData | null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto pt-28 pb-16 px-4 max-w-3xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/library")}
            className="gap-2 mb-4 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>

          <h1 className="font-display text-3xl font-bold mb-2">Débrief de mission</h1>
          <p className="text-muted-foreground">
            Analyse détaillée de votre performance
          </p>
        </motion.div>

        {/* Fallback notice */}
        {missionData && missionData.fallback_mode !== "full" && (
          <FallbackNotice
            fallbackMode={missionData.fallback_mode}
            qualityBand={missionData.quality_band}
            qualityScore={missionData.qa_score / 100}
          />
        )}

        {/* Score card */}
        <DebriefScoreCard score={score} />

        {/* Error tree & revision plan */}
        {debrief && (
          <DebriefErrorTree
            errors={debrief.error_tree}
            overconfidence={debrief.overconfidence_zones}
            revisionPlan={debrief.revision_plan}
            fragileConcepts={debrief.fragile_concepts}
          />
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => navigate(`/player/${run.mission_id}`)}
            variant="outline"
            className="gap-2 rounded-xl"
          >
            <RotateCcw className="w-4 h-4" /> Rejouer
          </Button>
          <Button
            onClick={() => navigate("/quiz")}
            className="gap-2 rounded-xl gradient-bg-premium"
          >
            <ClipboardCheck className="w-4 h-4" /> Lancer un re-test
          </Button>
          <Button
            onClick={() => navigate("/profile")}
            variant="ghost"
            className="gap-2 rounded-xl text-muted-foreground"
          >
            <BookOpen className="w-4 h-4" /> Voir mon profil mémoire
          </Button>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center border-t border-border/10 pt-6">
          Usage strictement pédagogique. Les contenus générés ne constituent pas un avis médical, juridique ou professionnel.
        </p>
      </div>
      <Footer />
    </div>
  );
}
