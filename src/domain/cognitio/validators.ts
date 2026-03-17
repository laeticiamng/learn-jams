// ============================================================
// COGNITIO Validators — Zod schemas for contract validation
// ============================================================

import { z } from "zod";
import { SECOND_PASS_THRESHOLDS } from "./secondPassThresholds";

// ---------- Quality Band ----------

export function getQualityBand(score: number) {
  if (score > 0.85) return "excellent" as const;
  if (score >= 0.70) return "good" as const;
  if (score >= 0.55) return "medium" as const;
  if (score >= 0.40) return "poor" as const;
  return "unusable" as const;
}

export function getFallbackMode(qualityBand: ReturnType<typeof getQualityBand>) {
  switch (qualityBand) {
    case "excellent": return "full" as const;
    case "good": return "full_with_alerts" as const;
    case "medium": return "reduced" as const;
    case "poor": return "minimal" as const;
    case "unusable": return "synthesis_only" as const;
  }
}

export function getRoomCount(qualityBand: ReturnType<typeof getQualityBand>) {
  switch (qualityBand) {
    case "excellent": return 5;
    case "good": return 5;
    case "medium": return 3;
    case "poor": return 2;
    case "unusable": return 0;
  }
}

export function shouldIncludeBoss(qualityBand: ReturnType<typeof getQualityBand>) {
  return qualityBand === "excellent" || qualityBand === "good";
}

// ---------- Ingestion Validators ----------

export const ingestInputSchema = z.object({
  file: z.instanceof(File).optional(),
  pasted_text: z.string().optional(),
  content_type: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ]),
  objective: z.enum(["discovery", "revision", "exam", "consolidation"]),
  language: z.string().optional(),
}).refine(
  (data) => data.file || data.pasted_text,
  { message: "Either file or pasted_text must be provided" }
);

// ---------- QA Validators ----------

export const QA_MIN_SCORE = 80;
export const QA_BLOCKING_CHECKS = [
  "has_active_recall",
  "no_cognitive_overload",
  "no_hallucination",
] as const;

export function validateQAScore(score: number, violations: { severity: string; violation_type: string }[]) {
  const hasBlockingViolation = violations.some(v => v.severity === "blocking");
  const hasHallucination = violations.some(v => v.violation_type === "hallucination");

  return {
    publish_blocked: score < QA_MIN_SCORE || hasBlockingViolation || hasHallucination,
    block_reason: hasHallucination
      ? "Hallucination conceptuelle détectée — blocage absolu"
      : hasBlockingViolation
        ? "Violation bloquante détectée"
        : score < QA_MIN_SCORE
          ? `Score QA insuffisant (${score}/100, minimum ${QA_MIN_SCORE})`
          : undefined,
  };
}

// ---------- Cognitive Budget ----------

export const MAX_NEW_ITEMS_PER_SEGMENT = 5;
export const MIN_CRITICAL_APPEARANCES = 3;
export const MIN_RECALL_PER_WORDS = 500; // 1 recall every 500 words
export const MAX_CONCEPTS_STANDARD = 30;

export function validateCognitiveBudget(
  totalConcepts: number,
  segmentNewItems: number[]
) {
  const overloaded = segmentNewItems.some(n => n > MAX_NEW_ITEMS_PER_SEGMENT);
  const tooManyConcepts = totalConcepts > MAX_CONCEPTS_STANDARD;

  return {
    valid: !overloaded && !tooManyConcepts,
    overloaded_segments: segmentNewItems
      .map((n, i) => (n > MAX_NEW_ITEMS_PER_SEGMENT ? i : -1))
      .filter(i => i >= 0),
    too_many_concepts: tooManyConcepts,
  };
}

// ---------- Mission Sequence Validator ----------

export function validateRoomSequence(brickTypes: string[]) {
  const violations: string[] = [];

  // No consecutive same bricks
  for (let i = 1; i < brickTypes.length; i++) {
    if (brickTypes[i] === brickTypes[i - 1]) {
      violations.push(`Rooms ${i} and ${i + 1} use the same brick: ${brickTypes[i]}`);
    }
  }

  // OBSERVATION should be early
  const obsIndex = brickTypes.indexOf("OBSERVATION");
  if (obsIndex > 1) {
    violations.push("OBSERVATION should be in the first two rooms");
  }

  // DECISION should increase in intensity (later rooms)
  const decIndex = brickTypes.indexOf("DECISION");
  if (decIndex >= 0 && decIndex < Math.floor(brickTypes.length / 2)) {
    violations.push("DECISION should be in the later rooms");
  }

  return { valid: violations.length === 0, violations };
}

