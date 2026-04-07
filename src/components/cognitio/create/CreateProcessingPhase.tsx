// ============================================================
// CreateProcessingPhase — Processing spinner & pipeline status
// Extracted from Create.tsx for maintainability
// ============================================================

import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import IngestionStatus from "@/components/cognitio/IngestionStatus";
import ImportDebugPanel from "@/components/cognitio/ImportDebugPanel";
import { PipelineSpectacle } from "@/experience/PipelineSpectacle";
import { PipelineErrorCard } from "./PipelineErrorCard";
import type { useCreatePipeline } from "@/hooks/useCreatePipeline";

interface Props {
  pipeline: ReturnType<typeof useCreatePipeline>;
  phaseTitle: string;
  phaseKeys: Record<string, string>;
}

export function CreateProcessingPhase({ pipeline, phaseTitle, phaseKeys }: Props) {
  const { t } = useTranslation();

  return (
    <motion.div
      key="progress"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <PipelineSpectacle currentPhase={pipeline.phase} title={phaseTitle} />

      <IngestionStatus steps={pipeline.allSteps} title={phaseTitle} />

      <ImportDebugPanel debugInfo={pipeline.ingestion.debugInfo} />

      {pipeline.pipelineError && (
        <PipelineErrorCard
          error={pipeline.pipelineError}
          phaseKeys={phaseKeys}
          onReset={pipeline.reset}
        />
      )}

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
  );
}
