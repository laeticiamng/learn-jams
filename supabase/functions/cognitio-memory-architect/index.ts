// ============================================================
// Edge Function: cognitio-memory-architect (M3)
// Build cognitive segments, repetition plan, mnemonics, visual anchors
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_NEW_ITEMS_PER_SEGMENT = 5;
const MIN_CRITICAL_APPEARANCES = 3;
const MAX_DURATION_BEFORE_SPLIT = 600;
const MAX_CONCEPTS = 30;

// ---------- Types ----------

interface MemoryArchitectRequest {
  course_profile_id: string;
  document_id: string;
  concepts: Concept[];
  confusion_pairs: ConfusionPair[];
  traps: Trap[];
  reasoning_type: string;
  objective: string;
  density: string;
  estimated_complexity: number;
  total_duration_budget_sec?: number;
}

interface Concept {
  stable_key: string;
  label: string;
  definition: string;
  type: string;
  criticality: number;
  criticality_score: number;
  bloom_target: string;
  relations: { target_key: string; relation_type: string }[];
  prerequisites: string[];
  source_confidence: number;
  source_trace: { segment_index: number; excerpt: string }[];
  uncertain: boolean;
}

interface ConfusionPair {
  concept_a_key: string;
  concept_b_key: string;
  distinction_key: string;
  frequency: number;
}

interface Trap {
  concept_key: string;
  trap_type: string;
  description: string;
}

