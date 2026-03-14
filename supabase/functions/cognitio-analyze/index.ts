// ============================================================
// Edge Function: cognitio-analyze (M2)
// Extract concepts, confusion pairs, build course profile
// Enhanced: detailed reasoning types, traps, confidence axes,
//           strict traceability, ops logging, prompt versioning
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const PROMPT_VERSION = "m2-analyze-v2.0";

// ---------- Types ----------

interface AnalyzeRequest {
  document_id: string;
  clean_text: string;
  segments: { segment_index: number; title: string | null; content: string; hierarchy_level: number; confidence_score: number }[];
  source_type: string;
  confidence_level: number;
  user_objective?: string;
  user_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: AnalyzeRequest = await req.json();
    const { document_id, clean_text, segments, source_type, confidence_level, user_objective, user_id } = body;

    if (!document_id || !clean_text) {
      return errorResponse(400, "document_id and clean_text required");
    }

    // Update document status
    await supabase.from("source_documents").update({ ingestion_status: "analyzing" }).eq("id", document_id);

    // Log ops
    await logOps(supabase, "analyze_started", "info", document_id, user_id, {
      word_count: clean_text.split(/\s+/).length,
      segments_count: segments.length,
      confidence_level,
    });

    let analysisResult: AnalysisResult;

    if (ANTHROPIC_API_KEY) {
      try {
        analysisResult = await analyzeWithClaude(clean_text, segments, user_objective || "discovery", source_type, confidence_level);
      } catch (err) {
        console.error("Claude API error, falling back to local:", err);
        await logOps(supabase, "analyze_llm_fallback", "warning", document_id, user_id, { error: String(err) });
        analysisResult = buildFallbackAnalysis(clean_text, segments, confidence_level);
      }
    } else {
      analysisResult = buildFallbackAnalysis(clean_text, segments, confidence_level);
    }

    // Validate: reject untraceable concepts
    const validatedConcepts = analysisResult.concepts.map((c) => {
      const hasValidTrace = c.source_trace.some(
        (t) => t.excerpt && t.excerpt.length > 10 && clean_text.toLowerCase().includes(t.excerpt.toLowerCase().slice(0, 30))
      );
      return {
        ...c,
        uncertain: !hasValidTrace || c.source_confidence < 0.5,
        source_confidence: hasValidTrace ? c.source_confidence : Math.min(c.source_confidence, 0.4),
      };
    });

    // Filter: do NOT promote untraceable concepts as reliable
    const reliableConcepts = validatedConcepts.filter((c) => !c.uncertain || c.source_trace.length > 0);

    // Persist course_profile
    const { data: profile, error: profileError } = await supabase
      .from("course_profiles")
      .insert({
        document_id,
        main_topic: analysisResult.main_topic,
        learning_objectives_json: analysisResult.learning_objectives,
        reasoning_type: analysisResult.reasoning_type,
        density: analysisResult.density,
        recommended_template: analysisResult.recommended_template,
        concepts_confidence: analysisResult.confidence.concepts,
        logic_confidence: analysisResult.confidence.logic,
        traps_confidence: analysisResult.confidence.traps,
        structure_confidence: analysisResult.confidence.structure,
        ambiguous_zones_json: analysisResult.confidence.ambiguous_zones,
        prerequis_json: analysisResult.prerequis,
        traps_json: analysisResult.traps,
        source_issues_json: analysisResult.source_issues,
        total_concepts: reliableConcepts.length,
        critical_count: reliableConcepts.filter((c) => c.criticality === 1).length,
        estimated_complexity: analysisResult.estimated_complexity,
      })
      .select("id")
      .single();

    if (profileError) throw new Error(`Course profile insert failed: ${profileError.message}`);

    const courseProfileId = profile.id;

