// ============================================================
// COGNITIO M8 Memory Update — Orchestrate post-test memory updates
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type {
  ConceptMemoryNode,
  ConfusionEdge,
  MemoryEvent,
} from "@/domain/cognitio/longitudinal.types";
import type {
  M8_UpdateMemoryInput,
  M8_UpdateMemoryOutput,
  ConceptTestResult,
} from "@/domain/cognitio/longitudinal.contracts";
import type { ConfusionMapEntry } from "@/domain/cognitio/recall.types";
import { applyTestResultToNode } from "./mastery-engine.service";
import { upsertFormatEffectiveness } from "./format-effectiveness.service";

// ---------- Update Memory After Test ----------

export async function updateMemoryAfterTest(
  input: M8_UpdateMemoryInput,
): Promise<M8_UpdateMemoryOutput> {
  const events: MemoryEvent[] = [];
  const updatedNodes: ConceptMemoryNode[] = [];

  // 1. Update each tested concept
  for (const result of input.concepts_tested) {
    const node = await upsertConceptNode(input.user_id, result, input.format_used);
    updatedNodes.push(node.updatedNode);

    if (node.statusChanged) {
      events.push({
        type: node.updatedNode.mastery_status === "fragile"
          ? "concept_became_fragile"
          : node.updatedNode.mastery_status === "stable" || node.updatedNode.mastery_status === "strong"
            ? "concept_became_stable"
            : node.updatedNode.mastery_status === "aging"
              ? "concept_became_aging"
              : "mastery_status_changed",
        user_id: input.user_id,
        concept_stable_key: result.concept_key,
        old_status: node.previousStatus,
        new_status: node.updatedNode.mastery_status,
        mastery_score: node.updatedNode.mastery_score,
        transformation_id: input.transformation_id,
      });
    }
  }

  // 2. Update confusion edges
  const updatedEdges = await updateConfusionEdges(input.user_id, input.confusion_map);
  if (updatedEdges.length > 0) {
    events.push({
      type: "confusion_edge_incremented",
      user_id: input.user_id,
      transformation_id: input.transformation_id,
    });
  }

  // 3. Update format effectiveness
  let formatRecord = null;
  try {
    formatRecord = await upsertFormatEffectiveness(
      input.user_id,
      input.format_used,
      input.objective,
      null,
      input.raw_score,
      input.raw_score * 100,
      input.calibration_gap,
    );
  } catch {
    // Non-blocking
  }

  events.push({
    type: "memory_updated",
    user_id: input.user_id,
    transformation_id: input.transformation_id,
    format_used: input.format_used,
  });

  return {
    updated_nodes: updatedNodes,
    updated_confusion_edges: updatedEdges,
    updated_format_effectiveness: formatRecord,
    events,
  };
}

// ---------- Local version (no DB) ----------

export function updateMemoryLocally(
  input: M8_UpdateMemoryInput,
  existingNodes: Partial<ConceptMemoryNode>[],
): M8_UpdateMemoryOutput {
  const events: MemoryEvent[] = [];
  const updatedNodes: ConceptMemoryNode[] = [];
  const now = new Date().toISOString();

  for (const result of input.concepts_tested) {
    const existing = existingNodes.find((n) => n.concept_stable_key === result.concept_key) ?? null;
    const update = applyTestResultToNode(existing, result);

    const node: ConceptMemoryNode = {
      id: existing?.id ?? crypto.randomUUID(),
      user_id: input.user_id,
      concept_stable_key: result.concept_key,
      mastery_score: update.score,
      mastery_status: update.status,
      last_seen_at: now,
      last_correct_at: result.is_correct ? now : (existing?.last_correct_at ?? null),
      last_incorrect_at: result.is_correct ? (existing?.last_incorrect_at ?? null) : now,
      next_review_at: update.nextReviewAt,
      observations_count: update.observationsCount,
      correct_count: update.correctCount,
      incorrect_count: update.incorrectCount,
      confidence_mean: update.confidenceMean,
      calibration_gap_mean: update.calibrationGapMean,
      confusion_hits: existing?.confusion_hits ?? 0,
      format_efficacy: existing?.format_efficacy ?? { fiche_dynamique: null, histoire_animee: null, music: null },
      archived: false,
      metadata_json: {},
      updated_at: now,
    };

    updatedNodes.push(node);

    if (update.status !== update.previousStatus) {
      events.push({
        type: "mastery_status_changed",
        user_id: input.user_id,
        concept_stable_key: result.concept_key,
        old_status: update.previousStatus,
        new_status: update.status,
        mastery_score: update.score,
        transformation_id: input.transformation_id,
      });
    }
  }

  events.push({
    type: "memory_updated",
    user_id: input.user_id,
    transformation_id: input.transformation_id,
    format_used: input.format_used,
  });

  return {
    updated_nodes: updatedNodes,
    updated_confusion_edges: [],
    updated_format_effectiveness: null,
    events,
  };
}

