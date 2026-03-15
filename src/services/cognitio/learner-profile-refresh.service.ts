// ============================================================
// COGNITIO M8 Learner Profile Refresh — Recompute profile from data
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type {
  ConceptMemoryNode,
  LearnerStateProfile,
  ProgressSnapshot,
  FormatEffectivenessRecord,
  CalibrationQuality,
  GuidanceNeed,
  DensityPreference,
  BestFormat,
} from "@/domain/cognitio/longitudinal.types";
import type { LearnerProfileStatus } from "@/domain/cognitio/types";
import { determineBestFormat, getFormatEffectiveness } from "./format-effectiveness.service";

// ---------- Refresh Profile ----------

export interface RefreshProfileResult {
  profile: Partial<LearnerStateProfile>;
  snapshot: Omit<ProgressSnapshot, "id" | "created_at">;
  formatSummary: FormatEffectivenessRecord[];
}

export function computeRefreshedProfile(
  nodes: ConceptMemoryNode[],
  formatRecords: FormatEffectivenessRecord[],
  currentProfile: Partial<LearnerStateProfile>,
  userId: string,
): RefreshProfileResult {
  const activeNodes = nodes.filter((n) => !n.archived);

  // Profile status
  const totalObs = activeNodes.reduce((s, n) => s + n.observations_count, 0);
  const profileStatus: LearnerProfileStatus = totalObs >= 20
    ? "stable"
    : totalObs >= 5
      ? "calibrated"
      : "estimated";

  // Best format
  const bestFormat = determineBestFormat(formatRecords);

  // Calibration quality
  const calQuality = computeCalibrationQuality(activeNodes);

  // Guidance need
  const guidanceNeed = inferGuidanceNeed(activeNodes, calQuality);

  // Density preference
  const density = inferDensityPreference(formatRecords);

  // Revision consistency
  const revisionScore = computeRevisionConsistency(activeNodes);

  // Progress snapshot
  const stableOrBetter = activeNodes.filter((n) =>
    ["stable", "strong", "mastered"].includes(n.mastery_status)
  ).length;
  const fragile = activeNodes.filter((n) =>
    ["fragile", "emerging"].includes(n.mastery_status)
  ).length;
  const aging = activeNodes.filter((n) => n.mastery_status === "aging").length;
  const avgMastery = activeNodes.length > 0
    ? activeNodes.reduce((s, n) => s + n.mastery_score, 0) / activeNodes.length
    : null;
  const avgCalGap = activeNodes.length > 0
    ? activeNodes.reduce((s, n) => s + (n.calibration_gap_mean ?? 0), 0) / activeNodes.length
    : null;

  const snapshot: Omit<ProgressSnapshot, "id" | "created_at"> = {
    user_id: userId,
    snapshot_date: new Date().toISOString().split("T")[0],
    concepts_known: stableOrBetter,
    concepts_fragile: fragile,
    concepts_aging: aging,
    avg_mastery_score: avgMastery ? Math.round(avgMastery * 100) / 100 : null,
    avg_calibration_gap: avgCalGap ? Math.round(avgCalGap * 100) / 100 : null,
    weekly_activity_score: computeWeeklyActivity(activeNodes),
  };

  return {
    profile: {
      profile_status: profileStatus,
      best_format: bestFormat,
      guidance_need: guidanceNeed,
      confidence_calibration_quality: calQuality,
      preferred_density: density,
      revision_consistency_score: revisionScore,
    },
    snapshot,
    formatSummary: formatRecords,
  };
}

// ---------- Calibration Quality ----------

function computeCalibrationQuality(nodes: ConceptMemoryNode[]): CalibrationQuality {
  const withCalData = nodes.filter((n) => n.calibration_gap_mean !== null && n.observations_count >= 2);
  if (withCalData.length === 0) return "unknown";

  const avgAbsGap = withCalData.reduce((s, n) => s + Math.abs(n.calibration_gap_mean ?? 0), 0) / withCalData.length;

  if (avgAbsGap <= 0.15) return "high";
  if (avgAbsGap <= 0.3) return "medium";
  return "low";
}

