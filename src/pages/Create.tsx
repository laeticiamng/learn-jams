// ============================================================
// Create Page — Progressive Create Flow (M1 → M7 Pipeline)
// 3-step guided flow: Format → Source → Personalization
// Lightweight orchestrator — all pipeline logic is in useCreatePipeline
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { FormatSelector } from "@/components/cognitio/FormatSelector";
import type { CreateFormat } from "@/lib/create-format-config";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Brain, Music } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CreateSourceStep, type SourceData } from "@/components/cognitio/create/CreateSourceStep";
import { CreatePersonalizationStep } from "@/components/cognitio/create/CreatePersonalizationStep";
import { CreatePrimaryCTA } from "@/components/cognitio/create/CreatePrimaryCTA";
import { CreateProgressHeader } from "@/components/cognitio/create/CreateProgressHeader";
import { CreateProcessingPhase } from "@/components/cognitio/create/CreateProcessingPhase";
import { CreateResultPhase } from "@/components/cognitio/create/CreateResultPhase";
import { useCreatePipeline } from "@/hooks/useCreatePipeline";
import { useQuotaGuard } from "@/hooks/useQuotaGuard";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Paywall } from "@/components/billing/Paywall";
import { useSeedLibrary } from "@/hooks/useSeedLibrary";
import { SeedLibraryGrid } from "@/components/product/SeedLibraryGrid";
import { FeatureFlagGuard } from "@/components/product/FeatureFlagGuard";
import { useProductTracking } from "@/hooks/useProductTracking";
import { useTranslation } from "react-i18next";
import type { LearningObjective } from "@/domain/cognitio/types";
import type { EducationStage, ExplanationStyle } from "@/domain/cognitio/learner-profile.types";
import { DEFAULT_LEARNER_PROFILE } from "@/domain/cognitio/learner-profile.types";
import { useAuth } from "@/hooks/useAuth";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useImmersionLevel } from "@/experience";
import { getFormatAvailability } from "@/services/billing/entitlementEngine.service";
import { FORMAT_CONFIGS, type CreateFormat as CF } from "@/lib/create-format-config";
import QuotaIndicator from "@/components/QuotaIndicator";

/** Compute which formats are locked for the current plan */
function computeLockedFormats(plan: import("@/domain/billing/pricing.types").PlanKey): CF[] {
  return (Object.values(FORMAT_CONFIGS) as { key: CF; featureKey: import("@/domain/billing/pricing.types").FeatureKey }[])
    .filter((c) => getFormatAvailability(plan, c.featureKey) === "locked")
    .map((c) => c.key);
}

/** Detect if pipeline produced an empty generation */
function checkEmptyGeneration(pipeline: ReturnType<typeof useCreatePipeline>): boolean {
  if (pipeline.debugCounters?.semantic_gate_status === "semantic_failure") return true;
  if (pipeline.debugCounters?.final_generation_status === "empty_generation") return true;
  if (pipeline.debugCounters?.final_generation_status === "error") return true;

  if (pipeline.generation.result) {
    const concepts = new Set(pipeline.generation.result.content_blocks.flatMap(b => b.concepts_covered));
    const pedagogical = pipeline.generation.result.content_blocks.filter(b => b.type === "pedagogical");
    if (concepts.size === 0 || pedagogical.length === 0 || pipeline.generation.result.final_test.length === 0) return true;
  }

  if (
    pipeline.phase === "result" &&
    !pipeline.pipelineError &&
    !pipeline.hasBlocking &&
    !pipeline.generation.result &&
    !pipeline.storyGeneration.result &&
    !pipeline.missionResult &&
    !pipeline.musicResult &&
    !pipeline.videoResult
  ) return true;

  return false;
}

