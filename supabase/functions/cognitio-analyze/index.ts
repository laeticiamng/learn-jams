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
const PROMPT_VERSION = "m2-analyze-v3.0";

// Document Understanding Layer — System prompt for pre-comprehension
const DOCUMENT_UNDERSTANDING_SYSTEM_PROMPT = `Tu es la couche de compréhension globale de COGNITIO.
Ta mission est d'abord de comprendre réellement le document d'apprentissage comme le ferait un excellent enseignant humain AVANT d'extraire des concepts.

RÈGLE FONDAMENTALE : Tu dois comprendre avant de structurer.

CE QUE TU DOIS IGNORER / DÉPRIORISER :
- branding ou nom de site (CODEX, S-ECN, iKB, PREP-ECN, MED-LINE)
- entêtes de polycopié, mentions de rang (Rang A/B/C), R2C/EDN/ECN
- dates de révision, numéros d'item, répétitions d'en-têtes
- fragments typographiques, artefacts OCR, blocs documentaires non pédagogiques
Ces éléments ne doivent JAMAIS devenir le sujet principal, un concept, un titre de mission ou un ancrage mnémotechnique.

CE QUE TU DOIS FAIRE AVANT TOUTE EXTRACTION :
A. Identifier le VRAI sujet pédagogique (3-12 mots, jamais R2C/Rang/CODEX/Item)
B. Reconstruire la carte réelle du document (chapitres, sous-parties, séquence logique)
C. Identifier les zones de bruit (front matter, headers, footers, tableaux mal extraits)
D. Identifier le cœur pédagogique (3-8 grands axes, notions structurantes, distinctions clés)

EXTRACTION DES CONCEPTS — QUALITÉ :
Un concept doit être : compréhensible seul, utile pédagogiquement, formulé proprement, non éditorial, relié au cœur du cours.
Un concept ne doit JAMAIS être : une ligne de header, un nom de site, un rang, une date, un item, un fragment non reformulé.
Si le document est sale, reformule proprement. Tu dois penser comme un enseignant qui nettoie et clarifie.

PRIORITÉ : Préférer une petite liste de concepts justes et propres plutôt qu'une grande liste de concepts faux ou bruités.

SI LE DOCUMENT EST BRUITÉ : ignore le bruit, base-toi sur le corps, cherche les titres réels, les définitions, mécanismes, diagnostics, traitements.

MISSION UNIVERSE RULE :
L'univers de mission doit dépendre du vrai sujet et du type de raisonnement :
- médecine clinique aiguë → prise en charge / décision / priorisation
- santé publique / prévention → enquête / audit / contrôle du risque
- droit → dossier / arbitrage / argumentation
- informatique → diagnostic / système / architecture / débogage
- histoire → enquête chronologique / causalité / sources
- sciences fondamentales → exploration / mécanismes / chaînes explicatives
Ne jamais utiliser un univers générique par défaut.`;


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
      } catch (err: unknown) {
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
      .insert([{
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
      }])
      .select("id")
      .single();

    if (profileError) throw new Error(`Course profile insert failed: ${profileError.message}`);

    const courseProfileId = profile.id;

    // Persist concepts
    const conceptIdMap: Record<string, string> = {};
    for (const concept of reliableConcepts) {
      const { data: row, error: conceptError } = await supabase
        .from("concepts")
        .insert([{
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
        }])
        .select("id")
        .single();

      if (!conceptError && row) {
        conceptIdMap[concept.stable_key] = row.id;
      }
    }

    // Persist confusion_pairs
    for (const pair of analysisResult.confusion_pairs) {
      await supabase.from("confusion_pairs").insert([{
        course_profile_id: courseProfileId,
        concept_a_id: conceptIdMap[pair.concept_a_key] || null,
        concept_b_id: conceptIdMap[pair.concept_b_key] || null,
        distinction_key: pair.distinction_key,
        frequency: pair.frequency,
      }]);
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
  } catch (error: unknown) {
    console.error("Analysis error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return errorResponse(500, message);
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
      system: DOCUMENT_UNDERSTANDING_SYSTEM_PROMPT,
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
  return `Analyse ce contenu éducatif et produis un profil pédagogique structuré.

ÉTAPE 1 — PRÉ-COMPRÉHENSION (obligatoire avant extraction) :
Avant d'extraire des concepts, tu DOIS d'abord identifier mentalement :
- Le VRAI sujet pédagogique du document (jamais un label éditorial R2C/Rang/CODEX/Item)
- Les grands blocs structurants du cours (définitions, mécanismes, diagnostic, traitement...)
- Les zones de bruit à ignorer (front matter, branding, en-têtes répétés)
- Le cœur pédagogique réel (3-8 axes clés que l'étudiant doit retenir)

ÉTAPE 2 — EXTRACTION (basée sur la compréhension) :

RÈGLES ABSOLUES :
- Ne JAMAIS inventer de concepts absents du texte source
- Chaque concept DOIT avoir au moins un source_trace avec un extrait EXACT du texte
- Si un concept n'est pas clairement traçable, mettre source_confidence < 0.5
- Signaler les zones ambiguës honnêtement
- Maximum 30 concepts
- Attribuer la criticality en fonction de l'importance PÉDAGOGIQUE réelle dans le cours

RÈGLES DE QUALITÉ SÉMANTIQUE (CRITIQUES) :
- Un concept DOIT être une notion scientifique/pédagogique réelle, intelligible seule
- NE PAS extraire comme concept : labels administratifs (Rang A, Rang B, R2C), balises pédagogiques, métadonnées de support, fragments typographiques, titres de section sales, ponctuation résiduelle
- Chaque label de concept DOIT être propre, lisible, normalisé (ex: "Pneumonie aiguë communautaire (PAC)" et non "COM R2C : Rang A")
- Les définitions DOIVENT être condensées et reformulées pédagogiquement : PAS de copier-coller brut du polycopié
- Chaque définition doit être autonome, compréhensible sans contexte, en 1-3 phrases maximum
- Chaque concept critique (criticality=1) doit être réellement central au sujet, pas un artefact du document
- Si un fragment du texte n'est pas un vrai concept (ex: ") - Signes généraux inconstants"), NE PAS l'inclure

QUALITÉ DES DÉFINITIONS :
- Reformuler, condenser, clarifier
- Supprimer le jargon éditorial et les références internes au polycopié
- Garder l'essentiel scientifique/pédagogique
- Ajouter un piège/distinction si pertinent directement dans "traps"

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
      "label": "Nom propre et lisible du concept",
      "definition": "Définition condensée, reformulée, pédagogiquement exploitable (1-3 phrases)",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];
}

function normalizeAnalysisResult(
  raw: Record<string, unknown>,
  sourceText: string,
  segments: AnalyzeRequest["segments"]
): AnalysisResult {
  const rawConcepts = asRecordArray(raw.concepts).slice(0, 30).map((c, i) => {
    const criticalityRaw = typeof c.criticality === "number" ? c.criticality : 3;
    const criticality = Math.min(4, Math.max(1, Math.round(criticalityRaw)));

    return {
      stable_key: typeof c.stable_key === "string" ? c.stable_key : `concept_${i}`,
      label: typeof c.label === "string" ? c.label : `Concept ${i + 1}`,
      definition: typeof c.definition === "string" ? c.definition : "",
      type: typeof c.type === "string" ? c.type : typeof c.category === "string" ? c.category : "general",
      criticality,
      criticality_score: typeof c.criticality_score === "number"
        ? c.criticality_score
        : (criticality === 1 ? 1 : criticality === 2 ? 0.7 : criticality === 3 ? 0.4 : 0.2),
      bloom_target: typeof c.bloom_target === "string" ? c.bloom_target : "remember",
      relations: asRecordArray(c.relations).map((r) => ({
        target_key: typeof r.target_key === "string" ? r.target_key : "",
        relation_type: typeof r.relation_type === "string" ? r.relation_type : "related",
      })),
      prerequisites: asStringArray(c.prerequisites),
      source_confidence: Math.min(1, Math.max(0, typeof c.source_confidence === "number" ? c.source_confidence : 0.5)),
      source_trace: asRecordArray(c.source_trace).map((t) => ({
        segment_index: typeof t.segment_index === "number" ? t.segment_index : 0,
        excerpt: typeof t.excerpt === "string" ? t.excerpt : "",
        page_ref: typeof t.page_ref === "number" ? t.page_ref : undefined,
      })),
      uncertain: false,
    };
  });

  const concepts = rawConcepts.filter((c) => {
    const rejection = rejectConceptArtifactEdge(c.label, c.definition);
    if (rejection.rejected) {
      console.log(`[M2] Rejected concept artifact: "${c.label}" — ${rejection.reason}`);
      return false;
    }
    return true;
  }).map((c) => ({
    ...c,
    label: normalizeConceptLabelEdge(c.label) || c.label,
    definition: compressDefinitionEdge(c.definition),
  }));

  const traps = asRecordArray(raw.traps).map((t) => ({
    concept_key: typeof t.concept_key === "string" ? t.concept_key : "",
    trap_type: typeof t.trap_type === "string" ? t.trap_type : "common_error",
    description: typeof t.description === "string" ? t.description : "",
    source_trace: isRecord(t.source_trace)
      ? {
          segment_index: typeof t.source_trace.segment_index === "number" ? t.source_trace.segment_index : 0,
          excerpt: typeof t.source_trace.excerpt === "string" ? t.source_trace.excerpt : "",
        }
      : undefined,
  }));

  const confusionPairs = asRecordArray(raw.confusion_pairs).map((p) => ({
    concept_a_key: typeof p.concept_a_key === "string" ? p.concept_a_key : "",
    concept_b_key: typeof p.concept_b_key === "string" ? p.concept_b_key : "",
    distinction_key: typeof p.distinction_key === "string" ? p.distinction_key : "",
    frequency: Math.min(5, Math.max(1, typeof p.frequency === "number" ? p.frequency : 1)),
  }));

  const ambiguousZones = asRecordArray(raw.ambiguous_zones).map((z) => {
    const segmentRefs = asNumberArray(z.segment_refs);
    return {
      zone_label: typeof z.zone_label === "string" ? z.zone_label : "",
      reason: typeof z.reason === "string" ? z.reason : "",
      segment_refs: segmentRefs.length > 0 ? segmentRefs : [0],
      severity: typeof z.severity === "string" ? z.severity : "low",
    };
  });

  const conceptsWithTrace = concepts.filter((c) => c.source_trace.length > 0 && c.source_trace[0].excerpt.length > 10);
  const conceptsConfidence = concepts.length > 0 ? conceptsWithTrace.length / concepts.length : 0;
  const density = concepts.length >= 20 ? "high" : concepts.length >= 8 ? "medium" : "low";
  const recommended = density === "high" || concepts.length >= 10 ? "histoire_animee" : "fiche_dynamique";

  return {
    main_topic: typeof raw.main_topic === "string" ? raw.main_topic : "Sujet non identifié",
    learning_objectives: asStringArray(raw.learning_objectives),
    concepts,
    traps,
    confusion_pairs: confusionPairs,
    reasoning_type: typeof raw.reasoning_type === "string" ? raw.reasoning_type : "declaratif",
    density,
    recommended_template: recommended,
    confidence: {
      concepts: Math.min(1, conceptsConfidence),
      logic: Math.min(1, Math.max(0, traps.length > 0 ? 0.7 : 0.4)),
      traps: Math.min(1, Math.max(0, traps.length > 0 ? 0.8 : 0.3)),
      structure: Math.min(1, Math.max(0, segments.length >= 3 ? 0.8 : 0.5)),
      ambiguous_zones: ambiguousZones,
    },
    prerequis: asStringArray(raw.prerequis),
    structure_type: typeof raw.structure_type === "string" ? raw.structure_type : "minimal",
    source_issues: asRecordArray(raw.source_issues).map((issue) => {
      const VALID_SEVERITIES = ["info", "warning", "blocking"] as const;
      const rawSeverity = typeof issue.severity === "string" ? issue.severity : "info";
      const severity = VALID_SEVERITIES.includes(rawSeverity as typeof VALID_SEVERITIES[number])
        ? (rawSeverity as "info" | "warning" | "blocking")
        : "info";
      return {
        code: typeof issue.code === "string" ? issue.code : "UNKNOWN",
        message: typeof issue.message === "string" ? issue.message : "",
        severity,
      };
    }),
    estimated_complexity: Math.min(10, Math.max(1, typeof raw.estimated_complexity === "number" ? raw.estimated_complexity : 5)),
  };
}

// ---------- Fallback Analysis (no LLM) ----------

function buildFallbackAnalysis(
  cleanText: string,
  segments: AnalyzeRequest["segments"],
  confidenceLevel: number
): AnalysisResult {
  // P0 FIX: Pre-clean text to remove R2C/editorial noise before extraction
  // SAFETY GUARD: If cleaning removes >70% of content, fall back to original text
  let cleaned = cleanTextForFallback(cleanText);
  const cleanRatio = cleaned.length / Math.max(1, cleanText.length);
  if (cleanRatio < 0.3) {
    console.warn(
      `[M2-FALLBACK][SAFETY] cleanTextForFallback removed ${(100 - cleanRatio * 100).toFixed(1)}% — ` +
      `falling back to original text (${cleanText.length} chars)`
    );
    cleaned = cleanText;
  }

  // P0 FIX: Join text into continuous prose before splitting on sentence boundaries
  // to avoid fragmenting bullet-point medical text into too-short chunks
  const continuousText = cleaned.replace(/\n+/g, " ").replace(/\s{2,}/g, " ");
  let sentences = continuousText.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 20);

  // Fallback: if no sentence-boundary splits worked, split on paragraph breaks
  if (sentences.length === 0 && cleaned.length > 30) {
    sentences = cleaned.split(/\n\s*\n/).flatMap(p => {
      const t = p.trim();
      return t.length > 20 ? [t] : [];
    });
  }

  // Last resort: word chunks
  if (sentences.length === 0 && cleaned.length > 20) {
    const words = cleaned.split(/\s+/);
    for (let i = 0; i < words.length; i += 10) {
      const chunk = words.slice(i, i + 15).join(" ");
      if (chunk.length > 15) sentences.push(chunk);
      if (sentences.length >= 10) break;
    }
  }

  // Extract concepts from first N sentences
  const concepts: ConceptResult[] = sentences.slice(0, 15).map((sentence, i) => {
    const words = sentence.trim().split(/\s+/);
    const key = words.slice(0, 3).join("_").toLowerCase().replace(/[^a-z0-9_]/g, "");
    const excerpt = sentence.trim().slice(0, 120);

    return {
      stable_key: `concept_${key}_${i}`,
      label: words.slice(0, 5).join(" ").trim(),
      definition: compressDefinitionEdge(sentence.trim()),
      type: "general",
      criticality: i < 3 ? 1 : i < 7 ? 2 : i < 12 ? 3 : 4,
      criticality_score: i < 3 ? 1 : i < 7 ? 0.7 : i < 12 ? 0.4 : 0.2,
      bloom_target: i < 5 ? "understand" : "remember",
      relations: [],
      prerequisites: [],
      source_confidence: 0.6,
      source_trace: [{ segment_index: Math.min(i, Math.max(0, segments.length - 1)), excerpt }],
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

  // P0 FIX: Clean segment titles before using as topic
  let mainTopic = "Sujet non identifié";
  for (const seg of segments) {
    if (!seg.title) continue;
    const cleanedTitle = cleanTopicForFallback(seg.title);
    if (cleanedTitle.length >= 5) {
      mainTopic = cleanedTitle;
      break;
    }
  }
  // P1: Try extracting "ITEM N : TOPIC" from segment content
  if (mainTopic === "Sujet non identifié") {
    for (const seg of segments) {
      const itemTopic = extractItemTopicFromText(seg.content ?? "");
      if (itemTopic && itemTopic.length >= 5) {
        mainTopic = itemTopic;
        break;
      }
    }
  }
  // If no clean title found, use first substantial sentence
  if (mainTopic === "Sujet non identifié" && sentences.length > 0) {
    const firstWords = sentences[0].trim().split(/\s+/).slice(0, 8).join(" ");
    const cleanedFirst = cleanTopicForFallback(firstWords);
    if (cleanedFirst.length >= 5) {
      mainTopic = cleanedFirst;
    }
  }

  const density = concepts.length >= 12 ? "high" : concepts.length >= 5 ? "medium" : "low";

  console.log(
    `[M2-FALLBACK] text=${cleanText.length}→cleaned=${cleaned.length}, ` +
    `sentences=${sentences.length}, concepts=${concepts.length}, topic="${mainTopic}"`
  );

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

// ---------- Edge-side Noise Cleaning ----------

/** Noise patterns to remove from text before fallback extraction */
const EDGE_NOISE_LINE_PATTERNS: RegExp[] = [
  /^(?:COM\s+)?R2C\s*:\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|BRUN|MARRON|Rang\s+[A-Z])\b/i,
  /^\s*Rang\s+[A-Z]\s*$/i,
  /^COM\s+R2C\b/i,
  /^en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\s*$/i,
  /^en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\s*[-–—]\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)/i,
  /^(?:Dernière\s+)?(?:mise\s+à\s+jour|MAJ|révision)\s*[:—–\-]\s*\d/i,
  /^Version\s+\d+/i,
  /^(?:UE|DFGSM|DFASM|ECN|EDN|iECN)\s*\d/i,
  /^(?:Item|Objectif|N°)\s*\d+\s*(?:[-–—:]|$)/i,
  /^Collège\s+(?:national|des)\s/i,
  /^Référentiel\s/i,
  /^Page\s+\d+/i,
  /^\d+\s*\/\s*\d+\s*$/,
  /^©\s/,
  /^Tous\s+droits\s+réservés/i,
  /^[-–—]+\s*$/,
  /^\s*[•\-–]\s*$/,
  /^(?:Université|Faculté|Institut|École)\s.{0,60}$/i,
  /^(?:Enseignant|Professeur|Dr|Pr)\s*[:—–.]\s*.{0,80}$/i,
  /^(?:Année\s+(?:universitaire|scolaire))\s*[:—–\-]\s*\d/i,
  /^Sujet\s+principal\s*:\s*COM\s/i,
  /^(?:www\.|http|mailto)/i,
];

function cleanTextForFallback(text: string): string {
  const lines = text.split("\n");
  const cleaned: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) { cleaned.push(""); continue; }
    if (trimmed.length <= 2 && /^[^a-zA-ZÀ-ÿ0-9]/.test(trimmed)) continue;
    if (EDGE_NOISE_LINE_PATTERNS.some(p => p.test(trimmed))) continue;
    // Clean inline Rang labels
    let cl = trimmed.replace(/\s*\(?\s*Rang\s+[A-Z]\s*\)?\s*/gi, " ");
    cl = cl.replace(/\s*\(?\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\s*\)?\s*/gi, " ");
    cl = cl.replace(/\s{2,}/g, " ").trim();
    if (cl.length < 3) continue;
    cleaned.push(cl);
  }
  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function cleanTopicForFallback(rawTopic: string): string {
  let topic = rawTopic.trim();
  topic = topic.replace(/R2C\s*:?\s*(?:Rang\s+[A-Z]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)?\s*[-–—]?\s*)+/gi, "").trim();
  topic = topic.replace(/\bCOM\s+R2C\s*:\s*/gi, "");
  topic = topic.replace(/\s*[-–—]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\b.*/gi, "");
  topic = topic.replace(/\s*\(?\s*Rang\s+[A-Z]\s*(?:en\s+\w+)?\s*\)?\s*/gi, "");
  topic = topic.replace(/\bCODEX\b[.:;,]*\s*/gi, "");
  topic = topic.replace(/\bS[\s-]*ECN(?:\.COM)?\b[.:;,]*\s*/gi, "");
  topic = topic.replace(/\bMED[\s-]*LINE\b[.:;,]*\s*/gi, "");
  topic = topic.replace(/\biKB\b[.:;,]*\s*/gi, "");
  topic = topic.replace(/\bPREP['']?ECN\b[.:;,]*\s*/gi, "");
  topic = topic.replace(/\bELLIPSES\b[.:;,]*\s*/gi, "");
  topic = topic.replace(/\bVERNAZOBRES[\s-]*GREGO?\b[.:;,]*\s*/gi, "");
  topic = topic.replace(/\bECN\.COM\b[.:;,]*\s*/gi, "");
  topic = topic.replace(/\bRévision\s+\d[\d\/]*\b\s*/gi, "");
  topic = topic.replace(/\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b\s*/g, "");
  topic = topic.replace(/^(?:Item|UE|N°)\s*\d+\s*[-–—:.\s]\s*/i, "");
  topic = topic.replace(/^Sujet\s+principal\s*:\s*/i, "");
  topic = topic.replace(/\s{2,}/g, " ").trim();
  topic = topic.replace(/^[\s.:;,\-–—]+/, "").replace(/[\s.:;,\-–—]+$/, "").trim();
  return topic.length >= 3 ? topic : "";
}

function extractItemTopicFromText(content: string): string | null {
  const match = content.match(/\bITEM\s+\d+\s*[-–—:]\s*(.+)/i);
  if (!match) return null;
  const rest = match[1];
  const words = rest.split(/\s+/);
  const titleWords: string[] = [];
  for (const w of words) {
    const cleaned = w.replace(/[-–—,()]/g, "");
    if (!cleaned) { titleWords.push(w); continue; }
    if (/^[A-ZÀ-Ÿ'']+$/.test(cleaned) || /^(de|du|et|l|d|à|en|des|les|aux)$/i.test(cleaned)) {
      titleWords.push(w);
    } else break;
  }
  const result = titleWords.join(" ").replace(/[-–—,\s]+$/, "").trim();
  return result.length >= 5 ? result : null;
}

// ---------- Helpers ----------

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logOps(
  supabase: any,
  eventType: string,
  severity: string,
  documentId?: string,
  userId?: string,
  payload?: Record<string, unknown>
) {
  try {
    await supabase.from("ops_events").insert([{
      event_type: eventType,
      severity,
      document_id: documentId || null,
      user_id: userId || null,
      payload_json: payload || {},
    }]);
  } catch {
    console.error("Ops logging failed for:", eventType);
  }
}

// ---------- Concept Normalization Helpers ----------

const CONCEPT_NOISE_PATTERNS: RegExp[] = [
  /^[\s)(\-–—•:;,.\]}\[{]+/,
  /[\s)(\-–—•:;,.\]}\[{]+$/,
  /^(?:COM\s+)?R2C\s*:\s*Rang\s+[A-Z]\s*[-–—:]\s*/i,
  /\s*[-–—]\s*Rang\s+[A-Z]\s*$/i,
  /^Rang\s+[A-Z]\s*[-–—:]\s*/i,
  /^Item\s+\d+\s*[-–—:]\s*/i,
  /^N°\s*\d+\s*[-–—:]\s*/i,
  /^[)]\s*[-–—]\s*/,
];

function normalizeConceptLabelEdge(rawLabel: string): string | null {
  let label = rawLabel.trim();
  for (const pattern of CONCEPT_NOISE_PATTERNS) {
    label = label.replace(pattern, "").trim();
  }
  if (label.length < 3) return null;
  if (/^(?:Rang|R2C|COM|Item|UE|DFGSM|ECN|EDN)\s/i.test(label)) return null;
  if (/^[\d\s\-–—:.;,()]+$/.test(label)) return null;
  if (/^[)\]}>]/.test(label)) return null;
  label = label.replace(/\s*[-–—:]\s*$/, "").trim();
  return label.length >= 3 ? label : null;
}

function rejectConceptArtifactEdge(label: string, definition: string): { rejected: boolean; reason?: string } {
  const normalized = normalizeConceptLabelEdge(label);
  if (!normalized) return { rejected: true, reason: `Label is artifact: "${label}"` };
  if (!/[a-zA-ZÀ-ÿ]/.test(normalized)) return { rejected: true, reason: "No letters in label" };
  if (normalized.length < 3) return { rejected: true, reason: "Label too short" };

  // Reject non-concept structural fragments
  const rejectPatterns = [
    /^(?:Signes?\s+(?:généraux|cliniques?|fonctionnels?)\s*(?:inconstants?)?)\s*$/i,
    /^(?:Voir|Cf\.?|Tableau|Figure|Annexe)\s/i,
    /^(?:Introduction|Conclusion|Résumé|Bibliographie|Références?)\s*$/i,
    /^(?:NB|PS|Note)\s*:/i,
    /^(?:Suite|Fin|Début)\s*$/i,
  ];
  if (rejectPatterns.some(p => p.test(normalized))) {
    return { rejected: true, reason: `Structural fragment: "${normalized}"` };
  }

  if (definition.trim().length < 10) return { rejected: true, reason: "Definition too short" };
  if (definition.trim().toLowerCase() === label.trim().toLowerCase()) {
    return { rejected: true, reason: "Definition is just the label" };
  }

  return { rejected: false };
}

function compressDefinitionEdge(rawDef: string, maxLen = 250): string {
  let def = rawDef.trim();
  def = def.replace(/^(?:Il s'agit d'|C'est |On appelle |On définit |Par définition,?\s*)/i, "");
  def = def.replace(/\s*\([Cc]f\.?\s*[^)]+\)\s*$/g, "");
  def = def.replace(/\s*\[[\d,\s]+\]\s*$/g, "");
  def = def.replace(/\s*\(Rang\s+[A-Z]\)\s*/gi, " ");
  def = def.replace(/\s*\(R2C[^)]*\)\s*/gi, " ");
  def = def.replace(/\s{2,}/g, " ").trim();
  if (def.length > maxLen) {
    const sentences = def.match(/[^.!?]+[.!?]+/g) || [def];
    let compressed = "";
    for (const s of sentences) {
      if ((compressed + s).length <= maxLen) compressed += s;
      else break;
    }
    def = compressed.trim() || def.slice(0, maxLen).replace(/\s\S*$/, "…");
  }
  if (def.length > 0) def = def.charAt(0).toUpperCase() + def.slice(1);
  return def;
}
