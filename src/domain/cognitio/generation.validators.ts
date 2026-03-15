// ============================================================
// COGNITIO M5 Generation Validators
// ============================================================

import { z } from "zod";
import type { M5_Input, M5_Output } from "./generation.contracts";
import type { ContentBlock, FinalTestItem, ContentBlockType } from "./generation.types";
import { MANDATORY_BLOCK_TYPES } from "./generation.types";

// ---------- Constants ----------

export const MIN_FINAL_TEST_QUESTIONS = 3;
export const MAX_FINAL_TEST_QUESTIONS = 10;
export const MIN_BLOOM_LEVELS_IN_TEST = 3;
export const MAX_NEW_ELEMENTS_PER_BLOCK = 5;
export const MAX_OUTPUT_WORD_RATIO = 2.0;
export const MIN_RECALL_PER_WORDS = 500;
export const MAX_SENTENCES_WITHOUT_ANCHOR = 5;

// ---------- Zod Schemas ----------

export const contentBlockSchema = z.object({
  block_id: z.string(),
  type: z.enum(["contract", "hook", "anchor_map", "pedagogical", "reactivation", "clarity_peak", "consolidation", "final_test", "disclaimer"]),
  title: z.string(),
  content: z.string(),
  concepts_covered: z.array(z.string()),
  visual_anchor: z.object({
    image_desc: z.string(),
    verbal_formula: z.string(),
  }).nullable(),
  contrast_box: z.object({
    concept_a: z.string(),
    concept_b: z.string(),
    distinction_key: z.string(),
  }).nullable(),
  mnemonic: z.object({
    type: z.enum(["acronyme", "phrase", "pattern", "image"]),
    content: z.string(),
  }).nullable(),
  recall_event: z.object({
    type: z.enum(["question", "completion", "prediction", "distinction", "reformulation"]),
    prompt: z.string(),
    expected_concepts: z.array(z.string()),
    bloom_level: z.number().int().min(1).max(6),
  }).nullable(),
  position: z.number().int().min(0),
});

export const finalTestItemSchema = z.object({
  id: z.string(),
  type: z.enum(["qcm", "qcu", "completion", "short_answer", "distinction", "ordering"]),
  prompt: z.string(),
  choices: z.array(z.string()).nullable(),
  expected_answer: z.union([z.string(), z.array(z.string())]),
  concepts_tested: z.array(z.string()),
  bloom_level: z.number().int().min(1).max(6),
});

export const m5OutputSchema = z.object({
  transformation_id: z.string(),
  format: z.literal("fiche_dynamique"),
  metadata: z.object({
    document_id: z.string(),
    course_profile_id: z.string(),
    memory_architecture_id: z.string(),
    format_decision_id: z.string(),
    estimated_duration_sec: z.number().min(0),
    quality_flags: z.array(z.string()),
    coverage: z.object({
      critical_total: z.number().int().min(0),
      critical_covered: z.number().int().min(0),
      major_total: z.number().int().min(0),
      major_covered: z.number().int().min(0),
    }),
  }),
  internal_summary: z.object({
    learning_objective: z.string(),
    dominant_knowledge_type: z.object({
      dominant: z.string(),
      distribution: z.object({
        declaratif: z.number(),
        procedural: z.number(),
        conditionnel: z.number(),
        causal: z.number(),
        metacognitif: z.number(),
      }),
    }),
    critical_concepts: z.array(z.string()),
    confusions: z.array(z.string()),
    cognitive_structure: z.string(),
    cognitive_budget: z.object({
      segments: z.number().int(),
      max_new_elements: z.number().int(),
      total_duration_sec: z.number(),
    }),
    pedagogical_format: z.literal("fiche_dynamique"),
    reactivation_plan: z.array(z.string()),
    active_recall_plan: z.array(z.string()),
    mnemonics: z.array(z.string()),
  }),
  content_blocks: z.array(contentBlockSchema).min(1),
  final_test: z.array(finalTestItemSchema).min(MIN_FINAL_TEST_QUESTIONS),
  source_disclaimer: z.object({
    confidence_level: z.number().min(0).max(1),
    uncertain_concepts: z.array(z.string()),
    contradictions: z.array(z.string()),
    ambiguities: z.array(z.string()),
  }),
});

// ---------- Validation Result ----------

export interface M5ValidationError {
  code: string;
  message: string;
  severity: "fatal" | "error" | "warning";
}

export interface M5ValidationResult {
  valid: boolean;
  errors: M5ValidationError[];
  warnings: M5ValidationError[];
}

// ---------- Input Validation ----------

