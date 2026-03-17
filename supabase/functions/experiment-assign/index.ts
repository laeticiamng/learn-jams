// ============================================================
// Edge Function: experiment-assign
// Assign user to experiment variant
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VARIANTS = ["control", "baseline_summary", "dynamic_sheet", "animated_story"];

interface AssignRequest {
  experiment_key: string;
  anonymous_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body: AssignRequest = await req.json();

    if (!body.experiment_key) {
      return new Response(
        JSON.stringify({ error: "experiment_key is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract user
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id ?? null;
    }

    // Check existing
    let query = supabase
      .from("experiment_assignments")
      .select("*")
      .eq("experiment_key", body.experiment_key);

    if (userId) query = query.eq("user_id", userId);
    else if (body.anonymous_id) query = query.eq("anonymous_id", body.anonymous_id);

    const { data: existing } = await query.maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({ assignment: existing }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Random assignment
    const variant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];

    const { data, error } = await supabase
      .from("experiment_assignments")
      .insert({
        user_id: userId,
        anonymous_id: body.anonymous_id ?? null,
        experiment_key: body.experiment_key,
        variant,
      })
      .select("*")
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ assignment: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
