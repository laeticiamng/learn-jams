// ============================================================
// Edge Function: cognitio-analyze
// Extract concepts, confusion pairs, build course profile
// Uses Claude API for intelligent analysis
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

interface AnalyzeRequest {
  document_id: string;
  segments: { segment_index: number; title: string | null; content: string }[];
  clean_text: string;
  objective: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: AnalyzeRequest = await req.json();
    const { document_id, segments, clean_text, objective } = body;

    if (!ANTHROPIC_API_KEY) {
      // Fallback: return basic analysis without LLM
      return new Response(JSON.stringify(buildFallbackAnalysis(segments, clean_text)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build analysis prompt
    const prompt = buildAnalysisPrompt(clean_text, objective, segments.length);

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error:", response.status);
      return new Response(JSON.stringify(buildFallbackAnalysis(segments, clean_text)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeResponse = await response.json();
    const content = claudeResponse.content?.[0]?.text ?? "";

    // Parse Claude's JSON response
    let analysisResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      analysisResult = null;
    }

    if (!analysisResult) {
      return new Response(JSON.stringify(buildFallbackAnalysis(segments, clean_text)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate and cap concepts at 30
    const concepts = (analysisResult.concepts ?? []).slice(0, 30).map((c: Record<string, unknown>, i: number) => ({
      stable_key: (c.stable_key as string) || `concept_${i}`,
      label: (c.label as string) || `Concept ${i + 1}`,
      definition: (c.definition as string) || "",
      criticality: Math.min(4, Math.max(1, (c.criticality as number) || 3)),
      bloom_target: (c.bloom_target as string) || "remember",
      category: (c.category as string) || "General",
      prerequisites: (c.prerequisites as string[]) || [],
      source_confidence: Math.min(1, Math.max(0, (c.source_confidence as number) || 0.7)),
      source_trace: (c.source_trace as unknown[]) || [],
    }));

    const confusion_pairs = (analysisResult.confusion_pairs ?? []).map((p: Record<string, unknown>) => ({
      concept_a_key: (p.concept_a_key as string) || "",
      concept_b_key: (p.concept_b_key as string) || "",
      distinction_key: (p.distinction_key as string) || "",
      frequency: (p.frequency as number) || 1,
    }));

    const result = {
      course_profile_id: "",
      concepts,
      confusion_pairs,
      knowledge_type: analysisResult.knowledge_type || "factual",
      structure_type: analysisResult.structure_type || "linear",
      source_issues: analysisResult.source_issues || [],
      total_concepts: concepts.length,
      critical_count: concepts.filter((c: { criticality: number }) => c.criticality === 1).length,
      estimated_complexity: Math.min(10, Math.max(1, analysisResult.estimated_complexity || 5)),
      ambiguous_zones: analysisResult.ambiguous_zones || [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function buildAnalysisPrompt(text: string, objective: string, segmentCount: number): string {
  const truncated = text.slice(0, 8000);
  return `Analyze this educational content and extract a structured pedagogical profile.

RULES:
- Never invent concepts not present in the source
- Maximum 30 concepts
- Each concept must have a source_trace linking to the source text
- Flag any ambiguous zones
- Detect confusion pairs (concepts students commonly confuse)

Content (${objective} objective):
---
${truncated}
---

Return ONLY valid JSON with this structure:
{
  "concepts": [
    {
      "stable_key": "string (snake_case unique key)",
      "label": "string",
      "definition": "string",
      "criticality": 1-4,
      "bloom_target": "remember|understand|apply|analyze|evaluate|create",
      "category": "string",
      "prerequisites": ["stable_keys"],
      "source_confidence": 0.0-1.0,
      "source_trace": [{"segment_index": 0, "excerpt": "quote from source"}]
    }
  ],
  "confusion_pairs": [
    {
      "concept_a_key": "string",
      "concept_b_key": "string",
      "distinction_key": "what makes them different",
      "frequency": 1-5
    }
  ],
  "knowledge_type": "factual|conceptual|procedural|metacognitive",
  "structure_type": "linear|hierarchical|network",
  "source_issues": [],
  "estimated_complexity": 1-10,
  "ambiguous_zones": [
    {"zone_label": "string", "reason": "string", "segment_refs": [0], "severity": "low|medium|high"}
  ]
}`;
}

function buildFallbackAnalysis(
  segments: { content: string; segment_index: number }[],
  cleanText: string
) {
  const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const concepts = sentences.slice(0, 15).map((sentence, i) => {
    const words = sentence.trim().split(/\s+/);
    const key = words.slice(0, 3).join("_").toLowerCase().replace(/[^a-z0-9_]/g, "");
    return {
      stable_key: `concept_${key}_${i}`,
      label: words.slice(0, 5).join(" "),
      definition: sentence.trim(),
      criticality: i < 3 ? 1 : i < 7 ? 2 : i < 12 ? 3 : 4,
      bloom_target: i < 5 ? "understand" : "remember",
      category: "General",
      prerequisites: [],
      source_confidence: 0.6,
      source_trace: [{ segment_index: 0, excerpt: sentence.trim().slice(0, 100) }],
    };
  });

  return {
    course_profile_id: "",
    concepts,
    confusion_pairs: [],
    knowledge_type: "factual",
    structure_type: "linear",
    source_issues: [],
    total_concepts: concepts.length,
    critical_count: concepts.filter((c) => c.criticality === 1).length,
    estimated_complexity: Math.min(10, Math.max(1, Math.ceil(concepts.length / 2))),
    ambiguous_zones: [],
  };
}
