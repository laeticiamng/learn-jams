// ============================================================
// Hook: useCreatePipeline
// Orchestrates the full M1→M7 pipeline with proper async chaining.
// Each step uses return values (not stale React state) for determinism.
// ============================================================

import { useState, useCallback, useRef } from "react";
import { useDocumentIngestion } from "@/hooks/useDocumentIngestion";
import { useCourseAnalysis } from "@/hooks/useCourseAnalysis";
import { useMemoryArchitecture } from "@/hooks/useMemoryArchitecture";
import { useFormatDecision } from "@/hooks/useFormatDecision";
import { useDynamicSheetGeneration } from "@/hooks/useDynamicSheetGeneration";
import { useAnimatedStoryGeneration } from "@/hooks/useAnimatedStoryGeneration";
import { useQAStatus } from "@/hooks/useQAStatus";
import { useProductTracking } from "@/hooks/useProductTracking";
import { generateRecallSuiteLocally } from "@/services/cognitio/recall-generator.service";
import type { IngestInput } from "@/domain/cognitio/contracts";
import type { LearningObjective, ChosenFormat } from "@/domain/cognitio/types";
import type { LearnerAudienceProfile } from "@/domain/cognitio/learner-profile.types";
import type { M7_Input } from "@/domain/cognitio/qa.contracts";
import type { M5_Output } from "@/domain/cognitio/generation.contracts";
import type { M5B_Output } from "@/domain/cognitio/story.contracts";
import type { CreateFormat } from "@/lib/create-format-config";

export type PipelinePhase =
  | "import"
  | "ingesting"
  | "analyzing"
  | "architecting"
  | "formatting"
  | "generating"
  | "result";

export type PipelineErrorSource =
  | "ingestion"
  | "analysis"
  | "memory"
  | "format"
  | "generation"
  | "qa";

export interface PipelineError {
  source: PipelineErrorSource;
  message: string;
  phase: PipelinePhase;
}

/** Map CreateFormat (UI) to ChosenFormat (pipeline) */
function mapCreateFormatToChosenFormat(createFormat?: CreateFormat): ChosenFormat | undefined {
  if (!createFormat) return undefined;
  switch (createFormat) {
    case "escape_game": return "mission_interactive";
    case "dynamic_sheet": return "fiche_dynamique";
    case "animated_story": return "histoire_animee";
    // music and video don't map to cognitio ChosenFormat
    default: return undefined;
  }
}

