// ============================================================
// Hook: useMemoryArchitecture
// Manages M3 memory architect pipeline with step tracking
// ============================================================

import { useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { M3_Output } from "@/domain/cognitio/memory.contracts";
import type { M2_Output } from "@/domain/cognitio/contracts";
import type { PipelineStepStatus, LearningObjective } from "@/domain/cognitio/types";
import { buildLocalMemoryArchitect, persistMemoryArchitecture } from "@/services/cognitio/memory-architect.service";
import type { M3_Input } from "@/domain/cognitio/memory.contracts";
import type { LearnerAudienceProfile } from "@/domain/cognitio/learner-profile.types";

export type MemoryStepName = "ordering" | "segmenting" | "repetition" | "mnemonics" | "saving";

export interface MemoryStep {
  name: MemoryStepName;
  label: string;
  status: PipelineStepStatus;
  message?: string;
}

const INITIAL_STEPS: MemoryStep[] = [
  { name: "ordering", label: "Ordonnancement des concepts", status: "pending" },
  { name: "segmenting", label: "Segmentation cognitive", status: "pending" },
  { name: "repetition", label: "Plan de répétition", status: "pending" },
  { name: "mnemonics", label: "Mnémoniques et ancrages", status: "pending" },
  { name: "saving", label: "Sauvegarde", status: "pending" },
];

export function useMemoryArchitecture() {
  const { session } = useAuth();
  const [steps, setSteps] = useState<MemoryStep[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<M3_Output | null>(null);

  const updateStep = useCallback((name: MemoryStepName, status: PipelineStepStatus, message?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.name === name ? { ...s, status, message } : s))
    );
  }, []);

  const build = useCallback(async (m2Output: M2_Output, documentId: string, objective: LearningObjective, learnerProfile?: LearnerAudienceProfile) => {
    if (!session?.user?.id) {
      setError("Vous devez être connecté.");
      return;
    }

    setIsRunning(true);
    setError(null);
    setSteps(INITIAL_STEPS);

    try {
      // Step 1: Ordering
      updateStep("ordering", "running", "Analyse de l'ordre optimal...");
      await delay(300);

      const input: M3_Input = {
        course_profile_id: m2Output.course_profile_id,
        document_id: documentId,
        concepts: m2Output.key_concepts,
        confusion_pairs: m2Output.confusion_pairs,
        traps: m2Output.traps,
        reasoning_type: m2Output.reasoning_type,
        objective,
        density: m2Output.density,
        estimated_complexity: m2Output.estimated_complexity,
        learner_profile: learnerProfile,
      };

      updateStep("ordering", "completed", `${m2Output.key_concepts.length} concepts ordonnés`);

      // Step 2: Segmenting
      updateStep("segmenting", "running", "Construction des segments cognitifs...");
      await delay(400);

      const output = buildLocalMemoryArchitect(input);

      updateStep("segmenting", "completed", `${output.segments.length} segments créés`);

      // Step 3: Repetition plan
      updateStep("repetition", "running", "Planification des répétitions...");
      await delay(300);
      updateStep("repetition", "completed", `${output.repetition_plan.filter(r => r.is_critical).length} concepts critiques planifiés`);

      // Step 4: Mnemonics
      updateStep("mnemonics", "running", "Génération des mnémoniques...");
      await delay(300);
      updateStep("mnemonics", "completed", `${output.mnemonics.length} mnémonique(s), ${output.visual_anchors.length} ancrage(s)`);

      // Step 5: Saving
      updateStep("saving", "running", "Sauvegarde...");
      try {
        await persistMemoryArchitecture(output, session.user.id);
        updateStep("saving", "completed");
      } catch {
        // Non-fatal: we still have the result
        updateStep("saving", "completed", "Sauvegarde locale uniquement");
      }

      setResult(output);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la construction mémoire";
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
  }, []);

  return { steps, isRunning, error, result, build, reset };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
