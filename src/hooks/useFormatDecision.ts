// ============================================================
// Hook: useFormatDecision
// Manages M4 format selector pipeline with step tracking
// ============================================================

import { useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { M4_Output } from "@/domain/cognitio/format.contracts";
import type { M4_Input } from "@/domain/cognitio/format.contracts";
import type { M3_Output } from "@/domain/cognitio/memory.contracts";
import type { M2_Output } from "@/domain/cognitio/contracts";
import type { PipelineStepStatus, LearningObjective } from "@/domain/cognitio/types";
import { selectFormatLocally, persistFormatDecision } from "@/services/cognitio/format-selector.service";

export type FormatStepName = "matrix" | "overrides" | "splitting" | "saving";

export interface FormatStep {
  name: FormatStepName;
  label: string;
  status: PipelineStepStatus;
  message?: string;
}

const INITIAL_STEPS: FormatStep[] = [
  { name: "matrix", label: "Matrice de décision", status: "pending" },
  { name: "overrides", label: "Vérification des overrides", status: "pending" },
  { name: "splitting", label: "Découpage en modules", status: "pending" },
  { name: "saving", label: "Sauvegarde", status: "pending" },
];

export function useFormatDecision() {
  const { session } = useAuth();
  const [steps, setSteps] = useState<FormatStep[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<M4_Output | null>(null);

  const updateStep = useCallback((name: FormatStepName, status: PipelineStepStatus, message?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.name === name ? { ...s, status, message } : s))
    );
  }, []);

  const decide = useCallback(async (
    m3Output: M3_Output,
    m2Output: M2_Output,
    documentId: string,
    qualityScore: number,
    objective: LearningObjective
  ) => {
    if (!session?.user?.id) {
      setError("Vous devez être connecté.");
      return;
    }

    setIsRunning(true);
    setError(null);
    setSteps(INITIAL_STEPS);

    try {
      // Step 1: Matrix
      updateStep("matrix", "running", "Application de la matrice décisionnelle...");
      await delay(300);

      const input: M4_Input = {
        architecture_id: m3Output.architecture_id,
        course_profile_id: m3Output.course_profile_id,
        document_id: documentId,
        total_concepts: m3Output.cognitive_budget.total_concepts,
        critical_count: m3Output.pedagogical_contract.critical_concepts,
        segment_count: m3Output.segments.length,
        total_duration_sec: m3Output.total_duration_sec,
        needs_splitting: m3Output.needs_splitting,
        split_modules: m3Output.split_modules,
        reasoning_type: m2Output.reasoning_type,
        density: m2Output.density,
        estimated_complexity: m2Output.estimated_complexity,
        structure_type: m2Output.structure_type,
        quality_score: qualityScore,
        objective,
      };

      const output = selectFormatLocally(input);

      updateStep("matrix", "completed", `Matrice: ${output.decision_trace.matrix_result}`);

      // Step 2: Overrides
      updateStep("overrides", "running", "Vérification des conditions de dérogation...");
      await delay(250);
      updateStep("overrides", "completed",
        output.overrides_applied.length > 0
          ? `${output.overrides_applied.length} override(s) appliqué(s)`
          : "Aucun override nécessaire"
      );

      // Step 3: Splitting
      updateStep("splitting", "running", "Analyse du découpage...");
      await delay(200);
      updateStep("splitting", "completed",
        output.needs_split
          ? `${output.split_count} module(s) requis`
          : "Module unique"
      );

      // Step 4: Saving
      updateStep("saving", "running", "Sauvegarde...");
      try {
        await persistFormatDecision(
          output,
          documentId,
          m3Output.course_profile_id,
          session.user.id
        );
        updateStep("saving", "completed");
      } catch {
        updateStep("saving", "completed", "Sauvegarde locale uniquement");
      }

      setResult(output);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la sélection de format";
      setError(message);

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
  }, []);

  return { steps, isRunning, error, result, decide, reset };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