export function validateM5Input(input: M5_Input): M5ValidationResult {
  const errors: M5ValidationError[] = [];
  const warnings: M5ValidationError[] = [];

  if (input.m4_output.chosen_format !== "fiche_dynamique") {
    errors.push({
      code: "FORMAT_MISMATCH",
      message: `Expected fiche_dynamique, got ${input.m4_output.chosen_format}`,
      severity: "fatal",
    });
  }

  if (!input.m2_output.key_concepts || input.m2_output.key_concepts.length === 0) {
    // P0 FIX: downgrade from fatal to warning — the generator now handles
    // empty concepts with a minimal fallback instead of crashing.
    warnings.push({
      code: "NO_CONCEPTS",
      message: "No concepts available for generation — minimal fallback will be used",
      severity: "warning",
    });
  }

  if (!input.m3_output.segments || input.m3_output.segments.length === 0) {
    warnings.push({
      code: "NO_SEGMENTS",
      message: "No memory segments available — a single default segment will be used",
      severity: "warning",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ---------- Output Validation ----------

export function validateM5Output(output: M5_Output, sourceWordCount: number): M5ValidationResult {
  const errors: M5ValidationError[] = [];
  const warnings: M5ValidationError[] = [];

  // Format check
  if (output.format !== "fiche_dynamique") {
    errors.push({ code: "FORMAT_MISMATCH", message: `Format must be fiche_dynamique`, severity: "fatal" });
  }

  // Mandatory block types
  const blockTypes = new Set(output.content_blocks.map(b => b.type));
  for (const required of MANDATORY_BLOCK_TYPES) {
    if (required === "reactivation") continue; // Can be inline in pedagogical blocks
    if (!blockTypes.has(required)) {
      const severity = (required === "contract" || required === "consolidation") ? "fatal" : "error";
      errors.push({
        code: `MISSING_BLOCK_${required.toUpperCase()}`,
        message: `Missing mandatory block: ${required}`,
        severity,
      });
    }
  }

  // Final test validation
  if (output.final_test.length < MIN_FINAL_TEST_QUESTIONS) {
    errors.push({
      code: "INSUFFICIENT_FINAL_TEST",
      message: `Final test has ${output.final_test.length} questions (min ${MIN_FINAL_TEST_QUESTIONS})`,
      severity: "error",
    });
  }

  // Bloom diversity in final test
  const bloomLevels = new Set(output.final_test.map(q => q.bloom_level));
  if (bloomLevels.size < MIN_BLOOM_LEVELS_IN_TEST && output.final_test.length >= MIN_FINAL_TEST_QUESTIONS) {
    errors.push({
      code: "INSUFFICIENT_BLOOM_DIVERSITY",
      message: `Final test covers ${bloomLevels.size} Bloom levels (min ${MIN_BLOOM_LEVELS_IN_TEST})`,
      severity: "error",
    });
  }

  // Critical concept coverage
  if (output.metadata.coverage.critical_total > 0 &&
      output.metadata.coverage.critical_covered < output.metadata.coverage.critical_total) {
    errors.push({
      code: "MISSING_CRITICAL_CONCEPT",
      message: `Only ${output.metadata.coverage.critical_covered}/${output.metadata.coverage.critical_total} critical concepts covered`,
      severity: "fatal",
    });
  }

  // Output verbosity
  const outputWordCount = output.content_blocks.reduce((sum, b) => sum + b.content.split(/\s+/).length, 0);
  if (sourceWordCount > 0 && outputWordCount > sourceWordCount * MAX_OUTPUT_WORD_RATIO) {
    errors.push({
      code: "OUTPUT_TOO_VERBOSE",
      message: `Output ${outputWordCount} words exceeds ${MAX_OUTPUT_WORD_RATIO}x source (${sourceWordCount})`,
      severity: "error",
    });
  }

  // Recall density
  const recallEvents = output.content_blocks.filter(b => b.recall_event !== null).length;
  const expectedRecalls = Math.max(1, Math.floor(outputWordCount / MIN_RECALL_PER_WORDS));
  if (recallEvents < expectedRecalls) {
    warnings.push({
      code: "LOW_RECALL_DENSITY",
      message: `${recallEvents} recall events for ${outputWordCount} words (expected >= ${expectedRecalls})`,
      severity: "warning",
    });
  }

  // Max new elements per pedagogical block
  const pedagogicalBlocks = output.content_blocks.filter(b => b.type === "pedagogical");
  for (const block of pedagogicalBlocks) {
    if (block.concepts_covered.length > MAX_NEW_ELEMENTS_PER_BLOCK) {
      errors.push({
        code: "BLOCK_OVERLOAD",
        message: `Block "${block.title}" has ${block.concepts_covered.length} concepts (max ${MAX_NEW_ELEMENTS_PER_BLOCK})`,
        severity: "error",
      });
    }
  }

  // Disclaimer for uncertain concepts
  const uncertainInBlocks = output.content_blocks
    .flatMap(b => b.concepts_covered)
    .filter(key => output.source_disclaimer.uncertain_concepts.includes(key));
  if (output.source_disclaimer.uncertain_concepts.length > 0 &&
      output.source_disclaimer.confidence_level === 0) {
    errors.push({
      code: "MISSING_SOURCE_DISCLAIMER",
      message: "Uncertain concepts present but no disclaimer confidence",
      severity: "error",
    });
  }

  // Visual anchors for critical concepts
  const criticalKeys = output.internal_summary.critical_concepts;
  const blocksWithAnchors = output.content_blocks.filter(b => b.visual_anchor !== null);
  const anchored = new Set(blocksWithAnchors.flatMap(b => b.concepts_covered));
  const unanchoredCritical = criticalKeys.filter(k => !anchored.has(k));
  if (unanchoredCritical.length > 0) {
    warnings.push({
      code: "UNANCHORED_CRITICAL",
      message: `${unanchoredCritical.length} critical concept(s) without visual anchor`,
      severity: "warning",
    });
  }

  return {
    valid: errors.filter(e => e.severity === "fatal" || e.severity === "error").length === 0,
    errors: errors.filter(e => e.severity !== "warning"),
    warnings: [...warnings, ...errors.filter(e => e.severity === "warning")],
  };
}