// ---------- Main ----------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const input: MemoryArchitectRequest = await req.json();
    const startTime = Date.now();

    // Auth
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log start
    await logOps(supabase, "memory_architect_started", "info", input.document_id, user.id, {
      concept_count: input.concepts.length,
      reasoning_type: input.reasoning_type,
      objective: input.objective,
    });

    // Build architecture
    const result = buildMemoryArchitecture(input);

    // Persist
    const { error: insertError } = await supabase
      .from("memory_architectures")
      .insert({
        id: result.architecture_id,
        document_id: input.document_id,
        course_profile_id: input.course_profile_id,
        user_id: user.id,
        segments_json: result.segments,
        concept_order_json: result.concept_order,
        repetition_plan_json: result.repetition_plan,
        mnemonics_json: result.mnemonics,
        visual_anchors_json: result.visual_anchors,
        cognitive_budget_json: result.cognitive_budget,
        pedagogical_contract_json: result.pedagogical_contract,
        total_duration_sec: result.total_duration_sec,
        needs_splitting: result.needs_splitting,
        split_modules_json: result.split_modules ?? null,
        reasoning_type: result.reasoning_type,
        objective: result.objective,
      });

    if (insertError) {
      console.error("DB insert error:", insertError);
    }

    const latency = Date.now() - startTime;
    await logOps(supabase, "memory_architect_completed", "info", input.document_id, user.id, {
      architecture_id: result.architecture_id,
      segment_count: result.segments.length,
      total_duration_sec: result.total_duration_sec,
      needs_splitting: result.needs_splitting,
      latency_ms: latency,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Memory architect error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---------- Core Logic ----------

function buildMemoryArchitecture(input: MemoryArchitectRequest) {
  const concepts = input.concepts.slice(0, MAX_CONCEPTS);
  const sorted = [...concepts].sort((a, b) => {
    if (a.criticality !== b.criticality) return a.criticality - b.criticality;
    return b.source_confidence - a.source_confidence;
  });

  const conceptOrder = sorted.map(c => c.stable_key);
  const criticalKeys = new Set(sorted.filter(c => c.criticality === 1).map(c => c.stable_key));
  const confusionPairKeys = input.confusion_pairs.map(p => [p.concept_a_key, p.concept_b_key] as [string, string]);

  // Build segments
  const segments: any[] = [];
  let current: string[] = [];

  for (const c of sorted) {
    if (current.length >= MAX_NEW_ITEMS_PER_SEGMENT) {
      segments.push(makeSegment(segments.length, current, sorted, criticalKeys, confusionPairKeys));
      current = [];
    }
    current.push(c.stable_key);
  }
  if (current.length > 0) {
    segments.push(makeSegment(segments.length, current, sorted, criticalKeys, confusionPairKeys));
  }

  // Add reinforcement
  for (let i = 1; i < segments.length; i++) {
    const segKeys = new Set(segments[i].concept_keys);
    const reinforcements: string[] = [];
    for (const key of criticalKeys) {
      if (!segKeys.has(key) && reinforcements.length < 2) {
        reinforcements.push(key);
      }
    }
    segments[i].reinforcement_keys = reinforcements;
  }

  // Repetition plan
  const repetitionPlan = sorted.map(c => {
    const isCritical = c.criticality === 1;
    let appearances = segments.filter(s =>
      s.concept_keys.includes(c.stable_key) || s.reinforcement_keys.includes(c.stable_key)
    ).length;

    const moments = ["inline"];
    if (isCritical) {
      moments.push("end_of_segment", "final_test", "j1", "j7");
      appearances = Math.max(appearances, MIN_CRITICAL_APPEARANCES);
    } else if (c.criticality === 2) {
      moments.push("final_test", "j1");
      appearances = Math.max(appearances, 2);
    } else {
      moments.push("final_test");
    }

    return {
      concept_key: c.stable_key,
      moments,
      total_appearances: appearances,
      is_critical: isCritical,
    };
  });

  // Mnemonics
  const mnemonics: any[] = [];
  const critical = sorted.filter(c => c.criticality === 1);
  if (critical.length >= 3) {
    mnemonics.push({
      concept_keys: critical.slice(0, 6).map(c => c.stable_key),
      mnemonic: critical.slice(0, 6).map(c => c.label.charAt(0).toUpperCase()).join(""),
      type: "acronym",
      effectiveness_hint: "Acronyme des concepts critiques",
    });
  }

  // Visual anchors
  const visualAnchors = sorted
    .filter(c => c.criticality <= 2)
    .slice(0, 6)
    .map(c => ({
      concept_key: c.stable_key,
      anchor_type: "metaphor",
      content: `Visualisez "${c.label}" — ${c.definition.slice(0, 80)}`,
      related_concepts: c.relations.map(r => r.target_key).slice(0, 3),
    }));

  const totalDuration = segments.reduce((s: number, seg: any) => s + seg.estimated_duration_sec, 0);
  const needsSplitting = totalDuration > MAX_DURATION_BEFORE_SPLIT;

  // Split modules
  let splitModules;
  if (needsSplitting) {
    splitModules = [];
    let curIndices: number[] = [];
    let curDur = 0;
    for (const seg of segments) {
      if (curDur + seg.estimated_duration_sec > MAX_DURATION_BEFORE_SPLIT && curIndices.length > 0) {
        splitModules.push({
          module_index: splitModules.length,
          segment_indices: [...curIndices],
          concept_keys: curIndices.flatMap(i => segments[i].concept_keys),
          estimated_duration_sec: curDur,
          title_suggestion: `Module ${splitModules.length + 1}`,
        });
        curIndices = [];
        curDur = 0;
      }
      curIndices.push(seg.segment_index);
      curDur += seg.estimated_duration_sec;
    }
    if (curIndices.length > 0) {
      splitModules.push({
        module_index: splitModules.length,
        segment_indices: [...curIndices],
        concept_keys: curIndices.flatMap(i => segments[i].concept_keys),
        estimated_duration_sec: curDur,
        title_suggestion: `Module ${splitModules.length + 1}`,
      });
    }
  }

  // Cognitive budget
  const totalNew = segments.reduce((s: number, seg: any) => s + seg.new_element_count, 0);
  const totalReinf = segments.reduce((s: number, seg: any) => s + seg.reinforcement_keys.length, 0);
  const maxCap = segments.length * MAX_NEW_ITEMS_PER_SEGMENT;

  const cognitiveBudget = {
    total_concepts: sorted.length,
    max_per_segment: MAX_NEW_ITEMS_PER_SEGMENT,
    segment_count: segments.length,
    total_new_introductions: totalNew,
    total_reinforcements: totalReinf,
    budget_utilization: maxCap > 0 ? totalNew / maxCap : 0,
  };

  const criticalCount = critical.length;
  const contract = {
    total_concepts: sorted.length,
    critical_concepts: criticalCount,
    estimated_duration_sec: totalDuration,
    segment_count: segments.length,
    cognitive_budget: cognitiveBudget,
    repetition_summary: {
      inline_recall_count: repetitionPlan.filter(r => r.moments.includes("inline")).length,
      final_test_questions: Math.min(10, Math.max(5, sorted.length)),
      j1_questions: Math.min(7, Math.max(3, Math.ceil(sorted.length * 0.6))),
      j7_questions: Math.min(10, Math.max(5, sorted.length)),
    },
    guarantees: [
      `Max ${MAX_NEW_ITEMS_PER_SEGMENT} nouveaux éléments/segment`,
      `${criticalCount} concept(s) critique(s) avec ≥${MIN_CRITICAL_APPEARANCES} apparitions`,
      "Plan de rappel : J+1, J+7",
    ],
  };

  return {
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
    reasoning_type: input.reasoning_type,
    objective: input.objective,
  };
}

function makeSegment(
  index: number,
  keys: string[],
  sorted: Concept[],
  criticalKeys: Set<string>,
  confusionPairs: [string, string][]
) {
  const keysSet = new Set(keys);
  let fn = "encoding";
  if (index > 0) {
    const hasDisc = confusionPairs.some(([a, b]) => keysSet.has(a) && keysSet.has(b));
    if (hasDisc) fn = "discrimination";
    else if (keys.some(k => criticalKeys.has(k)) && index > 1) fn = "consolidation";
  }

  const bloomTargets = [...new Set(
    keys.map(k => sorted.find(c => c.stable_key === k)?.bloom_target ?? "remember")
  )];

  return {
    segment_index: index,
    concept_keys: keys,
    new_element_count: keys.length,
    reinforcement_keys: [] as string[],
    dominant_function: fn,
    estimated_duration_sec: keys.length * 30,
    bloom_targets: bloomTargets,
  };
}

// ---------- Ops Logging ----------

async function logOps(supabase: any, eventType: string, severity: string, documentId: string, userId: string, payload: any) {
  try {
    await supabase.from("ops_events").insert({
      event_type: eventType,
      severity,
      document_id: documentId,
      user_id: userId,
      payload_json: payload,
    });
  } catch (e) {
    console.error("Ops log failed:", e);
  }
}
