// ============================================================
// Video Provider Router — Route video generation to correct provider
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { VideoProject, VideoProviderRun, VideoRunType, VideoRunStatus } from "@/domain/video/video.types";
import { resolveProvider, executeWithFailover } from "@/services/providers/providerRouter";
import { getVideoProvider } from "@/services/providers/providerRegistry";

export async function createProviderRun(
  projectId: string,
  providerKey: string,
  runType: VideoRunType,
  requestJson: Record<string, unknown>,
): Promise<VideoProviderRun> {
  const { data, error } = await supabase
    .from("video_provider_runs")
    .insert([{
      project_id: projectId,
      provider_key: providerKey,
      run_type: runType,
      status: "pending",
      request_json: requestJson as Json,
    }])
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create provider run: ${error.message}`);
  return data as unknown as VideoProviderRun;
}

export async function updateProviderRun(
  runId: string,
  status: VideoRunStatus,
  response?: Record<string, unknown>,
  errorJson?: Record<string, unknown>,
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (response) patch.response_json = response as Json;
  if (errorJson) patch.error_json = errorJson as Json;

  const { error } = await supabase
    .from("video_provider_runs")
    .update(patch)
    .eq("id", runId);

  if (error) throw new Error(`Failed to update provider run: ${error.message}`);
}

export async function getProviderRuns(projectId: string): Promise<VideoProviderRun[]> {
  const { data, error } = await supabase
    .from("video_provider_runs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as unknown as VideoProviderRun[];
}

/**
 * Execute a video generation run with automatic failover.
 * If the preferred provider (e.g., Sora) fails, falls back to internal FFmpeg.
 */
export async function executeVideoRun(
  projectId: string,
  prompt: string,
  options?: Record<string, unknown>,
): Promise<{ run: VideoProviderRun; provider_key: string; is_fallback: boolean }> {
  const resolution = await resolveProvider("video");
  if (!resolution) throw new Error("No video provider available");

  const providerKey = resolution.resolved.provider_key;
  const run = await createProviderRun(projectId, providerKey, "generate_clip", {
    prompt,
    ...options,
  });

  try {
    const { result, provider_key, is_fallback } = await executeWithFailover("video", async (key) => {
      const provider = getVideoProvider(key);
      if (!provider) throw new Error(`Video provider ${key} not registered`);

      await updateProviderRun(run.id, "running");
      const videoResult = await provider.generateVideo(prompt, options);
      await updateProviderRun(run.id, "completed", videoResult as unknown as Record<string, unknown>);
      return videoResult;
    });

    return { run: { ...run, status: "completed", provider_key }, provider_key, is_fallback };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    await updateProviderRun(run.id, "failed", undefined, {
      message,
    });
    throw err;
  }
}
