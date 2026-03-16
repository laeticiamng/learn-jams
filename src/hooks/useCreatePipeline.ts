// ============================================================
// Hook: useCreatePipeline
// Orchestrates the full M1→M7 pipeline with proper async chaining.
// Each step uses return values (not stale React state) for determinism.
// ============================================================

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentIngestion } from "@/hooks/useDocumentIngestion";
import { useCourseAnalysis } from "@/hooks/useCourseAnalysis";
import { useMemoryArchitecture } from "@/hooks/useMemoryArchitecture";
import { useFormatDecision } from "@/hooks/useFormatDecision";
import { useDynamicSheetGeneration } from "@/hooks/useDynamicSheetGeneration";
import { useAnimatedStoryGeneration } from "@/hooks/useAnimatedStoryGeneration";
import { useQAStatus } from "@/hooks/useQAStatus";
import { useProductTracking } from "@/hooks/useProductTracking";
import { generateRecallSuiteLocally } from "@/services/cognitio/recall-generator.service";
import { generateMissionLocally, saveMission } from "@/services/cognitio/experience-generator.service";
import type { IngestInput, GenerateExperienceOutput, PipelineDebugCounters, PipelineTraceEntry } from "@/domain/cognitio/contracts";
import type { LearningObjective, ChosenFormat } from "@/domain/cognitio/types";
import type { LearnerAudienceProfile } from "@/domain/cognitio/learner-profile.types";
import type { M7_Input } from "@/domain/cognitio/qa.contracts";
import type { M5_Output } from "@/domain/cognitio/generation.contracts";
import type { M5B_Output } from "@/domain/cognitio/story.contracts";
import type { CreateFormat } from "@/lib/create-format-config";
import { validateGenerationNotEmpty } from "@/domain/cognitio/generation.validators";
import { scoreConceptCandidate, isEditorialArtifact, cleanMainTopic } from "@/lib/cognitio-semantic-cleaning";
import { runSemanticSuccessGate, runMissionGate } from "@/domain/cognitio/validators";
import { runLocalAnalysis } from "@/services/cognitio/analysis.service";
import { recordSecondPassEvaluation, recordSecondPassCompletion, recordGateEvaluation } from "@/services/observability/metricsService";

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
  const { session } = useAuth();
  const [phase, setPhase] = useState<PipelinePhase>("import");
  const [objective, setObjective] = useState<LearningObjective>("discovery");
  const [learnerProfile, setLearnerProfile] = useState<LearnerAudienceProfile | undefined>();
  const [pipelineError, setPipelineError] = useState<PipelineError | null>(null);
  const [userSelectedFormat, setUserSelectedFormat] = useState<CreateFormat | undefined>();
  const [missionResult, setMissionResult] = useState<GenerateExperienceOutput | null>(null);
  const [debugCounters, setDebugCounters] = useState<PipelineDebugCounters | null>(null);

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
      // P0: Initialize debug counters
      const counters: PipelineDebugCounters = {
        raw_text_length: 0,
        cleaned_text_length: 0,
        canonical_text_preview: "",
        detected_sections_count: 0,
        raw_topic: "",
        cleaned_topic: "",
        m2_input_text_length: 0,
        extracted_concepts_raw_count: 0,
        extracted_concepts_after_filter_count: 0,
        rejected_concepts_count: 0,
        reject_reasons: [],
        chapters_detected_count: 0,
        sentences_extracted_count: 0,
        concepts_persisted_count: 0,
        concepts_reloaded_count: 0,
        memory_segments_generated_count: 0,
        final_format_decision: "",
        format_override_applied: false,
        generator_called: "",
        generation_success: false,
        final_generation_status: "pending",
        pipeline_trace: [],
      };

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

      // P0: Populate M1 counters
      // CRITICAL FIX: raw_text_length must reflect the ACTUAL text that entered the pipeline,
      // not input.pasted_text (which is undefined for file uploads — the extracted text
      // is injected as enrichedInput.pasted_text inside useDocumentIngestion).
      // The canonical_semantic_text for the entire pipeline is m1Result.clean_text.
      const canonicalSemanticText = m1Result.clean_text;
      // Best estimate for raw text: for file uploads, the word_count * ~6 is a proxy.
      // But clean_text segments concatenated is the real source text that entered cleaning.
      const rawTextEstimate = m1Result.segments.reduce((sum, s) => sum + s.content.length, 0) || m1Result.clean_text.length;
      counters.raw_text_length = rawTextEstimate;
      counters.cleaned_text_length = canonicalSemanticText.length;
      counters.canonical_text_preview = canonicalSemanticText.slice(0, 200);
      counters.detected_sections_count = m1Result.segments.length;
      counters.pipeline_trace.push({
        step: "A_import",
        input_length: rawTextEstimate,
        output_length: canonicalSemanticText.length,
        preview: canonicalSemanticText.slice(0, 100),
        detail: `words=${m1Result.word_count}, segments=${m1Result.segments.length}, confidence=${m1Result.confidence_level.toFixed(2)}`,
      });
      // P0 FIX: More faithful cleaning metric — avoid negative/misleading noise_removed
      const noiseRemovedChars = Math.max(0, rawTextEstimate - canonicalSemanticText.length);
      const noiseRemovedPct = rawTextEstimate > 0 ? ((noiseRemovedChars / rawTextEstimate) * 100).toFixed(1) : "0";
      counters.pipeline_trace.push({
        step: "B_cleaning",
        input_length: rawTextEstimate,
        output_length: canonicalSemanticText.length,
        detail: `noise_removed=${noiseRemovedChars} chars (${noiseRemovedPct}%), ` +
          `raw_estimate=${rawTextEstimate}, canonical=${canonicalSemanticText.length}`,
      });
      console.info(
        `[COGNITIO][P0] M1 done: raw_text=${counters.raw_text_length}, ` +
        `cleaned_text(canonical)=${counters.cleaned_text_length}, ` +
        `sections=${counters.detected_sections_count}, ` +
        `words=${m1Result.word_count}, confidence=${m1Result.confidence_level.toFixed(2)}`
      );

      const hasBlocking = m1Result.issues.some((i) => i.severity === "blocking");
      if (hasBlocking) {
        setDebugCounters(counters);
        setPhase("result");
        return;
      }

      // === M2: Analysis ===
      setPhase("analyzing");
      const m2Result = await analysis.analyze(m1Result, currentObjective, currentProfile);
      if (!m2Result) {
        setPipelineError({ source: "analysis", message: analysis.error ?? "Analysis failed", phase: "analyzing" });
        setDebugCounters(counters);
        setPhase("result");
        return;
      }

      // P0: Populate M2 counters
      counters.raw_topic = m2Result.main_topic;
      counters.cleaned_topic = m2Result.main_topic;
      counters.m2_input_text_length = canonicalSemanticText.length;
      counters.extracted_concepts_after_filter_count = m2Result.key_concepts.length;
      counters.extracted_concepts_raw_count = m2Result.total_concepts;
      counters.rejected_concepts_count = m2Result.total_concepts - m2Result.key_concepts.length;
      // Document Understanding Layer trace
      if (m2Result.document_understanding) {
        const du = m2Result.document_understanding;
        counters.pipeline_trace.push({
          step: "B2_understanding",
          input_length: canonicalSemanticText.length,
          detail: `true_topic="${du.true_topic}", domain=${du.domain_classification}, ` +
            `reasoning=${du.dominant_reasoning}, sections=${du.section_map.length}, ` +
            `learning_core=${du.learning_core.length}, noise_zones=${du.noise_zones.length}, ` +
            `confidence=${du.comprehension_confidence.toFixed(2)}`,
          warning: du.noise_zones.length > 3
            ? `Document fortement bruité : ${du.noise_zones.length} zones de bruit détectées`
            : undefined,
        });
      }

      counters.pipeline_trace.push({
        step: "C_topic",
        input_length: canonicalSemanticText.length,
        detail: `detected_topic="${m2Result.main_topic}"` +
          (m2Result.document_understanding
            ? ` (understanding_topic="${m2Result.document_understanding.true_topic}")`
            : ""),
      });
      counters.pipeline_trace.push({
        step: "D_concept_extraction",
        input_length: canonicalSemanticText.length,
        input_count: m2Result.total_concepts,
        output_count: m2Result.key_concepts.length,
        detail: `raw=${m2Result.total_concepts}, critical=${m2Result.critical_count}, density=${m2Result.density}`,
      });
      counters.pipeline_trace.push({
        step: "E_concept_filtering",
        input_count: m2Result.total_concepts,
        output_count: m2Result.key_concepts.length,
        detail: `rejected=${m2Result.total_concepts - m2Result.key_concepts.length}`,
        warning: m2Result.key_concepts.length === 0 && canonicalSemanticText.length > 50
          ? `CRITICAL: 0 concepts from ${m1Result.word_count}-word document`
          : undefined,
      });

      // P0: Compute segment distribution for debug counters
      const conceptsFromSeg0 = m2Result.key_concepts.filter(c =>
        c.source_trace?.some(t => t.segment_index === 0)
      ).length;
      const conceptsFromBody = m2Result.key_concepts.filter(c =>
        c.source_trace?.some(t => t.segment_index > 0)
      ).length;
      counters.concepts_from_segment_0_count = conceptsFromSeg0;
      counters.concepts_from_body_count = conceptsFromBody;
      counters.final_topic_clean = m2Result.main_topic;
      counters.final_concepts_count = m2Result.key_concepts.length;
      // P0: Propagate M2 diagnostic fields to pipeline counters
      counters.front_matter_detected = m2Result._diag_front_matter_detected;
      counters.segment_0_quarantined = m2Result._diag_segment_0_quarantined;
      counters.artifact_only_first_pass = m2Result._diag_artifact_only_first_pass;
      counters.body_only_second_pass_triggered = m2Result._diag_body_only_second_pass_triggered;
      counters.body_only_second_pass_concepts_count = m2Result._diag_body_only_second_pass_concepts_count;
      if (m2Result._diag_segment_0_noise_score !== undefined) {
        counters.segment_0_noise_score = m2Result._diag_segment_0_noise_score;
      }
      if (m2Result._diag_front_matter_lines_count !== undefined) {
        counters.front_matter_lines_detected = m2Result._diag_front_matter_lines_count;
      }
      if (m2Result._diag_front_matter_chars_count !== undefined) {
        counters.front_matter_chars_removed = m2Result._diag_front_matter_chars_count;
      }
      if (m2Result._diag_secondary_pass_topic !== undefined) {
        counters.secondary_pass_topic = m2Result._diag_secondary_pass_topic;
      }
      if (m2Result._diag_secondary_pass_concepts_count !== undefined) {
        counters.secondary_pass_concepts_count = m2Result._diag_secondary_pass_concepts_count;
      }
      // P0 FIX: Propagate granular body concept validity metrics
      counters.valid_body_concepts_count = m2Result._diag_valid_body_concepts_count;
      counters.uncertain_body_concepts_count = m2Result._diag_uncertain_body_concepts_count;
      counters.editorial_body_concepts_count = m2Result._diag_editorial_body_concepts_count;
      // P0 FIX: Domain before/after body pass
      if (m2Result._diag_domain_before_body_pass) {
        counters.domain_before_body_pass = m2Result._diag_domain_before_body_pass;
      }
      if (m2Result._diag_domain_after_body_pass) {
        counters.domain_after_body_pass = m2Result._diag_domain_after_body_pass;
      }
      // P0 FIX: Enhanced cleaning metrics
      if (m2Result._diag_editorial_lines_removed !== undefined) {
        counters.editorial_lines_removed = m2Result._diag_editorial_lines_removed;
      }
      if (m2Result._diag_header_noise_score_before !== undefined) {
        counters.header_noise_score_before = m2Result._diag_header_noise_score_before;
      }
      if (m2Result._diag_header_noise_score_after !== undefined) {
        counters.header_noise_score_after = m2Result._diag_header_noise_score_after;
      }
      // P0 FIX: LLM fallback
      if (m2Result._diag_llm_fallback_triggered) {
        counters.llm_fallback_triggered = m2Result._diag_llm_fallback_triggered;
        counters.llm_fallback_concepts_count = m2Result._diag_llm_fallback_concepts_count;
      }

      counters.pipeline_trace.push({
        step: "E1_segment_distribution",
        detail: `concepts_from_segment_0=${conceptsFromSeg0}, concepts_from_body=${conceptsFromBody}, ` +
          `front_matter=${m2Result._diag_front_matter_detected ?? false}, ` +
          `seg0_quarantined=${m2Result._diag_segment_0_quarantined ?? false}, ` +
          `seg0_quarantined_retroactive=${m2Result._diag_segment_0_quarantined_retroactive ?? false}, ` +
          `body_pass_trigger_condition_met=${m2Result._diag_body_pass_trigger_condition_met ?? false}, ` +
          `body_pass=${m2Result._diag_body_only_second_pass_triggered ?? false}, ` +
          `body_pass_reason_if_not=${m2Result._diag_body_pass_reason_if_not_triggered ?? "n/a"}, ` +
          `body_concepts=${m2Result._diag_body_only_second_pass_concepts_count ?? 0}, ` +
          `secondary_topic="${m2Result._diag_secondary_pass_topic ?? "n/a"}", ` +
          `secondary_concepts=${m2Result._diag_secondary_pass_concepts_count ?? 0}`,
        warning: conceptsFromSeg0 > 0 && conceptsFromBody === 0 && m1Result.segments.length > 1
          ? `WARNING: All concepts from segment 0 — body segments ignored`
          : undefined,
      });

      console.info(
        `[COGNITIO][P0] M2 done: concepts=${m2Result.key_concepts.length}, ` +
        `critical=${m2Result.critical_count}, density=${m2Result.density}, ` +
        `reasoning=${m2Result.reasoning_type}, topic="${m2Result.main_topic}", ` +
        `from_seg0=${conceptsFromSeg0}, from_body=${conceptsFromBody}`
      );

      // P0 VALIDATION GATE: If 0 concepts from non-empty doc, this is a pipeline failure.
      // Block continuation and show explicit root cause instead of producing empty generation.
      if (m2Result.key_concepts.length === 0 && canonicalSemanticText.length > 50) {
        const rootCause = `Le moteur d'extraction a épuisé toutes ses méthodes automatiques sur ${m1Result.word_count} mots ` +
          `(détection front matter: ${m2Result._diag_front_matter_detected ?? "n/a"}, ` +
          `quarantaine segment 0: ${m2Result._diag_segment_0_quarantined ?? "n/a"}, ` +
          `second pass corps: ${m2Result._diag_body_only_second_pass_triggered ?? "n/a"}, ` +
          `recalcul domaine: ${m2Result._diag_domain_before_body_pass ?? "n/a"} → ${m2Result._diag_domain_after_body_pass ?? "n/a"}, ` +
          `fallback compréhension: ${m2Result._diag_llm_fallback_triggered ?? false}, ` +
          `concepts corps: ${m2Result._diag_body_only_second_pass_concepts_count ?? 0}). ` +
          `Texte canonique: ${canonicalSemanticText.length} car.`;
        console.error(
          `[COGNITIO][P0] PIPELINE BLOCKED: 0 concepts from ${m1Result.word_count}-word document. ` +
          `canonical_text=${canonicalSemanticText.length} chars. This is a data contract violation.`
        );
        counters.final_generation_status = "error";
        counters.success_gate_reason = "0 concepts extracted from non-empty document — pipeline blocked";
        counters.generation_error = rootCause;
        setDebugCounters(counters);
        setPipelineError({
          source: "analysis",
          message: rootCause,
          phase: "analyzing",
        });
        setPhase("result");
        return;
      }

      // === P0 PRODUCT GUARD: Reject only if ALL extraction methods were exhausted ===
      // PRODUCT RULE: Never blame the user for "noisy text" if front matter detection,
      // segment 0 quarantine, and body-only second pass have not all been attempted.
      // The pipeline must exhaust its own extraction capabilities before blocking.
      if (m2Result.key_concepts.length > 0) {
        const allConceptsNoisy = m2Result.key_concepts.every(c => {
          const scores = scoreConceptCandidate(c.label, c.definition);
          return !scores.accepted || scores.editorial_artifact_score >= 0.4 || scores.header_noise_score >= 0.4;
        });
        const allUncertain = m2Result.key_concepts.every(c => c.uncertain === true || c.source_confidence < 0.4);

        // Only block if body-only second pass was already attempted and still failed
        const bodyPassWasAttempted = m2Result._diag_body_only_second_pass_triggered === true;
        const frontMatterWasDetected = m2Result._diag_front_matter_detected === true;
        const seg0WasQuarantined = m2Result._diag_segment_0_quarantined === true;
        const llmFallbackWasAttempted = m2Result._diag_llm_fallback_triggered === true;
        const allSafeguardsExhausted = (bodyPassWasAttempted && llmFallbackWasAttempted) ||
          (bodyPassWasAttempted && frontMatterWasDetected && seg0WasQuarantined);

        if ((allConceptsNoisy || (m2Result.key_concepts.length === 1 && allUncertain && allConceptsNoisy)) && allSafeguardsExhausted) {
          const sampleLabel = m2Result.key_concepts[0]?.label ?? "?";
          const rootCause = `Le moteur d'extraction a épuisé toutes ses méthodes automatiques ` +
            `(détection front matter, quarantaine segment 0, second pass corps, recalcul domaine, ` +
            `fallback compréhension) mais n'a trouvé que des artefacts éditoriaux (ex: "${sampleLabel}"). ` +
            `Diagnostic : front_matter=${frontMatterWasDetected}, seg0_quarantined=${seg0WasQuarantined}, ` +
            `body_pass=${bodyPassWasAttempted}, llm_fallback=${m2Result._diag_llm_fallback_triggered ?? false}, ` +
            `body_concepts=${m2Result._diag_body_only_second_pass_concepts_count ?? 0}.`;
          console.error(
            `[COGNITIO][P0] PRODUCT GUARD: All ${m2Result.key_concepts.length} concepts are editorial artifacts ` +
            `AFTER all safeguards exhausted. Pipeline blocked. ` +
            `Labels: [${m2Result.key_concepts.map(c => `"${c.label}"`).join(", ")}]`
          );
          counters.final_generation_status = "error";
          counters.success_gate_reason = "All concepts are editorial artifacts after exhausting all extraction methods";
          counters.generation_error = rootCause;
          setDebugCounters(counters);
          setPipelineError({
            source: "analysis",
            message: rootCause,
            phase: "analyzing",
          });
          setPhase("result");
          return;
        } else if (allConceptsNoisy && !allSafeguardsExhausted) {
          // Safeguards NOT exhausted — log warning but do NOT block.
          // This should not happen in normal flow (M2 should have triggered body pass),
          // but if it does, let the pipeline continue with whatever concepts we have.
          console.warn(
            `[COGNITIO][P0] PRODUCT GUARD: All concepts appear noisy but safeguards not exhausted ` +
            `(body_pass=${bodyPassWasAttempted}, fm=${frontMatterWasDetected}, seg0_q=${seg0WasQuarantined}). ` +
            `Allowing pipeline to continue — not blaming user.`
          );
        }
      }

      // === P0 SEMANTIC SUCCESS GATE ===
      // Block generation if the conceptual base is semantically invalid,
      // even if concepts were extracted (they may all be artifacts/uncertain).
      const semanticGate = runSemanticSuccessGate({
        concepts: m2Result.key_concepts.map(c => ({
          label: c.label,
          definition: c.definition,
          uncertain: c.uncertain,
          source_confidence: c.source_confidence,
          source_trace: c.source_trace?.map(t => ({
            segment_index: t.segment_index,
            excerpt: t.excerpt,
          })),
        })),
        main_topic: m2Result.main_topic,
        scoreConceptCandidate,
        isEditorialArtifact,
        cleanMainTopic,
        analysis_mode: "full",
      });

      // Ticket 4: record gate evaluation
      recordGateEvaluation({
        analysis_mode: "full",
        threshold_profile: semanticGate.signals.threshold_profile ?? "full_strict",
        passed: semanticGate.passed,
        gate_failure_reasons: semanticGate.signals.gate_block_reasons,
        valid_concepts_count: semanticGate.signals.valid_concepts_count,
        body_concepts_count: semanticGate.signals.body_concepts_count,
        editorial_artifact_ratio: semanticGate.signals.editorial_artifact_ratio,
        main_topic_is_editorial_artifact: semanticGate.signals.main_topic_is_editorial_artifact,
      });

      // Populate semantic gate signals in counters
      counters.semantic_gate_passed = semanticGate.passed;
      counters.semantic_gate_status = semanticGate.status;
      counters.valid_concepts_count = semanticGate.signals.valid_concepts_count;
      counters.uncertain_concepts_count = semanticGate.signals.uncertain_concepts_count;
      counters.editorial_artifact_ratio = semanticGate.signals.editorial_artifact_ratio;
      counters.main_topic_is_editorial_artifact = semanticGate.signals.main_topic_is_editorial_artifact;
      counters.semantic_generation_allowed = semanticGate.signals.semantic_generation_allowed;
      counters.semantic_gate_block_reasons = semanticGate.signals.gate_block_reasons;

      counters.pipeline_trace.push({
        step: "E2_secondary_pass",
        detail: `semantic_gate=${semanticGate.status}, valid=${semanticGate.signals.valid_concepts_count}, ` +
          `uncertain=${semanticGate.signals.uncertain_concepts_count}, ` +
          `body=${semanticGate.signals.body_concepts_count}, seg0=${semanticGate.signals.segment_0_concepts_count}, ` +
          `artifact_ratio=${semanticGate.signals.editorial_artifact_ratio}, ` +
          `topic_editorial=${semanticGate.signals.main_topic_is_editorial_artifact}`,
        warning: !semanticGate.passed
          ? `SEMANTIC GATE BLOCKED: ${semanticGate.signals.gate_block_reasons.join("; ")}`
          : undefined,
      });

      if (!semanticGate.passed) {
        // ============================================================
        // P0 PIPELINE RETRY: If semantic gate failed AND body-only second
        // pass was NOT triggered in M2, force a re-analysis on body segments.
        // This is the pipeline-level safety net: even if M2's internal logic
        // missed the trigger, the pipeline will catch it here.
        // ============================================================
        const bodyPassWasTriggered = m2Result._diag_body_only_second_pass_triggered === true;
        const hasMultipleSegments = m1Result.segments.length > 1;

        if (!bodyPassWasTriggered && hasMultipleSegments) {
          // Ticket 4: record second-pass trigger from pipeline retry
          recordSecondPassEvaluation({
            analysis_mode: "body_only",
            trigger_reason: "pipeline_gate_retry",
            triggered: true,
            valid_concepts_count: semanticGate.signals.valid_concepts_count,
            segments_count: m1Result.segments.length,
          });

          console.warn(
            `[COGNITIO][P0] SEMANTIC GATE RETRY: Gate failed but body-only second pass was NOT triggered. ` +
            `Forcing re-analysis on body segments (segments 1-${m1Result.segments.length - 1}).`
          );

          // Build body-only M2 input: exclude segment 0, use body text only
          const bodySegments = m1Result.segments.slice(1);
          const bodyText = bodySegments.map(s => s.content).join("\n\n");

          if (bodyText.length > 50) {
            const bodyOnlyInput = {
              ...({
                document_id: m1Result.document_id,
                clean_text: bodyText,
                segments: bodySegments.map((s, i) => ({ ...s, segment_index: i + 1 })),
                source_type: m1Result.source_type,
                confidence_level: m1Result.confidence_level,
                user_objective: currentObjective as any,
                learner_profile: currentProfile,
              }),
            };

            const retryResult = runLocalAnalysis(bodyOnlyInput, bodySegments.map((s, i) => ({ ...s, segment_index: i + 1 })));

            // Check if retry produced better results
            if (retryResult.key_concepts.length > 0) {
              const retryGate = runSemanticSuccessGate({
                concepts: retryResult.key_concepts.map(c => ({
                  label: c.label,
                  definition: c.definition,
                  uncertain: c.uncertain,
                  source_confidence: c.source_confidence,
                  source_trace: c.source_trace?.map(t => ({
                    segment_index: t.segment_index,
                    excerpt: t.excerpt,
                  })),
                })),
                main_topic: retryResult.main_topic,
                scoreConceptCandidate,
                isEditorialArtifact,
                cleanMainTopic,
                analysis_mode: "body_only",
              });

              // Ticket 4: record body-only retry gate evaluation
              recordGateEvaluation({
                analysis_mode: "body_only",
                threshold_profile: retryGate.signals.threshold_profile ?? "body_only_relaxed",
                passed: retryGate.passed,
                gate_failure_reasons: retryGate.signals.gate_block_reasons,
                valid_concepts_count: retryGate.signals.valid_concepts_count,
                body_concepts_count: retryGate.signals.body_concepts_count,
                editorial_artifact_ratio: retryGate.signals.editorial_artifact_ratio,
                main_topic_is_editorial_artifact: retryGate.signals.main_topic_is_editorial_artifact,
              });

              console.info(
                `[COGNITIO][P0] SEMANTIC GATE RETRY result: ` +
                `concepts=${retryResult.key_concepts.length}, ` +
                `topic="${retryResult.main_topic}", ` +
                `gate_passed=${retryGate.passed}, ` +
                `valid=${retryGate.signals.valid_concepts_count}, ` +
                `body=${retryGate.signals.body_concepts_count}`
              );

              if (retryGate.passed || retryGate.signals.valid_concepts_count > semanticGate.signals.valid_concepts_count) {
                // Use the retry result — it's better than what we had
                // Merge retry concepts into the M2 result
                const improvedM2 = {
                  ...m2Result,
                  key_concepts: retryResult.key_concepts,
                  main_topic: retryResult.main_topic !== "Sujet non identifié" ? retryResult.main_topic : m2Result.main_topic,
                  total_concepts: retryResult.total_concepts,
                  critical_count: retryResult.critical_count,
                  _diag_body_only_second_pass_triggered: true,
                  _diag_body_only_second_pass_concepts_count: retryResult.key_concepts.length,
                };

                // Update counters
                counters.body_only_second_pass_triggered = true;
                counters.body_only_second_pass_concepts_count = retryResult.key_concepts.length;
                counters.secondary_pass_triggered = true;
                counters.secondary_pass_concepts_count = retryResult.key_concepts.length;
                counters.final_concepts_count = retryResult.key_concepts.length;
                counters.final_topic_clean = improvedM2.main_topic;

                // Re-run semantic gate on improved result
                if (retryGate.passed) {
                  // Update semantic gate counters
                  counters.semantic_gate_passed = retryGate.passed;
                  counters.semantic_gate_status = retryGate.status;
                  counters.valid_concepts_count = retryGate.signals.valid_concepts_count;
                  counters.uncertain_concepts_count = retryGate.signals.uncertain_concepts_count;
                  counters.editorial_artifact_ratio = retryGate.signals.editorial_artifact_ratio;
                  counters.main_topic_is_editorial_artifact = retryGate.signals.main_topic_is_editorial_artifact;
                  counters.semantic_generation_allowed = retryGate.signals.semantic_generation_allowed;
                  counters.semantic_gate_block_reasons = retryGate.signals.gate_block_reasons;

                  counters.pipeline_trace.push({
                    step: "E2_secondary_pass",
                    detail: `PIPELINE_RETRY: body-only re-analysis passed. ` +
                      `concepts=${retryResult.key_concepts.length}, topic="${improvedM2.main_topic}"`,
                  });

                  // IMPORTANT: Replace m2Result for downstream pipeline
                  // We need to reassign for the rest of the pipeline to use
                  Object.assign(m2Result, improvedM2);
                  // Continue pipeline — do NOT block
                } else {
                  // Retry didn't pass either, but update diagnostics
                  counters.pipeline_trace.push({
                    step: "E2_secondary_pass",
                    detail: `PIPELINE_RETRY: body-only re-analysis attempted but gate still failed. ` +
                      `concepts=${retryResult.key_concepts.length}, valid=${retryGate.signals.valid_concepts_count}`,
                    warning: `Gate still blocked after body-only retry: ${retryGate.signals.gate_block_reasons.join("; ")}`,
                  });
                  // Fall through to the block below
                }

                if (retryGate.passed) {
                  // Skip the block — pipeline continues
                  console.info(`[COGNITIO][P0] SEMANTIC GATE RETRY: Gate now PASSES. Pipeline continues.`);
                  // goto rest of pipeline — we use a flag-free approach by NOT returning
                } else {
                  // Still blocked — fall through to error
                  console.error(
                    `[COGNITIO][P0] SEMANTIC GATE RETRY: Gate STILL blocked after body-only retry. ` +
                    `Reasons: ${retryGate.signals.gate_block_reasons.join("; ")}`
                  );
                  counters.final_generation_status = "error";
                  counters.success_gate_reason = `Semantic gate failed after body-only retry: ${retryGate.signals.gate_block_reasons.join("; ")}`;
                  counters.generation_error = retryGate.passed ? undefined : semanticGate.display_message;
                  setDebugCounters(counters);
                  setPipelineError({
                    source: "analysis",
                    message: semanticGate.display_message,
                    phase: "analyzing",
                  });
                  setPhase("result");
                  return;
                }
              } else {
                // Retry produced worse or equal results — block
                console.error(
                  `[COGNITIO][P0] SEMANTIC GATE RETRY: Retry did not improve results. Blocking.`
                );
                counters.final_generation_status = "error";
                counters.success_gate_reason = `Semantic gate failed: ${semanticGate.signals.gate_block_reasons.join("; ")} (body-only retry attempted, no improvement)`;
                counters.generation_error = semanticGate.display_message;
                counters.body_only_second_pass_triggered = true;
                counters.body_only_second_pass_concepts_count = retryResult.key_concepts.length;
                setDebugCounters(counters);
                setPipelineError({
                  source: "analysis",
                  message: semanticGate.display_message,
                  phase: "analyzing",
                });
                setPhase("result");
                return;
              }
            } else {
              // Body text too short or no concepts extracted
              console.error(
                `[COGNITIO][P0] SEMANTIC GATE RETRY: Body-only re-analysis produced 0 concepts. Blocking.`
              );
              counters.final_generation_status = "error";
              counters.success_gate_reason = `Semantic gate failed: ${semanticGate.signals.gate_block_reasons.join("; ")} (body-only retry: 0 concepts)`;
              counters.generation_error = semanticGate.display_message;
              counters.body_only_second_pass_triggered = true;
              counters.body_only_second_pass_concepts_count = 0;
              setDebugCounters(counters);
              setPipelineError({
                source: "analysis",
                message: semanticGate.display_message,
                phase: "analyzing",
              });
              setPhase("result");
              return;
            }
          } else {
            // Body text too short
            console.error(
              `[COGNITIO][P0] SEMANTIC GATE: Body text too short for retry (${bodyText.length} chars). Blocking.`
            );
            counters.final_generation_status = "error";
            counters.success_gate_reason = `Semantic gate failed: ${semanticGate.signals.gate_block_reasons.join("; ")}`;
            counters.generation_error = semanticGate.display_message;
            setDebugCounters(counters);
            setPipelineError({
              source: "analysis",
              message: semanticGate.display_message,
              phase: "analyzing",
            });
            setPhase("result");
            return;
          }
        } else {
          // Body-only pass was already attempted or only 1 segment — genuine failure
          console.error(
            `[COGNITIO][P0] SEMANTIC SUCCESS GATE BLOCKED. ` +
            `Reasons: ${semanticGate.signals.gate_block_reasons.join("; ")}. ` +
            `Signals: valid=${semanticGate.signals.valid_concepts_count}, ` +
            `uncertain=${semanticGate.signals.uncertain_concepts_count}, ` +
            `body=${semanticGate.signals.body_concepts_count}, ` +
            `artifact_ratio=${semanticGate.signals.editorial_artifact_ratio}` +
            `${bodyPassWasTriggered ? " (body-only second pass WAS triggered)" : ""}` +
            `${!hasMultipleSegments ? " (single-segment document)" : ""}`
          );
          counters.final_generation_status = "error";
          counters.success_gate_reason = `Semantic gate failed: ${semanticGate.signals.gate_block_reasons.join("; ")}`;
          counters.generation_error = semanticGate.display_message;
          setDebugCounters(counters);
          setPipelineError({
            source: "analysis",
            message: semanticGate.display_message,
            phase: "analyzing",
          });
          setPhase("result");
          return;
        }
      }

      // === P0 MISSION-SPECIFIC GATE (if mission format requested) ===
      if (chosenFormatHint === "mission_interactive") {
        const missionGate = runMissionGate(semanticGate.signals, m2Result.main_topic);
        counters.mission_gate_passed = missionGate.passed;
        counters.mission_gate_block_reasons = missionGate.block_reasons;

        if (!missionGate.passed) {
          console.error(
            `[COGNITIO][P0] MISSION GATE BLOCKED. Reasons: ${missionGate.block_reasons.join("; ")}`
          );
          counters.final_generation_status = "error";
          counters.success_gate_reason = `Mission gate failed: ${missionGate.block_reasons.join("; ")}`;
          counters.generation_error = missionGate.display_message;
          setDebugCounters(counters);
          setPipelineError({
            source: "analysis",
            message: missionGate.display_message,
            phase: "analyzing",
          });
          setPhase("result");
          return;
        }
      }

      // === M3: Memory Architecture ===
      setPhase("architecting");
      const m3Result = await memory.build(m2Result, m1Result.document_id, currentObjective, currentProfile);
      if (!m3Result) {
        setPipelineError({ source: "memory", message: memory.error ?? "Memory architecture failed", phase: "architecting" });
        setDebugCounters(counters);
        setPhase("result");
        return;
      }

      // P0: Populate M3 counters
      counters.concepts_persisted_count = m2Result.key_concepts.length;
      counters.concepts_reloaded_count = m3Result.concept_order.length;
      counters.memory_segments_generated_count = m3Result.segments.length;
      counters.pipeline_trace.push({
        step: "F_memory",
        input_count: m2Result.key_concepts.length,
        output_count: m3Result.segments.length,
        detail: `concept_order=${m3Result.concept_order.length}, duration=${m3Result.total_duration_sec}s, needs_split=${m3Result.needs_splitting}`,
      });
      console.info(
        `[COGNITIO][P0] M3 done: memory_segments=${m3Result.segments.length}, ` +
        `concept_order=${m3Result.concept_order.length}, ` +
        `duration=${m3Result.total_duration_sec}s, needs_split=${m3Result.needs_splitting}`
      );

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
        setDebugCounters(counters);
        setPhase("result");
        return;
      }

      // P0: Populate M4 counters
      counters.final_format_decision = m4Result.chosen_format;
      counters.format_override_applied = (m4Result.overrides_applied?.length ?? 0) > 0;
      counters.format_override_reason = m4Result.override_reason;
      console.info(
        `[COGNITIO][P0] M4 done: format=${m4Result.chosen_format}, ` +
        `overrides=${m4Result.overrides_applied?.length ?? 0}, ` +
        `user_respected=${m4Result.decision_trace.user_intent_respected}`
      );

      // === M5: Generation ===
      setPhase("generating");
      let m5Result: M5_Output | null = null;
      let m5bResult: M5B_Output | null = null;
      let m5cResult: GenerateExperienceOutput | null = null;

      const generationFormat = m4Result.chosen_format;
      counters.generator_called = generationFormat;

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
          counters.generation_success = false;
          counters.generation_error = generation.error ?? "Échec de la génération de la fiche";
          setPipelineError({ source: "generation", message: counters.generation_error, phase: "generating" });
          setDebugCounters(counters);
          console.error("[COGNITIO][P0] M5 FAILED. Full debug counters:", JSON.stringify(counters, null, 2));
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
          setPipelineError({ source: "generation", message: storyGeneration.error ?? "Échec de la génération de l'histoire", phase: "generating" });
          setPhase("result");
          return;
        }
      } else if (generationFormat === "mission_interactive") {
        try {
          const missionInput = {
            document_id: m1Result.document_id,
            course_profile_id: m2Result.course_profile_id,
            user_id: session?.user?.id ?? "",
            chosen_format: "mission_interactive" as const,
            learning_contract: m3Result.pedagogical_contract as any,
            concepts: m2Result.key_concepts,
            confusion_pairs: m2Result.confusion_pairs,
            visual_anchors: m3Result.visual_anchors.map((va) => ({
              concept_key: va.concept_key,
              anchor_type: va.anchor_type as "metaphor" | "comparison" | "mnemonic" | "image_desc",
              content: va.content,
            })),
            quality_score: m1Result.confidence_level,
            objective: currentObjective,
            main_topic: m2Result.main_topic,
            reasoning_type: m2Result.reasoning_type,
            estimated_audience_level: m2Result.estimated_audience_level,
          };
          m5cResult = generateMissionLocally(missionInput);
          setMissionResult(m5cResult);
          // Persist mission to database so the player can load it
          await saveMission(
            missionInput,
            m5cResult
          );
        } catch (missionErr) {
          const errMsg = missionErr instanceof Error ? missionErr.message : "Échec de la génération de la mission";
          setPipelineError({ source: "generation", message: errMsg, phase: "generating" });
          setPhase("result");
          return;
        }
      }

      // === P0 VALIDATION GATE: Reject empty generations ===
      if (m5Result) {
        const gate = validateGenerationNotEmpty(m5Result);
        if (!gate.passed) {
          counters.generation_success = false;
          counters.final_generation_status = "empty_generation";
          counters.success_gate_reason = gate.reason;
          counters.generation_error = gate.reason;
          setPipelineError({
            source: "generation",
            message: `Le document a été importé, mais le moteur n'a pas réussi à extraire suffisamment de concepts exploitables pour générer ce format. ${gate.reason}`,
            phase: "generating",
          });
          setDebugCounters(counters);
          console.error(
            `[COGNITIO][P0] EMPTY GENERATION GATE FAILED. ` +
            `reason="${gate.reason}", counters=${JSON.stringify(gate.counters)}, ` +
            `full_debug=${JSON.stringify(counters, null, 2)}`
          );
          setPhase("result");
          return;
        }
        console.info(
          `[COGNITIO][P0] Generation gate PASSED: ${gate.reason}, ` +
          `counters=${JSON.stringify(gate.counters)}`
        );
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
            format: m4Result.chosen_format,
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

      // P0: Final debug counters
      counters.generation_success = true;
      counters.final_generation_status = "success";
      counters.success_gate_reason = "All gates passed";
      counters.pipeline_trace.push({
        step: "G_generation",
        input_count: m2Result.key_concepts.length,
        detail: `format=${generationFormat}, status=success`,
      });
      setDebugCounters(counters);
      console.info("[COGNITIO][P0] Pipeline complete. Debug counters:", JSON.stringify(counters, null, 2));

      setPhase("result");
      track({ event_name: "transformation_generated" });
    } finally {
      runningRef.current = false;
    }
  }, [ingestion, analysis, memory, format, generation, storyGeneration, qa, track, session]);

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
    setMissionResult(null);
    setDebugCounters(null);
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
    missionResult,
    qa,

    // Aggregated state
    allSteps,
    hasBlocking,
    anyError,
    pipelineError,
    debugCounters,

    // Actions
    runPipeline,
    reset,
  };
}
