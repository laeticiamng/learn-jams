// ============================================================
// Job Queue Service — Create, update, and manage generation jobs
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { GenerationJob, GenerationArtifact, CreateJobInput, JobStatus } from "@/domain/providers/job.types";

export async function createJob(input: CreateJobInput): Promise<GenerationJob> {
  const { data, error } = await supabase
    .from("generation_jobs")
    .insert([{
      user_id: input.user_id ?? null,
      domain: input.domain,
      job_type: input.job_type,
      status: "pending",
      preferred_provider_key: input.preferred_provider_key ?? null,
      input_json: input.input_json as Json,
      max_retries: input.max_retries ?? 3,
    }])
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create job: ${error.message}`);
  return data as unknown as GenerationJob;
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  updates?: {
    actual_provider_key?: string;
    output_json?: Record<string, unknown>;
    error_json?: Record<string, unknown>;
  },
): Promise<void> {
  const patch: Record<string, unknown> = { status };

  if (status === "running") patch.started_at = new Date().toISOString();
  if (status === "completed" || status === "failed") patch.finished_at = new Date().toISOString();
  if (updates?.actual_provider_key) patch.actual_provider_key = updates.actual_provider_key;
  if (updates?.output_json) patch.output_json = updates.output_json as Json;
  if (updates?.error_json) patch.error_json = updates.error_json as Json;

  const { error } = await supabase
    .from("generation_jobs")
    .update(patch)
    .eq("id", jobId);

  if (error) throw new Error(`Failed to update job: ${error.message}`);
}

export async function incrementRetryCount(jobId: string): Promise<number> {
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("retry_count, max_retries")
    .eq("id", jobId)
    .single();

  if (error || !data) throw new Error(`Failed to get job retry count: ${error?.message}`);

  const newCount = (data.retry_count ?? 0) + 1;
  await supabase
    .from("generation_jobs")
    .update({ retry_count: newCount })
    .eq("id", jobId);

  return newCount;
}

export async function getJob(jobId: string): Promise<GenerationJob | null> {
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as GenerationJob;
}

export async function getJobsByUser(userId: string, limit = 20): Promise<GenerationJob[]> {
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[jobQueue] getJobsByUser failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as GenerationJob[];
}

export async function getPendingJobs(domain?: string, limit = 50): Promise<GenerationJob[]> {
  let query = supabase
    .from("generation_jobs")
    .select("*")
    .in("status", ["pending", "queued"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (domain) query = query.eq("domain", domain);

  const { data, error } = await query;
  if (error) {
    console.warn("[jobQueue] getPendingJobs failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as GenerationJob[];
}

// ── Artifacts ──────────────────────────────────────────────

export async function addArtifact(
  jobId: string,
  artifactType: string,
  storagePath: string,
  metadata?: Record<string, unknown>,
): Promise<GenerationArtifact> {
  const { data, error } = await supabase
    .from("generation_artifacts")
    .insert([{
      job_id: jobId,
      artifact_type: artifactType,
      storage_path: storagePath,
      metadata_json: (metadata ?? {}) as Json,
    }])
    .select("*")
    .single();

  if (error) throw new Error(`Failed to add artifact: ${error.message}`);
  return data as unknown as GenerationArtifact;
}

export async function getArtifactsForJob(jobId: string): Promise<GenerationArtifact[]> {
  const { data, error } = await supabase
    .from("generation_artifacts")
    .select("*")
    .eq("job_id", jobId);

  if (error) {
    console.warn("[jobQueue] getArtifactsForJob failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as GenerationArtifact[];
}

// ── Webhook Events ─────────────────────────────────────────

export async function logWebhookEvent(
  providerKey: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase
    .from("webhook_events")
    .insert([{
      provider_key: providerKey,
      event_type: eventType,
      payload_json: payload as Json,
    }])
    .select("id")
    .single();

  if (error) throw new Error(`Failed to log webhook event: ${error.message}`);
  return data.id;
}

export async function markWebhookProcessed(eventId: string, errorMessage?: string): Promise<void> {
  const patch: Record<string, unknown> = {
    processed: true,
    processed_at: new Date().toISOString(),
  };
  if (errorMessage) patch.error_message = errorMessage;

  await supabase
    .from("webhook_events")
    .update(patch)
    .eq("id", eventId);
}
