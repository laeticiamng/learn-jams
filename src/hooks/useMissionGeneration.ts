// ============================================================
// Hook: useMissionGeneration — Full pipeline orchestration
// ============================================================

import { useState, useCallback } from "react";
import type { PipelineStep, LearningObjective } from "@/domain/cognitio/types";
import type { IngestInput, AnalyzeOutput, GenerateExperienceOutput } from "@/domain/cognitio/contracts";
import { uploadDocument, runIngestion, updateIngestionStatus, extractAndAnalyzeText } from "@/services/cognitio/ingestion.service";
import { runAnalysis } from "@/services/cognitio/analysis.service";
import { buildLocalMemoryArchitect } from "@/services/cognitio/memory-architect.service";
import { selectFormatLocally } from "@/services/cognitio/format-selector.service";
import { generateMissionLocally } from "@/services/cognitio/experience-generator.service";
import { runLocalQA } from "@/services/cognitio/qa.service";
import { useAuth } from "@/hooks/useAuth";

const INITIAL_STEPS: PipelineStep[] = [
  { name: "upload", status: "pending" },
  { name: "ingestion", status: "pending" },
  { name: "analysis", status: "pending" },
  { name: "memory_architecture", status: "pending" },
  { name: "format_selection", status: "pending" },
  { name: "generation", status: "pending" },
  { name: "qa", status: "pending" },
];

export function useMissionGeneration() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateExperienceOutput | null>(null);
  const [qaResult, setQaResult] = useState<ReturnType<typeof runLocalQA> | null>(null);

  const updateStep = useCallback(
    (name: PipelineStep["name"], update: Partial<PipelineStep>) => {
      setSteps((prev) =>
        prev.map((s) => (s.name === name ? { ...s, ...update } : s))
      );
    },
    []
  );

  const reset = useCallback(() => {
    setSteps(INITIAL_STEPS);
    setIsRunning(false);
    setError(null);
    setResult(null);
    setQaResult(null);
  }, []);

  const generate = useCallback(
    async (input: IngestInput) => {
      if (!user) throw new Error("User not authenticated");

      setIsRunning(true);
      setError(null);
      setResult(null);
      setQaResult(null);
      setSteps(INITIAL_STEPS);

      try {
        // Step 1: Upload
        updateStep("upload", { status: "running", message: "Upload du document..." });
        const { document_id } = await uploadDocument(user.id, input);
        updateStep("upload", { status: "completed" });

        // Step 2: Ingestion
        updateStep("ingestion", { status: "running", message: "Analyse du document..." });
        let ingestionResult;
        try {
          ingestionResult = await runIngestion(document_id, input);
        } catch {
          // Fallback for pasted text if edge function unavailable
          if (input.pasted_text) {
            const local = extractAndAnalyzeText(input.pasted_text);
            ingestionResult = {
              document_id,
              clean_text: local.clean_text,
              word_count: local.word_count,
              language: local.language,
              source_type: local.source_type,
              confidence_level: local.confidence_level,
              detected_structure: local.detected_structure,
              issues: local.issues,
              segments: local.segments,
            };
            await updateIngestionStatus(document_id, "parsed", {
              quality_score: local.confidence_level,
            });
          } else {
            throw new Error("L'analyse du fichier a échoué. Essayez de coller le texte directement.");
          }
        }

        updateStep("ingestion", {
          status: "completed",
          message: `${ingestionResult.segments.length} segments détectés`,
        });

        // Step 3: Analysis
        updateStep("analysis", { status: "running", message: "Extraction des concepts..." });
        let analysisResult: AnalyzeOutput;
        try {
          analysisResult = await runAnalysis({
            document_id,
            segments: ingestionResult.segments,
            clean_text: ingestionResult.clean_text,
            source_type: ingestionResult.source_type,
            confidence_level: ingestionResult.confidence_level,
          });
        } catch {
          // Local fallback analysis
          analysisResult = buildLocalAnalysis(document_id, ingestionResult);
        }
        updateStep("analysis", {
          status: "completed",
          message: `${analysisResult.total_concepts} concepts, ${analysisResult.critical_count} critiques`,
        });

        // Step 4: Memory Architecture
        updateStep("memory_architecture", { status: "running", message: "Construction du plan mémoire..." });
        const memoryResult = buildLocalMemoryArchitect({
          course_profile_id: analysisResult.course_profile_id,
          document_id: document_id,
          concepts: analysisResult.key_concepts,
          confusion_pairs: analysisResult.confusion_pairs,
          traps: analysisResult.traps,
          reasoning_type: analysisResult.reasoning_type,
          objective: input.objective,
          density: analysisResult.density,
          estimated_complexity: analysisResult.estimated_complexity,
        });
        updateStep("memory_architecture", { status: "completed" });

        // Step 5: Format Selection
        updateStep("format_selection", { status: "running", message: "Choix du format optimal..." });
        const formatResult = selectFormatLocally({
          architecture_id: memoryResult.architecture_id,
          course_profile_id: analysisResult.course_profile_id,
          document_id: document_id,
          total_concepts: analysisResult.total_concepts,
          critical_count: analysisResult.critical_count,
          segment_count: memoryResult.segments.length,
          total_duration_sec: memoryResult.total_duration_sec,
          needs_splitting: memoryResult.needs_splitting,
          reasoning_type: analysisResult.reasoning_type,
          density: analysisResult.density,
          estimated_complexity: analysisResult.estimated_complexity,
          structure_type: analysisResult.structure_type,
          quality_score: ingestionResult.confidence_level,
          objective: input.objective,
        });
        updateStep("format_selection", {
          status: "completed",
          message: `Format: ${formatResult.chosen_format === "histoire_animee" ? "Mission narrative" : "Fiche dynamique"}`,
        });

        // Step 6: Generate Experience
        updateStep("generation", { status: "running", message: "Génération de la mission..." });
        const missionResult = generateMissionLocally({
          document_id,
          course_profile_id: analysisResult.course_profile_id,
          user_id: user.id,
          chosen_format: formatResult.chosen_format,
          learning_contract: memoryResult.pedagogical_contract as any,
          concepts: analysisResult.key_concepts,
          confusion_pairs: analysisResult.confusion_pairs,
          visual_anchors: memoryResult.visual_anchors.map((va) => ({
            concept_key: va.concept_key,
            anchor_type: va.anchor_type as "metaphor" | "comparison" | "mnemonic" | "image_desc",
            content: va.content,
          })),
          quality_score: ingestionResult.confidence_level,
          objective: input.objective,
        });
        updateStep("generation", {
          status: "completed",
          message: `${missionResult.room_count} salles${missionResult.includes_boss ? " + boss" : ""}`,
        });

        // Step 7: QA
        updateStep("qa", { status: "running", message: "Vérification qualité..." });
        const qa = runLocalQA({
          mission_id: missionResult.mission_id,
          mission_json: missionResult.mission_json,
          concepts: analysisResult.key_concepts,
          quality_score: ingestionResult.confidence_level,
          source_text: ingestionResult.clean_text,
        });
        setQaResult(qa);
        updateStep("qa", {
          status: qa.publish_blocked ? "error" : "completed",
          message: qa.publish_blocked
            ? `QA bloqué: ${qa.block_reason}`
            : `Score QA: ${qa.qa_score}/100`,
        });

        setResult(missionResult);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inattendue";
        setError(message);
        // Mark current running step as error
        setSteps((prev) =>
          prev.map((s) =>
            s.status === "running" ? { ...s, status: "error", message } : s
          )
        );
      } finally {
        setIsRunning(false);
      }
    },
    [user, updateStep]
  );

  return { steps, isRunning, error, result, qaResult, generate, reset };
}

