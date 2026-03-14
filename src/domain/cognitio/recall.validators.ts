// ============================================================
// COGNITIO M6 Recall Validators
// ============================================================

import { z } from "zod";
import type { RecallItem, RecallAnswer, RecallTestType, BloomNumeric } from "./recall.types";
import type { M6_GenerateOutput } from "./recall.contracts";

// ---------- Constants ----------

export const FINAL_TEST_MIN_QUESTIONS = 5;
export const FINAL_TEST_MAX_QUESTIONS = 10;
export const RETEST_MIN_QUESTIONS = 3;
export const RETEST_MAX_QUESTIONS = 6;
export const MIN_BLOOM_LEVELS_FINAL = 3;
export const MIN_INLINE_PER_WORDS = 500;

// ---------- Zod Schemas ----------

export const recallItemSchema = z.object({
  id: z.string(),
  type: z.enum(["qcm", "qcu", "completion", "short_answer", "distinction", "ordering", "reformulation", "transfer"]),
  prompt: z.string().min(1),
  choices: z.array(z.string()).nullable(),
  expected_answer: z.union([z.string(), z.array(z.string())]),
  concepts_tested: z.array(z.string()).min(1),
  bloom_level: z.number().int().min(1).max(6),
  is_discrimination: z.boolean(),
  is_transfer: z.boolean(),
  linked_block_id: z.string().nullable(),
});

export const recallAnswerSchema = z.object({
  item_id: z.string(),
  answer: z.union([z.string(), z.array(z.string())]),
  is_correct: z.boolean(),
  confidence: z.number().int().min(1).max(5),
  time_taken_ms: z.number().min(0),
  concepts_tested: z.array(z.string()),
});

// ---------- Validation ----------

export interface RecallValidationError {
  code: string;
  message: string;
  severity: "fatal" | "error" | "warning";
}

export interface RecallValidationResult {
  valid: boolean;
  errors: RecallValidationError[];
  warnings: RecallValidationError[];
}

export function validateRecallTest(
  output: M6_GenerateOutput,
  criticalConceptKeys: string[],
): RecallValidationResult {
  const errors: RecallValidationError[] = [];
  const warnings: RecallValidationError[] = [];
  const { items, test_type } = output;

  // Question count based on test type
  const [min, max] = getQuestionCountRange(test_type);
  if (items.length < min) {
    errors.push({ code: "TOO_FEW_QUESTIONS", message: `${items.length} items (min ${min} for ${test_type})`, severity: "error" });
  }
  if (items.length > max) {
    warnings.push({ code: "TOO_MANY_QUESTIONS", message: `${items.length} items (max ${max} for ${test_type})`, severity: "warning" });
  }

  // Bloom diversity for final test
  if (test_type === "final") {
    const bloomLevels = new Set(items.map(i => i.bloom_level));
    if (bloomLevels.size < MIN_BLOOM_LEVELS_FINAL) {
      errors.push({
        code: "INSUFFICIENT_BLOOM_DIVERSITY",
        message: `${bloomLevels.size} Bloom levels (min ${MIN_BLOOM_LEVELS_FINAL})`,
        severity: "error",
      });
    }

    // Must have at least: 1 recall, 1 distinction, 1 application/ordering
    const types = new Set(items.map(i => i.type));
    if (!types.has("qcu") && !types.has("qcm") && !types.has("completion")) {
      errors.push({ code: "MISSING_RECALL_ITEM", message: "No recall question (qcu/qcm/completion)", severity: "error" });
    }
    if (!types.has("distinction")) {
      warnings.push({ code: "MISSING_DISTINCTION_ITEM", message: "No distinction question", severity: "warning" });
    }
  }

  // Critical concept coverage
  const testedConcepts = new Set(items.flatMap(i => i.concepts_tested));
  const missingCritical = criticalConceptKeys.filter(k => !testedConcepts.has(k));
  if (missingCritical.length > 0 && (test_type === "final" || test_type === "j7")) {
    errors.push({
      code: "MISSING_CRITICAL_CONCEPTS",
      message: `${missingCritical.length} critical concept(s) not tested: ${missingCritical.join(", ")}`,
      severity: "error",
    });
  }

  // J+7 must have at least one distinction or transfer
  if (test_type === "j7") {
    const hasDiscriminant = items.some(i => i.is_discrimination || i.is_transfer);
    if (!hasDiscriminant) {
      errors.push({
        code: "J7_MISSING_DISCRIMINATION",
        message: "J+7 test must include at least one distinction or transfer item",
        severity: "error",
      });
    }
  }

  // IDs unique
  const ids = items.map(i => i.id);
  if (new Set(ids).size !== ids.length) {
    errors.push({ code: "DUPLICATE_IDS", message: "Duplicate item IDs", severity: "error" });
  }

  return {
    valid: errors.filter(e => e.severity === "fatal" || e.severity === "error").length === 0,
    errors: errors.filter(e => e.severity !== "warning"),
    warnings: [...warnings, ...errors.filter(e => e.severity === "warning")],
  };
}

function getQuestionCountRange(testType: RecallTestType): [number, number] {
  switch (testType) {
    case "inline": return [1, 20];
    case "final": return [FINAL_TEST_MIN_QUESTIONS, FINAL_TEST_MAX_QUESTIONS];
    case "j1": return [RETEST_MIN_QUESTIONS, RETEST_MAX_QUESTIONS];
    case "j7": return [RETEST_MIN_QUESTIONS, RETEST_MAX_QUESTIONS];
  }
}
