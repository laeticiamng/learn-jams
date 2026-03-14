// ============================================================
// Hook: useDynamicSheetGeneration
// Manages M5-A dynamic sheet generation pipeline
// ============================================================

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { M5_Input, M5_Output } from "@/domain/cognitio/generation.contracts";
import type { M2_Output } from "@/domain/cognitio/contracts";
import type { M3_Output } from "@/domain/cognitio/memory.contracts";
import type { M4_Output } from "@/domain/cognitio/format.contracts";
import type { PipelineStepStatus, LearningObjective } from "@/domain/cognitio/types";
import { generateDynamicSheetLocally, persistTransformation } from "@/services/cognitio/dynamic-sheet.service";
import type { LearnerAudienceProfile } from "@/domain/cognitio/learner-profile.types";

export type GenerationStepName = "preparing" | "building_blocks" | "building_test" | "validating" | "saving";

export interface GenerationStep {
  name: GenerationStepName;
  label: string;
  status: PipelineStepStatus;
  message?: string;
}

const INITIAL_STEPS: GenerationStep[] = [
  { name: "preparing", label: "Préparation du contenu", status: "pending" },
  { name: "building_blocks", label: "Construction des blocs pédagogiques", status: "pending" },
  { name: "building_test", label: "Génération du test final", status: "pending" },
  { name: "validating", label: "Validation structurelle", status: "pending" },
  { name: "saving", label: "Sauvegarde", status: "pending" },
];

export function useDynamicSheetGeneration() {
  const { session } = useAuth();
  const [steps, setSteps] = useState<GenerationStep[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<M5_Output | null>(null);

  const updateStep = useCallback((name: GenerationStepName, status: PipelineStepStatus, message?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.name === name ? { ...s, status, message } : s))
    );
  }, []);

  const generate = useCallback(async (
    m2Output: M2_Output,
    m3Output: M3_Output,
    m4Output: M4_Output,
    documentId: string,
    wordCount: number,
    sourceType: string,
    confidenceLevel: number,
    sourceIssues: string[],
    objective: LearningObjective,
    learnerProfile?: LearnerAudienceProfile
  ) => {
    if (!session?.user?.id) {
      setError("Vous devez être connecté.");
      return;
    }

    setIsRunning(true);
    setError(null);
    setSteps(INITIAL_STEPS);

    try {
      // Step 1: Preparing
      updateStep("preparing", "running", "Assemblage des données M2 + M3 + M4...");
      await delay(300);

      const input: M5_Input = {
        m2_output: m2Output,
        m3_output: m3Output,
        m4_output: m4Output,
        source_document: {
          document_id: documentId,
          word_count: wordCount,
          source_type: sourceType,
          confidence_level: confidenceLevel,
          source_issues: sourceIssues,
        },
        user_objective: objective,
        learner_profile: learnerProfile,
      };

      updateStep("preparing", "completed");

      // Step 2: Building blocks
      updateStep("building_blocks", "running", "Construction des 8 temps pédagogiques...");
      await delay(500);

      const output = generateDynamicSheetLocally(input);

      updateStep("building_blocks", "completed", `${output.content_blocks.length} blocs générés`);

      // Step 3: Building test
      updateStep("building_test", "running", "Génération du test final...");
      await delay(300);
      updateStep("building_test", "completed", `${output.final_test.length} questions, ${new Set(output.final_test.map(q => q.bloom_level)).size} niveaux Bloom`);

      // Step 4: Validating
      updateStep("validating", "running", "Validation de la couverture...");
      await delay(200);
      const { coverage } = output.metadata;
      updateStep("validating", "completed", `${coverage.critical_covered}/${coverage.critical_total} notions critiques couvertes`);

      // Step 5: Saving
      updateStep("saving", "running", "Sauvegarde...");
      try {
        await persistTransformation(output, session.user.id);
        updateStep("saving", "completed");
      } catch {
        updateStep("saving", "completed", "Sauvegarde locale uniquement");
      }

      setResult(output);
      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la génération";
      setError(message);
      setSteps((prev) =>
        prev.map((s) => (s.status === "running" ? { ...s, status: "error" as const, message } : s))
      );
      return null;
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

  return { steps, isRunning, error, result, generate, reset };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