    // Persist concepts
    const conceptIdMap: Record<string, string> = {};
    for (const concept of reliableConcepts) {
      const { data: row, error: conceptError } = await supabase
        .from("concepts")
        .insert({
          course_profile_id: courseProfileId,
          stable_key: concept.stable_key,
          label: concept.label,
          definition: concept.definition,
          criticality: concept.criticality,
          criticality_score: concept.criticality_score,
          bloom_target: concept.bloom_target,
          category: concept.type,
          concept_type: concept.type,
          prerequisites_json: concept.prerequisites,
          source_confidence: concept.source_confidence,
          source_trace_json: concept.source_trace,
          relations_json: concept.relations,
          uncertain: concept.uncertain,
        })
        .select("id")
        .single();

      if (!conceptError && row) {
        conceptIdMap[concept.stable_key] = row.id;
      }
    }

    // Persist confusion_pairs
    for (const pair of analysisResult.confusion_pairs) {
      await supabase.from("confusion_pairs").insert({
        course_profile_id: courseProfileId,
        concept_a_id: conceptIdMap[pair.concept_a_key] || null,
        concept_b_id: conceptIdMap[pair.concept_b_key] || null,
        distinction_key: pair.distinction_key,
        frequency: pair.frequency,
      });
    }

    // Update document status
    await supabase.from("source_documents").update({ ingestion_status: "analyzed" }).eq("id", document_id);

    // Log completion
    const latencyMs = Date.now() - startTime;
    const uncertainCount = validatedConcepts.filter((c) => c.uncertain).length;
    await logOps(supabase, "analyze_completed", "info", document_id, user_id, {
      course_profile_id: courseProfileId,
      total_concepts: reliableConcepts.length,
      critical_count: reliableConcepts.filter((c) => c.criticality === 1).length,
      uncertain_count: uncertainCount,
      confusion_pairs: analysisResult.confusion_pairs.length,
      traps: analysisResult.traps.length,
      latency_ms: latencyMs,
    });

    if (uncertainCount > 0) {
      await logOps(supabase, "low_confidence_detected", "warning", document_id, user_id, {
        uncertain_concepts: validatedConcepts.filter((c) => c.uncertain).map((c) => c.stable_key),
      });
    }

    if (analysisResult.confidence.ambiguous_zones.length > 0) {
      await logOps(supabase, "ambiguous_structure_detected", "warning", document_id, user_id, {
        zones: analysisResult.confidence.ambiguous_zones,
      });
    }

    // Build M2 output
    const result = {
      course_profile_id: courseProfileId,
      main_topic: analysisResult.main_topic,
      learning_objectives: analysisResult.learning_objectives,
      key_concepts: reliableConcepts,
      traps: analysisResult.traps,
      confusion_pairs: analysisResult.confusion_pairs,
      reasoning_type: analysisResult.reasoning_type,
      density: analysisResult.density,
      recommended_template: analysisResult.recommended_template,
      confidence: analysisResult.confidence,
      prerequis: analysisResult.prerequis,
      structure_type: analysisResult.structure_type,
      source_issues: analysisResult.source_issues,
      total_concepts: reliableConcepts.length,
      critical_count: reliableConcepts.filter((c) => c.criticality === 1).length,
      estimated_complexity: analysisResult.estimated_complexity,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return errorResponse(500, error.message || "Internal error");
  }
});

// ---------- Types ----------

interface AnalysisResult {
  main_topic: string;
  learning_objectives: string[];
  concepts: ConceptResult[];
  traps: TrapResult[];
  confusion_pairs: { concept_a_key: string; concept_b_key: string; distinction_key: string; frequency: number }[];
  reasoning_type: string;
  density: string;
  recommended_template: string;
  confidence: {
    concepts: number;
    logic: number;
    traps: number;
    structure: number;
    ambiguous_zones: { zone_label: string; reason: string; segment_refs: number[]; severity: string }[];
  };
  prerequis: string[];
  structure_type: string;
  source_issues: { code: string; message: string; severity: string }[];
  estimated_complexity: number;
}

