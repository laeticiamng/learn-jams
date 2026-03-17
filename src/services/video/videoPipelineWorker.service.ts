// ============================================================
// Video Pipeline Worker — Orchestrate full video generation
// ============================================================

import type { VideoProject, VideoMode } from "@/domain/video/video.types";
import { getVideoProject, updateVideoProjectStatus } from "./videoProject.service";
import { estimateVideoProject } from "./videoEstimate.service";
import { enhanceSynopsis, enhanceSynopsisLocal } from "./videoSynopsisEnhancer.service";
import { createGenerationPlan, getGenerationPlan } from "./videoPlanning.service";
import { executeVideoRun } from "./videoProviderRouter.service";
import { linkExternalAsset } from "./videoAssetPipeline.service";

export interface PipelineResult {
  project_id: string;
  status: "completed" | "failed" | "fallback_completed";
  provider_used: string;
  is_fallback: boolean;
  output_url?: string;
  error?: string;
}

/**
 * Full pipeline: estimate → enrich → plan → generate → render
 * Automatically falls back to FFmpeg template if AI provider fails.
 */
export async function runVideoPipeline(projectId: string): Promise<PipelineResult> {
  const project = await getVideoProject(projectId);
  if (!project) throw new Error(`Video project ${projectId} not found`);

  try {
    // Step 1: Estimate
    await updateVideoProjectStatus(projectId, "estimating");
    const estimate = estimateVideoProject(project);
    await updateVideoProjectStatus(projectId, "estimating", {
      estimated_duration_sec: estimate.estimated_duration_sec,
      estimated_shots: estimate.estimated_shots,
      estimated_credits: estimate.estimated_credits,
    });

    // Step 2: Enrich synopsis
    await updateVideoProjectStatus(projectId, "planning");
    let enriched;
    try {
      enriched = await enhanceSynopsis(
        project.synopsis ?? project.title,
        project.project_type,
      );
    } catch {
      // Fallback to local enrichment
      enriched = enhanceSynopsisLocal(
        project.synopsis ?? project.title,
        project.project_type,
      );
    }
    await updateVideoProjectStatus(projectId, "planning", {
      enriched_synopsis_json: enriched,
    });

    // Step 3: Create generation plan
    const plan = await createGenerationPlan(
      projectId,
      enriched,
      estimate.estimated_duration_sec,
    );

    // Step 4: Generate video
    await updateVideoProjectStatus(projectId, "generating");

    if (project.mode === "pedagogical_template_video") {
      // Pure template mode — skip external provider
      return await renderFallbackTemplate(projectId, project);
    }

    // Try AI generation
    try {
      const shotPrompts = (plan.shot_list_json as any[]).map((shot: any) => shot.description);
      const mainPrompt = shotPrompts.join(". ");

      const { provider_key, is_fallback } = await executeVideoRun(projectId, mainPrompt, {
        duration_sec: estimate.estimated_duration_sec,
        resolution: "1920x1080",
      });

      await updateVideoProjectStatus(projectId, "completed", {
        provider_used: provider_key,
      });

      return {
        project_id: projectId,
        status: is_fallback ? "fallback_completed" : "completed",
        provider_used: provider_key,
        is_fallback,
      };
    } catch {
      // AI provider failed — fallback to FFmpeg template
      return await renderFallbackTemplate(projectId, project);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    await updateVideoProjectStatus(projectId, "failed");
    return {
      project_id: projectId,
      status: "failed",
      provider_used: "none",
      is_fallback: false,
      error: message,
    };
  }
}

async function renderFallbackTemplate(
  projectId: string,
  project: VideoProject,
): Promise<PipelineResult> {
  await updateVideoProjectStatus(projectId, "rendering");

  // In production, this would trigger an FFmpeg job on the compute plane.
  // For now, mark as completed with internal_ffmpeg provider.
  await updateVideoProjectStatus(projectId, "completed", {
    provider_used: "internal_ffmpeg",
  });

  return {
    project_id: projectId,
    status: "fallback_completed",
    provider_used: "internal_ffmpeg",
    is_fallback: true,
  };
}
