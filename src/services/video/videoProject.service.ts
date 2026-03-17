// ============================================================
// Video Project Service — CRUD + lifecycle management
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type {
  VideoProject, VideoProjectStatus, CreateVideoProjectInput,
} from "@/domain/video/video.types";

export async function createVideoProject(input: CreateVideoProjectInput): Promise<VideoProject> {
  const { data, error } = await supabase
    .from("video_projects")
    .insert([{
      user_id: input.user_id,
      project_type: input.project_type,
      title: input.title,
      synopsis: input.synopsis ?? null,
      mode: input.mode ?? "pedagogical_template_video",
      provider_requested: input.provider_requested ?? null,
      status: "draft",
    }])
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create video project: ${error.message}`);
  return data as unknown as VideoProject;
}

export async function getVideoProject(projectId: string): Promise<VideoProject | null> {
  const { data, error } = await supabase
    .from("video_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as VideoProject;
}

export async function updateVideoProjectStatus(
  projectId: string,
  status: VideoProjectStatus,
  updates?: Partial<Pick<VideoProject, "provider_used" | "estimated_duration_sec" | "estimated_shots" | "estimated_credits" | "enriched_synopsis_json">>,
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    ...updates,
  };

  const { error } = await supabase
    .from("video_projects")
    .update(patch)
    .eq("id", projectId);

  if (error) throw new Error(`Failed to update video project: ${error.message}`);
}

export async function getUserVideoProjects(userId: string, limit = 20): Promise<VideoProject[]> {
  const { data, error } = await supabase
    .from("video_projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as unknown as VideoProject[];
}
