// ============================================================
// COGNITIO Memory Architect Validators — M3
// ============================================================

import { z } from "zod";
import { MAX_NEW_ITEMS_PER_SEGMENT, MIN_CRITICAL_APPEARANCES, MAX_CONCEPTS_STANDARD } from "./validators";
import type { M3_Output } from "./memory.contracts";
import type { M3_Segment, RepetitionPlanItem } from "./memory.types";

// ---------- Constants ----------

export const MAX_DURATION_BEFORE_SPLIT = 600; // seconds
export const MIN_SEGMENTS = 2;
export const MIN_DURATION_SEC = 60;

// ---------- Zod Schemas ----------

export const m3SegmentSchema = z.object({
  segment_index: z.number().int().min(0),
  concept_keys: z.array(z.string()),
  new_element_count: z.number().int().min(0).max(MAX_NEW_ITEMS_PER_SEGMENT),
  reinforcement_keys: z.array(z.string()),
  dominant_function: z.enum(["encoding", "consolidation", "retrieval", "discrimination"]),
  estimated_duration_sec: z.number().min(0),
  bloom_targets: z.array(z.enum(["remember", "understand", "apply", "analyze", "evaluate", "create"])),
});

export const m3OutputSchema = z.object({
  architecture_id: z.string(),
  document_id: z.string(),
  course_profile_id: z.string(),
  segments: z.array(m3SegmentSchema).min(1),
  concept_order: z.array(z.string()),
  repetition_plan: z.array(z.object({
    concept_key: z.string(),
    moments: z.array(z.enum(["inline", "end_of_segment", "final_test", "j1", "j7"])),
    total_appearances: z.number().int().min(1),
    is_critical: z.boolean(),
  })),
  mnemonics: z.array(z.object({
    concept_keys: z.array(z.string()),
    mnemonic: z.string(),
    type: z.enum(["acronym", "story", "association", "rhyme", "visual"]),
    effectiveness_hint: z.string().optional(),
  })),
  visual_anchors: z.array(z.object({
    concept_key: z.string(),
    anchor_type: z.enum(["metaphor", "comparison", "mnemonic", "image_desc", "diagram_desc"]),
    content: z.string(),
    related_concepts: z.array(z.string()).optional(),
  })),
  cognitive_budget: z.object({
    total_concepts: z.number().int().min(0),
    max_per_segment: z.number().int(),
    segment_count: z.number().int().min(1),
    total_new_introductions: z.number().int().min(0),
    total_reinforcements: z.number().int().min(0),
    budget_utilization: z.number().min(0).max(1),
  }),
  pedagogical_contract: z.object({
    total_concepts: z.number().int().min(0),
    critical_concepts: z.number().int().min(0),
    estimated_duration_sec: z.number().min(0),
    segment_count: z.number().int().min(1),
    cognitive_budget: z.object({
      total_concepts: z.number().int().min(0),
      max_per_segment: z.number().int(),
      segment_count: z.number().int().min(1),
      total_new_introductions: z.number().int().min(0),
      total_reinforcements: z.number().int().min(0),
      budget_utilization: z.number().min(0).max(1),
    }),
    repetition_summary: z.object({
      inline_recall_count: z.number().int().min(0),
      final_test_questions: z.number().int().min(0),
      j1_questions: z.number().int().min(0),
      j7_questions: z.number().int().min(0),
    }),
    guarantees: z.array(z.string()),
  }),
  total_duration_sec: z.number().min(0),
  needs_splitting: z.boolean(),
  split_modules: z.array(z.object({
    module_index: z.number().int().min(0),
    segment_indices: z.array(z.number().int()),
    concept_keys: z.array(z.string()),
    estimated_duration_sec: z.number().min(0),
    title_suggestion: z.string(),
  })).optional(),
  reasoning_type: z.enum(["declaratif", "procedural", "conditionnel", "causal", "metacognitif"]),
  objective: z.enum(["discovery", "revision", "exam", "consolidation"]),
});

// ---------- Invariant Validators ----------

export interface M3ValidationResult {
  valid: boolean;
  errors: M3ValidationError[];
  warnings: M3ValidationWarning[];
}

export interface M3ValidationError {
  code: string;
  message: string;
  severity: "fatal" | "error";
  segment_index?: number;
}

export interface M3ValidationWarning {
  code: string;
  message: string;
  concept_key?: string;
}

/**
 * Validate M3 output against all invariants.
 * FATAL errors mean the output MUST be rejected.
 */
