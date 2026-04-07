// ============================================================
// CreateResultPhase — Pipeline result display
// Extracted from Create.tsx for maintainability
// ============================================================

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw, Eye, FileText, Music, Video, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PipelineVisualization } from "@/components/cognitio/PipelineVisualization";
import { DocumentPreview } from "@/components/cognitio/DocumentPreview";
import { DocumentQualityPanel } from "@/components/cognitio/DocumentQualityPanel";
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
import { PipelineErrorCard } from "./PipelineErrorCard";
import type { useCreatePipeline } from "@/hooks/useCreatePipeline";
import type { AmbiguousZone } from "@/domain/cognitio/types";

interface Props {
  pipeline: ReturnType<typeof useCreatePipeline>;
  phaseKeys: Record<string, string>;
  isEmptyGeneration: boolean;
}

export function CreateResultPhase({ pipeline, phaseKeys, isEmptyGeneration }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ingestion, analysis, memory, format, generation, storyGeneration, missionResult, musicResult, videoResult, qa } = pipeline;

  return (
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

      {pipeline.pipelineError && (
        <PipelineErrorCard error={pipeline.pipelineError} phaseKeys={phaseKeys} onReset={pipeline.reset} />
      )}

      {/* Header message */}
      {!pipeline.pipelineError && (
        <div className={`border rounded-lg p-4 ${
          pipeline.hasBlocking || isEmptyGeneration
            ? "bg-orange-500/5 border-orange-500/20"
            : "bg-muted/30 border-border/20"
        }`}>
          <p className="text-sm font-medium mb-1">
            {pipeline.hasBlocking
              ? t("create_page.result_blocking")
              : isEmptyGeneration
                ? t("create_page.result_empty_generation", { defaultValue: "Le document a été importé, mais le moteur n'a pas réussi à extraire suffisamment de concepts exploitables pour générer ce format." })
                : t("create_page.result_success", { defaultValue: "Ton contenu a été généré avec succès !" })}
          </p>
          <p className="text-xs text-muted-foreground">
            {pipeline.hasBlocking
              ? t("create_page.result_blocking_detail")
              : isEmptyGeneration
                ? t("create_page.result_empty_generation_detail", { defaultValue: "Essaye de coller le texte directement ou d'importer un document avec plus de contenu structuré." })
                : t("create_page.result_success_detail", { defaultValue: "Tu peux maintenant consulter et utiliser ta création." })}
          </p>
        </div>
      )}

      {/* Fallback mode warning */}
      {ingestion.result?._fallback_used && (
        <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-300">
                {t("create_page.fallback_warning_title", { defaultValue: "Mode local activé" })}
              </p>
              <p className="text-xs text-amber-400/80">
                {t("create_page.fallback_warning_detail", { defaultValue: "Le service d'analyse distant n'était pas disponible. L'analyse a été effectuée localement avec une qualité potentiellement réduite." })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Document preview */}
      {ingestion.result && (
        <DocumentPreview m1Output={ingestion.result} rawTextEstimate={pipeline.debugCounters?.raw_text_length} />
      )}

      {/* Debug panel */}
      {pipeline.debugCounters && <SimplifiedDebugPanel counters={pipeline.debugCounters} />}

      {/* Audience mismatch */}
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

      {/* Generated content by type */}
      {storyGeneration.result && (
        <div className="border rounded-lg p-4"><StoryboardLayout output={storyGeneration.result} /></div>
      )}
      {generation.result && (
        <div className="border rounded-lg p-4"><DynamicSheetLayout output={generation.result} /></div>
      )}
      {missionResult && (
        <div className="border rounded-lg p-4"><MissionPreviewLayout output={missionResult} /></div>
      )}

      {/* Music result */}
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
              {t("create_page.music_generating_hint", { defaultValue: "La chanson est en cours de génération par le moteur musical." })}
            </p>
          )}
        </div>
      )}

      {/* Video result */}
      {videoResult && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Video className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t("create_page.video_title", { defaultValue: "Vidéo pédagogique" })}</h3>
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
            <video src={videoResult.video_url} controls className="w-full rounded-lg mt-2" style={{ maxHeight: 400 }} />
          )}
          {!videoResult.video_url && (videoResult.status === "pending" || videoResult.status === "processing") && (
            <p className="text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
              {t("create_page.video_generating_hint", { defaultValue: "La vidéo est en cours de génération." })}
            </p>
          )}
        </div>
      )}

      {/* QA */}
      {qa.publishDecision && <PublishStatusBanner decision={qa.publishDecision} />}
      {qa.qaReport && <QAChecklistPanel report={qa.qaReport} />}

      {/* Document quality */}
      {ingestion.result && (
        <div className="border rounded-lg p-4">
          <DocumentQualityPanel m1Output={ingestion.result} m2Output={analysis.result} />
        </div>
      )}

      {/* Memory Architecture */}
      {memory.result && (
        <>
          <div className="border rounded-lg p-4"><MemoryPlanCard output={memory.result} /></div>
          <div className="border rounded-lg p-4"><PedagogicalContractCard contract={memory.result.pedagogical_contract} /></div>
          <div className="border rounded-lg p-4"><CognitiveBudgetCard budget={memory.result.cognitive_budget} /></div>
          <div className="border rounded-lg p-4"><MemorySegmentsList segments={memory.result.segments} /></div>
          {memory.result.repetition_plan.length > 0 && (
            <div className="border rounded-lg p-4"><RepetitionPlanCard plan={memory.result.repetition_plan} /></div>
          )}
          {memory.result.mnemonics.length > 0 && (
            <div className="border rounded-lg p-4"><MnemonicsCard mnemonics={memory.result.mnemonics} /></div>
          )}
          {memory.result.visual_anchors.length > 0 && (
            <div className="border rounded-lg p-4"><VisualAnchorsCard anchors={memory.result.visual_anchors} /></div>
          )}
        </>
      )}

      {/* Format Decision */}
      {format.result && (
        <div className="border rounded-lg p-4"><FormatDecisionCard decision={format.result} /></div>
      )}

      {/* Concepts */}
      {analysis.result && analysis.result.key_concepts.length > 0 && (
        <div className="border rounded-lg p-4">
          <ConceptList concepts={analysis.result.key_concepts} maxDisplay={10} />
        </div>
      )}
      {analysis.result && analysis.result.key_concepts.length > 1 && (
        <ConceptGraph concepts={analysis.result.key_concepts} confusionPairs={analysis.result.confusion_pairs} />
      )}

      {/* Confusions & Traps */}
      {analysis.result && (analysis.result.confusion_pairs.length > 0 || analysis.result.traps.length > 0) && (
        <div className="border rounded-lg p-4">
          <ConfusionPairsCard confusionPairs={analysis.result.confusion_pairs} traps={analysis.result.traps} />
        </div>
      )}

      {/* Ambiguity warnings */}
      {analysis.result?.confidence.ambiguous_zones && analysis.result.confidence.ambiguous_zones.length > 0 && (
        <AmbiguityWarning zones={analysis.result.confidence.ambiguous_zones as AmbiguousZone[]} />
      )}

      {/* Uncertain concepts */}
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
        {missionResult && !isEmptyGeneration && !pipeline.pipelineError && (
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
  );
}
