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
import { Brain, FileText, AlertTriangle, RotateCcw, Eye, ClipboardPaste, Upload, Bug, ArrowRight, Music, Video } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import IngestionStatus from "@/components/cognitio/IngestionStatus";
import { PipelineSpectacle } from "@/experience/PipelineSpectacle";
import { useImmersionLevel } from "@/experience";
import ImportDebugPanel from "@/components/cognitio/ImportDebugPanel";
import { DocumentQualityPanel } from "@/components/cognitio/DocumentQualityPanel";
import { DocumentPreview } from "@/components/cognitio/DocumentPreview";
import { PipelineVisualization } from "@/components/cognitio/PipelineVisualization";
import { SimplifiedDebugPanel } from "@/components/cognitio/SimplifiedDebugPanel";
import { ConceptList } from "@/components/cognitio/ConceptList";
import { ConceptGraph } from "@/components/cognitio/ConceptGraph";
import { ConfusionPairsCard } from "@/components/cognitio/ConfusionPairsCard";
import AmbiguityWarning from "@/components/cognitio/AmbiguityWarning";
import { MemoryPlanCard } from "@/components/cognitio/MemoryPlanCard";
import { MemorySegmentsList } from "@/components/cognitio/MemorySegmentsList";
import { RepetitionPlanCard } from "@/components/cognitio/RepetitionPlanCard";
import { MnemonicsCard } from "@/components/cognitio/MnemonicsCard";
import { VisualAnchorsCard } from "@/components/cognitio/VisualAnchorsCard";
import { CognitiveBudgetCard } from "@/components/cognitio/CognitiveBudgetCard";
import { FormatDecisionCard } from "@/components/cognitio/FormatDecisionCard";
import { PedagogicalContractCard } from "@/components/cognitio/PedagogicalContractCard";
import { DynamicSheetLayout } from "@/components/cognitio/DynamicSheetLayout";
import { StoryboardLayout } from "@/components/cognitio/StoryboardLayout";
import { MissionPreviewLayout } from "@/components/cognitio/MissionPreviewLayout";
import { QAChecklistPanel } from "@/components/cognitio/recall/QAChecklistPanel";
import { PublishStatusBanner } from "@/components/cognitio/recall/PublishStatusBanner";
import { CreateSourceStep, type SourceData } from "@/components/cognitio/create/CreateSourceStep";
import { CreatePersonalizationStep } from "@/components/cognitio/create/CreatePersonalizationStep";
import { CreatePrimaryCTA } from "@/components/cognitio/create/CreatePrimaryCTA";
import { CreateProgressHeader } from "@/components/cognitio/create/CreateProgressHeader";
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
import type { AmbiguousZone } from "@/domain/cognitio/types";
import { useAuth } from "@/hooks/useAuth";
import { usePageSEO } from "@/hooks/usePageSEO";
import { getFormatAvailability } from "@/services/billing/entitlementEngine.service";
import { FORMAT_CONFIGS, type CreateFormat as CF } from "@/lib/create-format-config";

/** Compute which formats are locked for the current plan */
function computeLockedFormats(plan: import("@/domain/billing/pricing.types").PlanKey): CF[] {
  return (Object.values(FORMAT_CONFIGS) as { key: CF; featureKey: import("@/domain/billing/pricing.types").FeatureKey }[])
    .filter((c) => getFormatAvailability(plan, c.featureKey) === "locked")
    .map((c) => c.key);
}

