// ============================================================
// Seed Library — Demo transformations for instant experience
// ============================================================

export type SeedStatus = "active" | "draft" | "archived";

export interface SeedTransformation {
  id: string;
  title: string;
  subject: string;
  audience_level: string;
  format: string;
  transformation_json: Record<string, unknown>;
  recall_tests_json: Record<string, unknown>;
  debrief_demo_json: Record<string, unknown>;
  feature_flags_json: Record<string, unknown>;
  status: SeedStatus;
  created_at: string;
}

export interface SeedTransformationSummary {
  id: string;
  title: string;
  subject: string;
  audience_level: string;
  format: string;
}
