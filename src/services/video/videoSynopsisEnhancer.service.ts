// ============================================================
// Video Synopsis Enhancer — Transform brief into rich synopsis
// ============================================================

import type { EnrichedSynopsis, VideoProjectType } from "@/domain/video/video.types";
import { executeWithFailover } from "@/services/providers/providerRouter";
import { getLLMProvider } from "@/services/providers/providerRegistry";

const ENHANCE_SYSTEM_PROMPT = `You are a video production assistant specializing in educational content.
Given a brief synopsis and project type, produce an enriched synopsis as JSON with:
- logline: one-sentence summary
- synopsis: expanded 2-3 paragraph synopsis
- narrative_structure: story arc description (setup, conflict, resolution)
- characters: array of {name, role, description}
- ambiance: mood and atmosphere description
- visual_tone: visual style guide
- pedagogical_constraints: array of educational requirements (if educational)

Output valid JSON only.`;

export async function enhanceSynopsis(
  synopsis: string,
  projectType: VideoProjectType,
  additionalContext?: string,
): Promise<EnrichedSynopsis> {
  const prompt = [
    `Project type: ${projectType}`,
    `Original synopsis: ${synopsis}`,
    additionalContext ? `Additional context: ${additionalContext}` : "",
  ].filter(Boolean).join("\n\n");

  const { result } = await executeWithFailover("llm", async (providerKey) => {
    const llm = getLLMProvider(providerKey);
    if (!llm) throw new Error(`LLM provider ${providerKey} not found`);
    return llm.generateStructured<EnrichedSynopsis>(prompt, {}, {
      system_prompt: ENHANCE_SYSTEM_PROMPT,
      temperature: 0.7,
    });
  });

  return result;
}

/**
 * Lightweight local enrichment when LLM is unavailable.
 * Parses the synopsis into a basic structure without AI.
 */
export function enhanceSynopsisLocal(synopsis: string, projectType: VideoProjectType): EnrichedSynopsis {
  const sentences = synopsis.split(/[.!?]+/).filter(s => s.trim());
  return {
    logline: sentences[0]?.trim() ?? synopsis.slice(0, 100),
    synopsis,
    narrative_structure: "linear",
    characters: [],
    ambiance: "neutral",
    visual_tone: "clean, modern, educational",
    pedagogical_constraints: projectType === "pedagogical_video"
      ? ["age-appropriate", "curriculum-aligned", "clear narration"]
      : [],
  };
}