export default function Create() {
  const { t } = useTranslation();
  usePageSEO({ title: t("create_page.seo_title", "Créer du contenu"), description: t("create_page.seo_description", "Importe ton cours et génère du contenu pédagogique interactif"), noindex: true });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { track } = useProductTracking();
  const { user } = useAuth();

  const pipeline = useCreatePipeline();
  // Experience Layer: set immersion based on pipeline phase
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

  // Step 3: Personalization (smart defaults)
  const [objective, setObjective] = useState<LearningObjective>("revision");
  const [educationStage, setEducationStage] = useState<EducationStage>("unknown");
  const [explanationStyle, setExplanationStyle] = useState<ExplanationStyle>("balanced");

  // Format-specific options
  const [musicStyle, setMusicStyle] = useState<string>("pop");

  const hasSource = sourceData !== null;

  // Handle seed parameter from URL
  useEffect(() => {
    const seedId = searchParams.get("seed");
    if (seedId && pipeline.phase === "import") {
      setActiveSeedId(seedId);
    }
  }, [searchParams, pipeline.phase]);

  const handleFormatSelect = useCallback((f: CreateFormat) => {
    setSelectedFormat(f);
    track({ event_name: "format_selected", metadata: { format: f } });
  }, [track]);

  const handleSourceReady = useCallback((source: SourceData) => {
    setSourceData(source);
  }, []);

  const handleSourceCleared = useCallback(() => {
    setSourceData(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!sourceData || !selectedFormat) return;

    // P0: Credit guard — check quota before running the pipeline
    const allowed = await quotaGuard.checkBeforeGenerate(selectedFormat);
    if (!allowed) return;

    const learner_profile = {
      ...DEFAULT_LEARNER_PROFILE,
      education_stage: educationStage,
      explanation_style: explanationStyle,
    };

    pipeline.runPipeline(
      {
        file: sourceData.file,
        pasted_text: sourceData.pasted_text,
        content_type: sourceData.content_type,
        objective,
        learner_profile,
        ...(selectedFormat === "music" ? { music_style: musicStyle } : {}),
      } as any,
      selectedFormat,
    );
  }, [sourceData, selectedFormat, objective, educationStage, explanationStyle, pipeline, quotaGuard, musicStyle]);

  const { phase, ingestion, analysis, memory, format, generation, storyGeneration, missionResult, musicResult, videoResult, qa } = pipeline;

  // Resolve generating phase label based on actual format being generated
  const getGeneratingPhaseKey = () => {
    if (selectedFormat === "music") return "create_page.phase_generating_music";
    if (selectedFormat === "video") return "create_page.phase_generating_video";
    const chosenFormat = format.result?.chosen_format;
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
  const phaseTitle = t(PHASE_KEYS[phase] ?? "create_page.phase_default");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8 pt-24">
        <AnimatePresence mode="wait">
          {/* ========== IMPORT PHASE — Progressive Flow ========== */}
          {phase === "import" && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Header — cinematic scene entrance */}
              <motion.div
                className="text-center mb-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center justify-center gap-3 mb-3">
                  <motion.div
                    className="w-10 h-10 rounded-xl gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/20"
                    animate={{ rotate: [0, -3, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
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

              {/* Progress indicator */}
              <CreateProgressHeader selectedFormat={selectedFormat} hasSource={hasSource} />

              {/* SECTION 1 — Format Selection */}
              <section>
                <FormatSelector
                  selectedFormat={selectedFormat}
                  onSelectFormat={handleFormatSelect}
                  lockedFormats={computeLockedFormats(plan)}
                  onLockedClick={(f) => {
                    quotaGuard.checkBeforeGenerate(f);
                  }}
                />
              </section>

              {/* SECTION 2 — Source (revealed after format) */}
              {selectedFormat && (
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <CreateSourceStep
                    onSourceReady={handleSourceReady}
                    onSourceCleared={handleSourceCleared}
                  />
                </motion.section>
              )}

              {/* SECTION 3 — Personalization (revealed after source, collapsible) */}
              {selectedFormat && hasSource && (
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                >
                  <CreatePersonalizationStep
                    objective={objective}
                    educationStage={educationStage}
                    explanationStyle={explanationStyle}
                    onObjectiveChange={setObjective}
                    onEducationStageChange={setEducationStage}
                    onExplanationStyleChange={setExplanationStyle}
                  />
                </motion.section>
              )}

              {/* Music style selector (shown only for music format) */}
              {selectedFormat === "music" && hasSource && (
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                >
                  <div className="rounded-xl border border-border/30 bg-card/30 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-pink-500" />
                      <p className="text-sm font-medium">
                        {t("create_flow.music_style_title", { defaultValue: "Style musical" })}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {["pop", "rap", "lofi", "rock", "jazz", "reggaeton", "spoken-word", "classique", "afrobeat", "techno"].map((style) => (
                        <button
                          key={style}
                          onClick={() => setMusicStyle(style)}
                          className={`px-2.5 py-2 rounded-lg border text-xs font-medium capitalize transition-all ${
                            musicStyle === style
                              ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500/20 text-pink-600"
                              : "border-border/30 hover:border-border/50 bg-card/50 text-muted-foreground"
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              {/* P0: Paywall — shown when quota guard blocks generation */}
              {quotaGuard.guardResult && !quotaGuard.guardResult.allowed && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Paywall
                    feature={quotaGuard.guardResult.feature}
                    currentPlan={plan}
                    upgradeTo={quotaGuard.guardResult.upgrade_to}
                    reason={quotaGuard.guardResult.reason!}
                    onBuyCredits={() => navigate("/pricing")}
                  />
                </motion.div>
              )}

              {/* CTA — visible once format + source ready */}
              {selectedFormat && hasSource && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <CreatePrimaryCTA
                    selectedFormat={selectedFormat}
                    hasSource={hasSource}
                    onClick={handleSubmit}
                    loading={quotaGuard.checking || pipeline.phase !== "import"}
                    disabled={pipeline.phase !== "import"}
                  />
                </motion.div>
              )}

              {/* Seed Library */}
              <FeatureFlagGuard flag="ff_seed_library_enabled">
                <SeedLibraryGrid
                  seeds={seeds}
                  loading={seedsLoading}
                  onStartSeed={(id) => {
                    track({ event_name: "seed_transformation_started", metadata: { seed_id: id } });
                    setActiveSeedId(id);
                    navigate(`/create?seed=${id}`, { replace: true });
                  }}
                />
              </FeatureFlagGuard>
            </motion.div>
          )}

          {/* ========== PROCESSING PHASES ========== */}
          {(phase === "ingesting" || phase === "analyzing" || phase === "architecting" || phase === "formatting" || phase === "generating") && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <PipelineSpectacle
                currentPhase={pipeline.phase}
                title={phaseTitle}
              />

              <IngestionStatus
                steps={pipeline.allSteps}
                title={phaseTitle}
              />

              {/* Debug panel (dev only) */}
              <ImportDebugPanel debugInfo={pipeline.ingestion.debugInfo} />

              {/* Pipeline error with source info */}
              {pipeline.pipelineError && (
                <PipelineErrorCard
                  error={pipeline.pipelineError}
                  phaseKeys={PHASE_KEYS}
                  onReset={pipeline.reset}
                />
              )}

              {/* Generic error fallback */}
              {!pipeline.pipelineError && pipeline.anyError && (
                <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-300">{t("create_page.error_label")}</p>
                      <p className="text-sm text-red-400/80">{pipeline.anyError}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={pipeline.reset}>
                    <RotateCcw className="h-4 w-4 mr-2" /> {t("create_page.restart")}
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* ========== RESULT PHASE ========== */}
          {phase === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <PipelineVisualization
                phase={pipeline.phase}
                debugCounters={pipeline.debugCounters}
                hasError={!!pipeline.pipelineError}
              />

              {/* Error in result phase */}
              {pipeline.pipelineError && (
                <PipelineErrorCard
                  error={pipeline.pipelineError}
                  phaseKeys={PHASE_KEYS}
                  onReset={pipeline.reset}
                />
              )}

              {/* Header message — P0: never show success for empty generation */}
              {!pipeline.pipelineError && (
                <div className={`border rounded-lg p-4 ${
                  pipeline.hasBlocking || isEmptyGeneration(pipeline)
                    ? "bg-orange-500/5 border-orange-500/20"
                    : "bg-muted/30 border-border/20"
                }`}>
                  <p className="text-sm font-medium mb-1">
                    {pipeline.hasBlocking
                      ? t("create_page.result_blocking")
                      : isEmptyGeneration(pipeline)
                        ? t("create_page.result_empty_generation", {
                            defaultValue: "Le document a été importé, mais le moteur n'a pas réussi à extraire suffisamment de concepts exploitables pour générer ce format.",
                          })
                        : t("create_page.result_success", {
                            defaultValue: "Ton contenu a été généré avec succès !",
                          })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pipeline.hasBlocking
                      ? t("create_page.result_blocking_detail")
                      : isEmptyGeneration(pipeline)
                        ? t("create_page.result_empty_generation_detail", {
                            defaultValue: "Essaye de coller le texte directement ou d'importer un document avec plus de contenu structuré.",
                          })
                        : t("create_page.result_success_detail", {
                            defaultValue: "Tu peux maintenant consulter et utiliser ta création.",
                          })}
                  </p>
                </div>
              )}

              {/* P0: Fallback mode warning — service distant indisponible */}
              {ingestion.result?._fallback_used && (
                <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-300">
                        {t("create_page.fallback_warning_title", { defaultValue: "Mode local activé" })}
                      </p>
                      <p className="text-xs text-amber-400/80">
                        {t("create_page.fallback_warning_detail", {
                          defaultValue: "Le service d'analyse distant n'était pas disponible. L'analyse a été effectuée localement avec une qualité potentiellement réduite. Les résultats sont sauvegardés normalement.",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* P0: Document preview — shows cleaned text, segments, issues */}
              {ingestion.result && (
                <DocumentPreview
                  m1Output={ingestion.result}
                  rawTextEstimate={pipeline.debugCounters?.raw_text_length}
                />
              )}

              {/* P0: Simplified debug panel with user/dev modes */}
              {pipeline.debugCounters && (
                <SimplifiedDebugPanel counters={pipeline.debugCounters} />
              )}

              {/* Audience mismatch warning */}
              {analysis.result?.audience_mismatch_risk != null && analysis.result.audience_mismatch_risk >= 0.3 && (
                <div className="border border-orange-500/20 bg-orange-500/5 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-300">{t("create_page.audience_mismatch")}</p>
                      <p className="text-xs text-orange-400/80">
                        {analysis.result.audience_mismatch_message ?? t("create_page.audience_mismatch_default")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Generated Animated Story */}
              {storyGeneration.result && (
                <div className="border rounded-lg p-4">
                  <StoryboardLayout output={storyGeneration.result} />
                </div>
              )}

              {/* Generated Dynamic Sheet */}
              {generation.result && (
                <div className="border rounded-lg p-4">
                  <DynamicSheetLayout output={generation.result} />
                </div>
              )}

              {/* Generated Mission */}
              {missionResult && (
                <div className="border rounded-lg p-4">
                  <MissionPreviewLayout output={missionResult} />
                </div>
              )}

              {/* Generated Music */}
              {musicResult && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                      <Music className="w-5 h-5 text-pink-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{musicResult.title}</h3>
                      <p className="text-xs text-muted-foreground capitalize">
                        {musicResult.style} · {musicResult.status === "generating"
                          ? t("create_page.music_generating", { defaultValue: "Génération en cours…" })
                          : t("create_page.music_ready", { defaultValue: "Prêt à écouter" })}
                      </p>
                    </div>
                  </div>
                  {musicResult.status === "generating" && (
                    <p className="text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
                      {t("create_page.music_generating_hint", {
                        defaultValue: "La chanson est en cours de génération par le moteur musical. Tu peux écouter le résultat sur la page Player dès qu'il sera prêt.",
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Generated Video */}
              {videoResult && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Video className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">
                        {t("create_page.video_title", { defaultValue: "Vidéo pédagogique" })}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {videoResult.status === "pending" || videoResult.status === "processing"
                          ? t("create_page.video_generating", { defaultValue: "Génération en cours…" })
                          : videoResult.status === "completed"
                            ? t("create_page.video_ready", { defaultValue: "Prêt à visionner" })
                            : t("create_page.video_failed", { defaultValue: "Échec de la génération" })}
                      </p>
                    </div>
                  </div>
                  {videoResult.video_url && (
                    <video
                      src={videoResult.video_url}
                      controls
                      className="w-full rounded-lg mt-2"
                      style={{ maxHeight: 400 }}
                    />
                  )}
                  {!videoResult.video_url && (videoResult.status === "pending" || videoResult.status === "processing") && (
                    <p className="text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
                      {t("create_page.video_generating_hint", {
                        defaultValue: "La vidéo est en cours de génération. Cette opération peut prendre plusieurs minutes.",
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* QA Status */}
              {qa.publishDecision && (
                <PublishStatusBanner decision={qa.publishDecision} />
              )}

              {qa.qaReport && (
                <QAChecklistPanel report={qa.qaReport} />
              )}

              {/* Document quality panel */}
              {ingestion.result && (
                <div className="border rounded-lg p-4">
                  <DocumentQualityPanel
                    m1Output={ingestion.result}
                    m2Output={analysis.result}
                  />
                </div>
              )}

              {/* Memory Architecture */}
              {memory.result && (
                <>
                  <div className="border rounded-lg p-4">
                    <MemoryPlanCard output={memory.result} />
                  </div>

                  <div className="border rounded-lg p-4">
                    <PedagogicalContractCard contract={memory.result.pedagogical_contract} />
                  </div>

                  <div className="border rounded-lg p-4">
                    <CognitiveBudgetCard budget={memory.result.cognitive_budget} />
                  </div>

                  <div className="border rounded-lg p-4">
                    <MemorySegmentsList segments={memory.result.segments} />
                  </div>

                  {memory.result.repetition_plan.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <RepetitionPlanCard plan={memory.result.repetition_plan} />
                    </div>
                  )}

                  {memory.result.mnemonics.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <MnemonicsCard mnemonics={memory.result.mnemonics} />
                    </div>
                  )}

                  {memory.result.visual_anchors.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <VisualAnchorsCard anchors={memory.result.visual_anchors} />
                    </div>
                  )}
                </>
              )}

              {/* Format Decision */}
              {format.result && (
                <div className="border rounded-lg p-4">
                  <FormatDecisionCard decision={format.result} />
                </div>
              )}

              {/* Concepts */}
              {analysis.result && analysis.result.key_concepts.length > 0 && (
                <div className="border rounded-lg p-4">
                  <ConceptList concepts={analysis.result.key_concepts} maxDisplay={10} />
                </div>
              )}

              {/* Concept Graph */}
              {analysis.result && analysis.result.key_concepts.length > 1 && (
                <ConceptGraph
                  concepts={analysis.result.key_concepts}
                  confusionPairs={analysis.result.confusion_pairs}
                />
              )}

              {/* Confusions & Traps */}
              {analysis.result && (analysis.result.confusion_pairs.length > 0 || analysis.result.traps.length > 0) && (
                <div className="border rounded-lg p-4">
                  <ConfusionPairsCard
                    confusionPairs={analysis.result.confusion_pairs}
                    traps={analysis.result.traps}
                  />
                </div>
              )}

              {/* Ambiguity warnings */}
              {analysis.result?.confidence.ambiguous_zones && analysis.result.confidence.ambiguous_zones.length > 0 && (
                <AmbiguityWarning zones={analysis.result.confidence.ambiguous_zones as AmbiguousZone[]} />
              )}

              {/* Uncertain concepts warning */}
              {analysis.result && analysis.result.key_concepts.some((c) => c.uncertain) && (
                <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-300">{t("create_page.uncertain_concepts")}</p>
                      <p className="text-xs text-yellow-400/80">
                        {t("create_page.uncertain_concepts_detail", { count: analysis.result.key_concepts.filter((c) => c.uncertain).length })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Learning objectives */}
              {analysis.result?.learning_objectives && analysis.result.learning_objectives.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> {t("create_page.learning_objectives")}
                  </h3>
                  <ul className="space-y-1">
                    {analysis.result.learning_objectives.map((obj, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">-</span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={pipeline.reset}>
                  <RotateCcw className="h-4 w-4 mr-2" /> {t("create_page.import_another")}
                </Button>

                {generation.result && (
                  <Button onClick={() => navigate(`/transformation/${generation.result!.transformation_id}`)}>
                    <Eye className="h-4 w-4 mr-2" /> {t("create_page.view_sheet")}
                  </Button>
                )}

                {storyGeneration.result && (
                  <Button onClick={() => navigate(`/transformation/${storyGeneration.result!.transformation_id}`)}>
                    <Eye className="h-4 w-4 mr-2" /> {t("create_page.view_story")}
                  </Button>
                )}

                {missionResult && !isEmptyGeneration(pipeline) && !pipeline.pipelineError && (
                  <Button onClick={() => navigate(`/mission/${missionResult.mission_id}/play`)}>
                    <Eye className="h-4 w-4 mr-2" /> {t("create_page.play_mission", { defaultValue: "Jouer la mission" })}
                  </Button>
                )}

                {musicResult && (
                  <Button onClick={() => navigate(`/player/${musicResult.song_id}`)}>
                    <Music className="h-4 w-4 mr-2" /> {t("create_page.listen_song", { defaultValue: "Écouter la chanson" })}
                  </Button>
                )}

                {videoResult && videoResult.video_url && (
                  <Button onClick={() => window.open(videoResult.video_url, "_blank")}>
                    <Video className="h-4 w-4 mr-2" /> {t("create_page.watch_video", { defaultValue: "Voir la vidéo" })}
                  </Button>
                )}

                {!pipeline.hasBlocking && format.result && !generation.result && !storyGeneration.result && !missionResult && !musicResult && !videoResult && (
                  <Button disabled className="opacity-50 cursor-not-allowed">
                    <ArrowRight className="h-4 w-4 mr-2" /> {t("create_page.format_unsupported")}
                  </Button>
                )}
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground text-center mt-8 max-w-lg mx-auto">
                {t("create_page.disclaimer")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

// ============================================================
// P0: Empty Generation Detection
// ============================================================

function isEmptyGeneration(pipeline: ReturnType<typeof useCreatePipeline>): boolean {
  // P0: Check semantic gate failure
  if (pipeline.debugCounters?.semantic_gate_status === "semantic_failure") {
    return true;
  }

  // Check via debug counters (most reliable)
  if (pipeline.debugCounters?.final_generation_status === "empty_generation") {
    return true;
  }

  // P0: Check if generation status is error (semantic or mission gate blocked)
  if (pipeline.debugCounters?.final_generation_status === "error") {
    return true;
  }

  // Check dynamic sheet result
  if (pipeline.generation.result) {
    const concepts = new Set(pipeline.generation.result.content_blocks.flatMap(b => b.concepts_covered));
    const pedagogical = pipeline.generation.result.content_blocks.filter(b => b.type === "pedagogical");
    if (concepts.size === 0 || pedagogical.length === 0 || pipeline.generation.result.final_test.length === 0) {
      return true;
    }
  }

  // Check if we're in result phase with no generation output at all (and no error)
  if (
    pipeline.phase === "result" &&
    !pipeline.pipelineError &&
    !pipeline.hasBlocking &&
    !pipeline.generation.result &&
    !pipeline.storyGeneration.result &&
    !pipeline.missionResult &&
    !pipeline.musicResult &&
    !pipeline.videoResult
  ) {
    return true;
  }

  return false;
}

// ============================================================
// PipelineErrorCard — Extracted error display (used in progress + result)
// ============================================================

function PipelineErrorCard({
  error,
  phaseKeys,
  onReset,
}: {
  error: { source: string; message: string; phase: string };
  phaseKeys: Record<string, string>;
  onReset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-300">
            {t("create_page.error_label")} — {t(`create_page.error_source_${error.source}`, { defaultValue: t("create_page.error_source_default") })}
          </p>
          <p className="text-sm text-red-400/80">{error.message}</p>
          <p className="text-xs text-red-500/60 mt-1">
            {t("create_page.error_phase_hint", { phase: t(phaseKeys[error.phase] ?? "create_page.phase_default") })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-2" /> {t("create_page.retry")}
        </Button>
        <Button variant="outline" size="sm" onClick={onReset}>
          <ClipboardPaste className="h-4 w-4 mr-2" /> {t("create_page.paste_text_instead")}
        </Button>
        <Button variant="outline" size="sm" onClick={onReset}>
          <Upload className="h-4 w-4 mr-2" /> {t("create_page.import_other_doc")}
        </Button>
        {import.meta.env.DEV && (
          <Button variant="ghost" size="sm" onClick={() => console.error("[COGNITIO DEBUG]", error)}>
            <Bug className="h-4 w-4 mr-2" /> {t("create_page.show_debug")}
          </Button>
        )}
      </div>
    </div>
  );
}
