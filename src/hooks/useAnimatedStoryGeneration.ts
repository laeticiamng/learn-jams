// ============================================================
// Hook: useAnimatedStoryGeneration
// Manages M5-B animated story generation pipeline
// ============================================================

import { useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { M5B_Input, M5B_Output } from "@/domain/cognitio/story.contracts";
import type { M2_Output } from "@/domain/cognitio/contracts";
import type { M3_Output } from "@/domain/cognitio/memory.contracts";
import type { M4_Output } from "@/domain/cognitio/format.contracts";
import type { PipelineStepStatus, LearningObjective } from "@/domain/cognitio/types";
import {
  generateAnimatedStoryLocally,
  persistStoryTransformation,
} from "@/services/cognitio/animated-story.service";
import type { LearnerAudienceProfile } from "@/domain/cognitio/learner-profile.types";

export type StoryGenerationStepName =
  | "preparing"
  | "checking_necessity"
  | "building_scenes"
  | "validating"
  | "saving";

export interface StoryGenerationStep {
  name: StoryGenerationStepName;
  label: string;
  status: PipelineStepStatus;
  message?: string;
}

const INITIAL_STEPS: StoryGenerationStep[] = [
  { name: "preparing", label: "Préparation du contenu", status: "pending" },
  { name: "checking_necessity", label: "Vérification de la pertinence narrative", status: "pending" },
  { name: "building_scenes", label: "Construction des scènes", status: "pending" },
  { name: "validating", label: "Validation structurelle", status: "pending" },
  { name: "saving", label: "Sauvegarde", status: "pending" },
];

export function useAnimatedStoryGeneration() {
  const { session } = useAuth();
  const [steps, setSteps] = useState<StoryGenerationStep[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<M5B_Output | null>(null);

  const updateStep = useCallback(
    (name: StoryGenerationStepName, status: PipelineStepStatus, message?: string) => {
      setSteps((prev) =>
        prev.map((s) => (s.name === name ? { ...s, status, message } : s)),
      );
    },
    [],
  );

  const generate = useCallback(
    async (
      m2Output: M2_Output,
      m3Output: M3_Output,
      m4Output: M4_Output,
      documentId: string,
      wordCount: number,
      sourceType: string,
      confidenceLevel: number,
      sourceIssues: string[],
      objective: LearningObjective,
      learnerProfile?: LearnerAudienceProfile,
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

        const input: M5B_Input = {
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

        // Step 2: Check narrative necessity
        updateStep("checking_necessity", "running", "Vérification de la valeur narrative...");
        await delay(400);

        const output = generateAnimatedStoryLocally(input);

        if (output.narrative_necessity.revert_candidate) {
          updateStep(
            "checking_necessity",
            "completed",
            "Narration jugée non indispensable mais générée (revert_candidate)",
          );
        } else {
          updateStep("checking_necessity", "completed", "Narration justifiée");
        }

        // Step 3: Building scenes
        updateStep("building_scenes", "running", "Construction des scènes...");
        await delay(500);
        updateStep(
          "building_scenes",
          "completed",
          `${output.scenes.length} scènes générées`,
        );

        // Step 4: Validating
        updateStep("validating", "running", "Validation de la couverture et de la structure...");
        await delay(200);
        const flags = output.metadata.quality_flags;
        const hasCoverage = flags.includes("full_critical_coverage");
        updateStep(
          "validating",
          "completed",
          hasCoverage
            ? "100% des concepts critiques couverts"
            : "Couverture partielle des concepts critiques",
        );

        // Step 5: Saving
        updateStep("saving", "running", "Sauvegarde...");
        try {
          await persistStoryTransformation(output, session.user.id);
          updateStep("saving", "completed");
        } catch {
          updateStep("saving", "completed", "Sauvegarde locale uniquement");
        }

        setResult(output);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de la génération de l'histoire";
        setError(message);
        setSteps((prev) =>
          prev.map((s) =>
            s.status === "running" ? { ...s, status: "error" as const, message } : s,
          ),
        );
      } finally {
        setIsRunning(false);
      }
    },
    [session, updateStep],
  );

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
