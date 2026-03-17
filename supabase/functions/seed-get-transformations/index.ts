// ============================================================
// Edge Function: seed-get-transformations
// Return active seed library
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const url = new URL(req.url);
    const format = url.searchParams.get("format");
    const audienceLevel = url.searchParams.get("audience_level");

    let query = supabase
      .from("seed_transformations")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (format) query = query.eq("format", format);
    if (audienceLevel) query = query.eq("audience_level", audienceLevel);

    const { data, error } = await query;
    if (error) throw error;

    return new Response(
      JSON.stringify({ seeds: data ?? [] }),
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
