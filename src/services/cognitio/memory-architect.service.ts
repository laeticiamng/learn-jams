// ============================================================
// COGNITIO Memory Architect Service — M3
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { M3_Input, M3_Output, SplitModule } from "@/domain/cognitio/memory.contracts";
import type {
  M3_Segment,
  RepetitionPlanItem,
  MnemonicItem,
  M3_VisualAnchor,
  CognitiveBudget,
  PedagogicalContract,
  CognitiveFunctionType,
} from "@/domain/cognitio/memory.types";
import type { AnalyzedConcept } from "@/domain/cognitio/contracts";
import { MAX_NEW_ITEMS_PER_SEGMENT, MIN_CRITICAL_APPEARANCES, MAX_CONCEPTS_STANDARD } from "@/domain/cognitio/validators";
import { MAX_DURATION_BEFORE_SPLIT, validateM3Output } from "@/domain/cognitio/memory.validators";
import { computeAdaptation, DEFAULT_LEARNER_PROFILE } from "@/domain/cognitio/learner-profile.types";
import type { AudienceAdaptation } from "@/domain/cognitio/learner-profile.types";

// ---------- Edge Function Call ----------

export async function runMemoryArchitect(input: M3_Input): Promise<M3_Output> {
  try {
    const { data, error } = await supabase.functions.invoke("cognitio-memory-architect", {
      body: input,
    });
    if (error) throw error;
    return data as M3_Output;
  } catch {
    // Fallback to local
    return buildLocalMemoryArchitect(input);
  }
}

// ---------- Local Memory Architect ----------

export function buildLocalMemoryArchitect(input: M3_Input): M3_Output {
  const { concepts, confusion_pairs, traps, reasoning_type, objective, density, estimated_complexity } = input;

  // Compute audience adaptation
  const profile = input.learner_profile ?? DEFAULT_LEARNER_PROFILE;
  const adaptation = computeAdaptation(profile);

  // Cap concepts at MAX_CONCEPTS_STANDARD
  const capped = concepts.slice(0, MAX_CONCEPTS_STANDARD);

  // Sort: criticality ASC (critical first), then by source_confidence DESC
  const sorted = [...capped].sort((a, b) => {
    if (a.criticality !== b.criticality) return a.criticality - b.criticality;
    return b.source_confidence - a.source_confidence;
  });

  // Build concept order
  const conceptOrder = sorted.map(c => c.stable_key);

  // Build cognitive segments (use profile-adapted max elements per block)
  const maxPerSegment = Math.min(MAX_NEW_ITEMS_PER_SEGMENT, adaptation.max_new_elements_per_block);
  const segments = buildSegments(sorted, confusion_pairs.map(p => [p.concept_a_key, p.concept_b_key]), maxPerSegment);

  // Build repetition plan
  const repetitionPlan = buildRepetitionPlan(sorted, segments);

  // Build mnemonics
  const mnemonics = buildMnemonics(sorted);

  // Build visual anchors
  const visualAnchors = buildVisualAnchors(sorted);

  // Compute duration
  const durationPerConcept = getDurationPerConcept(density, estimated_complexity);
  const totalDuration = segments.reduce((sum, s) => sum + s.estimated_duration_sec, 0);

  // Check if splitting is needed
  const needsSplitting = totalDuration > MAX_DURATION_BEFORE_SPLIT;
  const splitModules = needsSplitting ? buildSplitModules(segments, sorted) : undefined;

  // Build cognitive budget
  const cognitiveBudget = buildCognitiveBudget(sorted, segments, maxPerSegment);

  // Build pedagogical contract
  const contract = buildPedagogicalContract(sorted, segments, repetitionPlan, cognitiveBudget, totalDuration);

  const output: M3_Output = {
    architecture_id: crypto.randomUUID(),
    document_id: input.document_id,
    course_profile_id: input.course_profile_id,
    segments,
    concept_order: conceptOrder,
    repetition_plan: repetitionPlan,
    mnemonics,
    visual_anchors: visualAnchors,
    cognitive_budget: cognitiveBudget,
    pedagogical_contract: contract,
    total_duration_sec: totalDuration,
    needs_splitting: needsSplitting,
    split_modules: splitModules,
    reasoning_type,
    objective,
  };

  return output;
}

