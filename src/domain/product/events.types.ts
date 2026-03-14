// ============================================================
// Product Event Taxonomy — Structured event tracking
// ============================================================

export const PRODUCT_EVENTS = [
  "landing_viewed",
  "onboarding_started",
  "onboarding_completed",
  "seed_transformation_started",
  "upload_started",
  "upload_completed",
  "analysis_completed",
  "memory_plan_generated",
  "format_selected",
  "transformation_generated",
  "transformation_opened",
  "inline_recall_answered",
  "final_test_started",
  "final_test_completed",
  "debrief_viewed",
  "review_queue_viewed",
  "review_queue_item_started",
  "qa_pass",
  "qa_warn",
  "qa_block",
  "j1_retest_completed",
  "j7_retest_completed",
  "guardian_invite_started",
  "guardian_invite_completed",
  "lyrics_generation_completed",
  "music_generation_completed",
  "profile_viewed",
  "library_viewed",
  "error_occurred",
  "session_resumed",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[number];

export interface ProductEvent {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  transformation_id: string | null;
  event_name: ProductEventName;
  audience_level: string | null;
  format: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface TrackEventInput {
  event_name: ProductEventName;
  transformation_id?: string | null;
  audience_level?: string | null;
  format?: string | null;
  metadata?: Record<string, unknown>;
}
