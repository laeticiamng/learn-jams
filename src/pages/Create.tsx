import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Play, Eye } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImportDropzone from "@/components/cognitio/ImportDropzone";
import IngestionStatus from "@/components/cognitio/IngestionStatus";
import FallbackNotice from "@/components/cognitio/FallbackNotice";
import { useAuth } from "@/hooks/useAuth";
import { useMissionGeneration } from "@/hooks/useMissionGeneration";
import { usePageSEO } from "@/hooks/usePageSEO";
import { getQualityBand, getFallbackMode } from "@/domain/cognitio/validators";
import { getFallbackModeLabel, formatDuration } from "@/lib/cognitio-ui";
import type { ContentType, LearningObjective } from "@/domain/cognitio/types";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

export default function Create() {
  usePageSEO({
    title: "Importer & Transformer — COGNITIO",
    description: "Importez un cours et transformez-le en mission pédagogique interactive.",
    noindex: true,
  });

  const navigate = useNavigate();
  const { user } = useAuth();
  const { steps, isRunning, error, result, qaResult, generate, reset } = useMissionGeneration();

  const [hasStarted, setHasStarted] = useState(false);

  const handleImport = (data: {
    file?: File;
    pasted_text?: string;
    content_type: ContentType;
    objective: LearningObjective;
  }) => {
    setHasStarted(true);
    generate(data);
  };

  const isComplete = result !== null;
  const qualityBand = result ? getQualityBand(result.quality_band === "excellent" ? 0.9 : result.quality_band === "good" ? 0.75 : result.quality_band === "medium" ? 0.6 : result.quality_band === "poor" ? 0.45 : 0.3) : null;
  const fallbackMode = result?.fallback_mode ?? null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent_70%)]" />

      <Navbar />

      <div className="container mx-auto pt-24 sm:pt-28 pb-16 px-4 max-w-3xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 tracking-tight">
              Importer & Transformer
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
              Importez votre cours et laissez COGNITIO le transformer en mission d'apprentissage interactive.
            </p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!hasStarted && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease }}
            >
              <ImportDropzone onImport={handleImport} disabled={isRunning} />

              {/* Pedagogical disclaimer */}
              <p className="text-xs text-muted-foreground text-center mt-8">
                Usage strictement pédagogique. Les contenus générés ne constituent pas un avis médical, juridique ou professionnel.
                Vos documents sont sécurisés et isolés.
              </p>
            </motion.div>
          )}

          {hasStarted && !isComplete && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease }}
              className="space-y-6"
            >
              <IngestionStatus steps={steps} />

              {error && (
                <div className="glass-card p-4 rounded-xl border-l-4 border-red-500/50 bg-red-500/5">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">Erreur</p>
                  <p className="text-xs text-muted-foreground mt-1">{error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { reset(); setHasStarted(false); }}
                    className="mt-3 text-muted-foreground"
                  >
                    Recommencer
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {isComplete && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
              className="space-y-6"
            >
              {/* Success card */}
              <div className="glass-card-elevated p-8 rounded-xl text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl gradient-bg-premium flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                  <Play className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="font-display text-2xl font-bold">Mission générée !</h2>
                <p className="text-muted-foreground">
                  {result.room_count} salle{result.room_count > 1 ? "s" : ""}
                  {result.includes_boss ? " + Boss final" : ""}
                </p>

                {/* QA score */}
                {qaResult && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    qaResult.publish_blocked
                      ? "bg-red-500/10 text-red-500 border border-red-500/20"
                      : "bg-green-500/10 text-green-500 border border-green-500/20"
                  }`}>
                    QA: {qaResult.qa_score}/100
                    {qaResult.publish_blocked && " — Publication bloquée"}
                  </div>
                )}
              </div>

              {/* Fallback notice */}
              {fallbackMode && fallbackMode !== "full" && qualityBand && (
                <FallbackNotice
                  fallbackMode={fallbackMode}
                  qualityBand={qualityBand}
                  qualityScore={qualityBand === "excellent" ? 0.9 : qualityBand === "good" ? 0.75 : qualityBand === "medium" ? 0.6 : qualityBand === "poor" ? 0.45 : 0.3}
                />
              )}

              {/* QA warnings */}
              {qaResult && qaResult.violations.length > 0 && (
                <div className="glass-card p-4 rounded-xl space-y-2">
                  <p className="text-sm font-semibold">Alertes QA</p>
                  {qaResult.violations.map((v, i) => (
                    <p key={i} className={`text-xs ${v.severity === "blocking" ? "text-red-500" : "text-yellow-500"}`}>
                      [{v.violation_type}] {v.message}
                    </p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 justify-center">
                {!qaResult?.publish_blocked && result.fallback_mode !== "synthesis_only" && (
                  <Button
                    onClick={() => navigate(`/player/${result.mission_id}`)}
                    className="gap-2 gradient-bg-premium rounded-xl shadow-lg shadow-primary/20"
                    size="lg"
                  >
                    <Play className="w-4 h-4" /> Jouer la mission
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate("/library")}
                  className="gap-2 rounded-xl"
                >
                  <Eye className="w-4 h-4" /> Voir dans la bibliothèque
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { reset(); setHasStarted(false); }}
                  className="gap-2 rounded-xl text-muted-foreground"
                >
                  Importer un autre cours
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}
