// ============================================================
// export-user-data — RGPD Article 20 (Right to data portability)
// Returns a JSON archive of the authenticated user's data.
// ============================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkIdempotency } from "../_shared/idempotency.ts";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const uid = user.id;

    // Idempotency: avoid generating duplicate exports
    const idem = await checkIdempotency(supabaseAdmin, req, uid, "export-user-data", corsHeaders);
    if (idem.cached) return idem.replay();

    // Aggregate data in parallel — only own rows (defense-in-depth: filter by user_id everywhere)
    const [
      profileRes, songsRes, favoritesRes, missionsRes, runsRes, transformationsRes,
      streakRes, recallRes, knowledgeRes, leaguePointsRes, subscriptionRes, quotasRes,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabaseAdmin.from("songs").select("*").eq("user_id", uid),
      supabaseAdmin.from("favorites").select("*").eq("user_id", uid),
      supabaseAdmin.from("generated_missions").select("*").eq("user_id", uid),
      supabaseAdmin.from("mission_runs").select("*").eq("user_id", uid),
      supabaseAdmin.from("transformations").select("*").eq("user_id", uid),
      supabaseAdmin.from("daily_streaks").select("*").eq("user_id", uid).maybeSingle(),
      supabaseAdmin.from("recall_attempts").select("*").eq("user_id", uid),
      supabaseAdmin.from("learner_knowledge_graph").select("*").eq("user_id", uid),
      supabaseAdmin.from("league_points").select("*").eq("user_id", uid),
      supabaseAdmin.from("subscriptions").select("*").eq("user_id", uid).maybeSingle(),
      supabaseAdmin.from("usage_quotas_v2").select("*").eq("user_id", uid).maybeSingle(),
    ]);

    const archive = {
      meta: {
        export_version: "1.0",
        generated_at: new Date().toISOString(),
        user_id: uid,
        email: user.email,
        legal_basis: "GDPR Article 20 — Right to data portability",
      },
      auth: { id: uid, email: user.email, created_at: user.created_at },
      profile: profileRes.data ?? null,
      subscription: subscriptionRes.data ?? null,
      quotas: quotasRes.data ?? null,
      streak: streakRes.data ?? null,
      songs: songsRes.data ?? [],
      favorites: favoritesRes.data ?? [],
      missions: missionsRes.data ?? [],
      mission_runs: runsRes.data ?? [],
      transformations: transformationsRes.data ?? [],
      recall_attempts: recallRes.data ?? [],
      knowledge_graph: knowledgeRes.data ?? [],
      league_points: leaguePointsRes.data ?? [],
    };

    return new Response(JSON.stringify(archive, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="cognitio-export-${uid.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    console.error("[export-user-data] error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