export function useCreatePipeline() {
  const [phase, setPhase] = useState<PipelinePhase>("import");
  const [objective, setObjective] = useState<LearningObjective>("discovery");
  const [learnerProfile, setLearnerProfile] = useState<LearnerAudienceProfile | undefined>();
  const [pipelineError, setPipelineError] = useState<PipelineError | null>(null);
  const [userSelectedFormat, setUserSelectedFormat] = useState<CreateFormat | undefined>();

  // Track whether a pipeline run is active to prevent double-execution
  const runningRef = useRef(false);

  const ingestion = useDocumentIngestion();
  const analysis = useCourseAnalysis();
  const memory = useMemoryArchitecture();
  const format = useFormatDecision();
  const generation = useDynamicSheetGeneration();
  const storyGeneration = useAnimatedStoryGeneration();
  const qa = useQAStatus();
  const { track } = useProductTracking();

  const runPipeline = useCallback(async (input: IngestInput, selectedFormat?: CreateFormat) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPipelineError(null);
    setUserSelectedFormat(selectedFormat);

    const currentObjective = input.objective;
    const currentProfile = input.learner_profile;
    const chosenFormatHint = mapCreateFormatToChosenFormat(selectedFormat);
    setObjective(currentObjective);
    setLearnerProfile(currentProfile);

    try {
      // === M1: Ingestion ===
      setPhase("ingesting");
      track({ event_name: "upload_started" });

      let m1Result;
      try {
        m1Result = await ingestion.ingest(input);
      } catch (ingestErr) {
        const errMsg = ingestErr instanceof Error ? ingestErr.message : String(ingestErr);
        setPipelineError({ source: "ingestion", message: errMsg, phase: "ingesting" });
        setPhase("result");
        return;
      }
      if (!m1Result) {
        // ingestion.error may not be flushed in React state yet; extract from last known step
        const failedStep = ingestion.steps.find((s) => s.status === "error");
        const errMsg = failedStep?.message || ingestion.error || "Le document n'a pas pu être importé. Veuillez réessayer ou coller le texte directement.";
        setPipelineError({ source: "ingestion", message: errMsg, phase: "ingesting" });
        setPhase("result");
        return;
      }

      const hasBlocking = m1Result.issues.some((i) => i.severity === "blocking");
      if (hasBlocking) {
        setPhase("result");
        return;
      }

      // === M2: Analysis ===
      setPhase("analyzing");
      const m2Result = await analysis.analyze(m1Result, currentObjective, currentProfile);
      if (!m2Result) {
        setPipelineError({ source: "analysis", message: analysis.error ?? "Analysis failed", phase: "analyzing" });
        setPhase("result");
        return;
      }

      // === M3: Memory Architecture ===
      setPhase("architecting");
      const m3Result = await memory.build(m2Result, m1Result.document_id, currentObjective, currentProfile);
      if (!m3Result) {
        setPipelineError({ source: "memory", message: memory.error ?? "Memory architecture failed", phase: "architecting" });
        setPhase("result");
        return;
      }

      // === M4: Format Selection (with user intent priority) ===
      setPhase("formatting");
      const m4Result = await format.decide(
        m3Result,
        m2Result,
        m1Result.document_id,
        m1Result.confidence_level,
        currentObjective,
        chosenFormatHint,
      );
      if (!m4Result) {
        setPipelineError({ source: "format", message: format.error ?? "Format selection failed", phase: "formatting" });
        setPhase("result");
        return;
      }

      // === M5: Generation ===
      setPhase("generating");
      let m5Result: M5_Output | null = null;
      let m5bResult: M5B_Output | null = null;

      // mission_interactive falls back to fiche_dynamique generation for now
      // until full mission generation pipeline is connected
      const generationFormat = m4Result.chosen_format === "mission_interactive"
        ? "fiche_dynamique"
        : m4Result.chosen_format;

      if (generationFormat === "fiche_dynamique") {
        m5Result = await generation.generate(
          m2Result,
          m3Result,
          m4Result,
          m1Result.document_id,
          m1Result.word_count,
          m1Result.source_type,
          m1Result.confidence_level,
          m1Result.issues.map((i) => i.message),
          currentObjective,
          currentProfile
        ) ?? null;
        if (!m5Result) {
          setPipelineError({ source: "generation", message: generation.error ?? "Generation failed", phase: "generating" });
          setPhase("result");
          return;
        }
      } else if (generationFormat === "histoire_animee") {
        m5bResult = await storyGeneration.generate(
          m2Result,
          m3Result,
          m4Result,
          m1Result.document_id,
          m1Result.word_count,
          m1Result.source_type,
          m1Result.confidence_level,
          m1Result.issues.map((i) => i.message),
          currentObjective,
          currentProfile
        ) ?? null;
        if (!m5bResult) {
          setPipelineError({ source: "generation", message: storyGeneration.error ?? "Story generation failed", phase: "generating" });
          setPhase("result");
          return;
        }
      }

      // === M6+M7: Recall + QA (non-blocking) ===
      const generationOutput = m5Result || m5bResult;
      if (generationOutput) {
        try {
          const recallSuite = generateRecallSuiteLocally({
            transformation_id: generationOutput.transformation_id,
            concepts: m2Result.key_concepts,
            confusion_pairs: m2Result.confusion_pairs,
            critical_concept_keys: m2Result.key_concepts
              .filter((c) => c.criticality <= 2)
              .map((c) => c.stable_key),
            learner_profile: currentProfile,
            user_objective: currentObjective,
            word_count: m1Result.word_count,
          });

          const qaInput: M7_Input = {
            transformation_id: generationOutput.transformation_id,
            format: m4Result.chosen_format as "fiche_dynamique" | "histoire_animee",
            m5_output: m5Result ?? undefined,
            m5b_output: m5bResult ?? undefined,
            m2_output: m2Result,
            m3_output: m3Result,
            m4_output: m4Result,
            recall_tests: [recallSuite.final_test],
            source_confidence: m1Result.confidence_level,
            word_count: m1Result.word_count,
          };

          await qa.runQA(qaInput);
        } catch {
          // QA is non-blocking
        }
      }

      setPhase("result");
      track({ event_name: "transformation_generated" });
    } finally {
      runningRef.current = false;
    }
  }, [ingestion, analysis, memory, format, generation, storyGeneration, qa, track]);

  const reset = useCallback(() => {
    ingestion.reset();
    analysis.reset();
    memory.reset();
    format.reset();
    generation.reset();
    storyGeneration.reset();
    qa.reset();
    setPhase("import");
    setPipelineError(null);
    runningRef.current = false;
  }, [ingestion, analysis, memory, format, generation, storyGeneration, qa]);

  // Aggregate all steps for the progress display
  const allSteps = [
    ...ingestion.steps,
    ...(["analyzing", "architecting", "formatting", "generating", "result"].includes(phase) ? analysis.steps : []),
    ...(["architecting", "formatting", "generating", "result"].includes(phase) ? memory.steps : []),
    ...(["formatting", "generating", "result"].includes(phase) ? format.steps : []),
    ...(["generating", "result"].includes(phase) ? generation.steps : []),
    ...(["generating", "result"].includes(phase) ? storyGeneration.steps : []),
  ];

  const hasBlocking = ingestion.result?.issues.some((i) => i.severity === "blocking") ?? false;
  const anyError =
    pipelineError?.message ||
    ingestion.error ||
    analysis.error ||
    memory.error ||
    format.error ||
    generation.error ||
    storyGeneration.error ||
    qa.error;

  return {
    // Phase
    phase,
    objective,
    learnerProfile,
    userSelectedFormat,

    // Sub-hook results (for display)
    ingestion,
    analysis,
    memory,
    format,
    generation,
    storyGeneration,
    qa,

    // Aggregated state
    allSteps,
    hasBlocking,
    anyError,
    pipelineError,

    // Actions
    runPipeline,
    reset,
  };
}
