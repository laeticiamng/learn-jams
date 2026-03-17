// ============================================================
// Hook: useDocumentIngestion
// Manages M1 ingestion pipeline with step tracking
// ============================================================

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { IngestInput, M1_Output, SourceIssue } from "@/domain/cognitio/contracts";
import type { PipelineStepStatus } from "@/domain/cognitio/types";
import { uploadDocument, runIngestion, extractFileText } from "@/services/cognitio/ingestion.service";
import { isCognitioError, type CognitioError } from "@/lib/cognitio-errors";
import type { ExtractionResult } from "@/services/cognitio/file-extractor.service";

export type IngestionStepName = "upload" | "cleaning" | "segmentation" | "scoring" | "saving";

export interface IngestionStep {
  name: IngestionStepName;
  label: string;
  status: PipelineStepStatus;
  message?: string;
}

const INITIAL_STEPS: IngestionStep[] = [
  { name: "upload", label: "Import du document", status: "pending" },
  { name: "cleaning", label: "Nettoyage du texte", status: "pending" },
  { name: "segmentation", label: "Segmentation logique", status: "pending" },
  { name: "scoring", label: "Évaluation qualité", status: "pending" },
  { name: "saving", label: "Sauvegarde", status: "pending" },
];

/** Debug information for the import pipeline (visible in dev mode) */
export interface ImportDebugInfo {
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  extraction_method: string | null;
  extraction_success: boolean | null;
  extraction_warnings: string[];
  extracted_text_length: number | null;
  upload_started: boolean;
  upload_success: boolean | null;
  upload_bucket: string | null;
  upload_error: string | null;
  document_id: string | null;
  document_record_created: boolean | null;
  edge_function_called: boolean;
  edge_function_status: string | null;
  fallback_used: boolean;
  root_cause: string | null;
  raw_error: string | null;
  step_log: string[];
  timestamps: Record<string, number>;
}

const EMPTY_DEBUG: ImportDebugInfo = {
  file_name: null,
  file_type: null,
  file_size: null,
  extraction_method: null,
  extraction_success: null,
  extraction_warnings: [],
  extracted_text_length: null,
  upload_started: false,
  upload_success: null,
  upload_bucket: null,
  upload_error: null,
  document_id: null,
  document_record_created: null,
  edge_function_called: false,
  edge_function_status: null,
  fallback_used: false,
  root_cause: null,
  raw_error: null,
  step_log: [],
  timestamps: {},
};

