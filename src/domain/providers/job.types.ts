// ============================================================
// Generation Job Types — Unified job queue
// ============================================================

import type { ProviderDomain } from "./provider.types";

export const JOB_STATUSES = [
  "pending", "queued", "running", "completed", "failed", "cancelled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TYPES = [
  "generate_pedagogical_plan",
  "generate_lyrics",
  "generate_music",
  "generate_image_assets",
  "generate_video",
  "generate_tts",
  "render_template_video",
  "sanitize_audio",
  "postprocess_media",
  "send_email",
  "send_sms",
  "sync_billing",
  "process_webhook_event",
  "enhance_synopsis",
  "estimate_cost",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export interface GenerationJob {
  id: string;
  user_id: string | null;
  domain: ProviderDomain;
  job_type: JobType;
  status: JobStatus;
  preferred_provider_key: string | null;
  actual_provider_key: string | null;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown>;
  error_json: Record<string, unknown>;
  retry_count: number;
  max_retries: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface GenerationArtifact {
  id: string;
  job_id: string;
  artifact_type: string;
  storage_path: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface CreateJobInput {
  user_id?: string;
  domain: ProviderDomain;
  job_type: JobType;
  preferred_provider_key?: string;
  input_json: Record<string, unknown>;
  max_retries?: number;
}

// ── Webhook Events ─────────────────────────────────────────

export interface WebhookEvent {
  id: string;
  provider_key: string;
  event_type: string;
  payload_json: Record<string, unknown>;
  processed: boolean;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

// ── Worker Nodes ───────────────────────────────────────────

export const WORKER_NODE_TYPES = ["cpu", "gpu"] as const;
export type WorkerNodeType = (typeof WORKER_NODE_TYPES)[number];

export const WORKER_STATUSES = ["active", "draining", "offline"] as const;
export type WorkerStatus = (typeof WORKER_STATUSES)[number];

export interface WorkerNode {
  id: string;
  node_key: string;
  node_type: WorkerNodeType;
  capabilities_json: Record<string, unknown>;
  status: WorkerStatus;
  last_seen_at: string | null;
  created_at: string;
}