// ---------- Concept Node Upsert ----------

async function upsertConceptNode(
  userId: string,
  result: ConceptTestResult,
  formatUsed: string,
): Promise<{ updatedNode: ConceptMemoryNode; previousStatus: string; statusChanged: boolean }> {
  const now = new Date().toISOString();

  // Fetch existing
  const { data: existing } = await supabase
    .from("learner_knowledge_graph")
    .select("*")
    .eq("user_id", userId)
    .eq("concept_stable_key", result.concept_key)
    .maybeSingle();

  const existingNode = existing as unknown as Partial<ConceptMemoryNode> | null;
  const update = applyTestResultToNode(existingNode, result);

  const nodeData = {
    mastery_score: update.score,
    mastery_status: update.status,
    last_seen_at: now,
    last_correct_at: result.is_correct ? now : (existingNode?.last_correct_at ?? null),
    last_incorrect_at: result.is_correct ? (existingNode?.last_incorrect_at ?? null) : now,
    next_review_at: update.nextReviewAt,
    observations_count: update.observationsCount,
    correct_count: update.correctCount,
    incorrect_count: update.incorrectCount,
    confidence_mean: update.confidenceMean,
    calibration_gap_mean: update.calibrationGapMean,
    updated_at: now,
  };

  let savedNode: ConceptMemoryNode;

  if (existing) {
    const { data, error } = await supabase
      .from("learner_knowledge_graph")
      .update(nodeData)
      .eq("id", (existing as Record<string, unknown>).id)
      .select("*")
      .single();
    if (error) throw new Error(`Knowledge graph update failed: ${error.message}`);
    savedNode = data as unknown as ConceptMemoryNode;
  } else {
    const { data, error } = await supabase
      .from("learner_knowledge_graph")
      .insert({
        user_id: userId,
        concept_stable_key: result.concept_key,
        ...nodeData,
      })
      .select("*")
      .single();
    if (error) throw new Error(`Knowledge graph insert failed: ${error.message}`);
    savedNode = data as unknown as ConceptMemoryNode;
  }

  return {
    updatedNode: savedNode,
    previousStatus: update.previousStatus,
    statusChanged: update.status !== update.previousStatus,
  };
}

// ---------- Confusion Edge Updates ----------

async function updateConfusionEdges(
  userId: string,
  confusionMap: ConfusionMapEntry[],
): Promise<ConfusionEdge[]> {
  const updatedEdges: ConfusionEdge[] = [];

  for (const entry of confusionMap) {
    if (entry.confusion_count === 0) continue;

    // Normalize key order for consistent lookups
    const [keyA, keyB] = [entry.concept_a, entry.concept_b].sort();

    const { data: existing } = await supabase
      .from("learner_confusion_edges")
      .select("*")
      .eq("user_id", userId)
      .eq("concept_a_key", keyA)
      .eq("concept_b_key", keyB)
      .maybeSingle();

    const now = new Date().toISOString();

    if (existing) {
      const currentHits = (existing as Record<string, unknown>).hits_count as number;
      const newHits = currentHits + entry.confusion_count;
      const severity = Math.min(1, newHits / 10);

      const { data, error } = await supabase
        .from("learner_confusion_edges")
        .update({
          hits_count: newHits,
          last_hit_at: now,
          severity_score: severity,
          updated_at: now,
        })
        .eq("id", (existing as Record<string, unknown>).id)
        .select("*")
        .single();

      if (!error && data) updatedEdges.push(data as unknown as ConfusionEdge);
    } else {
      const severity = Math.min(1, entry.confusion_count / 10);

      const { data, error } = await supabase
        .from("learner_confusion_edges")
        .insert({
          user_id: userId,
          concept_a_key: keyA,
          concept_b_key: keyB,
          hits_count: entry.confusion_count,
          last_hit_at: now,
          severity_score: severity,
        })
        .select("*")
        .single();

      if (!error && data) updatedEdges.push(data as unknown as ConfusionEdge);
    }
  }

  return updatedEdges;
}
