// ============================================================
// COGNITIO Longitudinal Trace Service — Learner memory & knowledge graph
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { UpdateMemoryInput, UpdateMemoryOutput } from "@/domain/cognitio/contracts";
import type { LearnerProfile, LearnerKnowledgeNode, MasteryStatus } from "@/domain/cognitio/types";

export async function getOrCreateLearnerProfile(userId: string): Promise<LearnerProfile> {
  const { data: existing } = await (supabase as any)
    .from("learner_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing) return existing as unknown as LearnerProfile;

  const { data: created, error } = await (supabase as any)
    .from("learner_profiles")
    .insert({
      user_id: userId,
      profile_status: "estimated",
      cognitive_profile_json: {
        preferred_format: null,
        avg_confidence_calibration: 0,
        strength_areas: [],
        weakness_areas: [],
        avg_session_duration_sec: 0,
      },
    })
    .select("*")
    .single();

  if (error) throw new Error(`Profile creation failed: ${error.message}`);
  return created as unknown as LearnerProfile;
}

export async function updateLearnerProfile(
  userId: string,
  updates: Partial<Pick<LearnerProfile, "profile_status" | "level_declared" | "session_count" | "calibration_sessions_count">>
) {
  const { error } = await (supabase as any)
    .from("learner_profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) throw new Error(`Profile update failed: ${error.message}`);
}

export async function updateKnowledgeGraph(
  input: UpdateMemoryInput
): Promise<UpdateMemoryOutput> {
  const { user_id, results, test_type } = input;
  const updatedConcepts: UpdateMemoryOutput["updated_concepts"] = [];

  for (const result of results) {
    // Upsert knowledge node
    const { data: existing } = await (supabase as any)
      .from("learner_knowledge_graph")
      .select("*")
      .eq("user_id", user_id)
      .eq("concept_stable_key", result.concept_key)
      .single();

    const currentScore = (existing as Record<string, unknown>)?.mastery_score as number ?? 0;
    const currentObs = (existing as Record<string, unknown>)?.observations_count as number ?? 0;
    const currentConfusion = (existing as Record<string, unknown>)?.confusion_hits as number ?? 0;

    // Update mastery score based on result
    const delta = result.is_correct ? 0.15 : -0.1;
    const newScore = Math.max(0, Math.min(1, currentScore + delta));
    const newStatus = computeMasteryStatus(newScore, currentObs + 1);

    // Detect illusion of mastery
    const illusion = result.confidence > 0.7 && !result.is_correct;

    // Compute next review date
    const nextReview = computeNextReview(newScore, test_type);

    if (existing) {
      await (supabase as any)
        .from("learner_knowledge_graph")
        .update({
          mastery_score: newScore,
          mastery_status: newStatus,
          last_seen_at: new Date().toISOString(),
          next_review_at: nextReview,
          observations_count: currentObs + 1,
          confusion_hits: illusion ? currentConfusion + 1 : currentConfusion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", (existing as Record<string, unknown>).id);
    } else {
      await supabase
        .from("learner_knowledge_graph")
        .insert({
          user_id,
          concept_stable_key: result.concept_key,
          mastery_score: newScore,
          mastery_status: newStatus,
          last_seen_at: new Date().toISOString(),
          next_review_at: nextReview,
          observations_count: 1,
          confusion_hits: illusion ? 1 : 0,
        });
    }

    updatedConcepts.push({
      concept_key: result.concept_key,
      new_mastery_score: newScore,
      new_mastery_status: newStatus,
      next_review_at: nextReview,
      illusion_detected: illusion,
    });
  }

  // Update session count
  await supabase
    .from("learner_profiles")
    .update({
      session_count: supabase.rpc ? undefined : undefined, // Will use raw increment
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user_id);

  const accuracy = results.filter(r => r.is_correct).length / results.length;

  return {
    updated_concepts: updatedConcepts,
    retention_snapshot: {
      j0: accuracy,
    },
    format_efficacy: null,
  };
}

function computeMasteryStatus(score: number, observations: number): MasteryStatus {
  if (observations === 0) return "unknown";
  if (score >= 0.85) return "mastered";
  if (score >= 0.6) return "learning";
  if (score >= 0.3) return "fragile";
  return "unknown";
}

function computeNextReview(score: number, testType: string): string | null {
  const now = new Date();
  let daysUntilReview: number;

  if (score >= 0.85) {
    daysUntilReview = testType === "j7" ? 30 : 7;
  } else if (score >= 0.6) {
    daysUntilReview = testType === "j7" ? 7 : 3;
  } else {
    daysUntilReview = 1;
  }

  return new Date(now.getTime() + daysUntilReview * 24 * 60 * 60 * 1000).toISOString();
}

export async function getKnowledgeGraph(userId: string) {
  const { data, error } = await supabase
    .from("learner_knowledge_graph")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("mastery_score", { ascending: true });

  if (error) throw new Error(`Knowledge graph fetch failed: ${error.message}`);
  return data ?? [];
}

export async function getFragileConcepts(userId: string) {
  const { data, error } = await supabase
    .from("learner_knowledge_graph")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .in("mastery_status", ["fragile", "unknown"])
    .order("mastery_score", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function getDueReviews(userId: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("learner_knowledge_graph")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .lte("next_review_at", now)
    .order("next_review_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}
