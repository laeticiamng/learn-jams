// ============================================================
// Hook: useCourseAnalysis
// Manages M2 analysis pipeline with step tracking
// ============================================================

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { M1_Output, M2_Input, M2_Output } from "@/domain/cognitio/contracts";
import type { PipelineStepStatus } from "@/domain/cognitio/types";
import { analyzeAndPersist } from "@/services/cognitio/analysis.service";
import type { LearnerAudienceProfile } from "@/domain/cognitio/learner-profile.types";

export type AnalysisStepName = "understanding" | "concepts" | "traps" | "verification" | "saving";

export interface AnalysisStep {
  name: AnalysisStepName;
  label: string;
  status: PipelineStepStatus;
  message?: string;
}

const INITIAL_STEPS: AnalysisStep[] = [
  { name: "understanding", label: "Compréhension du contenu", status: "pending" },
  { name: "concepts", label: "Extraction des concepts", status: "pending" },
  { name: "traps", label: "Détection des pièges", status: "pending" },
  { name: "verification", label: "Vérification traçabilité", status: "pending" },
  { name: "saving", label: "Sauvegarde du profil", status: "pending" },
];

export function useCourseAnalysis() {
  const { session } = useAuth();
  const [steps, setSteps] = useState<AnalysisStep[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<M2_Output | null>(null);

  const updateStep = useCallback((name: AnalysisStepName, status: PipelineStepStatus, message?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.name === name ? { ...s, status, message } : s))
    );
  }, []);

  const analyze = useCallback(async (m1Output: M1_Output, objective: string = "discovery", learnerProfile?: LearnerAudienceProfile) => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setSteps(INITIAL_STEPS);

    try {
      // Build M2 input from M1 output
      const input: M2_Input = {
        document_id: m1Output.document_id,
        clean_text: m1Output.clean_text,
        segments: m1Output.segments,
        source_type: m1Output.source_type,
        confidence_level: m1Output.confidence_level,
        user_objective: objective as M2_Input["user_objective"],
        learner_profile: learnerProfile,
      };

      // Step 1: Understanding
      updateStep("understanding", "running", "Analyse du contenu en cours...");
      await new Promise((r) => setTimeout(r, 400));
      updateStep("understanding", "completed", `Type: ${m1Output.source_type}, Structure: ${m1Output.detected_structure}`);

      // Step 2: Concept extraction
      updateStep("concepts", "running", "Extraction des concepts clés...");

      const m2Output = await analyzeAndPersist(input);

      updateStep("concepts", "completed", `${m2Output.total_concepts} concepts extraits (${m2Output.critical_count} critiques)`);

      // Step 3: Trap detection
      updateStep("traps", "running", "Recherche de pièges et confusions...");
      await new Promise((r) => setTimeout(r, 300));
      const trapCount = m2Output.traps.length + m2Output.confusion_pairs.length;
      updateStep("traps", "completed",
        trapCount > 0
          ? `${m2Output.traps.length} piège(s), ${m2Output.confusion_pairs.length} confusion(s) détectées`
          : "Aucun piège majeur détecté"
      );

      // Step 4: Verification
      updateStep("verification", "running", "Vérification de la traçabilité source...");
      await new Promise((r) => setTimeout(r, 200));
      const uncertainCount = m2Output.key_concepts.filter((c) => c.uncertain).length;
      updateStep("verification", uncertainCount > 0 ? "completed" : "completed",
        uncertainCount > 0
          ? `${uncertainCount} concept(s) marqué(s) comme incertains`
          : "Tous les concepts sont traçables"
      );

      // Step 5: Saving
      updateStep("saving", "running", "Sauvegarde du profil pédagogique...");
      await new Promise((r) => setTimeout(r, 200));
      updateStep("saving", "completed", "Profil sauvegardé");

      setResult(m2Output);
      return m2Output;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'analyse";
      setError(message);
      setSteps((prev) =>
        prev.map((s) => (s.status === "running" ? { ...s, status: "error" as const, message } : s))
      );
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [updateStep]);

  const reset = useCallback(() => {
    setSteps(INITIAL_STEPS);
    setIsRunning(false);
    setError(null);
    setResult(null);
  }, []);

  return {
    steps,
    isRunning,
    error,
    result,
    analyze,
    reset,
  };
}
