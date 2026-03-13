// ============================================================
// COGNITIO Format Selector Service
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { FormatSelectorInput, FormatSelectorOutput } from "@/domain/cognitio/contracts";
import type { ChosenFormat } from "@/domain/cognitio/types";

export async function runFormatSelector(
  input: FormatSelectorInput
): Promise<FormatSelectorOutput> {
  const { data, error } = await supabase.functions.invoke("cognitio-format-selector", {
    body: input,
  });

  if (error) throw new Error(`Format selector failed: ${error.message}`);
  return data as FormatSelectorOutput;
}

// Client-side format selector
export function selectFormatLocally(
  input: FormatSelectorInput
): FormatSelectorOutput {
  const {
    total_concepts,
    critical_count,
    knowledge_type,
    estimated_complexity,
    quality_score,
    objective,
  } = input;

  let chosen_format: ChosenFormat = "fiche_dynamique";
  let justification = "";

  // Decision logic: use the simplest format that achieves the objective
  const needsNarrative =
    total_concepts >= 10 ||
    estimated_complexity >= 6 ||
    knowledge_type === "procedural" ||
    objective === "exam";

  if (needsNarrative && quality_score >= 0.55) {
    chosen_format = "histoire_animee";
    justification =
      "Le contenu est suffisamment dense et structuré pour bénéficier d'une mission narrative immersive.";
  } else {
    chosen_format = "fiche_dynamique";
    justification =
      quality_score < 0.55
        ? "La qualité du contenu source ne permet pas une mission narrative complète. Format fiche retenu."
        : "Le contenu est assez concis pour une fiche dynamique interactive.";
  }

  const estimatedDurationSec = chosen_format === "histoire_animee"
    ? Math.min(600, total_concepts * 40)
    : Math.min(300, total_concepts * 20);

  const needsSplit = estimatedDurationSec > 600;

  return {
    chosen_format,
    justification,
    estimated_duration_sec: estimatedDurationSec,
    cost_level: chosen_format === "histoire_animee" ? "medium" : "low",
    needs_split: needsSplit,
    split_count: needsSplit ? Math.ceil(estimatedDurationSec / 600) : undefined,
  };
}
