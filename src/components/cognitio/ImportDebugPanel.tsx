import { useState, useEffect } from "react";
import { Bug, ChevronDown, ChevronUp, Check, X, Minus } from "lucide-react";
import type { ImportDebugInfo } from "@/hooks/useDocumentIngestion";

interface ImportDebugPanelProps {
  debugInfo: ImportDebugInfo;
}

export default function ImportDebugPanel({ debugInfo }: ImportDebugPanelProps) {
  const [expanded, setExpanded] = useState(false);

  // Only show in development mode
  if (import.meta.env.PROD) return null;

  // Auto-expand when an error occurs
  useEffect(() => {
    if (debugInfo.root_cause || debugInfo.raw_error) {
      setExpanded(true);
    }
  }, [debugInfo.root_cause, debugInfo.raw_error]);

  // Don't show if no data yet
  if (!debugInfo.file_name && !debugInfo.upload_started && debugInfo.step_log.length === 0) return null;

  const hasError = Boolean(debugInfo.root_cause || debugInfo.raw_error);

  return (
    <div className={`mt-4 border rounded-xl text-xs font-mono overflow-hidden ${
      hasError
        ? "border-red-500/50 bg-red-500/5"
        : "border-orange-500/30 bg-orange-500/5"
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-orange-500/10 transition-colors"
      >
        <Bug className={`w-3.5 h-3.5 ${hasError ? "text-red-500" : "text-orange-500"}`} />
        <span className={`font-semibold ${hasError ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"}`}>
          Import Debug Panel
        </span>
        <span className="flex-1" />
        {debugInfo.root_cause && (
          <span className="text-red-500 mr-2">cause: {debugInfo.root_cause}</span>
        )}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-orange-500/20 pt-2">
          {/* File Info */}
          <DebugSection title="Fichier sélectionné">
            <DebugRow label="nom" value={debugInfo.file_name} />
            <DebugRow label="type MIME" value={debugInfo.file_type} />
            <DebugRow label="taille" value={debugInfo.file_size ? `${(debugInfo.file_size / 1024).toFixed(1)} Ko` : null} />
          </DebugSection>

          {/* Extraction */}
          <DebugSection title="Extraction texte (client-side)">
            <DebugRow label="méthode" value={debugInfo.extraction_method} />
            <DebugStatusRow label="succès" value={debugInfo.extraction_success} />
            <DebugRow label="texte extrait" value={debugInfo.extracted_text_length !== null ? `${debugInfo.extracted_text_length} chars` : null} />
            {debugInfo.extraction_warnings.length > 0 && (
              <div className="text-orange-500">
                {debugInfo.extraction_warnings.map((w, i) => (
                  <div key={i}>warn: {w}</div>
                ))}
              </div>
            )}
          </DebugSection>

          {/* Upload */}
          <DebugSection title="Upload storage">
            <DebugStatusRow label="démarré" value={debugInfo.upload_started} />
            <DebugStatusRow label="succès" value={debugInfo.upload_success} />
            <DebugRow label="bucket" value={debugInfo.upload_bucket} />
            {debugInfo.upload_error && (
              <div className="text-red-500">erreur: {debugInfo.upload_error}</div>
            )}
          </DebugSection>

          {/* DB Record */}
          <DebugSection title="Document record (source_documents)">
            <DebugRow label="document_id" value={debugInfo.document_id} />
            <DebugStatusRow label="créé" value={debugInfo.document_record_created} />
          </DebugSection>

          {/* Edge Function */}
          <DebugSection title="Edge function (cognitio-ingest)">
            <DebugStatusRow label="appelée" value={debugInfo.edge_function_called} />
            <DebugRow label="status" value={debugInfo.edge_function_status} />
            <DebugStatusRow label="fallback local utilisé" value={debugInfo.fallback_used} />
          </DebugSection>

          {/* Root Cause */}
          {debugInfo.root_cause && (
            <DebugSection title="Cause racine">
              <div className="text-red-500 font-semibold">{debugInfo.root_cause}</div>
            </DebugSection>
          )}

          {/* Raw Error */}
          {debugInfo.raw_error && (
            <DebugSection title="Erreur brute">
              <div className="text-red-400 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                {debugInfo.raw_error}
              </div>
            </DebugSection>
          )}

          {/* Step Log — full chronological trace */}
          {debugInfo.step_log.length > 0 && (
            <DebugSection title="Journal détaillé">
              <div className="text-muted-foreground whitespace-pre-wrap break-all max-h-64 overflow-y-auto bg-black/5 dark:bg-white/5 rounded p-2">
                {debugInfo.step_log.map((line, i) => (
                  <div key={i} className={
                    line.includes("ERROR") || line.includes("FAILED") || line.includes("BLOCKED")
                      ? "text-red-500"
                      : line.includes("warn:")
                        ? "text-orange-500"
                        : line.includes("OK") || line.includes("COMPLETE")
                          ? "text-green-600 dark:text-green-400"
                          : ""
                  }>
                    {line}
                  </div>
                ))}
              </div>
            </DebugSection>
          )}

          {/* Timing */}
          {Object.keys(debugInfo.timestamps).length > 1 && (
            <DebugSection title="Timing">
              {Object.entries(debugInfo.timestamps)
                .sort(([, a], [, b]) => a - b)
                .map(([key, ts]) => (
                  <DebugRow
                    key={key}
                    label={key}
                    value={`${new Date(ts).toISOString().slice(11, 23)} (${debugInfo.timestamps.start ? `+${ts - debugInfo.timestamps.start}ms` : ""})`}
                  />
                ))}
            </DebugSection>
          )}
        </div>
      )}
    </div>
  );
}

function DebugSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground font-semibold uppercase tracking-wider mb-1">{title}</div>
      <div className="pl-2 space-y-0.5">{children}</div>
    </div>
  );
}

function DebugRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className={value ? "" : "text-muted-foreground/50"}>{value ?? "—"}</span>
    </div>
  );
}

function DebugStatusRow({ label, value }: { label: string; value: boolean | null | undefined }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{label}:</span>
      {value === true && <Check className="w-3 h-3 text-green-500" />}
      {value === false && <X className="w-3 h-3 text-red-500" />}
      {value === null || value === undefined ? <Minus className="w-3 h-3 text-muted-foreground/50" /> : null}
    </div>
  );
}
