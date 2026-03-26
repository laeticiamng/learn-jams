// ============================================================
// AI Puzzle Generation Service — Calls the edge function to
// generate high-quality puzzles using AI, with local fallback.
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { NormalizedConcept } from "./conceptNormalizer";
import type { BrickType } from "@/domain/cognitio/types";

export interface AIPuzzleResult {
  prompt: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  brick_type: string;
  puzzle_type: string;
  concept_key: string;
  bloom_level: string;
}

export interface AIPuzzleGenerationResult {
  puzzles: AIPuzzleResult[];
  ai_generated: boolean;
}

/**
 * Generate puzzles using AI via the edge function.
 * Returns empty array on failure (caller should use local fallback).
 */
export async function generateAIPuzzles(
  concepts: NormalizedConcept[],
  roomType: string,
  difficulty: number,
  brickTypes: BrickType[],
  mainTopic: string,
  roomIndex: number,
  totalRooms: number
): Promise<AIPuzzleGenerationResult> {
  try {
    const conceptInputs = concepts.slice(0, 6).map(c => ({
      label: c.normalized_label,
      definition: c.definition,
      compressed_definition: c.compressed_definition,
      criticality: c.criticality,
      category: c.category,
    }));

    const { data, error } = await supabase.functions.invoke("cognitio-generate-puzzles", {
      body: {
        concepts: conceptInputs,
        room_type: roomType,
        difficulty,
        brick_types: brickTypes,
        main_topic: mainTopic,
        room_index: roomIndex,
        total_rooms: totalRooms,
      },
    });

    if (error) {
      console.warn("[AI_PUZZLES] Edge function error, using local fallback:", error.message);
      return { puzzles: [], ai_generated: false };
    }

    if (data?.puzzles?.length > 0) {
      console.log(`[AI_PUZZLES] Generated ${data.puzzles.length} AI puzzles for room ${roomIndex}`);
      return { puzzles: data.puzzles, ai_generated: true };
    }

    console.warn("[AI_PUZZLES] No puzzles returned, using local fallback");
    return { puzzles: [], ai_generated: false };
  } catch (err) {
    console.warn("[AI_PUZZLES] Failed, using local fallback:", err);
    return { puzzles: [], ai_generated: false };
  }
}