// ---------- Semantic Success Gate ----------

/**
 * P0: Semantic validation signals computed from M2 output.
 * These signals determine whether generation should proceed.
 */
export interface SemanticGateSignals {
  valid_concepts_count: number;
  uncertain_concepts_count: number;
  body_concepts_count: number;
  segment_0_concepts_count: number;
  editorial_artifact_ratio: number;
  main_topic_is_editorial_artifact: boolean;
  semantic_generation_allowed: boolean;
  gate_block_reasons: string[];
  /** Which analysis mode / threshold profile was used */
  analysis_mode?: "full" | "body_only";
  /** Which threshold profile was applied */
  threshold_profile?: string;
}

/**
 * P0: Semantic success gate result.
 * If `passed` is false, no generation should proceed.
 */
export interface SemanticGateResult {
  passed: boolean;
  status: "semantic_success" | "semantic_failure";
  signals: SemanticGateSignals;
  display_message: string;
}

/**
 * P0: Mission-specific gate result.
 * Stricter than the general semantic gate.
 */
export interface MissionGateResult {
  passed: boolean;
  block_reasons: string[];
  display_message: string;
}

/**
 * P0: Run the semantic success gate on M2 analysis output.
 * Blocks generation if the conceptual base is invalid.
 */
/** Concept input for semantic gate — all fields are tolerant of undefined for partial analysis results */
export interface SemanticGateConceptInput {
  label: string;
  definition: string;
  uncertain?: boolean;
  source_confidence?: number;
  source_trace?: { segment_index: number; excerpt: string }[];
}

/**
 * Normalize a concept input to ensure all fields have safe defaults.
 * Prevents validation failures from partial upstream analysis objects.
 */
export function normalizeGateConceptInput(c: SemanticGateConceptInput): {
  label: string;
  definition: string;
  uncertain: boolean;
  source_confidence: number;
  source_trace: { segment_index: number; excerpt: string }[];
} {
  return {
    label: c.label ?? "",
    definition: c.definition ?? "",
    uncertain: c.uncertain ?? false,
    source_confidence: Number.isFinite(c.source_confidence) ? c.source_confidence! : 0.5,
    source_trace: Array.isArray(c.source_trace) ? c.source_trace : [],
  };
}

/** Per-concept diagnostic entry for debugging rejection reasons */
export interface ConceptDiagnosticEntry {
  label: string;
  definition_preview: string;
  source_confidence: number;
  uncertain: boolean;
  scores: { accepted: boolean; editorial_artifact_score: number; header_noise_score: number };
  is_artifact: boolean;
  is_uncertain: boolean;
  is_valid: boolean;
  reject_reason: string | null;
}

