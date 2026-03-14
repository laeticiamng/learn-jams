// ============================================================
// Experiment Protocol — A/B testing & proof of value
// ============================================================

export type ExperimentVariant = "control" | "baseline_summary" | "dynamic_sheet" | "animated_story";

export type ExperimentStatus = "started" | "completed" | "abandoned";

export type MeasureKey =
  | "free_recall_t0"
  | "cued_recall_t0"
  | "free_recall_j1"
  | "cued_recall_j1"
  | "cued_recall_j7"
  | "discrimination_j7"
  | "transfer_simple_j7"
  | "confidence_calibration"
  | "completion_time_sec"
  | "engagement_score";

export interface ExperimentAssignment {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  experiment_key: string;
  variant: ExperimentVariant;
  assigned_at: string;
}

export interface ExperimentRun {
  id: string;
  assignment_id: string;
  transformation_id: string | null;
  status: ExperimentStatus;
  created_at: string;
  completed_at: string | null;
}

export interface ExperimentMeasurement {
  id: string;
  experiment_run_id: string;
  measure_key: MeasureKey;
  measure_value_numeric: number | null;
  measure_value_text: string | null;
  recorded_at: string;
}

export interface AssignExperimentInput {
  experiment_key: string;
  user_id?: string | null;
  anonymous_id?: string | null;
}

export interface RecordMeasurementInput {
  experiment_run_id: string;
  measure_key: MeasureKey;
  value_numeric?: number | null;
  value_text?: string | null;
}