// Simple local analysis fallback
function buildLocalAnalysis(
  documentId: string,
  ingestion: { clean_text: string; segments: { content: string; segment_index: number }[] },
): AnalyzeOutput {
  // Extract simple concepts from text segments
  const sentences = ingestion.clean_text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const concepts = sentences.slice(0, 15).map((sentence, i) => {
    const words = sentence.trim().split(/\s+/);
    const key = words.slice(0, 3).join("_").toLowerCase().replace(/[^a-z0-9_]/g, "");
    return {
      stable_key: `concept_${key}_${i}`,
      label: words.slice(0, 5).join(" "),
      definition: sentence.trim(),
      type: "Général",
      criticality: (i < 3 ? 1 : i < 7 ? 2 : i < 12 ? 3 : 4) as 1 | 2 | 3 | 4,
      criticality_score: i < 3 ? 0.9 : 0.5,
      bloom_target: (i < 5 ? "understand" : "remember") as "understand" | "remember",
      relations: [],
      prerequisites: [],
      source_confidence: 0.6,
      source_trace: [{ segment_index: 0, excerpt: sentence.trim().slice(0, 100) }],
      uncertain: false,
    };
  });

  return {
    course_profile_id: "",
    main_topic: "",
    learning_objectives: [],
    key_concepts: concepts,
    traps: [],
    confusion_pairs: [],
    reasoning_type: "declaratif",
    density: "medium",
    recommended_template: "fiche_dynamique",
    confidence: { concepts: 0.6, logic: 0.6, traps: 0.5, structure: 0.6, ambiguous_zones: [] },
    prerequis: [],
    structure_type: "minimal",
    source_issues: [],
    total_concepts: concepts.length,
    critical_count: concepts.filter((c) => c.criticality === 1).length,
    estimated_complexity: Math.min(10, Math.max(1, Math.ceil(concepts.length / 2))),
  };
}