export function runSemanticSuccessGate(params: {
  concepts: SemanticGateConceptInput[];
  main_topic: string;
  scoreConceptCandidate: (label: string, definition: string) => {
    accepted: boolean;
    editorial_artifact_score: number;
    header_noise_score: number;
  };
  isEditorialArtifact: (text: string) => boolean;
  cleanMainTopic: (text: string) => string;
  /** Ticket 3: analysis mode — body_only uses relaxed thresholds */
  analysis_mode?: "full" | "body_only";
  /** Source type from M1 — used to detect medical polycopiés */
  source_type?: string;
}): SemanticGateResult {
  const { main_topic, scoreConceptCandidate, isEditorialArtifact, cleanMainTopic } = params;
  const analysisMode = params.analysis_mode ?? "full";
  const blockReasons: string[] = [];

  // Detect medical polycopié mode for relaxed thresholds
  const isMedicalPolycopie = params.source_type === "polycopie";

  // Mode-aware thresholds — sourced from centralized SECOND_PASS_THRESHOLDS
  const isBodyOnly = analysisMode === "body_only";
  const minValidConcepts = isMedicalPolycopie
    ? SECOND_PASS_THRESHOLDS.MEDICAL_MIN_VALID_CONCEPTS_FULL
    : isBodyOnly
      ? SECOND_PASS_THRESHOLDS.MIN_VALID_CONCEPTS_BODY_ONLY
      : SECOND_PASS_THRESHOLDS.MIN_VALID_CONCEPTS_FULL;
  const minBodyConcepts = isBodyOnly
    ? SECOND_PASS_THRESHOLDS.MIN_BODY_CONCEPTS_BODY_ONLY
    : SECOND_PASS_THRESHOLDS.MIN_BODY_CONCEPTS_FULL;
  const maxArtifactRatio = isMedicalPolycopie
    ? SECOND_PASS_THRESHOLDS.MEDICAL_MAX_ARTIFACT_RATIO
    : isBodyOnly
      ? SECOND_PASS_THRESHOLDS.MAX_ARTIFACT_RATIO_BODY_ONLY
      : SECOND_PASS_THRESHOLDS.MAX_ARTIFACT_RATIO_FULL;
  const thresholdProfile = isMedicalPolycopie
    ? "medical_polycopie"
    : isBodyOnly ? "body_only_relaxed" : "full_strict";

  // Artifact/uncertainty thresholds — relaxed for medical polycopiés
  const artifactEditorialThreshold = isMedicalPolycopie ? 0.6 : 0.4;
  const artifactHeaderThreshold = isMedicalPolycopie ? 0.6 : 0.4;
  const uncertaintyConfidenceThreshold = isMedicalPolycopie
    ? SECOND_PASS_THRESHOLDS.MEDICAL_UNCERTAINTY_CONFIDENCE
    : 0.4;

  // Normalize and compute signals
  let validConceptsCount = 0;
  let uncertainConceptsCount = 0;
  let bodyConceptsCount = 0;
  let segment0ConceptsCount = 0;
  let editorialArtifactCount = 0;

  const normalizedConcepts = params.concepts.map(normalizeGateConceptInput);
  const conceptDiagnostics: ConceptDiagnosticEntry[] = [];

  for (const c of normalizedConcepts) {
    const scores = scoreConceptCandidate(c.label, c.definition);
    const isUncertain = c.uncertain === true || c.source_confidence < uncertaintyConfidenceThreshold;
    const isArtifact = !scores.accepted ||
      scores.editorial_artifact_score >= artifactEditorialThreshold ||
      scores.header_noise_score >= artifactHeaderThreshold;

    // Build rejection reason for diagnostics
    let rejectReason: string | null = null;
    if (!scores.accepted) rejectReason = "scoring_rejected";
    else if (scores.editorial_artifact_score >= artifactEditorialThreshold) rejectReason = `editorial_score=${scores.editorial_artifact_score}>=threshold(${artifactEditorialThreshold})`;
    else if (scores.header_noise_score >= artifactHeaderThreshold) rejectReason = `header_score=${scores.header_noise_score}>=threshold(${artifactHeaderThreshold})`;
    else if (isUncertain) rejectReason = `uncertain(confidence=${c.source_confidence}<${uncertaintyConfidenceThreshold})`;

    if (isUncertain) uncertainConceptsCount++;
    if (isArtifact) editorialArtifactCount++;
    if (!isArtifact && !isUncertain) validConceptsCount++;

    const fromSeg0 = c.source_trace.length > 0 && c.source_trace.every(t => t.segment_index === 0);
    const fromBody = c.source_trace.some(t => t.segment_index > 0);

    if (fromSeg0 && !fromBody) segment0ConceptsCount++;
    if (fromBody) bodyConceptsCount++;

    // For body-only mode, if source_trace is empty, count as body concept
    // (body-only retry may not have segment indices set correctly)
    if (isBodyOnly && c.source_trace.length === 0) bodyConceptsCount++;

    // Diagnostic logging per concept
    conceptDiagnostics.push({
      label: c.label,
      definition_preview: c.definition.slice(0, 80),
      source_confidence: c.source_confidence,
      uncertain: c.uncertain,
      scores: { accepted: scores.accepted, editorial_artifact_score: scores.editorial_artifact_score, header_noise_score: scores.header_noise_score },
      is_artifact: isArtifact,
      is_uncertain: isUncertain,
      is_valid: !isArtifact && !isUncertain,
      reject_reason: rejectReason,
    });
  }

  // Emit per-concept diagnostic log
  console.info(
    `[COGNITIO][GATE] Per-concept diagnostics (${thresholdProfile}, source_type=${params.source_type ?? "unknown"}):\n` +
    conceptDiagnostics.map((d, i) =>
      `  [${i}] "${d.label}" → valid=${d.is_valid}, artifact=${d.is_artifact}, uncertain=${d.is_uncertain}, ` +
      `scores={editorial=${d.scores.editorial_artifact_score}, header=${d.scores.header_noise_score}, accepted=${d.scores.accepted}}, ` +
      `confidence=${d.source_confidence}, reject=${d.reject_reason ?? "none"}`
    ).join("\n")
  );

  const editorialArtifactRatio = normalizedConcepts.length > 0 ? editorialArtifactCount / normalizedConcepts.length : 1;

  // Check main topic
  const cleanedTopic = cleanMainTopic(main_topic);
  const mainTopicIsEditorial = isEditorialArtifact(main_topic) ||
    cleanedTopic.length < 3 ||
    /^R2C\b|^Rang\s+[A-Z]|^COM\s+R2C|^CODEX\b|^S[\s-]*ECN\b|^ITEM\s+\d|^Révision\s+\d/i.test(cleanedTopic);

  // Gate conditions — mode-aware
  if (validConceptsCount < minValidConcepts) {
    blockReasons.push(`Seulement ${validConceptsCount} concept(s) valide(s) (minimum : ${minValidConcepts})`);
  }
  if (bodyConceptsCount < minBodyConcepts && normalizedConcepts.length > 0) {
    blockReasons.push("Aucun concept provenant du corps du document");
  }
  if (normalizedConcepts.length > 0 && uncertainConceptsCount === normalizedConcepts.length) {
    blockReasons.push("Tous les concepts sont marqués incertains");
  }
  if (mainTopicIsEditorial) {
    blockReasons.push(`Le sujet principal est un artefact éditorial : "${main_topic}"`);
  }
  if (editorialArtifactRatio >= maxArtifactRatio) {
    blockReasons.push(`${Math.round(editorialArtifactRatio * 100)}% des concepts sont des artefacts éditoriaux`);
  }

  const signals: SemanticGateSignals = {
    valid_concepts_count: validConceptsCount,
    uncertain_concepts_count: uncertainConceptsCount,
    body_concepts_count: bodyConceptsCount,
    segment_0_concepts_count: segment0ConceptsCount,
    editorial_artifact_ratio: Math.round(editorialArtifactRatio * 100) / 100,
    main_topic_is_editorial_artifact: mainTopicIsEditorial,
    semantic_generation_allowed: blockReasons.length === 0,
    gate_block_reasons: blockReasons,
    analysis_mode: analysisMode,
    threshold_profile: thresholdProfile,
  };

  const passed = blockReasons.length === 0;

  return {
    passed,
    status: passed ? "semantic_success" : "semantic_failure",
    signals,
    display_message: passed
      ? "Base sémantique validée"
      : "Le document a été importé. L'analyse approfondie est en cours : " +
        "détection du front matter, quarantaine du segment 0, extraction corps-seulement, " +
        "recalcul du domaine et extraction par compréhension du document seront tentés automatiquement.",
  };
}

