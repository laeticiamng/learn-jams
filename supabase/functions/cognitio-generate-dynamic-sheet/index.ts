// ============================================================
// Edge Function: cognitio-generate-dynamic-sheet (M5-A)
// Generate fiche_dynamique from M2+M3+M4 outputs
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const input = await req.json();
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

    // Validate format
    if (input.m4_output?.chosen_format !== "fiche_dynamique") {
      return new Response(JSON.stringify({
        error: "FORMAT_MISMATCH",
        message: `Expected fiche_dynamique, got ${input.m4_output?.chosen_format}`,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logOps(supabase, "m5_dynamic_started", "info", input.source_document?.document_id, user.id, {
      concept_count: input.m2_output?.key_concepts?.length ?? 0,
      segment_count: input.m3_output?.segments?.length ?? 0,
    });

    // Generate
    const result = generateDynamicSheet(input);

    // Persist transformation
    const { error: tErr } = await supabase.from("transformations").insert([{
      id: result.transformation_id,
      user_id: user.id,
      document_id: result.metadata.document_id,
      course_profile_id: result.metadata.course_profile_id,
      memory_architecture_id: result.metadata.memory_architecture_id,
      format_decision_id: result.metadata.format_decision_id,
      format: "fiche_dynamique",
      strategy: "dynamic_sheet_v1",
      published_status: "draft",
      qa_status: "pending",
      estimated_duration_sec: result.metadata.estimated_duration_sec,
    }]);
    if (tErr) console.error("Transform insert error:", tErr);

    // Persist content
    const { error: cErr } = await supabase.from("generated_contents").insert([{
      transformation_id: result.transformation_id,
      version: 1,
      content_json: result.content_blocks,
      source_disclaimer_json: result.source_disclaimer,
      coverage_json: result.metadata.coverage,
      generation_flags_json: result.metadata.quality_flags,
      internal_summary_json: result.internal_summary,
    }]);
    if (cErr) console.error("Content insert error:", cErr);

    // Persist final test
    const bloomLevels = new Set(result.final_test.map((q: any) => q.bloom_level));
    const { error: ftErr } = await supabase.from("final_tests").insert([{
      transformation_id: result.transformation_id,
      questions_json: result.final_test,
      bloom_levels_count: bloomLevels.size,
      question_count: result.final_test.length,
    }]);
    if (ftErr) console.error("Final test insert error:", ftErr);

    const latency = Date.now() - startTime;
    await logOps(supabase, "m5_dynamic_completed", "info", input.source_document?.document_id, user.id, {
      transformation_id: result.transformation_id,
      total_blocks: result.content_blocks.length,
      final_test_count: result.final_test.length,
      critical_covered: result.metadata.coverage.critical_covered,
      critical_total: result.metadata.coverage.critical_total,
      latency_ms: latency,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("M5 dynamic sheet error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// The generation logic mirrors the local service
function generateDynamicSheet(input: any) {
  const { m2_output, m3_output, m4_output, source_document } = input;
  const transformationId = crypto.randomUUID();
  const concepts = m2_output.key_concepts ?? [];
  const critical = concepts.filter((c: any) => c.criticality === 1);
  const confusions = m2_output.confusion_pairs ?? [];
  const segments = m3_output.segments ?? [];

  const blocks: any[] = [];
  let pos = 0;

  // 1. Contract
  const contract = m3_output.pedagogical_contract;
  blocks.push({
    block_id: crypto.randomUUID(), type: "contract", title: "Contrat pédagogique",
    content: `Objectif : maîtriser ${contract?.total_concepts ?? concepts.length} concept(s) dont ${critical.length} critique(s).\nStructure : ${contract?.segment_count ?? segments.length} bloc(s), ~${Math.ceil((contract?.estimated_duration_sec ?? 300) / 60)} min.\nPlan de rappel : test final + J+1 + J+7.`,
    concepts_covered: [], visual_anchor: null, contrast_box: null, mnemonic: null, recall_event: null, position: pos++,
  });

  // 2. Hook
  blocks.push({
    block_id: crypto.randomUUID(), type: "hook", title: "Accroche",
    content: critical.length > 0
      ? `Pourquoi "${critical[0].label}" est-il essentiel ? Parce que sans cette notion, le reste perd son ancrage.`
      : `Vous allez explorer : ${m2_output.main_topic}.`,
    concepts_covered: critical.slice(0, 1).map((c: any) => c.stable_key), visual_anchor: null, contrast_box: null, mnemonic: null, recall_event: null, position: pos++,
  });

  // 3. Anchor map
  const mapLines = segments.map((s: any, i: number) => {
    const labels = (s.concept_keys ?? []).slice(0, 5).map((k: string) => {
      const c = concepts.find((cc: any) => cc.stable_key === k);
      return c ? c.label : k;
    });
    return `Bloc ${i + 1} : ${labels.join(", ")}`;
  });
  blocks.push({
    block_id: crypto.randomUUID(), type: "anchor_map", title: "Carte mentale",
    content: `Ce cours : ${segments.length} bloc(s) :\n\n${mapLines.join("\n")}`,
    concepts_covered: [], visual_anchor: null, contrast_box: null, mnemonic: null, recall_event: null, position: pos++,
  });

  // 4+5. Pedagogical blocks + reactivations
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segC = concepts.filter((c: any) => (seg.concept_keys ?? []).includes(c.stable_key));
    const lines = segC.slice(0, 5).map((c: any) => {
      // Compress definitions for pedagogical quality
      const def = compressDefEdge(c.definition ?? "");
      return `**${c.label}** : ${def}`;
    });
    if (i > 0) lines.unshift("Suite :");

    const segConf = confusions.filter((p: any) =>
      (seg.concept_keys ?? []).includes(p.concept_a_key) || (seg.concept_keys ?? []).includes(p.concept_b_key)
    );

    const firstCrit = segC.find((c: any) => c.criticality === 1);
    blocks.push({
      block_id: crypto.randomUUID(), type: "pedagogical",
      title: `Bloc ${i + 1} — ${segC[0]?.label ?? "Concepts"}`,
      content: lines.join("\n\n"),
      concepts_covered: segC.map((c: any) => c.stable_key),
      visual_anchor: firstCrit ? {
        image_desc: `Visualisez "${firstCrit.label}" comme un pilier.`,
        verbal_formula: `"${firstCrit.label}" = ${(firstCrit.definition ?? "").slice(0, 60)}.`,
      } : null,
      contrast_box: segConf[0] ? {
        concept_a: segConf[0].concept_a_key,
        concept_b: segConf[0].concept_b_key,
        distinction_key: segConf[0].distinction_key,
      } : null,
      mnemonic: null, recall_event: null, position: pos++,
    });

    if (segC.length > 0 && i < segments.length - 1) {
      const t = segC[0];
      blocks.push({
        block_id: crypto.randomUUID(), type: "reactivation", title: "Rappel actif",
        content: `Qu'est-ce que "${t.label}" ?`,
        concepts_covered: [t.stable_key], visual_anchor: null, contrast_box: null, mnemonic: null,
        recall_event: { type: "question", prompt: `Qu'est-ce que "${t.label}" ?`, expected_concepts: [t.stable_key], bloom_level: 1 },
        position: pos++,
      });
    }
  }

  // 6. Clarity peak
  const peakLines = [`Vue d'ensemble : ${m2_output.main_topic}`, ""];
  if (critical.length > 0) {
    peakLines.push(`Notions fondamentales :`);
    for (const c of critical) peakLines.push(`• ${c.label} — ${(c.definition ?? "").slice(0, 80)}`);
  }
  blocks.push({
    block_id: crypto.randomUUID(), type: "clarity_peak", title: "Pic de clarté",
    content: peakLines.join("\n"),
    concepts_covered: critical.map((c: any) => c.stable_key), visual_anchor: null, contrast_box: null, mnemonic: null, recall_event: null, position: pos++,
  });

  // 7. Consolidation
  const consLines = ["**Ce qu'il faut retenir :**", ""];
  for (const c of critical) consLines.push(`• ${c.label} : ${(c.definition ?? "").slice(0, 100)}`);
  if (confusions.length > 0) {
    consLines.push("", "**Pièges à éviter :**");
    for (const p of confusions.slice(0, 3)) consLines.push(`• ${p.concept_a_key} ≠ ${p.concept_b_key}`);
  }
  blocks.push({
    block_id: crypto.randomUUID(), type: "consolidation", title: "Consolidation finale",
    content: consLines.join("\n"),
    concepts_covered: critical.map((c: any) => c.stable_key), visual_anchor: null, contrast_box: null, mnemonic: null, recall_event: null, position: pos++,
  });

  // 8. Final test
  const testItems = buildEdgeFinalTest(concepts, confusions);
  blocks.push({
    block_id: crypto.randomUUID(), type: "final_test", title: "Test final",
    content: `${testItems.length} questions.`,
    concepts_covered: [...new Set(testItems.flatMap((q: any) => q.concepts_tested))],
    visual_anchor: null, contrast_box: null, mnemonic: null, recall_event: null, position: pos++,
  });

  const uncertainConcepts = concepts.filter((c: any) => c.uncertain).map((c: any) => c.stable_key);
  const coveredKeys = new Set(blocks.flatMap((b: any) => b.concepts_covered ?? []));

  return {
    transformation_id: transformationId,
    format: "fiche_dynamique",
    metadata: {
      document_id: source_document.document_id,
      course_profile_id: m3_output.course_profile_id,
      memory_architecture_id: m3_output.architecture_id,
      format_decision_id: m4_output.decision_id,
      estimated_duration_sec: m4_output.estimated_duration_sec ?? 300,
      quality_flags: critical.every((c: any) => coveredKeys.has(c.stable_key))
        ? ["full_critical_coverage"] : ["missing_critical_coverage"],
      coverage: {
        critical_total: critical.length,
        critical_covered: critical.filter((c: any) => coveredKeys.has(c.stable_key)).length,
        major_total: concepts.filter((c: any) => c.criticality === 2).length,
        major_covered: concepts.filter((c: any) => c.criticality === 2 && coveredKeys.has(c.stable_key)).length,
      },
    },
    internal_summary: {
      learning_objective: m2_output.learning_objectives?.[0] ?? m2_output.main_topic,
      dominant_knowledge_type: {
        dominant: m2_output.reasoning_type ?? "declaratif",
        distribution: { declaratif: 1, procedural: 0, conditionnel: 0, causal: 0, metacognitif: 0 },
      },
      critical_concepts: critical.map((c: any) => c.stable_key),
      confusions: confusions.map((p: any) => `${p.concept_a_key} ↔ ${p.concept_b_key}`),
      cognitive_structure: `${segments.length} segments, ${concepts.length} concepts`,
      cognitive_budget: { segments: segments.length, max_new_elements: 5, total_duration_sec: m4_output.estimated_duration_sec ?? 300 },
      pedagogical_format: "fiche_dynamique",
      reactivation_plan: [],
      active_recall_plan: blocks.filter((b: any) => b.recall_event).map((b: any) => b.recall_event.prompt),
      mnemonics: (m3_output.mnemonics ?? []).map((m: any) => m.mnemonic),
    },
    content_blocks: blocks,
    final_test: testItems,
    source_disclaimer: {
      confidence_level: source_document.confidence_level ?? 0.5,
      uncertain_concepts: uncertainConcepts,
      contradictions: [],
      ambiguities: [],
    },
  };
}

function buildEdgeFinalTest(concepts: any[], confusions: any[]) {
  const items: any[] = [];
  const critical = concepts.filter((c: any) => c.criticality === 1);

  for (const c of critical.slice(0, 2)) {
    items.push({
      id: crypto.randomUUID(), type: "qcu",
      prompt: `Définition de "${c.label}" ?`,
      choices: [c.definition?.slice(0, 80) ?? c.label, "Concept secondaire", "Non abordé"],
      expected_answer: c.definition?.slice(0, 80) ?? c.label,
      concepts_tested: [c.stable_key], bloom_level: 1,
    });
  }
  if (concepts.length > 0) {
    items.push({
      id: crypto.randomUUID(), type: "completion",
      prompt: `Expliquez "${concepts[0].label}" en une phrase.`,
      choices: null, expected_answer: concepts[0].definition ?? "",
      concepts_tested: [concepts[0].stable_key], bloom_level: 2,
    });
  }
  if (concepts.length > 1) {
    items.push({
      id: crypto.randomUUID(), type: "short_answer",
      prompt: `Exemple d'application de "${concepts[1].label}" ?`,
      choices: null, expected_answer: `Exemple lié à ${concepts[1].label}`,
      concepts_tested: [concepts[1].stable_key], bloom_level: 3,
    });
  }
  if (confusions.length > 0) {
    items.push({
      id: crypto.randomUUID(), type: "distinction",
      prompt: `Différence entre "${confusions[0].concept_a_key}" et "${confusions[0].concept_b_key}" ?`,
      choices: null, expected_answer: confusions[0].distinction_key,
      concepts_tested: [confusions[0].concept_a_key, confusions[0].concept_b_key], bloom_level: 4,
    });
  }
  if (critical.length >= 2) {
    items.push({
      id: crypto.randomUUID(), type: "ordering",
      prompt: "Classez par importance :",
      choices: critical.slice(0, 4).map((c: any) => c.label),
      expected_answer: critical.slice(0, 4).map((c: any) => c.label),
      concepts_tested: critical.slice(0, 4).map((c: any) => c.stable_key), bloom_level: 5,
    });
  }
  if (concepts.length >= 3) {
    items.push({
      id: crypto.randomUUID(), type: "short_answer",
      prompt: "Synthèse personnelle reliant les concepts clés.",
      choices: null, expected_answer: "Synthèse cohérente",
      concepts_tested: critical.map((c: any) => c.stable_key), bloom_level: 6,
    });
  }
  while (items.length < 3 && concepts.length > 0) {
    items.push({
      id: crypto.randomUUID(), type: "qcu",
      prompt: `"${concepts[0].label}" est central. Vrai ?`,
      choices: ["Vrai", "Faux"], expected_answer: "Vrai",
      concepts_tested: [concepts[0].stable_key], bloom_level: 1 + items.length,
    });
  }
  return items.slice(0, 10);
}

function compressDefEdge(rawDef: string, maxLen = 200): string {
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

async function logOps(supabase: any, eventType: string, severity: string, documentId: string, userId: string, payload: any) {
  try {
    await supabase.from("ops_events").insert([{ event_type: eventType, severity, document_id: documentId, user_id: userId, payload_json: payload }]);
  } catch (e: unknown) { console.error("Ops log failed:", e); }
}
