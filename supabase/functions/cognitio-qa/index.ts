// ============================================================
// Edge Function: cognitio-qa
// Quality assurance checks before publishing a mission
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QA_MIN_SCORE = 80;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mission_id, mission_json, concepts, quality_score, source_text } = await req.json();

    const checklist: { check_id: string; label: string; passed: boolean; weight: number; details?: string }[] = [];
    const violations: { violation_type: string; severity: string; message: string; concept_key?: string }[] = [];

    const rooms = mission_json?.rooms ?? [];
    const allItems = rooms.flatMap((r: { items: unknown[] }) => r.items ?? []);

    // Check 1: Active recall present
    const hasRecall = allItems.length > 0;
    checklist.push({ check_id: "has_active_recall", label: "Rappel actif présent", passed: hasRecall, weight: 15 });
    if (!hasRecall) {
      violations.push({ violation_type: "missing_recall", severity: "blocking", message: "Aucun rappel actif" });
    }

    // Check 2: No cognitive overload
    const maxItems = Math.max(...rooms.map((r: { items: unknown[] }) => (r.items ?? []).length), 0);
    const noOverload = maxItems <= 7;
    checklist.push({ check_id: "no_cognitive_overload", label: "Pas de surcharge", passed: noOverload, weight: 10 });
    if (!noOverload) {
      violations.push({ violation_type: "overload", severity: "blocking", message: `${maxItems} items max par salle` });
    }

    // Check 3: Bloom diversity
    const blooms = new Set(allItems.map((i: { bloom_level: string }) => i.bloom_level));
    const bloomOk = blooms.size >= 3;
    checklist.push({ check_id: "bloom_diversity", label: "3+ niveaux Bloom", passed: bloomOk, weight: 10 });

    // Check 4: No hallucination
    const conceptKeys = new Set((concepts ?? []).map((c: { stable_key: string }) => c.stable_key));
    const itemKeys = allItems.map((i: { concept_key: string }) => i.concept_key);
    const unknown = itemKeys.filter((k: string) => !conceptKeys.has(k));
    const noHallucination = unknown.length === 0;
    checklist.push({ check_id: "no_hallucination", label: "Pas de hallucination", passed: noHallucination, weight: 20 });
    if (!noHallucination) {
      violations.push({ violation_type: "hallucination", severity: "blocking", message: `${unknown.length} concept(s) hors source` });
    }

    // Check 5: Critical coverage
    const critical = (concepts ?? []).filter((c: { criticality: number }) => c.criticality === 1);
    const covered = critical.filter((c: { stable_key: string }) => itemKeys.includes(c.stable_key));
    const coverageOk = critical.length === 0 || covered.length / critical.length >= 0.8;
    checklist.push({ check_id: "critical_coverage", label: "Couverture critiques >80%", passed: coverageOk, weight: 15 });

    // Check 6: Explanations
    const hasExplanations = allItems.every((i: { explanation: string }) => i.explanation?.length > 10);
    checklist.push({ check_id: "has_explanations", label: "Explications", passed: hasExplanations, weight: 10 });

    // Check 7: Quality threshold
    const qualityOk = (quality_score ?? 0) >= 0.4;
    checklist.push({ check_id: "quality_threshold", label: "Qualité source", passed: qualityOk, weight: 10 });

    // Check 8: Sequence valid
    const bricks = rooms.map((r: { brick_type: string }) => r.brick_type);
    const seqValid = !bricks.some((b: string, i: number) => i > 0 && b === bricks[i - 1]);
    checklist.push({ check_id: "valid_sequence", label: "Séquence valide", passed: seqValid, weight: 5 });

    // Check 9: Duration
    const reasonable = allItems.length * 0.5 <= 15;
    checklist.push({ check_id: "reasonable_duration", label: "Durée <15min", passed: reasonable, weight: 5 });

    // Score
    const totalWeight = checklist.reduce((s, c) => s + c.weight, 0);
    const passedWeight = checklist.filter((c) => c.passed).reduce((s, c) => s + c.weight, 0);
    const qaScore = Math.round((passedWeight / totalWeight) * 100);

    const hasBlocking = violations.some((v) => v.severity === "blocking");
    const hasHallucination = violations.some((v) => v.violation_type === "hallucination");
    const publishBlocked = qaScore < QA_MIN_SCORE || hasBlocking || hasHallucination;

    const result = {
      qa_score: qaScore,
      checklist_results: checklist,
      violations,
      recommendations: [],
      publish_blocked: publishBlocked,
      block_reason: hasHallucination
        ? "Hallucination conceptuelle — blocage absolu"
        : hasBlocking
          ? "Violation bloquante détectée"
          : qaScore < QA_MIN_SCORE
            ? `Score QA insuffisant (${qaScore}/100)`
            : undefined,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