// ---------- Guidance Need ----------

function inferGuidanceNeed(nodes: ConceptMemoryNode[], calQuality: CalibrationQuality): GuidanceNeed {
  if (nodes.length === 0) return "unknown";

  const fragileRatio = nodes.filter((n) => ["fragile", "emerging", "unknown"].includes(n.mastery_status)).length / nodes.length;

  if (fragileRatio > 0.5 || calQuality === "low") return "high";
  if (fragileRatio > 0.2 || calQuality === "medium") return "medium";
  return "low";
}

// ---------- Density Preference ----------

function inferDensityPreference(formatRecords: FormatEffectivenessRecord[]): DensityPreference {
  if (formatRecords.length === 0) return "unknown";

  // Use average composite score as proxy
  const avgComposite = formatRecords.reduce((s, r) => s + (r.avg_composite_score ?? 0), 0) / formatRecords.length;

  if (avgComposite >= 80) return "dense";
  if (avgComposite >= 60) return "balanced";
  if (avgComposite >= 40) return "light";
  return "light";
}

// ---------- Revision Consistency ----------

function computeRevisionConsistency(nodes: ConceptMemoryNode[]): number | null {
  const dueNodes = nodes.filter((n) => n.next_review_at !== null);
  if (dueNodes.length === 0) return null;

  const now = new Date();
  let onTimeCount = 0;

  for (const node of dueNodes) {
    if (node.last_seen_at && node.next_review_at) {
      const reviewDue = new Date(node.next_review_at);
      const lastSeen = new Date(node.last_seen_at);
      // Was the concept reviewed before or near its due date?
      if (lastSeen >= new Date(reviewDue.getTime() - 2 * 24 * 60 * 60 * 1000)) {
        onTimeCount++;
      }
    }
  }

  return Math.round((onTimeCount / dueNodes.length) * 100) / 100;
}

// ---------- Weekly Activity ----------

function computeWeeklyActivity(nodes: ConceptMemoryNode[]): number | null {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentNodes = nodes.filter((n) => n.last_seen_at && new Date(n.last_seen_at) >= weekAgo);
  if (nodes.length === 0) return null;

  return Math.round((recentNodes.length / Math.max(nodes.length, 1)) * 100) / 100;
}

// ---------- Persistence ----------

export async function persistProfileRefresh(
  userId: string,
  updates: Partial<LearnerStateProfile>,
  snapshot: Omit<ProgressSnapshot, "id" | "created_at">,
): Promise<void> {
  // Update profile
  const { error: profileErr } = await (supabase as any)
    .from("learner_profiles")
    .update({
      profile_status: updates.profile_status,
      best_format: updates.best_format,
      guidance_need: updates.guidance_need,
      confidence_calibration_quality: updates.confidence_calibration_quality,
      preferred_density: updates.preferred_density,
      revision_consistency_score: updates.revision_consistency_score,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (profileErr) throw new Error(`Profile refresh failed: ${profileErr.message}`);

  // Upsert snapshot (one per day)
  const { error: snapErr } = await (supabase as any)
    .from("learner_progress_snapshots")
    .upsert({
      user_id: snapshot.user_id,
      snapshot_date: snapshot.snapshot_date,
      concepts_known: snapshot.concepts_known,
      concepts_fragile: snapshot.concepts_fragile,
      concepts_aging: snapshot.concepts_aging,
      avg_mastery_score: snapshot.avg_mastery_score,
      avg_calibration_gap: snapshot.avg_calibration_gap,
      weekly_activity_score: snapshot.weekly_activity_score,
    }, { onConflict: "user_id,snapshot_date" });

  if (snapErr) throw new Error(`Snapshot persist failed: ${snapErr.message}`);
}

export async function getProgressSnapshots(
  userId: string,
  limit = 30,
): Promise<ProgressSnapshot[]> {
  const { data, error } = await (supabase as any)
    .from("learner_progress_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as unknown as ProgressSnapshot[];
}
