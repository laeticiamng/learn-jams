// ============================================================
// Create Page — Import & Transform (M1 → M7 Pipeline)
// Lightweight orchestrator page — all pipeline logic is in useCreatePipeline
// ============================================================

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, FileText, AlertTriangle, RotateCcw, Eye } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImportDropzone from "@/components/cognitio/ImportDropzone";
import IngestionStatus from "@/components/cognitio/IngestionStatus";
import { DocumentQualityPanel } from "@/components/cognitio/DocumentQualityPanel";
import { ConceptList } from "@/components/cognitio/ConceptList";
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
import { QAChecklistPanel } from "@/components/cognitio/recall/QAChecklistPanel";
import { PublishStatusBanner } from "@/components/cognitio/recall/PublishStatusBanner";
import { useCreatePipeline } from "@/hooks/useCreatePipeline";
import { useSeedLibrary } from "@/hooks/useSeedLibrary";
import { SeedLibraryGrid } from "@/components/product/SeedLibraryGrid";
import { FeatureFlagGuard } from "@/components/product/FeatureFlagGuard";
import { useProductTracking } from "@/hooks/useProductTracking";
import { useTranslation } from "react-i18next";
import type { IngestInput } from "@/domain/cognitio/contracts";
import type { AmbiguousZone } from "@/domain/cognitio/types";

export default function Create() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { track } = useProductTracking();

  const pipeline = useCreatePipeline();
  const { seeds, loading: seedsLoading } = useSeedLibrary();
  const [activeSeedId, setActiveSeedId] = useState<string | null>(null);

  // Handle seed parameter from URL
  useEffect(() => {
    const seedId = searchParams.get("seed");
    if (seedId && pipeline.phase === "import") {
      setActiveSeedId(seedId);
    }
  }, [searchParams, pipeline.phase]);

  const handleImport = (input: IngestInput) => {
    pipeline.runPipeline(input);
  };

  const { phase, ingestion, analysis, memory, format, generation, storyGeneration, qa } = pipeline;

  const PHASE_KEYS: Record<string, string> = {
    ingesting: "create_page.phase_ingesting",
    analyzing: "create_page.phase_analyzing",
    architecting: "create_page.phase_architecting",
    formatting: "create_page.phase_formatting",
    generating: "create_page.phase_generating",
  };
  const phaseTitle = t(PHASE_KEYS[phase] ?? "create_page.phase_default");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t("create_page.title")}</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {t("create_page.subtitle")}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Phase 1: Import */}
          {phase === "import" && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <ImportDropzone onImport={handleImport} />

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

          {/* Phase 2-5: Progress */}
          {(phase === "ingesting" || phase === "analyzing" || phase === "architecting" || phase === "formatting" || phase === "generating") && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <IngestionStatus
                steps={pipeline.allSteps}
                title={phaseTitle}
              />

              {/* Pipeline error with source info */}
              {pipeline.pipelineError && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        {t("create_page.error_label")} — {t(`create_page.error_source_${pipeline.pipelineError.source}`, pipeline.pipelineError.source)}
                      </p>
                      <p className="text-sm text-red-600">{pipeline.pipelineError.message}</p>
                      <p className="text-xs text-red-400 mt-1">
                        Phase: {pipeline.pipelineError.phase}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={pipeline.reset}>
                    <RotateCcw className="h-4 w-4 mr-2" /> {t("create_page.restart")}
                  </Button>
                </div>
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

          {/* Phase 6: Result */}
          {phase === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Error in result phase */}
              {pipeline.pipelineError && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        {t("create_page.error_label")} — {pipeline.pipelineError.source}
                      </p>
                      <p className="text-sm text-red-600">{pipeline.pipelineError.message}</p>
                      <p className="text-xs text-red-400 mt-1">
                        {t("create_page.error_phase_hint", { phase: pipeline.pipelineError.phase })}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={pipeline.reset}>
                    <RotateCcw className="h-4 w-4 mr-2" /> {t("create_page.restart")}
                  </Button>
                </div>
              )}

              {/* Header message */}
              {!pipeline.pipelineError && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-sm font-medium mb-1">
                    {pipeline.hasBlocking
                      ? t("create_page.result_blocking")
                      : storyGeneration.result
                        ? t("create_page.result_story_success")
                        : generation.result
                          ? t("create_page.result_sheet_success")
                          : format.result
                            ? t("create_page.result_format_selected")
                            : analysis.result
                              ? t("create_page.result_analysis_done")
                              : t("create_page.result_complete")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pipeline.hasBlocking
                      ? t("create_page.result_blocking_detail")
                      : storyGeneration.result
                        ? t("create_page.result_story_detail")
                        : generation.result
                          ? t("create_page.result_sheet_detail")
                          : t("create_page.result_default_detail")}
                  </p>
                </div>
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

                {!pipeline.hasBlocking && format.result && !generation.result && !storyGeneration.result && (
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
