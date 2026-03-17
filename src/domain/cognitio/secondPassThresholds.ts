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
} as const;
