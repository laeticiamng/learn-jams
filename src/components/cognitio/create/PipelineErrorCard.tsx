// ============================================================
// PipelineErrorCard — Extracted error display component
// ============================================================

import { useTranslation } from "react-i18next";
import { AlertTriangle, RotateCcw, ClipboardPaste, Upload, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  error: { source: string; message: string; phase: string };
  phaseKeys: Record<string, string>;
  onReset: () => void;
}

export function PipelineErrorCard({ error, phaseKeys, onReset }: Props) {
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
