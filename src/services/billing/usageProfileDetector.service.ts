// ============================================================
// Usage Profile Detector — Detects dominant usage patterns
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { FeatureKey } from "@/domain/billing/pricing.types";
import type { UsageProfile, DominantMode } from "@/domain/billing/adaptiveCredits.types";

// ---------- Detection thresholds ----------

const DOMINANCE_THRESHOLD = 0.45; // 45%+ of total usage = dominant
const HEAVY_VIDEO_THRESHOLD = 0.30;
const GUARDIAN_THRESHOLD = 0.20;

// ---------- Detect usage profile ----------

export function detectUsageProfile(
  usage: Partial<Record<FeatureKey, number>>,
): UsageProfile {
  const music = usage.music_generation ?? 0;
  const missions = usage.escape_game_generation ?? 0;
  const sheets = usage.dynamic_sheet_generation ?? 0;
  const stories = usage.animated_story_generation ?? 0;
  const videoAi = usage.video_generation_ai_seconds ?? 0;
  const videoTpl = usage.video_template_render ?? 0;
  const sms = usage.guardian_sms ?? 0;
  const email = usage.guardian_email ?? 0;

  const totalContent = music + missions + sheets + stories + videoAi + videoTpl;
  if (totalContent === 0) return "mixed";

  const guardianTotal = sms + email;
  const guardianPct = totalContent > 0 ? guardianTotal / (totalContent + guardianTotal) : 0;
  if (guardianPct >= GUARDIAN_THRESHOLD) return "family_guardian";

  const musicPct = music / totalContent;
  const missionPct = missions / totalContent;
  const sheetPct = (sheets + stories) / totalContent;
  const videoPct = (videoAi + videoTpl) / totalContent;

  if (videoPct >= HEAVY_VIDEO_THRESHOLD) return "video_heavy";
  if (musicPct >= DOMINANCE_THRESHOLD) return "music_first";
  if (missionPct >= DOMINANCE_THRESHOLD) return "mission_first";
  if (sheetPct >= DOMINANCE_THRESHOLD) return "sheet_first";
  if (videoPct >= 0.15) return "video_light";

  // Check for exam-intensive pattern: high missions + high sheets
  if (missionPct >= 0.25 && sheetPct >= 0.25) return "exam_intensive";

  return "mixed";
}

// ---------- Map profile to dominant mode ----------

export function profileToDominantMode(profile: UsageProfile): DominantMode {
  switch (profile) {
    case "music_first": return "songs";
    case "mission_first":
    case "exam_intensive": return "missions";
    case "sheet_first": return "sheets";
    case "video_light":
    case "video_heavy": return "video";
    default: return "mixed";
  }
}

// ---------- Persist detected profile ----------

export async function persistUsageProfile(
  userId: string,
  usage: Partial<Record<FeatureKey, number>>,
): Promise<UsageProfile> {
  const profile = detectUsageProfile(usage);
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("user_usage_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existing) {
    await supabase
      .from("user_usage_profiles")
      .update({
        dominant_usage_profile: profile,
        rolling_30d_usage_json: usage,
        last_detected_at: now,
        updated_at: now,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("user_usage_profiles").insert([{
      user_id: userId,
      dominant_usage_profile: profile,
      rolling_30d_usage_json: usage,
      last_detected_at: now,
    }]);
  }

  return profile;
}

// ---------- Get stored profile ----------

export async function getStoredUsageProfile(
  userId: string,
): Promise<{ profile: UsageProfile; usage: Partial<Record<FeatureKey, number>> } | null> {
  const { data } = await supabase
    .from("user_usage_profiles")
    .select("dominant_usage_profile, rolling_30d_usage_json")
    .eq("user_id", userId)
    .single();

  if (!data) return null;

  return {
    profile: data.dominant_usage_profile as UsageProfile,
    usage: data.rolling_30d_usage_json as Partial<Record<FeatureKey, number>>,
  };
}