export function validateM3Output(output: M3_Output): M3ValidationResult {
  const errors: M3ValidationError[] = [];
  const warnings: M3ValidationWarning[] = [];

  // INV-1: segments.length >= 2 (unless single concept)
  if (output.segments.length < MIN_SEGMENTS && output.cognitive_budget.total_concepts > 1) {
    errors.push({
      code: "INSUFFICIENT_SEGMENTS",
      message: `Architecture must have at least ${MIN_SEGMENTS} segments, got ${output.segments.length}`,
      severity: "error",
    });
  }

  // INV-2: No segment exceeds MAX_NEW_ITEMS_PER_SEGMENT — FATAL
  for (const seg of output.segments) {
    if (seg.new_element_count > MAX_NEW_ITEMS_PER_SEGMENT) {
      errors.push({
        code: "SEGMENT_OVERLOAD",
        message: `Segment ${seg.segment_index} has ${seg.new_element_count} new elements (max ${MAX_NEW_ITEMS_PER_SEGMENT})`,
        severity: "fatal",
        segment_index: seg.segment_index,
      });
    }
  }

  // INV-3: Critical concepts (criticality=1) must appear >= MIN_CRITICAL_APPEARANCES times
  const criticalItems = output.repetition_plan.filter(r => r.is_critical);
  for (const item of criticalItems) {
    if (item.total_appearances < MIN_CRITICAL_APPEARANCES) {
      errors.push({
        code: "CRITICAL_UNDERREPRESENTED",
        message: `Critical concept "${item.concept_key}" appears ${item.total_appearances} times (minimum ${MIN_CRITICAL_APPEARANCES})`,
        severity: "error",
      });
    }
  }

  // INV-4: Duration > 600s without splitting → ERROR
  if (output.total_duration_sec > MAX_DURATION_BEFORE_SPLIT && !output.needs_splitting) {
    errors.push({
      code: "DURATION_EXCEEDS_LIMIT",
      message: `Total duration ${output.total_duration_sec}s exceeds ${MAX_DURATION_BEFORE_SPLIT}s without splitting`,
      severity: "error",
    });
  }

  // INV-5: Total concepts must not exceed MAX_CONCEPTS_STANDARD
  if (output.cognitive_budget.total_concepts > MAX_CONCEPTS_STANDARD) {
    errors.push({
      code: "TOO_MANY_CONCEPTS",
      message: `${output.cognitive_budget.total_concepts} concepts exceed maximum ${MAX_CONCEPTS_STANDARD}`,
      severity: "error",
    });
  }

  // INV-6: concept_order must contain all segment concept_keys
  const allSegmentKeys = new Set(output.segments.flatMap(s => s.concept_keys));
  const orderSet = new Set(output.concept_order);
  for (const key of allSegmentKeys) {
    if (!orderSet.has(key)) {
      warnings.push({
        code: "MISSING_FROM_ORDER",
        message: `Concept "${key}" appears in segments but not in concept_order`,
        concept_key: key,
      });
    }
  }

  // INV-7: Split modules must cover all segments when splitting is needed
  if (output.needs_splitting && output.split_modules) {
    const coveredIndices = new Set(output.split_modules.flatMap(m => m.segment_indices));
    for (const seg of output.segments) {
      if (!coveredIndices.has(seg.segment_index)) {
        warnings.push({
          code: "UNCOVERED_SEGMENT",
          message: `Segment ${seg.segment_index} is not covered by any split module`,
        });
      }
    }
  }

  const hasFatal = errors.some(e => e.severity === "fatal");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single segment's cognitive load.
 */
export function validateSegmentLoad(segment: M3_Segment): {
  valid: boolean;
  overloaded: boolean;
  message?: string;
} {
  if (segment.new_element_count > MAX_NEW_ITEMS_PER_SEGMENT) {
    return {
      valid: false,
      overloaded: true,
      message: `Segment ${segment.segment_index}: ${segment.new_element_count} new items exceeds limit of ${MAX_NEW_ITEMS_PER_SEGMENT}`,
    };
  }
  return { valid: true, overloaded: false };
}

/**
 * Validate that critical concepts have enough repetitions across the plan.
 */
export function validateCriticalRepetitions(
  repetitionPlan: RepetitionPlanItem[]
): { valid: boolean; underrepresented: string[] } {
  const underrepresented: string[] = [];

  for (const item of repetitionPlan) {
    if (item.is_critical && item.total_appearances < MIN_CRITICAL_APPEARANCES) {
      underrepresented.push(item.concept_key);
    }
  }

  return {
    valid: underrepresented.length === 0,
    underrepresented,
  };
}
