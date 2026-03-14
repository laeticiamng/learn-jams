// ============================================================
// Video Progress Tracker — Track generation progress
// ============================================================

import type { VideoProject, VideoProviderRun } from "@/domain/video/video.types";
import { getVideoProject } from "./videoProject.service";
import { getProviderRuns } from "./videoProviderRouter.service";
import { getProjectAssets } from "./videoAssetPipeline.service";

export interface VideoProgress {
  project_id: string;
  status: string;
  provider_used: string | null;
  mode: string;
  progress_percent: number;
  steps: ProgressStep[];
  runs: VideoProviderRun[];
  asset_count: number;
}

export interface ProgressStep {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
}

const STATUS_PROGRESS: Record<string, number> = {
  draft: 0,
  planning: 10,
  estimating: 20,
  ready: 30,
  generating: 50,
  rendering: 80,
  completed: 100,
  failed: 0,
  cancelled: 0,
};

export async function getVideoProgress(projectId: string): Promise<VideoProgress | null> {
  const project = await getVideoProject(projectId);
  if (!project) return null;

  const [runs, assets] = await Promise.all([
    getProviderRuns(projectId),
    getProjectAssets(projectId),
  ]);

  const steps = buildSteps(project);

  return {
    project_id: projectId,
    status: project.status,
    provider_used: project.provider_used,
    mode: project.mode,
    progress_percent: STATUS_PROGRESS[project.status] ?? 0,
    steps,
    runs,
    asset_count: assets.length,
  };
}

function buildSteps(project: VideoProject): ProgressStep[] {
  const statusIdx = [
    "draft", "planning", "estimating", "ready", "generating", "rendering", "completed",
  ].indexOf(project.status);

  const allSteps = [
    { name: "Estimation", threshold: 2 },
    { name: "Enrichissement", threshold: 1 },
    { name: "Planification", threshold: 3 },
    { name: "Génération", threshold: 4 },
    { name: "Rendu", threshold: 5 },
    { name: "Terminé", threshold: 6 },
  ];

  return allSteps.map(step => ({
    name: step.name,
    status: statusIdx >= step.threshold ? "completed"
      : statusIdx === step.threshold - 1 ? "running"
      : "pending",
  }));
}
