// ============================================================
// COGNITIO Memory Architect Types — M3
// ============================================================

import type { BloomLevel } from "./types";

// ---------- Cognitive Segment (M3 core unit) ----------

/** Dominant cognitive function for a segment */
export type CognitiveFunctionType =
  | "encoding"      // new concept introduction
  | "consolidation" // reinforcement of prior concepts
  | "retrieval"     // active recall testing
  | "discrimination"; // distinguish confusable concepts

/** A segment in the memory architecture plan */
export interface M3_Segment {
  segment_index: number;
  concept_keys: string[];           // new concepts introduced
  new_element_count: number;        // must be <= 5
  reinforcement_keys: string[];     // prior critical concepts reinforced here
  dominant_function: CognitiveFunctionType;
  estimated_duration_sec: number;
  bloom_targets: BloomLevel[];      // target levels for this segment
}

// ---------- Repetition Planning ----------

export type RepetitionMoment = "inline" | "end_of_segment" | "final_test" | "j1" | "j7";

export interface RepetitionPlanItem {
  concept_key: string;
  moments: RepetitionMoment[];
  total_appearances: number;        // must be >= 3 for criticality=1
  is_critical: boolean;
}

// ---------- Mnemonics ----------

export type MnemonicType = "acronym" | "story" | "association" | "rhyme" | "visual";

export interface MnemonicItem {
  concept_keys: string[];
  mnemonic: string;
  type: MnemonicType;
  effectiveness_hint?: string;      // optional pedagogical note
}

// ---------- Visual Anchors ----------

export type VisualAnchorType = "metaphor" | "comparison" | "mnemonic" | "image_desc" | "diagram_desc";

export interface M3_VisualAnchor {
  concept_key: string;
  anchor_type: VisualAnchorType;
  content: string;
  related_concepts?: string[];      // concepts this anchor also connects
}

// ---------- Cognitive Budget ----------

export interface CognitiveBudget {
  total_concepts: number;
  max_per_segment: number;          // always 5
  segment_count: number;
  total_new_introductions: number;
  total_reinforcements: number;
  budget_utilization: number;       // 0-1, how much of the budget is used
}

// ---------- Pedagogical Contract ----------

export interface PedagogicalContract {
  total_concepts: number;
  critical_concepts: number;
  estimated_duration_sec: number;
  segment_count: number;
  cognitive_budget: CognitiveBudget;
  repetition_summary: {
    inline_recall_count: number;
    final_test_questions: number;
    j1_questions: number;
    j7_questions: number;
  };
  guarantees: string[];             // human-readable invariant descriptions
}