/**
 * P0: Mission-specific gate — stricter than the general semantic gate.
 * Now supports degraded mission mode: if >= 1 exploitable concept (valid OR uncertain),
 * generate a degraded mission instead of blocking completely.
 */
export function runMissionGate(signals: SemanticGateSignals, mainTopic: string): MissionGateResult {
  const blockReasons: string[] = [];

  if (signals.valid_concepts_count < SECOND_PASS_THRESHOLDS.MISSION_MIN_VALID_CONCEPTS) {
    blockReasons.push(`Minimum ${SECOND_PASS_THRESHOLDS.MISSION_MIN_VALID_CONCEPTS} concepts valides requis pour une mission (trouvé : ${signals.valid_concepts_count})`);
  }
  if (signals.body_concepts_count < 1) {
    blockReasons.push("Au moins 1 concept du corps du document est requis pour une mission");
  }
  if (signals.uncertain_concepts_count > 0 && signals.valid_concepts_count === 0) {
    blockReasons.push("Impossible de générer une mission uniquement avec des concepts incertains");
  }
  if (signals.main_topic_is_editorial_artifact) {
    blockReasons.push("Le sujet principal est un artefact éditorial — la mission ne peut pas être thématisée");
  }
  if (signals.editorial_artifact_ratio >= SECOND_PASS_THRESHOLDS.MISSION_MAX_ARTIFACT_RATIO) {
    blockReasons.push("Trop de concepts sont des artefacts éditoriaux pour construire une mission fiable");
  }

  // Degraded mission fallback: if gate would block but we have >= 1 exploitable concept
  // (valid or uncertain), allow a degraded mission instead of total failure
  const exploitableConcepts = signals.valid_concepts_count + signals.uncertain_concepts_count;
  const strictPassed = blockReasons.length === 0;

  if (!strictPassed && exploitableConcepts >= SECOND_PASS_THRESHOLDS.DEGRADED_MISSION_MIN_EXPLOITABLE) {
    // Check we don't have a poisoned topic — that's a hard block
    if (!signals.main_topic_is_editorial_artifact) {
      console.warn(
        `[COGNITIO][MISSION_GATE] DEGRADED FALLBACK: strict gate failed (${blockReasons.join("; ")}), ` +
        `but ${exploitableConcepts} exploitable concept(s) found (valid=${signals.valid_concepts_count}, ` +
        `uncertain=${signals.uncertain_concepts_count}). Allowing degraded mission.`
      );
      return {
        passed: true,
        block_reasons: [],
        display_message: `Mission dégradée : ${exploitableConcepts} concept(s) exploitable(s) — ` +
          `mission générée en mode réduit. Raisons initiales : ${blockReasons.join("; ")}`,
      };
    }
  }

  const passed = strictPassed;

  return {
    passed,
    block_reasons: blockReasons,
    display_message: passed
      ? "Mission gate validée"
      : "Le document a été importé. Après toutes les passes d'extraction automatiques " +
        "(détection front matter, quarantaine segment 0, extraction corps-seulement, " +
        "recalcul du domaine, fallback par compréhension du document), l'analyse n'a pas " +
        "identifié suffisamment de concepts pédagogiques fiables pour générer une mission interactive. " +
        blockReasons.join(". ") + ".",
  };
}

