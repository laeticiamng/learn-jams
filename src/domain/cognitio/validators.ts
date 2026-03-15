// ============================================================
// COGNITIO Validators — Zod schemas for contract validation
// ============================================================

import { z } from "zod";

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
export function runSemanticSuccessGate(params: {
  concepts: {
    label: string;
    definition: string;
    uncertain: boolean;
    source_confidence: number;
    source_trace: { segment_index: number; excerpt: string }[];
  }[];
  main_topic: string;
  scoreConceptCandidate: (label: string, definition: string) => {
    accepted: boolean;
    editorial_artifact_score: number;
    header_noise_score: number;
  };
  isEditorialArtifact: (text: string) => boolean;
  cleanMainTopic: (text: string) => string;
}): SemanticGateResult {
  const { concepts, main_topic, scoreConceptCandidate, isEditorialArtifact, cleanMainTopic } = params;
  const blockReasons: string[] = [];

  // Compute signals
  let validConceptsCount = 0;
  let uncertainConceptsCount = 0;
  let bodyConceptsCount = 0;
  let segment0ConceptsCount = 0;
  let editorialArtifactCount = 0;

  for (const c of concepts) {
    const scores = scoreConceptCandidate(c.label, c.definition);
    const isUncertain = c.uncertain === true || c.source_confidence < 0.4;
    const isArtifact = !scores.accepted || scores.editorial_artifact_score >= 0.4 || scores.header_noise_score >= 0.4;

    if (isUncertain) uncertainConceptsCount++;
    if (isArtifact) editorialArtifactCount++;
    if (!isArtifact && !isUncertain) validConceptsCount++;

    const fromSeg0 = c.source_trace?.every(t => t.segment_index === 0) ?? false;
    const fromBody = c.source_trace?.some(t => t.segment_index > 0) ?? false;

    if (fromSeg0 && !fromBody) segment0ConceptsCount++;
    if (fromBody) bodyConceptsCount++;
  }

  const editorialArtifactRatio = concepts.length > 0 ? editorialArtifactCount / concepts.length : 1;

  // Check main topic
  const cleanedTopic = cleanMainTopic(main_topic);
  const mainTopicIsEditorial = isEditorialArtifact(main_topic) ||
    cleanedTopic.length < 3 ||
    /^R2C\b|^Rang\s+[A-Z]|^COM\s+R2C|^CODEX\b|^S[\s-]*ECN\b|^ITEM\s+\d|^Révision\s+\d/i.test(cleanedTopic);

  // Gate conditions
  if (validConceptsCount < 2) {
    blockReasons.push(`Seulement ${validConceptsCount} concept(s) valide(s) (minimum : 2)`);
  }
  if (bodyConceptsCount < 1 && concepts.length > 0) {
    blockReasons.push("Aucun concept provenant du corps du document");
  }
  if (concepts.length > 0 && uncertainConceptsCount === concepts.length) {
    blockReasons.push("Tous les concepts sont marqués incertains");
  }
  if (mainTopicIsEditorial) {
    blockReasons.push(`Le sujet principal est un artefact éditorial : "${main_topic}"`);
  }
  if (editorialArtifactRatio >= 0.8) {
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
  };

  const passed = blockReasons.length === 0;

  return {
    passed,
    status: passed ? "semantic_success" : "semantic_failure",
    signals,
    display_message: passed
      ? "Base sémantique validée"
      : "Le document a été importé, mais l'analyse a détecté uniquement des éléments éditoriaux non exploitables. " +
        "Aucune mission fiable ne peut être générée à partir de ce document dans son état actuel.",
  };
}

/**
 * P0: Mission-specific gate — stricter than the general semantic gate.
 */
export function runMissionGate(signals: SemanticGateSignals, mainTopic: string): MissionGateResult {
  const blockReasons: string[] = [];

  if (signals.valid_concepts_count < 2) {
    blockReasons.push(`Minimum 2 concepts valides requis pour une mission (trouvé : ${signals.valid_concepts_count})`);
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
  if (signals.editorial_artifact_ratio >= 0.7) {
    blockReasons.push("Trop de concepts sont des artefacts éditoriaux pour construire une mission fiable");
  }

  const passed = blockReasons.length === 0;

  return {
    passed,
    block_reasons: blockReasons,
    display_message: passed
      ? "Mission gate validée"
      : "Le document a été importé, mais l'analyse n'a pas identifié suffisamment de concepts pédagogiques fiables " +
        "pour générer une mission interactive. " + blockReasons.join(". ") + ".",
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
