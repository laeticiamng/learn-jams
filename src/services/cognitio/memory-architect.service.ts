// ============================================================
// COGNITIO Memory Architect Service
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { MemoryArchitectInput, MemoryArchitectOutput } from "@/domain/cognitio/contracts";
import { MAX_NEW_ITEMS_PER_SEGMENT, MIN_CRITICAL_APPEARANCES } from "@/domain/cognitio/validators";

export async function runMemoryArchitect(
  input: MemoryArchitectInput
): Promise<MemoryArchitectOutput> {
  const { data, error } = await supabase.functions.invoke("cognitio-memory-architect", {
    body: input,
  });

  if (error) throw new Error(`Memory architect failed: ${error.message}`);
  return data as MemoryArchitectOutput;
}

// Client-side fallback memory architect for simple cases
export function buildLocalMemoryArchitect(
  input: MemoryArchitectInput
): MemoryArchitectOutput {
  const { concepts, confusion_pairs } = input;

  // Sort concepts by criticality
  const sorted = [...concepts].sort((a, b) => a.criticality - b.criticality);

  // Build cognitive segments (max 5 new items each)
  const segments = [];
  let current: string[] = [];
  for (const concept of sorted) {
    if (current.length >= MAX_NEW_ITEMS_PER_SEGMENT) {
      segments.push({
        segment_index: segments.length,
        concept_keys: [...current],
        max_new_items: current.length,
        reinforcement_items: [],
      });
      current = [];
    }
    current.push(concept.stable_key);
  }
  if (current.length > 0) {
    segments.push({
      segment_index: segments.length,
      concept_keys: [...current],
      max_new_items: current.length,
      reinforcement_items: [],
    });
  }

  // Add reinforcement: critical concepts appear in later segments
  const criticalKeys = sorted
    .filter((c) => c.criticality === 1)
    .map((c) => c.stable_key);

  for (let i = 1; i < segments.length; i++) {
    const reinforceCount = Math.min(
      2,
      criticalKeys.filter((k) => !segments[i].concept_keys.includes(k)).length
    );
    segments[i].reinforcement_items = criticalKeys
      .filter((k) => !segments[i].concept_keys.includes(k))
      .slice(0, reinforceCount);
  }

  // Build repetition plan
  const wordEstimate = concepts.reduce((s, c) => s + c.definition.split(/\s+/).length, 0);
  const inlineRecallCount = Math.max(1, Math.floor(wordEstimate / 500));

  const repetition_plan = {
    inline_recall_count: inlineRecallCount,
    final_test_questions: Math.min(10, Math.max(5, concepts.length)),
    j1_questions: Math.min(7, Math.max(3, Math.ceil(concepts.length * 0.6))),
    j7_questions: Math.min(10, Math.max(5, concepts.length)),
  };

  // Build mnemonics for critical groups
  const mnemonics = [];
  if (criticalKeys.length >= 3) {
    const labels = sorted
      .filter((c) => c.criticality === 1)
      .map((c) => c.label);
    mnemonics.push({
      concept_keys: criticalKeys.slice(0, 5),
      mnemonic: labels.map((l) => l.charAt(0).toUpperCase()).join(""),
      type: "acronym" as const,
    });
  }

  // Visual anchors
  const visual_anchors = sorted
    .filter((c) => c.criticality <= 2)
    .slice(0, 5)
    .map((c) => ({
      concept_key: c.stable_key,
      anchor_type: "metaphor" as const,
      content: `Imagine ${c.label} comme un élément clé dans la salle d'urgence`,
    }));

  return {
    learning_contract: {
      total_concepts: concepts.length,
      critical_concepts: criticalKeys.length,
      estimated_duration_sec: Math.max(180, concepts.length * 30),
      cognitive_budget: segments.length * MAX_NEW_ITEMS_PER_SEGMENT,
      segments,
      repetition_plan,
    },
    segments,
    repetition_plan,
    mnemonics,
    visual_anchors,
    cognitive_budget: segments.length * MAX_NEW_ITEMS_PER_SEGMENT,
  };
}