// ---------- Confidence Calibration ----------

export function computeCalibrationGap(
  results: { confidence: number; is_correct: boolean }[]
) {
  if (results.length === 0) return 0;

  const avgConfidence = results.reduce((s, r) => s + r.confidence, 0) / results.length;
  const accuracy = results.filter(r => r.is_correct).length / results.length;

  return Math.abs(avgConfidence - accuracy);
}

// ---------- Word Count Thresholds ----------

export const WORD_COUNT_THRESHOLDS = {
  MIN_VIABLE: 100,
  CHUNKING_THRESHOLD: 15000,
  CONFIDENCE_BLOCKING: 0.4,
} as const;

export function validateWordCount(wordCount: number) {
  if (wordCount < WORD_COUNT_THRESHOLDS.MIN_VIABLE) {
    return { valid: false, action: "fallback_micro" as const };
  }
  if (wordCount > WORD_COUNT_THRESHOLDS.CHUNKING_THRESHOLD) {
    return { valid: true, action: "chunk" as const };
  }
  return { valid: true, action: "proceed" as const };
}

// ---------- M1 Validation ----------

export const m1InputSchema = z.object({
  raw_content: z.union([z.instanceof(File), z.string().min(1)]),
  content_type: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "paste",
  ]),
  user_objective: z.enum(["discovery", "revision", "exam", "consolidation"]).optional(),
  user_language: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const m1OutputSchema = z.object({
  document_id: z.string().uuid(),
  clean_text: z.string().min(1),
  word_count: z.number().int().min(0),
  language: z.string().min(2).max(5),
  source_type: z.enum(["institutional", "polycopie", "slides", "personal_notes", "unknown"]),
  confidence_level: z.number().min(0).max(1),
  detected_structure: z.enum(["prose", "bullets", "table", "mixed", "minimal"]),
  issues: z.array(z.object({
    code: z.string(),
    message: z.string(),
    severity: z.enum(["info", "warning", "blocking"]),
    action_required: z.boolean().optional(),
    page_ref: z.number().optional(),
  })),
  segments: z.array(z.object({
    segment_index: z.number().int().min(0),
    title: z.string().nullable(),
    content: z.string().min(1),
    hierarchy_level: z.number().int().min(0),
    confidence_score: z.number().min(0).max(1),
    page_ref: z.string().nullable(),
  })),
});

// ---------- M2 Validation ----------

