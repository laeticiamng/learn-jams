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
import { Brain, FileText, AlertTriangle, RotateCcw, Eye, ClipboardPaste, Upload, Bug, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import IngestionStatus from "@/components/cognitio/IngestionStatus";
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

export default function Create() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { track } = useProductTracking();
  const { user } = useAuth();

  const pipeline = useCreatePipeline();
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
      },
      selectedFormat,
    );
  }, [sourceData, selectedFormat, objective, educationStage, explanationStyle, pipeline, quotaGuard]);

  const { phase, ingestion, analysis, memory, format, generation, storyGeneration, missionResult, qa } = pipeline;

  // Resolve generating phase label based on actual format being generated
  const getGeneratingPhaseKey = () => {
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
              {/* Header */}
              <div className="text-center mb-2">
                <div className="flex items-center justify-center gap-2.5 mb-2">
                  <Brain className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold">
                    {t("create_flow.title", { defaultValue: "Crée ton contenu" })}
                  </h1>
                </div>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {t("create_flow.subtitle", { defaultValue: "Choisis un format, ajoute ton cours, et laisse COGNITIO faire le reste." })}
                </p>
              </div>

              {/* Progress indicator */}
              <CreateProgressHeader selectedFormat={selectedFormat} hasSource={hasSource} />

              {/* SECTION 1 — Format Selection */}
              <section>
                <FormatSelector
                  selectedFormat={selectedFormat}
                  onSelectFormat={handleFormatSelect}
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
                    loading={quotaGuard.checking}
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
              <PipelineVisualization
                phase={pipeline.phase}
                debugCounters={pipeline.debugCounters}
                hasError={!!pipeline.pipelineError}
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
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">{t("create_page.error_label")}</p>
                      <p className="text-sm text-red-600">{pipeline.anyError}</p>
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
                    ? "bg-orange-50 border-orange-200"
                    : "bg-muted/30"
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
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">{t("create_page.audience_mismatch")}</p>
                      <p className="text-xs text-orange-600">
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
                <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">{t("create_page.uncertain_concepts")}</p>
                      <p className="text-xs text-yellow-600">
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

                {!pipeline.hasBlocking && format.result && !generation.result && !storyGeneration.result && !missionResult && (
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
    !pipeline.missionResult
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
    <div className="border border-red-200 bg-red-50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-800">
            {t("create_page.error_label")} — {t(`create_page.error_source_${error.source}`, { defaultValue: t("create_page.error_source_default") })}
          </p>
          <p className="text-sm text-red-600">{error.message}</p>
          <p className="text-xs text-red-400 mt-1">
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
