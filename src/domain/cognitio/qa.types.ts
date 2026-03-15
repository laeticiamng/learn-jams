// ============================================================
// COGNITIO M7 QA Types — Quality Assurance for Transformations
// ============================================================

// ---------- QA Status ----------

export type QAStatus = "pass" | "warn" | "block";

export type PublishDecisionStatus = "draft" | "review_needed" | "published" | "blocked";

// ---------- QA Checklist ----------

export type QACheckKey =
  | "STRUCTURE_REQUIRED_PRESENT"
  | "CRITICAL_CONCEPTS_COVERED"
  | "NO_CRITICAL_HALLUCINATION"
  | "INLINE_RECALL_PRESENT"
  | "FINAL_TEST_PRESENT"
  | "BLOOM_DISTRIBUTION_VALID"
  | "DISCLAIMER_PRESENT_IF_UNCERTAIN"
  | "DENSITY_ACCEPTABLE"
  | "FORMAT_CONSISTENT_WITH_M4"
  | "CLARITY_PEAK_PRESENT"
  | "CONSOLIDATION_PRESENT"
  // New semantic quality checks
  | "RESPECT_USER_INTENT"
  | "CONCEPT_CLEANLINESS"
  | "SEMANTIC_COHERENCE"
  | "DEFINITION_QUALITY"
  | "FORMAT_FIDELITY";

export interface QACheckResult {
  key: QACheckKey;
  label: string;
  status: "pass" | "warn" | "fail";
  weight: number;
  details: string;
}

// ---------- QA Violation ----------

export type QAViolationType =
  | "hallucination_critical"
  | "missing_critical_concept"
  | "missing_final_test"
  | "missing_inline_recall"
  | "missing_disclaimer"
  | "format_inconsistent"
  | "bloom_insufficient"
  | "density_excessive"
  | "structure_incomplete"
  // New semantic quality violations
  | "user_intent_overridden"
  | "dirty_labels"
  | "noisy_main_topic"
  | "poor_definitions";

export interface QAViolation {
  type: QAViolationType;
  severity: "warning" | "blocking";
  message: string;
  concept_key?: string;
}

// ---------- Blocking Violations ----------

export const BLOCKING_VIOLATION_TYPES: QAViolationType[] = [
  "hallucination_critical",
  "missing_critical_concept",
  "missing_final_test",
  "missing_inline_recall",
  "missing_disclaimer",
  "format_inconsistent",
];

// ---------- QA Score Thresholds ----------

export const QA_THRESHOLD_PASS = 80;
export const QA_THRESHOLD_WARN = 65;

// ---------- QA Report ----------

export interface QAReport {
  id: string;
  transformation_id: string;
  qa_score: number;
  qa_status: QAStatus;
  checklist_results: QACheckResult[];
  violations: QAViolation[];
  recommendations: string[];
  publish_blocked: boolean;
  created_at: string;
}

// ---------- Publish Decision ----------

export interface PublishDecision {
  id: string;
  transformation_id: string;
  qa_report_id: string;
  decision_status: PublishDecisionStatus;
  reason: string;
  created_at: string;
}