// ---------- Segment Builder ----------

function buildSegments(
  sorted: AnalyzedConcept[],
  confusionPairs: [string, string][],
  maxPerSegment: number = MAX_NEW_ITEMS_PER_SEGMENT
): M3_Segment[] {
  const segments: M3_Segment[] = [];
  let currentKeys: string[] = [];
  const criticalKeys = new Set(sorted.filter(c => c.criticality === 1).map(c => c.stable_key));

  for (const concept of sorted) {
    if (currentKeys.length >= maxPerSegment) {
      segments.push(createSegment(segments.length, currentKeys, criticalKeys, sorted, confusionPairs));
      currentKeys = [];
    }
    currentKeys.push(concept.stable_key);
  }

  if (currentKeys.length > 0) {
    segments.push(createSegment(segments.length, currentKeys, criticalKeys, sorted, confusionPairs));
  }

  // Add reinforcement of critical concepts to later segments
  for (let i = 1; i < segments.length; i++) {
    const segKeys = new Set(segments[i].concept_keys);
    const reinforcements: string[] = [];

    for (const key of criticalKeys) {
      if (!segKeys.has(key) && reinforcements.length < 2) {
        reinforcements.push(key);
      }
    }

    segments[i].reinforcement_keys = reinforcements;

    // If segment has discrimination pairs, mark it
    const segAllKeys = new Set([...segments[i].concept_keys, ...reinforcements]);
    const hasDiscrimination = confusionPairs.some(
      ([a, b]) => segAllKeys.has(a) && segAllKeys.has(b)
    );
    if (hasDiscrimination) {
      segments[i].dominant_function = "discrimination";
    }
  }

  return segments;
}

function createSegment(
  index: number,
  keys: string[],
  criticalKeys: Set<string>,
  sorted: AnalyzedConcept[],
  confusionPairs: [string, string][]
): M3_Segment {
  const keysSet = new Set(keys);

  // Determine dominant function
  let dominantFunction: CognitiveFunctionType = "encoding";
  if (index > 0) {
    const hasCriticalReinforcement = keys.some(k => criticalKeys.has(k));
    const hasDiscrimination = confusionPairs.some(
      ([a, b]) => keysSet.has(a) && keysSet.has(b)
    );
    if (hasDiscrimination) dominantFunction = "discrimination";
    else if (hasCriticalReinforcement && index > 1) dominantFunction = "consolidation";
  }

  // Gather bloom targets
  const bloomTargets = [...new Set(
    keys.map(k => sorted.find(c => c.stable_key === k)?.bloom_target ?? "remember")
  )];

  // Estimate duration: ~30s per new concept + 15s per reinforcement
  const estimatedDuration = keys.length * 30;

  return {
    segment_index: index,
    concept_keys: keys,
    new_element_count: keys.length,
    reinforcement_keys: [],
    dominant_function: dominantFunction,
    estimated_duration_sec: estimatedDuration,
    bloom_targets: bloomTargets,
  };
}

// ---------- Repetition Plan Builder ----------

function buildRepetitionPlan(
  sorted: AnalyzedConcept[],
  segments: M3_Segment[]
): RepetitionPlanItem[] {
  return sorted.map(concept => {
    const isCritical = concept.criticality === 1;

    // Count appearances across segments (as new + reinforcement)
    let appearances = 0;
    for (const seg of segments) {
      if (seg.concept_keys.includes(concept.stable_key)) appearances++;
      if (seg.reinforcement_keys.includes(concept.stable_key)) appearances++;
    }

    // Determine repetition moments
    const moments: RepetitionPlanItem["moments"] = ["inline"];

    if (isCritical) {
      moments.push("end_of_segment", "final_test", "j1", "j7");
      // Ensure minimum appearances
      appearances = Math.max(appearances, MIN_CRITICAL_APPEARANCES);
    } else if (concept.criticality === 2) {
      moments.push("final_test", "j1");
      appearances = Math.max(appearances, 2);
    } else {
      moments.push("final_test");
      appearances = Math.max(appearances, 1);
    }

    return {
      concept_key: concept.stable_key,
      moments,
      total_appearances: appearances,
      is_critical: isCritical,
    };
  });
}

