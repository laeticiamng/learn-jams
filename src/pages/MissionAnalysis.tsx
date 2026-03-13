import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnalysisPreviewCard from "@/components/cognitio/AnalysisPreviewCard";
import FallbackNotice from "@/components/cognitio/FallbackNotice";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageSEO } from "@/hooks/usePageSEO";
import { getQualityBand, getFallbackMode } from "@/domain/cognitio/validators";
import { getFallbackModeLabel, formatDuration } from "@/lib/cognitio-ui";
import type { AnalyzeOutput } from "@/domain/cognitio/contracts";
import type { QualityBand, FallbackMode } from "@/domain/cognitio/types";

export default function MissionAnalysis() {
  usePageSEO({ title: "Analyse — COGNITIO", description: "Analyse du contenu", noindex: true });
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<Record<string, unknown> | null>(null);
  const [concepts, setConcepts] = useState<AnalyzeOutput["concepts"]>([]);
  const [mission, setMission] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    const fetch = async () => {
      setLoading(true);
      try {
        // Get document
        const { data: doc } = await supabase
          .from("source_documents")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();
        setDocument(doc as Record<string, unknown> | null);

        if (doc) {
          // Get concepts via course profile
          const { data: profile } = await supabase
            .from("course_profiles")
            .select("id")
            .eq("document_id", doc.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (profile) {
            const { data: conceptData } = await supabase
              .from("concepts")
              .select("*")
              .eq("course_profile_id", profile.id)
              .order("criticality", { ascending: true });

            setConcepts(
              (conceptData ?? []).map((c: Record<string, unknown>) => ({
                stable_key: c.stable_key as string,
                label: c.label as string,
                definition: c.definition as string,
                criticality: c.criticality as 1 | 2 | 3 | 4,
                bloom_target: c.bloom_target as "remember",
                category: c.category as string,
                prerequisites: (c.prerequisites_json ?? []) as string[],
                source_confidence: c.source_confidence as number,
                source_trace: (c.source_trace_json ?? []) as { segment_index: number; excerpt: string }[],
              }))
            );
          }

          // Get mission
          const { data: missionData } = await supabase
            .from("generated_missions")
            .select("*")
            .eq("document_id", doc.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          setMission(missionData as Record<string, unknown> | null);
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
          </div>
        </div>
      </div>
    );
  }

  const qualityScore = (document?.quality_score as number) ?? 0;
  const qualityBand = getQualityBand(qualityScore);
  const fallbackMode = getFallbackMode(qualityBand);

  const analysisData: AnalyzeOutput = {
    course_profile_id: "",
    concepts,
    confusion_pairs: [],
    knowledge_type: "factual",
    structure_type: "linear",
    source_issues: [],
    total_concepts: concepts.length,
    critical_count: concepts.filter((c) => c.criticality === 1).length,
    estimated_complexity: Math.min(10, concepts.length),
    ambiguous_zones: [],
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto pt-28 pb-16 px-4 max-w-3xl space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button
            variant="ghost"
            onClick={() => navigate("/library")}
            className="gap-2 mb-4 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
          <h1 className="font-display text-3xl font-bold mb-2">
            Analyse: {(document?.original_filename as string) ?? "Document"}
          </h1>
          <p className="text-muted-foreground">
            Détails de l'analyse pédagogique du contenu source
          </p>
        </motion.div>

        <FallbackNotice
          fallbackMode={fallbackMode}
          qualityBand={qualityBand}
          qualityScore={qualityScore}
        />

        <AnalysisPreviewCard analysis={analysisData} qualityScore={qualityScore} />

        {mission && (
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(`/player/${mission.id}`)}
              className="gap-2 rounded-xl gradient-bg-premium"
            >
              <Play className="w-4 h-4" /> Jouer la mission
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center border-t border-border/10 pt-6">
          Usage strictement pédagogique. Les contenus générés ne constituent pas un avis médical, juridique ou professionnel.
        </p>
      </div>
      <Footer />
    </div>
  );
}
