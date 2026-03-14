// ============================================================
// COGNITIO M7 QA Validators
// ============================================================

import { z } from "zod";
import type { M7_Input, M7_Output } from "./qa.contracts";
import type {
  QACheckResult,
  QAViolation,
  QAStatus,
  QACheckKey,
  PublishDecisionStatus,
  QA_THRESHOLD_PASS,
  QA_THRESHOLD_WARN,
  BLOCKING_VIOLATION_TYPES,
} from "./qa.types";

// ---------- Zod Schemas ----------

export const qaCheckResultSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: z.enum(["pass", "warn", "fail"]),
  weight: z.number(),
  details: z.string(),
});

export const qaViolationSchema = z.object({
  type: z.string(),
  severity: z.enum(["warning", "blocking"]),
  message: z.string(),
  concept_key: z.string().optional(),
});

export const qaReportSchema = z.object({
  id: z.string(),
  transformation_id: z.string(),
  qa_score: z.number().min(0).max(100),
  qa_status: z.enum(["pass", "warn", "block"]),
  checklist_results: z.array(qaCheckResultSchema),
  violations: z.array(qaViolationSchema),
  recommendations: z.array(z.string()),
  publish_blocked: z.boolean(),
  created_at: z.string(),
});

// ---------- Validation ----------

export interface QAValidationError {
  code: string;
  message: string;
  severity: "fatal" | "error" | "warning";
}

export interface QAValidationResult {
  valid: boolean;
  errors: QAValidationError[];
}

export function validateM7Input(input: M7_Input): QAValidationResult {
  const errors: QAValidationError[] = [];

  if (!input.transformation_id) {
    errors.push({ code: "MISSING_TRANSFORMATION_ID", message: "No transformation_id", severity: "fatal" });
  }

  if (!input.m5_output && !input.m5b_output) {
    errors.push({ code: "NO_GENERATED_CONTENT", message: "No M5 or M5B output provided", severity: "fatal" });
  }

  if (!input.m2_output?.key_concepts || input.m2_output.key_concepts.length === 0) {
    errors.push({ code: "NO_CONCEPTS", message: "No concepts in M2 output", severity: "fatal" });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