// ---------- Mnemonics Builder ----------

function buildMnemonics(sorted: AnalyzedConcept[]): MnemonicItem[] {
  const mnemonics: MnemonicItem[] = [];

  // Acronym from critical concepts
  const critical = sorted.filter(c => c.criticality === 1);
  if (critical.length >= 3) {
    const labels = critical.slice(0, 6).map(c => c.label);
    mnemonics.push({
      concept_keys: critical.slice(0, 6).map(c => c.stable_key),
      mnemonic: labels.map(l => l.charAt(0).toUpperCase()).join(""),
      type: "acronym",
      effectiveness_hint: "Acronyme formé par les initiales des concepts critiques",
    });
  }

  // Association mnemonics for related concept pairs
  const relatedPairs = sorted
    .flatMap(c => c.relations
      .filter(r => r.relation_type === "related")
      .map(r => ({ a: c.stable_key, b: r.target_key, labelA: c.label }))
    )
    .slice(0, 3);

  for (const pair of relatedPairs) {
    const conceptB = sorted.find(c => c.stable_key === pair.b);
    if (conceptB) {
      mnemonics.push({
        concept_keys: [pair.a, pair.b],
        mnemonic: `${pair.labelA} ↔ ${conceptB.label}`,
        type: "association",
      });
    }
  }

  return mnemonics;
}

// ---------- Visual Anchors Builder ----------

function buildVisualAnchors(sorted: AnalyzedConcept[]): M3_VisualAnchor[] {
  return sorted
    .filter(c => c.criticality <= 2)
    .slice(0, 6)
    .map(c => ({
      concept_key: c.stable_key,
      anchor_type: "metaphor" as const,
      content: `Visualisez "${c.label}" comme un élément fondamental — ${c.definition.slice(0, 80)}`,
      related_concepts: c.relations.map(r => r.target_key).slice(0, 3),
    }));
}

// ---------- Split Modules Builder ----------

function buildSplitModules(segments: M3_Segment[], sorted: AnalyzedConcept[]): SplitModule[] {
  const modules: SplitModule[] = [];
  const maxPerModule = Math.ceil(MAX_DURATION_BEFORE_SPLIT / 30); // ~20 concepts per module

  let currentIndices: number[] = [];
  let currentDuration = 0;

  for (const seg of segments) {
    if (currentDuration + seg.estimated_duration_sec > MAX_DURATION_BEFORE_SPLIT && currentIndices.length > 0) {
      const moduleKeys = currentIndices.flatMap(i => segments[i].concept_keys);
      modules.push({
        module_index: modules.length,
        segment_indices: [...currentIndices],
        concept_keys: moduleKeys,
        estimated_duration_sec: currentDuration,
        title_suggestion: `Module ${modules.length + 1}`,
      });
      currentIndices = [];
      currentDuration = 0;
    }
    currentIndices.push(seg.segment_index);
    currentDuration += seg.estimated_duration_sec;
  }

  if (currentIndices.length > 0) {
    const moduleKeys = currentIndices.flatMap(i => segments[i].concept_keys);
    modules.push({
      module_index: modules.length,
      segment_indices: [...currentIndices],
      concept_keys: moduleKeys,
      estimated_duration_sec: currentDuration,
      title_suggestion: `Module ${modules.length + 1}`,
    });
  }

  return modules;
}

// ---------- Cognitive Budget Builder ----------

function buildCognitiveBudget(sorted: AnalyzedConcept[], segments: M3_Segment[], maxPerSegment: number = MAX_NEW_ITEMS_PER_SEGMENT): CognitiveBudget {
  const totalNew = segments.reduce((sum, s) => sum + s.new_element_count, 0);
  const totalReinforcements = segments.reduce((sum, s) => sum + s.reinforcement_keys.length, 0);
  const maxCapacity = segments.length * maxPerSegment;

  return {
    total_concepts: sorted.length,
    max_per_segment: maxPerSegment,
    segment_count: segments.length,
    total_new_introductions: totalNew,
    total_reinforcements: totalReinforcements,
    budget_utilization: maxCapacity > 0 ? totalNew / maxCapacity : 0,
  };
}