export function useDocumentIngestion() {
  const { session } = useAuth();
  const [steps, setSteps] = useState<IngestionStep[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<M1_Output | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<ImportDebugInfo>(EMPTY_DEBUG);

  const updateStep = useCallback((name: IngestionStepName, status: PipelineStepStatus, message?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.name === name ? { ...s, status, message } : s))
    );
  }, []);

  // Deep merge for timestamps — FIX: previous implementation replaced entire timestamps object
  const updateDebug = useCallback((patch: Partial<ImportDebugInfo>) => {
    setDebugInfo((prev) => {
      const merged = { ...prev, ...patch };
      // Deep merge timestamps instead of replacing
      if (patch.timestamps) {
        merged.timestamps = { ...prev.timestamps, ...patch.timestamps };
      }
      // Append to step_log instead of replacing
      if (patch.step_log) {
        merged.step_log = [...prev.step_log, ...patch.step_log];
      }
      return merged;
    });
  }, []);

  const ingest = useCallback(async (input: IngestInput): Promise<M1_Output | null> => {
    if (!session?.user?.id) {
      setError("Vous devez être connecté pour importer un document.");
      return null;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    setDebugInfo({ ...EMPTY_DEBUG, timestamps: { start: Date.now() } });

    // Record file info for debug
    if (input.file) {
      updateDebug({
        file_name: input.file.name,
        file_type: input.file.type || "(empty)",
        file_size: input.file.size,
        step_log: [`[${new Date().toISOString()}] File selected: ${input.file.name} (${input.file.type || "no MIME"}, ${input.file.size} bytes)`],
      });
    } else if (input.pasted_text) {
      updateDebug({
        step_log: [`[${new Date().toISOString()}] Pasted text: ${input.pasted_text.length} chars`],
      });
    }

    try {
      // Step 0: Extract text client-side BEFORE upload (for file imports)
      let enrichedInput = { ...input };

      if (input.file && !input.pasted_text) {
        updateStep("upload", "running", "Extraction du texte du fichier...");
        updateDebug({
          timestamps: { extraction_start: Date.now() },
          step_log: [`[${new Date().toISOString()}] Starting client-side extraction...`],
        });

        const extraction: ExtractionResult = await extractFileText(input.file);

        updateDebug({
          extraction_method: extraction.method,
          extraction_success: extraction.success,
          extraction_warnings: extraction.warnings,
          extracted_text_length: extraction.text.length,
          timestamps: { extraction_end: Date.now() },
          step_log: [
            `[${new Date().toISOString()}] Extraction ${extraction.success ? "OK" : "FAILED"} via ${extraction.method}: ${extraction.text.length} chars`,
            ...(extraction.warnings.length > 0 ? extraction.warnings.map(w => `  warn: ${w}`) : []),
            ...(extraction.error ? [`  error: ${extraction.error}`] : []),
          ],
        });

        if (extraction.success && extraction.text.trim().length > 0) {
          // Pass extracted text as pasted_text so edge function AND local fallback can use it
          enrichedInput = {
            ...input,
            pasted_text: extraction.text,
          };
          console.info(`[COGNITIO] Client-side extraction successful: ${extraction.text.length} chars via ${extraction.method}`);
        } else {
          // Extraction failed — show specific error
          const failReason = extraction.error || "Le texte n'a pas pu être extrait du fichier";
          console.error("[COGNITIO] Client-side extraction failed:", failReason, extraction.warnings);
          updateDebug({
            root_cause: `extraction_failed: ${failReason}`,
            step_log: [`[${new Date().toISOString()}] BLOCKED at extraction — no text could be extracted`],
          });

          // For scanned PDFs, give a specific message
          if (extraction.warnings.some((w) => w.includes("scanné") || w.includes("image"))) {
            setError("Le PDF semble être un scan/image sans texte extractible. Veuillez utiliser un PDF avec du texte sélectionnable, ou coller le texte directement.");
          } else {
            setError(`Le texte n'a pas pu être extrait du fichier (${input.file.name}). ${extraction.warnings.join(". ")}. Essayez de coller le texte directement.`);
          }
          updateStep("upload", "error", failReason);
          return null;
        }
      }

      // Step 1: Upload file to storage + create DB record
      updateStep("upload", "running", "Téléversement en cours...");
      updateDebug({
        upload_started: true,
        timestamps: { upload_start: Date.now() },
        step_log: [`[${new Date().toISOString()}] Starting upload + DB insert...`],
      });

      const uploadResult = await uploadDocument(session.user.id, enrichedInput);
      setDocumentId(uploadResult.document_id);

      updateDebug({
        document_id: uploadResult.document_id,
        upload_success: uploadResult.storage_path !== null,
        upload_bucket: uploadResult.bucket_used,
        upload_error: uploadResult.storage_error,
        document_record_created: true,
        timestamps: { upload_end: Date.now() },
        step_log: [
          `[${new Date().toISOString()}] DB record created: ${uploadResult.document_id}`,
          uploadResult.storage_path
            ? `[${new Date().toISOString()}] File stored in bucket "${uploadResult.bucket_used}": ${uploadResult.storage_path}`
            : `[${new Date().toISOString()}] Storage SKIPPED (text already extracted)${uploadResult.storage_error ? ` — error: ${uploadResult.storage_error}` : ""}`,
        ],
      });

      if (uploadResult.storage_error) {
        updateStep("upload", "completed", "Document reçu (stockage fichier échoué, texte extrait disponible)");
      } else {
        updateStep("upload", "completed", "Document reçu");
      }

      // Step 2-5: Ingestion (edge function or local fallback)
      updateStep("cleaning", "running", "Nettoyage et préparation du texte...");
      updateDebug({
        edge_function_called: true,
        timestamps: { ingestion_start: Date.now() },
        step_log: [`[${new Date().toISOString()}] Starting ingestion (edge function + local fallback)...`],
      });

      const m1Output = await runIngestion(uploadResult.document_id, enrichedInput, session.user.id);

      const fallbackUsed = m1Output._fallback_used || m1Output.issues.some((i) => i.code === "LOCAL_EXTRACTION_USED");
      updateDebug({
        edge_function_status: "completed",
        fallback_used: fallbackUsed,
        timestamps: { ingestion_end: Date.now() },
        step_log: [
          `[${new Date().toISOString()}] Ingestion completed: ${m1Output.word_count} words, ${m1Output.segments.length} segments, confidence=${m1Output.confidence_level.toFixed(2)}`,
          fallbackUsed ? `[${new Date().toISOString()}] Local fallback was used (edge function unavailable)` : "",
          ...(m1Output.issues.length > 0 ? m1Output.issues.map(i => `  issue [${i.severity}]: ${i.code} — ${i.message}`) : []),
        ].filter(Boolean),
      });

      // Mark intermediate steps based on output
      updateStep("cleaning", "completed",
        fallbackUsed
          ? `${m1Output.word_count} mots extraits (mode local — service distant indisponible)`
          : `${m1Output.word_count} mots extraits`
      );
      updateStep("segmentation", "running", "Découpage en sections logiques...");

      await new Promise((r) => setTimeout(r, 300));
      updateStep("segmentation", "completed", `${m1Output.segments.length} segments détectés`);

      updateStep("scoring", "running", "Évaluation de la qualité source...");
      await new Promise((r) => setTimeout(r, 200));

      const hasBlocking = m1Output.issues.some((i: SourceIssue) => i.severity === "blocking");
      updateStep("scoring", hasBlocking ? "error" : "completed",
        hasBlocking
          ? "Qualité insuffisante — certaines étapes sont bloquées"
          : `Confiance: ${Math.round(m1Output.confidence_level * 100)}%`
      );

      updateStep("saving", "running", "Sauvegarde des résultats...");
      await new Promise((r) => setTimeout(r, 200));
      updateStep("saving", "completed", "Données persistées");

      updateDebug({
        step_log: [`[${new Date().toISOString()}] M1 pipeline COMPLETE — ${hasBlocking ? "HAS BLOCKING ISSUES" : "OK"}`],
      });

      setResult(m1Output);
      return m1Output;
    } catch (err: unknown) {
      let message: string;
      let technicalDetail = "";
      let rootCause = "unknown";

      if (isCognitioError(err)) {
        const cogErr = err as CognitioError;
        message = cogErr.user_message;
        technicalDetail = `[${cogErr.code}] ${cogErr.technical_message}`;
        rootCause = cogErr.code;
      } else if (err instanceof Error) {
        const raw = err.message;
        technicalDetail = raw;

        if (raw.includes("storage") || raw.includes("bucket") || raw.includes("upload")) {
          message = "Le fichier n'a pas pu être envoyé au serveur. Vérifiez votre connexion et réessayez.";
          rootCause = "storage_upload_failed";
        } else if (raw.includes("source_documents") || raw.includes("insert") || raw.includes("row-level security")) {
          message = "Erreur lors de l'enregistrement du document en base de données. Veuillez réessayer.";
          rootCause = "db_insert_failed";
        } else if (raw.includes("auth") || raw.includes("JWT") || raw.includes("token")) {
          message = "Votre session a expiré. Veuillez vous reconnecter.";
          rootCause = "auth_expired";
        } else if (raw.includes("network") || raw.includes("fetch") || raw.includes("Failed to fetch")) {
          message = "Le service d'analyse est temporairement indisponible. Veuillez réessayer dans quelques instants.";
          rootCause = "network_error";
        } else if (raw.includes("extract") || raw.includes("parse") || raw.includes("PDF") || raw.includes("DOCX")) {
          message = "Le document a été envoyé mais son texte n'a pas pu être extrait. Essayez un autre format ou collez le texte directement.";
          rootCause = "text_extraction_failed";
        } else {
          message = "Le document n'a pas pu être importé. Veuillez réessayer ou coller le texte directement.";
          rootCause = "unknown_error";
        }
      } else {
        message = "Erreur inattendue lors de l'import. Veuillez réessayer.";
        rootCause = "unexpected_error";
      }

      if (technicalDetail) {
        console.error("[COGNITIO Ingestion Error]", technicalDetail);
      }

      updateDebug({
        root_cause: rootCause,
        raw_error: technicalDetail || String(err),
        timestamps: { error_at: Date.now() },
        step_log: [
          `[${new Date().toISOString()}] PIPELINE ERROR: ${rootCause}`,
          `  message: ${technicalDetail || String(err)}`,
        ],
      });

      setError(message);

      // Mark current running step as error
      setSteps((prev) =>
        prev.map((s) => (s.status === "running" ? { ...s, status: "error" as const, message } : s))
      );
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [session, updateStep, updateDebug]);

  const reset = useCallback(() => {
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    setIsRunning(false);
    setError(null);
    setResult(null);
    setDocumentId(null);
    setDebugInfo(EMPTY_DEBUG);
  }, []);

  return {
    steps,
    isRunning,
    error,
    result,
    documentId,
    debugInfo,
    ingest,
    reset,
  };
}
