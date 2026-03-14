// ============================================================
// COGNITIO M8 Review Queue — Build & manage revision queue
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { ConceptMemoryNode, ReviewQueueItem, ReviewReason, ReviewAction, ReviewFormat, FormatEffectivenessRecord } from "@/domain/cognitio/longitudinal.types";
import type { M8_BuildReviewQueueOutput } from "@/domain/cognitio/longitudinal.contracts";
import type { MasteryStatus } from "@/domain/cognitio/types";

// ---------- Build Review Queue ----------

export function buildReviewQueue(
  nodes: ConceptMemoryNode[],
  formatEffectiveness: FormatEffectivenessRecord[],
): ReviewQueueItem[] {
  const now = new Date();
  const items: ReviewQueueItem[] = [];

  for (const node of nodes) {
    if (node.archived) continue;

    const reason = classifyReviewReason(node, now);
    if (!reason) continue;

    const priority = computePriorityScore(node, reason, now);
    const action = recommendAction(node, reason);
    const format = recommendFormat(node, formatEffectiveness);

    items.push({
      id: crypto.randomUUID(),
      user_id: node.user_id,
      concept_stable_key: node.concept_stable_key,
      priority_score: priority,
      reason,
      recommended_format: format,
      recommended_action: action,
      due_at: node.next_review_at ?? now.toISOString(),
      status: "pending",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  }

  // Sort by priority descending
  items.sort((a, b) => b.priority_score - a.priority_score);

  return items;
}

// ---------- Classify Review Reason ----------

function classifyReviewReason(node: ConceptMemoryNode, now: Date): ReviewReason | null {
  // Fragile concept
  if (node.mastery_status === "fragile" || node.mastery_status === "emerging") {
    return "fragile";
  }

  // Aging concept
  if (node.mastery_status === "aging") {
    return "aging";
  }

  // High confusion
  if (node.confusion_hits >= 3) {
    return "high_confusion";
  }

  // Low calibration (overconfident)
  if (node.calibration_gap_mean > 0.3) {
    return "low_calibration";
  }

  // Recently missed
  if (node.last_incorrect_at) {
    const daysSinceMiss = daysBetween(new Date(node.last_incorrect_at), now);
    if (daysSinceMiss <= 3 && node.mastery_score < 0.7) {
      return "missed_recently";
    }
  }

  // Due for review based on schedule
  if (node.next_review_at && new Date(node.next_review_at) <= now) {
    if (node.mastery_status === "learning") return "fragile";
    if (node.mastery_status === "stable" || node.mastery_status === "strong") return "aging";
  }

  return null;
}

// ---------- Priority Scoring ----------

function computePriorityScore(node: ConceptMemoryNode, reason: ReviewReason, now: Date): number {
  let score = 0;

  // Base priority from reason
  const reasonWeights: Record<ReviewReason, number> = {
    fragile: 80,
    aging: 50,
    high_confusion: 70,
    low_calibration: 60,
    missed_recently: 75,
  };
  score += reasonWeights[reason];

  // Boost for low mastery
  score += (1 - node.mastery_score) * 20;

  // Boost for high confusion
  score += Math.min(node.confusion_hits * 5, 20);

  // Boost for overdue review
  if (node.next_review_at) {
    const overdueDays = daysBetween(new Date(node.next_review_at), now);
    if (new Date(node.next_review_at) <= now) {
      score += Math.min(overdueDays * 3, 15);
    }
  }

  // Reduce priority for recently seen concepts
  if (node.last_seen_at) {
    const daysSinceLastSeen = daysBetween(new Date(node.last_seen_at), now);
    if (daysSinceLastSeen < 1) score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ---------- Recommend Action ----------

function recommendAction(node: ConceptMemoryNode, reason: ReviewReason): ReviewAction {
  if (reason === "high_confusion") return "contrast_drill";
  if (reason === "fragile" && node.observations_count >= 3) return "retest";
  if (reason === "fragile" && node.observations_count < 3) return "quick_review";
  if (reason === "aging") return "retest";
  if (reason === "low_calibration") return "retest";
  if (reason === "missed_recently" && node.mastery_score < 0.3) return "full_regeneration";
  return "quick_review";
}

// ---------- Recommend Format ----------

function recommendFormat(
  node: ConceptMemoryNode,
  formatEffectiveness: FormatEffectivenessRecord[],
): ReviewFormat {
  // Check if concept has per-concept format efficacy
  if (node.format_efficacy) {
    const best = Object.entries(node.format_efficacy)
      .filter(([, score]) => score !== null)
      .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0];
    if (best && best[1] !== null && best[1] > 0.5) {
      return best[0] as ReviewFormat;
    }
  }

  // Fallback to global format effectiveness
  if (formatEffectiveness.length > 0) {
    const sorted = [...formatEffectiveness]
      .filter((f) => f.avg_composite_score !== null)
      .sort((a, b) => (b.avg_composite_score ?? 0) - (a.avg_composite_score ?? 0));
    if (sorted.length > 0) {
      return sorted[0].format as ReviewFormat;
    }
  }

  return "fiche_dynamique";
}

// ---------- Persistence ----------

export async function persistReviewQueue(
  userId: string,
  items: ReviewQueueItem[],
): Promise<void> {
  // Clear old pending items
  await supabase
    .from("review_queue")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "pending");

  if (items.length === 0) return;

  const rows = items.map((item) => ({
    id: item.id,
    user_id: item.user_id,
    concept_stable_key: item.concept_stable_key,
    priority_score: item.priority_score,
    reason: item.reason,
    recommended_format: item.recommended_format,
    recommended_action: item.recommended_action,
    due_at: item.due_at,
    status: item.status,
  }));

  const { error } = await supabase.from("review_queue").insert(rows);
  if (error) throw new Error(`Review queue persist failed: ${error.message}`);
}

export async function getReviewQueue(userId: string): Promise<ReviewQueueItem[]> {
  const { data, error } = await supabase
    .from("review_queue")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("priority_score", { ascending: false });

  if (error) return [];
  return (data ?? []) as unknown as ReviewQueueItem[];
}

export async function markReviewCompleted(reviewId: string): Promise<void> {
  await supabase
    .from("review_queue")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", reviewId);
}

// ---------- Helpers ----------

function daysBetween(a: Date, b: Date): number {
  return Math.abs((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}
