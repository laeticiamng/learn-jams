// ============================================================
// COGNITIO Second-Pass Thresholds — shared constants
// ============================================================
// Centralized constants to avoid magic numbers scattered across
// validators.ts and analysis.service.ts.

export const SECOND_PASS_THRESHOLDS = {
  /** Artifact ratio above which second pass is triggered */
  HIGH_ARTIFACT_RATIO: 0.8,
  /** Minimum valid concepts for semantic gate (full analysis) */
  MIN_VALID_CONCEPTS_FULL: 2,
  /** Minimum valid concepts for semantic gate (body-only second pass) */
  MIN_VALID_CONCEPTS_BODY_ONLY: 1,
  /** Minimum body concepts for semantic gate (full analysis) */
  MIN_BODY_CONCEPTS_FULL: 1,
  /** Minimum body concepts for semantic gate (body-only second pass) — relaxed since all concepts are from body */
  MIN_BODY_CONCEPTS_BODY_ONLY: 0,
  /** Editorial artifact ratio above which gate blocks (full) */
  MAX_ARTIFACT_RATIO_FULL: 0.8,
  /** Editorial artifact ratio above which gate blocks (body-only) */
  MAX_ARTIFACT_RATIO_BODY_ONLY: 0.9,
  /** Mission gate: minimum valid concepts */
  MISSION_MIN_VALID_CONCEPTS: 2,
  /** Mission gate: max artifact ratio */
  MISSION_MAX_ARTIFACT_RATIO: 0.7,

  // --- Medical polycopié relaxed thresholds ---
  /** Minimum valid concepts for medical polycopié (full analysis) */
  MEDICAL_MIN_VALID_CONCEPTS_FULL: 1,
  /** Scoring: editorial artifact threshold for medical polycopiés (more lenient) */
  MEDICAL_EDITORIAL_THRESHOLD: 0.7,
  /** Scoring: header noise threshold for medical polycopiés (more lenient) */
  MEDICAL_HEADER_THRESHOLD: 0.6,
  /** Scoring: semantic validity threshold for medical polycopiés (more lenient) */
  MEDICAL_VALIDITY_THRESHOLD: 0.1,
  /** Scoring: source_confidence threshold for uncertain classification in medical mode */
  MEDICAL_UNCERTAINTY_CONFIDENCE: 0.3,
  /** Max artifact ratio for medical polycopiés */
  MEDICAL_MAX_ARTIFACT_RATIO: 0.9,

  // --- Degraded mission fallback ---
  /** Minimum exploitable concepts (valid + uncertain) for degraded mission */
  DEGRADED_MISSION_MIN_EXPLOITABLE: 1,
} as const;