export const m2OutputSchema = z.object({
  course_profile_id: z.string(),
  main_topic: z.string().min(1),
  learning_objectives: z.array(z.string()),
  key_concepts: z.array(z.object({
    stable_key: z.string(),
    label: z.string(),
    definition: z.string(),
    type: z.string(),
    criticality: z.number().int().min(1).max(4),
    criticality_score: z.number().min(0).max(1),
    bloom_target: z.enum(["remember", "understand", "apply", "analyze", "evaluate", "create"]),
    relations: z.array(z.object({
      target_key: z.string(),
      relation_type: z.enum(["prerequisite", "related", "part_of", "contrasts_with"]),
    })),
    prerequisites: z.array(z.string()),
    source_confidence: z.number().min(0).max(1),
    source_trace: z.array(z.object({
      segment_index: z.number(),
      excerpt: z.string(),
      page_ref: z.number().optional(),
    })),
    uncertain: z.boolean(),
  })),
  traps: z.array(z.object({
    concept_key: z.string(),
    trap_type: z.enum(["false_friend", "common_error", "ambiguity", "partial_truth"]),
    description: z.string(),
  })),
  confusion_pairs: z.array(z.object({
    concept_a_key: z.string(),
    concept_b_key: z.string(),
    distinction_key: z.string(),
    frequency: z.number().int().min(1).max(5),
  })),
  reasoning_type: z.enum(["declaratif", "procedural", "conditionnel", "causal", "metacognitif"]),
  density: z.enum(["low", "medium", "high"]),
  recommended_template: z.enum(["fiche_dynamique", "histoire_animee"]),
  confidence: z.object({
    concepts: z.number().min(0).max(1),
    logic: z.number().min(0).max(1),
    traps: z.number().min(0).max(1),
    structure: z.number().min(0).max(1),
    ambiguous_zones: z.array(z.object({
      zone_label: z.string(),
      reason: z.string(),
      segment_refs: z.array(z.number()),
      severity: z.enum(["low", "medium", "high"]),
    })),
  }),
  prerequis: z.array(z.string()),
  structure_type: z.enum(["prose", "bullets", "table", "mixed", "minimal"]),
  source_issues: z.array(z.object({
    code: z.string(),
    message: z.string(),
    severity: z.enum(["info", "warning", "blocking"]),
  })),
  total_concepts: z.number().int().min(0),
  critical_count: z.number().int().min(0),
  estimated_complexity: z.number().int().min(1).max(10),
});

// ---------- Concept Trace Validation ----------

export function validateConceptTraceability(
  concepts: { stable_key: string; source_confidence: number; source_trace: { excerpt: string }[] }[],
  sourceText: string
): { valid: boolean; untraceable: string[]; uncertain: string[] } {
  const untraceable: string[] = [];
  const uncertain: string[] = [];
  const lowerSource = sourceText.toLowerCase();

  for (const c of concepts) {
    // Check if at least one trace excerpt can be found in source
    const hasTrace = c.source_trace.some(
      (t) => t.excerpt.length > 10 && lowerSource.includes(t.excerpt.toLowerCase().slice(0, 40))
    );

    if (!hasTrace && c.source_trace.length === 0) {
      untraceable.push(c.stable_key);
    } else if (c.source_confidence < 0.5) {
      uncertain.push(c.stable_key);
    }
  }

  return {
    valid: untraceable.length === 0,
    untraceable,
    uncertain,
  };
}

// ---------- M1 Ingestion Rules ----------

export function validateIngestionResult(
  wordCount: number,
  confidenceLevel: number,
  language: string
): { issues: { code: string; message: string; severity: "info" | "warning" | "blocking"; action_required: boolean }[] } {
  const issues: { code: string; message: string; severity: "info" | "warning" | "blocking"; action_required: boolean }[] = [];

  if (wordCount === 0) {
    issues.push({ code: "EMPTY_DOCUMENT", message: "Aucun texte exploitable détecté", severity: "blocking", action_required: true });
  } else if (wordCount < WORD_COUNT_THRESHOLDS.MIN_VIABLE) {
    issues.push({ code: "DOCUMENT_TOO_SHORT", message: `Seulement ${wordCount} mots (minimum: 100)`, severity: "warning", action_required: false });
  }

  if (wordCount > WORD_COUNT_THRESHOLDS.CHUNKING_THRESHOLD) {
    issues.push({ code: "DOCUMENT_TOO_LONG", message: `${wordCount} mots — segmentation automatique`, severity: "info", action_required: false });
  }

  if (confidenceLevel < WORD_COUNT_THRESHOLDS.CONFIDENCE_BLOCKING) {
    issues.push({ code: "LOW_CONFIDENCE_BLOCKING", message: "Confiance trop faible pour analyse fiable", severity: "blocking", action_required: true });
  }

  return { issues };
}
