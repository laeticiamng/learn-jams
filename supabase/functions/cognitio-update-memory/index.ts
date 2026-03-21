// ============================================================
// Edge Function: cognitio-update-memory
// Update learner knowledge graph after test completion
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://learn-jams.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── JWT Authentication ──────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { user_id, mission_run_id, test_type, results } = await req.json();

    if (!user_id || !results?.length) {
      return new Response(JSON.stringify({ error: "user_id and results required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updatedConcepts = [];

    for (const result of results) {
      const { concept_key, is_correct, confidence, time_taken_ms } = result;

      // Get or create knowledge node
      const { data: existing } = await supabase
        .from("learner_knowledge_graph")
        .select("*")
        .eq("user_id", user_id)
        .eq("concept_stable_key", concept_key)
        .single();

      const currentScore = existing?.mastery_score ?? 0;
      const currentObs = existing?.observations_count ?? 0;
      const currentConfusion = existing?.confusion_hits ?? 0;

      const delta = is_correct ? 0.15 : -0.1;
      const newScore = Math.max(0, Math.min(1, currentScore + delta));

      let newStatus = "unknown";
      if (currentObs + 1 >= 1) {
        if (newScore >= 0.85) newStatus = "mastered";
        else if (newScore >= 0.6) newStatus = "learning";
        else if (newScore >= 0.3) newStatus = "fragile";
      }

      const illusion = confidence > 0.7 && !is_correct;

      // Compute next review
      const now = new Date();
      let daysUntilReview = 1;
      if (newScore >= 0.85) daysUntilReview = test_type === "j7" ? 30 : 7;
      else if (newScore >= 0.6) daysUntilReview = test_type === "j7" ? 7 : 3;
      const nextReview = new Date(now.getTime() + daysUntilReview * 86400000).toISOString();

      if (existing) {
        await supabase
          .from("learner_knowledge_graph")
          .update({
            mastery_score: newScore,
            mastery_status: newStatus,
            last_seen_at: now.toISOString(),
            next_review_at: nextReview,
            observations_count: currentObs + 1,
            confusion_hits: illusion ? currentConfusion + 1 : currentConfusion,
            updated_at: now.toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("learner_knowledge_graph")
          .insert([{
            user_id,
            concept_stable_key: concept_key,
            mastery_score: newScore,
            mastery_status: newStatus,
            last_seen_at: now.toISOString(),
            next_review_at: nextReview,
            observations_count: 1,
            confusion_hits: illusion ? 1 : 0,
          }]);
      }

      updatedConcepts.push({
        concept_key,
        new_mastery_score: newScore,
        new_mastery_status: newStatus,
        next_review_at: nextReview,
        illusion_detected: illusion,
      });
    }

    // Update learner profile session count
    const { data: profile } = await supabase
      .from("learner_profiles")
      .select("session_count")
      .eq("user_id", user_id)
      .single();

    if (profile) {
      await supabase
        .from("learner_profiles")
        .update({
          session_count: (profile.session_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user_id);
    }

    const accuracy = results.filter((r: { is_correct: boolean }) => r.is_correct).length / results.length;

    return new Response(JSON.stringify({
      updated_concepts: updatedConcepts,
      retention_snapshot: { j0: accuracy },
      format_efficacy: null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