interface ConceptResult {
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
  source_trace: { segment_index: number; excerpt: string; page_ref?: number }[];
  uncertain: boolean;
}

interface TrapResult {
  concept_key: string;
  trap_type: string;
  description: string;
  source_trace?: { segment_index: number; excerpt: string };
}

// ---------- Claude API Analysis ----------

async function analyzeWithClaude(
  text: string,
  segments: AnalyzeRequest["segments"],
  objective: string,
  sourceType: string,
  confidenceLevel: number
): Promise<AnalysisResult> {
  const truncated = text.slice(0, 12000);
  const prompt = buildAnalysisPrompt(truncated, objective, segments.length, sourceType, confidenceLevel);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API returned ${response.status}`);
  }

  const claudeResponse = await response.json();
  const content = claudeResponse.content?.[0]?.text ?? "";

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No valid JSON in Claude response");
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Invalid JSON in Claude response");
  }

  // Validate and normalize
  return normalizeAnalysisResult(parsed, text, segments);
}

function buildAnalysisPrompt(
  text: string,
  objective: string,
  segmentCount: number,
  sourceType: string,
  confidenceLevel: number
): string {
  return `Tu es un analyste pédagogique expert. Analyse ce contenu éducatif et produis un profil pédagogique structuré.

RÈGLES ABSOLUES :
- Ne JAMAIS inventer de concepts absents du texte source
- Chaque concept DOIT avoir au moins un source_trace avec un extrait EXACT du texte
- Si un concept n'est pas clairement traçable, mettre source_confidence < 0.5
- Signaler les zones ambiguës honnêtement
- Maximum 30 concepts
- Attribuer la criticality en fonction de l'importance réelle dans le cours

CONTEXTE :
- Objectif utilisateur : ${objective}
- Type de source : ${sourceType}
- Niveau de confiance initial : ${confidenceLevel}
- Nombre de segments : ${segmentCount}

CONTENU À ANALYSER :
---
${text}
---

Retourne UNIQUEMENT du JSON valide avec cette structure exacte :
{
  "main_topic": "string — sujet principal du document",
  "learning_objectives": ["objectif 1", "objectif 2"],
  "concepts": [
    {
      "stable_key": "snake_case_unique",
      "label": "Nom du concept",
      "definition": "Définition claire",
      "type": "catégorie/domaine",
      "criticality": 1-4,
      "criticality_score": 0.0-1.0,
      "bloom_target": "remember|understand|apply|analyze|evaluate|create",
      "relations": [{"target_key": "autre_concept", "relation_type": "prerequisite|related|part_of|contrasts_with"}],
      "prerequisites": ["stable_keys des prérequis"],
      "source_confidence": 0.0-1.0,
      "source_trace": [{"segment_index": 0, "excerpt": "CITATION EXACTE du texte source"}]
    }
  ],
  "traps": [
    {
      "concept_key": "stable_key concerné",
      "trap_type": "false_friend|common_error|ambiguity|partial_truth",
      "description": "Description du piège"
    }
  ],
  "confusion_pairs": [
    {
      "concept_a_key": "stable_key_a",
      "concept_b_key": "stable_key_b",
      "distinction_key": "ce qui les distingue",
      "frequency": 1-5
    }
  ],
  "reasoning_type": "declaratif|procedural|conditionnel|causal|metacognitif",
  "density": "low|medium|high",
  "structure_type": "prose|bullets|table|mixed|minimal",
  "prerequis": ["prérequis externes au document"],
  "ambiguous_zones": [
    {"zone_label": "string", "reason": "string", "segment_refs": [0], "severity": "low|medium|high"}
  ],
  "source_issues": [],
  "estimated_complexity": 1-10
}`;
}

function normalizeAnalysisResult(
  raw: Record<string, unknown>,
  sourceText: string,
  segments: AnalyzeRequest["segments"]
): AnalysisResult {
  const concepts = ((raw.concepts as unknown[]) ?? []).slice(0, 30).map((c: Record<string, unknown>, i: number) => {
    const criticality = Math.min(4, Math.max(1, Math.round((c.criticality as number) || 3)));
    return {
      stable_key: (c.stable_key as string) || `concept_${i}`,
      label: (c.label as string) || `Concept ${i + 1}`,
      definition: (c.definition as string) || "",
      type: (c.type as string) || (c.category as string) || "general",
      criticality,
      criticality_score: (c.criticality_score as number) || (criticality === 1 ? 1 : criticality === 2 ? 0.7 : criticality === 3 ? 0.4 : 0.2),
      bloom_target: (c.bloom_target as string) || "remember",
      relations: ((c.relations as unknown[]) || []).map((r: Record<string, unknown>) => ({
        target_key: (r.target_key as string) || "",
        relation_type: (r.relation_type as string) || "related",
      })),
      prerequisites: ((c.prerequisites as string[]) || []),
      source_confidence: Math.min(1, Math.max(0, (c.source_confidence as number) || 0.5)),
      source_trace: ((c.source_trace as unknown[]) || []).map((t: Record<string, unknown>) => ({
        segment_index: (t.segment_index as number) || 0,
        excerpt: (t.excerpt as string) || "",
        page_ref: t.page_ref as number | undefined,
      })),
      uncertain: false, // Will be set by validation step
    };
  });

  const traps = ((raw.traps as unknown[]) ?? []).map((t: Record<string, unknown>) => ({
    concept_key: (t.concept_key as string) || "",
    trap_type: (t.trap_type as string) || "common_error",
    description: (t.description as string) || "",
    source_trace: t.source_trace as { segment_index: number; excerpt: string } | undefined,
  }));

  const confusionPairs = ((raw.confusion_pairs as unknown[]) ?? []).map((p: Record<string, unknown>) => ({
    concept_a_key: (p.concept_a_key as string) || "",
    concept_b_key: (p.concept_b_key as string) || "",
    distinction_key: (p.distinction_key as string) || "",
    frequency: Math.min(5, Math.max(1, (p.frequency as number) || 1)),
  }));

  const ambiguousZones = ((raw.ambiguous_zones as unknown[]) ?? []).map((z: Record<string, unknown>) => ({
    zone_label: (z.zone_label as string) || "",
    reason: (z.reason as string) || "",
    segment_refs: (z.segment_refs as number[]) || [0],
    severity: (z.severity as string) || "low",
  }));

  // Compute confidence axes
  const conceptsWithTrace = concepts.filter((c) => c.source_trace.length > 0 && c.source_trace[0].excerpt.length > 10);
  const conceptsConfidence = concepts.length > 0 ? conceptsWithTrace.length / concepts.length : 0;

  const density = concepts.length >= 20 ? "high" : concepts.length >= 8 ? "medium" : "low";

  const recommended = density === "high" || concepts.length >= 10
    ? "histoire_animee"
    : "fiche_dynamique";

  return {
    main_topic: (raw.main_topic as string) || "Sujet non identifié",
    learning_objectives: ((raw.learning_objectives as string[]) || []),
    concepts,
    traps,
    confusion_pairs: confusionPairs,
    reasoning_type: (raw.reasoning_type as string) || "declaratif",
    density,
    recommended_template: recommended,
    confidence: {
      concepts: Math.min(1, conceptsConfidence),
      logic: Math.min(1, Math.max(0, traps.length > 0 ? 0.7 : 0.4)),
      traps: Math.min(1, Math.max(0, traps.length > 0 ? 0.8 : 0.3)),
      structure: Math.min(1, Math.max(0, segments.length >= 3 ? 0.8 : 0.5)),
      ambiguous_zones: ambiguousZones,
    },
    prerequis: ((raw.prerequis as string[]) || []),
    structure_type: (raw.structure_type as string) || "minimal",
    source_issues: ((raw.source_issues as unknown[]) || []).map((i: Record<string, unknown>) => ({
      code: (i.code as string) || "UNKNOWN",
      message: (i.message as string) || "",
      severity: (i.severity as string) || "info",
    })),
    estimated_complexity: Math.min(10, Math.max(1, (raw.estimated_complexity as number) || 5)),
  };
}

// ---------- Fallback Analysis (no LLM) ----------

function buildFallbackAnalysis(
  cleanText: string,
  segments: AnalyzeRequest["segments"],
  confidenceLevel: number
): AnalysisResult {
  const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 20);

  // Extract concepts from first N sentences
  const concepts: ConceptResult[] = sentences.slice(0, 15).map((sentence, i) => {
    const words = sentence.trim().split(/\s+/);
    const key = words.slice(0, 3).join("_").toLowerCase().replace(/[^a-z0-9_]/g, "");
    const excerpt = sentence.trim().slice(0, 120);

    return {
      stable_key: `concept_${key}_${i}`,
      label: words.slice(0, 5).join(" ").trim(),
      definition: sentence.trim(),
      type: "general",
      criticality: i < 3 ? 1 : i < 7 ? 2 : i < 12 ? 3 : 4,
      criticality_score: i < 3 ? 1 : i < 7 ? 0.7 : i < 12 ? 0.4 : 0.2,
      bloom_target: i < 5 ? "understand" : "remember",
      relations: [],
      prerequisites: [],
      source_confidence: 0.6,
      source_trace: [{ segment_index: Math.min(i, segments.length - 1) || 0, excerpt }],
      uncertain: false,
    };
  });

  // Detect if text is procedural
  const hasSteps = /étape|step|\d+\.\s/i.test(cleanText);
  const hasConditions = /si\s|if\s|lorsque|when|en cas de/i.test(cleanText);
  const hasCausal = /parce que|car|because|donc|therefore|entraîne/i.test(cleanText);

  let reasoningType = "declaratif";
  if (hasSteps) reasoningType = "procedural";
  else if (hasConditions) reasoningType = "conditionnel";
  else if (hasCausal) reasoningType = "causal";

  // Detect main topic from first segment or first heading
  const firstTitle = segments.find((s) => s.title)?.title;
  const mainTopic = firstTitle || sentences[0]?.trim().split(/\s+/).slice(0, 8).join(" ") || "Sujet non identifié";

  const density = concepts.length >= 12 ? "high" : concepts.length >= 5 ? "medium" : "low";

  return {
    main_topic: mainTopic,
    learning_objectives: [`Comprendre les notions clés de : ${mainTopic}`],
    concepts,
    traps: [],
    confusion_pairs: [],
    reasoning_type: reasoningType,
    density,
    recommended_template: density === "high" ? "histoire_animee" : "fiche_dynamique",
    confidence: {
      concepts: Math.min(0.5, confidenceLevel),
      logic: 0.3,
      traps: 0.2,
      structure: segments.length >= 3 ? 0.5 : 0.3,
      ambiguous_zones: confidenceLevel < 0.5 ? [{
        zone_label: "Document entier",
        reason: "Confiance source faible — analyse heuristique uniquement",
        segment_refs: [0],
        severity: "medium",
      }] : [],
    },
    prerequis: [],
    structure_type: "minimal",
    source_issues: [{
      code: "FALLBACK_ANALYSIS",
      message: "Analyse locale heuristique (LLM non disponible)",
      severity: "warning",
    }],
    estimated_complexity: Math.min(10, Math.max(1, Math.ceil(concepts.length / 2))),
  };
}

// ---------- Helpers ----------

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logOps(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  severity: string,
  documentId?: string,
  userId?: string,
  payload?: Record<string, unknown>
) {
  try {
    await supabase.from("ops_events").insert({
      event_type: eventType,
      severity,
      document_id: documentId || null,
      user_id: userId || null,
      payload_json: payload || {},
    });
  } catch {
    console.error("Ops logging failed for:", eventType);
  }
}
