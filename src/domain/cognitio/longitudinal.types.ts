// ============================================================
// COGNITIO M8 Longitudinal Memory Types
// ============================================================

import type { MasteryStatus, LearnerProfileStatus, ChosenFormat, LearningObjective } from "./types";

// ---------- Concept Memory Node ----------

export interface ConceptMemoryNode {
  id: string;
  user_id: string;
  concept_stable_key: string;
  mastery_score: number;
  mastery_status: MasteryStatus;
  last_seen_at: string | null;
  last_correct_at: string | null;
  last_incorrect_at: string | null;
  next_review_at: string | null;
  observations_count: number;
  correct_count: number;
  incorrect_count: number;
  confidence_mean: number;
  calibration_gap_mean: number;
  confusion_hits: number;
  format_efficacy: FormatEfficacy;
  archived: boolean;
  metadata_json: Record<string, unknown>;
  updated_at: string;
}

export interface FormatEfficacy {
  fiche_dynamique: number | null;
  histoire_animee: number | null;
  music: number | null;
}

// ---------- Learner State Profile ----------

export interface LearnerStateProfile {
  id: string;
  user_id: string;
  profile_status: LearnerProfileStatus;
  age_band: string | null;
  education_stage: string | null;
  declared_level: string | null;
  explanation_style: string | null;
  preferred_density: DensityPreference;
  dominant_learning_pattern: string | null;
  best_format: BestFormat;
  guidance_need: GuidanceNeed;
  confidence_calibration_quality: CalibrationQuality;
  revision_consistency_score: number | null;
  session_count: number;
  calibration_sessions_count: number;
  created_at: string;
  updated_at: string;
}

export type DensityPreference = "light" | "balanced" | "dense" | "unknown";
export type BestFormat = ChosenFormat | "music" | "unknown";
export type GuidanceNeed = "high" | "medium" | "low" | "unknown";
export type CalibrationQuality = "low" | "medium" | "high" | "unknown";

// ---------- Confusion Edge ----------

export interface ConfusionEdge {
  id: string;
  user_id: string;
  concept_a_key: string;
  concept_b_key: string;
  hits_count: number;
  last_hit_at: string | null;
  severity_score: number;
  updated_at: string;
}

// ---------- Format Effectiveness ----------

export interface FormatEffectivenessRecord {
  id: string;
  user_id: string;
  format: string;
  objective: LearningObjective;
  audience_level: string | null;
  attempts_count: number;
  avg_raw_score: number | null;
  avg_composite_score: number | null;
  avg_calibration_gap: number | null;
  retention_signal: number | null;
  updated_at: string;
}

// ---------- Review Queue ----------

export type ReviewReason = "fragile" | "aging" | "high_confusion" | "low_calibration" | "missed_recently";
export type ReviewAction = "quick_review" | "retest" | "full_regeneration" | "contrast_drill";
export type ReviewFormat = ChosenFormat | "music" | "mixed";
export type ReviewStatus = "pending" | "completed" | "skipped" | "expired";

export interface ReviewQueueItem {
  id: string;
  user_id: string;
  concept_stable_key: string;
  priority_score: number;
  reason: ReviewReason;
  recommended_format: ReviewFormat;
  recommended_action: ReviewAction;
  due_at: string;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

// ---------- Progress Snapshot ----------

export interface ProgressSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  concepts_known: number;
  concepts_fragile: number;
  concepts_aging: number;
  avg_mastery_score: number | null;
  avg_calibration_gap: number | null;
  weekly_activity_score: number | null;
  created_at: string;
}

// ---------- Memory Update Events ----------

export type MemoryEventType =
  | "memory_updated"
  | "mastery_status_changed"
  | "concept_became_fragile"
  | "concept_became_stable"
  | "concept_became_aging"
  | "confusion_edge_incremented"
  | "review_queue_built"
  | "learner_profile_refreshed"
  | "best_format_changed"
  | "progress_snapshot_created";

export interface MemoryEvent {
  type: MemoryEventType;
  user_id: string;
  concept_stable_key?: string;
  old_status?: MasteryStatus;
  new_status?: MasteryStatus;
  mastery_score?: number;
  calibration_gap_mean?: number;
  format_used?: string;
  queue_size?: number;
  transformation_id?: string;
}

// ---------- Mastery Status Labels ----------

export const MASTERY_STATUS_LABELS: Record<MasteryStatus, string> = {
  unknown: "Inconnu",
  emerging: "En cours d'acquisition",
  fragile: "Encore fragile",
  learning: "En apprentissage",
  stable: "Bien stabilise",
  strong: "Solidement acquis",
  mastered: "Maitrise",
  aging: "A revoir bientot",
};

export const MASTERY_STATUS_COLORS: Record<MasteryStatus, string> = {
  unknown: "bg-gray-100 text-gray-600 border-gray-300",
  emerging: "bg-blue-50 text-blue-600 border-blue-300",
  fragile: "bg-red-50 text-red-600 border-red-300",
  learning: "bg-yellow-50 text-yellow-600 border-yellow-300",
  stable: "bg-green-50 text-green-600 border-green-300",
  strong: "bg-emerald-50 text-emerald-700 border-emerald-300",
  mastered: "bg-emerald-100 text-emerald-800 border-emerald-400",
  aging: "bg-orange-50 text-orange-600 border-orange-300",
};
