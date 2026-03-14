// ============================================================
// Hook: useDocumentIngestion
// Manages M1 ingestion pipeline with step tracking
// ============================================================

import { useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { IngestInput, M1_Output, SourceIssue } from "@/domain/cognitio/contracts";
import type { PipelineStep, PipelineStepStatus } from "@/domain/cognitio/types";
import { uploadDocument, runIngestion } from "@/services/cognitio/ingestion.service";
import { isCognitioError, type CognitioError } from "@/lib/cognitio-errors";

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

export function useDocumentIngestion() {
  const { session } = useAuth();
  const [steps, setSteps] = useState<IngestionStep[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<M1_Output | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const updateStep = useCallback((name: IngestionStepName, status: PipelineStepStatus, message?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.name === name ? { ...s, status, message } : s))
    );
  }, []);

  const ingest = useCallback(async (input: IngestInput) => {
    if (!session?.user?.id) {
      setError("Vous devez être connecté pour importer un document.");
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);
    setSteps(INITIAL_STEPS);

    try {
      // Step 1: Upload
      updateStep("upload", "running", "Téléversement en cours...");
      const { document_id } = await uploadDocument(session.user.id, input);
      setDocumentId(document_id);
      updateStep("upload", "completed", "Document reçu");

      // Step 2-5: Ingestion (edge function handles cleaning, segmentation, scoring, saving)
      updateStep("cleaning", "running", "Nettoyage et préparation du texte...");

      const m1Output = await runIngestion(document_id, input, session.user.id);

      // Mark intermediate steps based on output
      updateStep("cleaning", "completed", `${m1Output.word_count} mots extraits`);
      updateStep("segmentation", "running", "Découpage en sections logiques...");

      // Small delay for UX (shows progression)
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

      setResult(m1Output);
    } catch (err) {
      const message = isCognitioError(err)
        ? (err as CognitioError).user_message
        : err instanceof Error
          ? err.message
          : "Erreur inattendue lors de l'import";

      setError(message);

      // Mark current running step as error
      setSteps((prev) =>
        prev.map((s) => (s.status === "running" ? { ...s, status: "error" as const, message } : s))
      );
    } finally {
      setIsRunning(false);
    }
  }, [session, updateStep]);

  const reset = useCallback(() => {
    setSteps(INITIAL_STEPS);
    setIsRunning(false);
    setError(null);
    setResult(null);
    setDocumentId(null);
  }, []);

  return {
    steps,
    isRunning,
    error,
    result,
    documentId,
    ingest,
    reset,
  };
}