// ---------- Pedagogical Contract Builder ----------

function buildPedagogicalContract(
  sorted: AnalyzedConcept[],
  segments: M3_Segment[],
  repetitionPlan: RepetitionPlanItem[],
  cognitiveBudget: CognitiveBudget,
  totalDuration: number
): PedagogicalContract {
  const criticalCount = sorted.filter(c => c.criticality === 1).length;

  const inlineCount = repetitionPlan.filter(r => r.moments.includes("inline")).length;
  const finalCount = repetitionPlan.filter(r => r.moments.includes("final_test")).length;
  const j1Count = repetitionPlan.filter(r => r.moments.includes("j1")).length;
  const j7Count = repetitionPlan.filter(r => r.moments.includes("j7")).length;

  const guarantees: string[] = [
    `Maximum ${MAX_NEW_ITEMS_PER_SEGMENT} nouveaux éléments par segment`,
    `${criticalCount} concept(s) critique(s) avec ≥${MIN_CRITICAL_APPEARANCES} apparitions`,
    `Plan de rappel : J+1, J+7`,
  ];

  if (totalDuration <= MAX_DURATION_BEFORE_SPLIT) {
    guarantees.push(`Durée totale ≤ ${MAX_DURATION_BEFORE_SPLIT / 60} min`);
  }

  return {
    total_concepts: sorted.length,
    critical_concepts: criticalCount,
    estimated_duration_sec: totalDuration,
    segment_count: segments.length,
    cognitive_budget: cognitiveBudget,
    repetition_summary: {
      inline_recall_count: inlineCount,
      final_test_questions: Math.min(10, Math.max(5, finalCount)),
      j1_questions: Math.min(7, Math.max(3, j1Count)),
      j7_questions: Math.min(10, Math.max(5, j7Count)),
    },
    guarantees,
  };
}

// ---------- Helpers ----------

function getDurationPerConcept(density: "low" | "medium" | "high", complexity: number): number {
  const base = density === "high" ? 40 : density === "medium" ? 30 : 20;
  return base + Math.floor(complexity / 3) * 5;
}

// ---------- Persistence ----------

export async function persistMemoryArchitecture(
  output: M3_Output,
  userId: string
): Promise<string> {
  const { data, error } = await (supabase as any)
    .from("memory_architectures")
    .insert({
      id: output.architecture_id,
      document_id: output.document_id,
      course_profile_id: output.course_profile_id,
      user_id: userId,
      segments_json: output.segments,
      concept_order_json: output.concept_order,
      repetition_plan_json: output.repetition_plan,
      mnemonics_json: output.mnemonics,
      visual_anchors_json: output.visual_anchors,
      cognitive_budget_json: output.cognitive_budget,
      pedagogical_contract_json: output.pedagogical_contract,
      total_duration_sec: output.total_duration_sec,
      needs_splitting: output.needs_splitting,
      split_modules_json: output.split_modules ?? null,
      reasoning_type: output.reasoning_type,
      objective: output.objective,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to persist memory architecture: ${error.message}`);
  return data.id;
}

export async function getMemoryArchitecture(documentId: string): Promise<M3_Output | null> {
  const { data, error } = await supabase
    .from("memory_architectures")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    architecture_id: data.id,
    document_id: data.document_id,
    course_profile_id: data.course_profile_id,
    segments: data.segments_json as M3_Output["segments"],
    concept_order: data.concept_order_json as string[],
    repetition_plan: data.repetition_plan_json as M3_Output["repetition_plan"],
    mnemonics: data.mnemonics_json as M3_Output["mnemonics"],
    visual_anchors: data.visual_anchors_json as M3_Output["visual_anchors"],
    cognitive_budget: data.cognitive_budget_json as M3_Output["cognitive_budget"],
    pedagogical_contract: data.pedagogical_contract_json as M3_Output["pedagogical_contract"],
    total_duration_sec: data.total_duration_sec,
    needs_splitting: data.needs_splitting,
    split_modules: data.split_modules_json as M3_Output["split_modules"],
    reasoning_type: data.reasoning_type as M3_Output["reasoning_type"],
    objective: data.objective as M3_Output["objective"],
  };
}