export default function Create() {
  const { t } = useTranslation();
  usePageSEO({ title: t("create_page.seo_title", "Créer du contenu"), description: t("create_page.seo_description", "Importe ton cours et génère du contenu pédagogique interactif"), noindex: true });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { track } = useProductTracking();
  const { user } = useAuth();

  const pipeline = useCreatePipeline();
  const isProcessing = ["ingesting", "analyzing", "architecting", "formatting", "generating"].includes(pipeline.phase);
  useImmersionLevel(isProcessing ? 2 : 1, { mood: isProcessing ? "focus" : "warm" });
  const { seeds, loading: seedsLoading } = useSeedLibrary();
  const { plan } = useUserPlan(user?.id ?? null);
  const quotaGuard = useQuotaGuard(user?.id ?? null, plan);
  const [activeSeedId, setActiveSeedId] = useState<string | null>(null);

  // Step 1: Format
  const [selectedFormat, setSelectedFormat] = useState<CreateFormat | null>(null);
  // Step 2: Source
  const [sourceData, setSourceData] = useState<SourceData | null>(null);
  // Step 3: Personalization
  const [objective, setObjective] = useState<LearningObjective>("revision");
  const [educationStage, setEducationStage] = useState<EducationStage>("unknown");
  const [explanationStyle, setExplanationStyle] = useState<ExplanationStyle>("balanced");
  const [musicStyle, setMusicStyle] = useState<string>("pop");

  const hasSource = sourceData !== null;

  useEffect(() => {
    const seedId = searchParams.get("seed");
    if (seedId && pipeline.phase === "import") setActiveSeedId(seedId);
  }, [searchParams, pipeline.phase]);

  const handleFormatSelect = useCallback((f: CreateFormat) => {
    setSelectedFormat(f);
    track({ event_name: "format_selected", metadata: { format: f } });
  }, [track]);

  const handleSourceReady = useCallback((source: SourceData) => setSourceData(source), []);
  const handleSourceCleared = useCallback(() => setSourceData(null), []);

  const handleSubmit = useCallback(async () => {
    if (!sourceData || !selectedFormat) return;
    const allowed = await quotaGuard.checkBeforeGenerate(selectedFormat);
    if (!allowed) return;

    pipeline.runPipeline(
      {
        file: sourceData.file,
        pasted_text: sourceData.pasted_text,
        content_type: sourceData.content_type,
        objective,
        learner_profile: { ...DEFAULT_LEARNER_PROFILE, education_stage: educationStage, explanation_style: explanationStyle },
        ...(selectedFormat === "music" ? { music_style: musicStyle } : {}),
      } as any,
      selectedFormat,
    );
  }, [sourceData, selectedFormat, objective, educationStage, explanationStyle, pipeline, quotaGuard, musicStyle]);

  // Phase labels
  const getGeneratingPhaseKey = () => {
    if (selectedFormat === "music") return "create_page.phase_generating_music";
    if (selectedFormat === "video") return "create_page.phase_generating_video";
    const chosenFormat = pipeline.format.result?.chosen_format;
    if (chosenFormat === "fiche_dynamique") return "create_page.phase_generating_fiche";
    if (chosenFormat === "histoire_animee") return "create_page.phase_generating_story";
    if (chosenFormat === "mission_interactive") return "create_page.phase_generating_mission";
    return "create_page.phase_generating";
  };

  const PHASE_KEYS: Record<string, string> = {
    ingesting: "create_page.phase_ingesting",
    analyzing: "create_page.phase_analyzing",
    architecting: "create_page.phase_architecting",
    formatting: "create_page.phase_formatting",
    generating: getGeneratingPhaseKey(),
  };
  const phaseTitle = t(PHASE_KEYS[pipeline.phase] ?? "create_page.phase_default");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 pt-24">
        <AnimatePresence mode="wait">
          {/* ========== IMPORT PHASE ========== */}
          {pipeline.phase === "import" && (
            <motion.div key="import" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              {/* Header */}
              <motion.div className="text-center mb-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <motion.div className="w-10 h-10 rounded-xl gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/20" animate={{ rotate: [0, -3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                    <Brain className="h-5 w-5 text-primary-foreground" />
                  </motion.div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                    {t("create_flow.title", { defaultValue: "Crée ton contenu" })}
                  </h1>
                </div>
                <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                  {t("create_flow.subtitle", { defaultValue: "Choisis un format, ajoute ton cours, et laisse COGNITIO faire le reste." })}
                </p>
              </motion.div>

              <CreateProgressHeader selectedFormat={selectedFormat} hasSource={hasSource} />

              {/* Quota visibility */}
              {user && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <QuotaIndicator featureKey="transformation_generated" limit={plan === "free" ? 3 : 100} label="Transformations" compact />
                  <QuotaIndicator featureKey="mission_generated" limit={plan === "free" ? 1 : 50} label="Missions" compact />
                  <QuotaIndicator featureKey="music_generated" limit={plan === "free" ? 1 : 30} label="Musique" compact />
                </div>
              )}

              {/* Format Selection */}
              <section>
                <FormatSelector
                  selectedFormat={selectedFormat}
                  onSelectFormat={handleFormatSelect}
                  lockedFormats={computeLockedFormats(plan)}
                  onLockedClick={(f) => quotaGuard.checkBeforeGenerate(f)}
                />
              </section>

              {/* Source */}
              {selectedFormat && (
                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <CreateSourceStep onSourceReady={handleSourceReady} onSourceCleared={handleSourceCleared} />
                </motion.section>
              )}

              {/* Personalization */}
              {selectedFormat && hasSource && (
                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                  <CreatePersonalizationStep
                    objective={objective} educationStage={educationStage} explanationStyle={explanationStyle}
                    onObjectiveChange={setObjective} onEducationStageChange={setEducationStage} onExplanationStyleChange={setExplanationStyle}
                  />
                </motion.section>
              )}

              {/* Music style */}
              {selectedFormat === "music" && hasSource && (
                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
                  <div className="rounded-xl border border-border/30 bg-card/30 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-pink-500" />
                      <p className="text-sm font-medium">{t("create_flow.music_style_title", { defaultValue: "Style musical" })}</p>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {["pop", "rap", "lofi", "rock", "jazz", "reggaeton", "spoken-word", "classique", "afrobeat", "techno"].map((style) => (
                        <button key={style} onClick={() => setMusicStyle(style)}
                          className={`px-2.5 py-2 rounded-lg border text-xs font-medium capitalize transition-all ${
                            musicStyle === style
                              ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500/20 text-pink-600"
                              : "border-border/30 hover:border-border/50 bg-card/50 text-muted-foreground"
                          }`}
                        >{style}</button>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              {/* Paywall */}
              {quotaGuard.guardResult && !quotaGuard.guardResult.allowed && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <Paywall feature={quotaGuard.guardResult.feature} currentPlan={plan} upgradeTo={quotaGuard.guardResult.upgrade_to} reason={quotaGuard.guardResult.reason!} onBuyCredits={() => navigate("/pricing")} />
                </motion.div>
              )}

              {/* CTA */}
              {selectedFormat && hasSource && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
                  <CreatePrimaryCTA selectedFormat={selectedFormat} hasSource={hasSource} onClick={handleSubmit} loading={quotaGuard.checking || pipeline.phase !== "import"} disabled={pipeline.phase !== "import"} />
                </motion.div>
              )}

              {/* Seed Library */}
              <FeatureFlagGuard flag="ff_seed_library_enabled">
                <SeedLibraryGrid seeds={seeds} loading={seedsLoading} onStartSeed={(id) => {
                  track({ event_name: "seed_transformation_started", metadata: { seed_id: id } });
                  setActiveSeedId(id);
                  navigate(`/create?seed=${id}`, { replace: true });
                }} />
              </FeatureFlagGuard>
            </motion.div>
          )}

          {/* ========== PROCESSING PHASES ========== */}
          {isProcessing && (
            <CreateProcessingPhase pipeline={pipeline} phaseTitle={phaseTitle} phaseKeys={PHASE_KEYS} />
          )}

          {/* ========== RESULT PHASE ========== */}
          {pipeline.phase === "result" && (
            <CreateResultPhase pipeline={pipeline} phaseKeys={PHASE_KEYS} isEmptyGeneration={checkEmptyGeneration(pipeline)} />
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
