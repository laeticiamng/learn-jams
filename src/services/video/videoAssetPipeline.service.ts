// ============================================================
// Video Asset Pipeline — Upload, link, and manage project assets
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { VideoAsset, VideoAssetType } from "@/domain/video/video.types";
import { supabaseStorageProvider } from "@/services/providers/supabaseStorageProvider";

const VIDEO_BUCKET = "video-assets";

export async function uploadAsset(
  projectId: string,
  assetType: VideoAssetType,
  file: File | Blob,
  filename: string,
  metadata?: Record<string, unknown>,
): Promise<VideoAsset> {
  const storagePath = `${projectId}/${assetType}/${filename}`;

  await supabaseStorageProvider.upload(
    VIDEO_BUCKET,
    storagePath,
    file,
    file.type || "application/octet-stream",
  );

  const { data, error } = await supabase
    .from("video_assets")
    .insert({
      project_id: projectId,
      asset_type: assetType,
      storage_path: storagePath,
      metadata_json: {
        original_filename: filename,
        content_type: file.type,
        size_bytes: file.size,
        ...metadata,
      } as Json,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to register asset: ${error.message}`);
  return data as unknown as VideoAsset;
}

export async function linkExternalAsset(
  projectId: string,
  assetType: VideoAssetType,
  storagePath: string,
  metadata?: Record<string, unknown>,
): Promise<VideoAsset> {
  const { data, error } = await supabase
    .from("video_assets")
    .insert({
      project_id: projectId,
      asset_type: assetType,
      storage_path: storagePath,
      metadata_json: (metadata ?? {}) as Json,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to link asset: ${error.message}`);
  return data as unknown as VideoAsset;
}

export async function getProjectAssets(projectId: string): Promise<VideoAsset[]> {
  const { data, error } = await supabase
    .from("video_assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as unknown as VideoAsset[];
}

export async function getAssetsByType(projectId: string, assetType: VideoAssetType): Promise<VideoAsset[]> {
  const { data, error } = await supabase
    .from("video_assets")
    .select("*")
    .eq("project_id", projectId)
    .eq("asset_type", assetType);

  if (error) return [];
  return (data ?? []) as unknown as VideoAsset[];
}

export function getAssetUrl(asset: VideoAsset): string {
  return supabaseStorageProvider.getPublicUrl(VIDEO_BUCKET, asset.storage_path);
}
