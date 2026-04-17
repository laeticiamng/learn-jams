// ============================================================
// compute-slos — scheduled hourly to compute and store SLO
// measurements from cost_events / function_edge_logs / alerts.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: Record<string, unknown> = {};

  try {
    // ----- 1. music_generation_success -----
    // Source: cost_events with feature_key=music_generation in last hour
    const { data: musicEvents } = await admin
      .from("cost_events")
      .select("metadata_json")
      .eq("feature_key", "music_generation")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    const musicTotal = musicEvents?.length ?? 0;
    const musicOk = (musicEvents ?? []).filter(
      (e) => (e.metadata_json as Record<string, unknown> | null)?.status !== "failed",
    ).length;
    const musicPct = musicTotal === 0 ? 100 : (musicOk / musicTotal) * 100;
    await admin.from("slo_measurements").insert({
      slo_key: "music_generation_success",
      value: musicPct,
      met: musicPct >= 95,
      sample_size: musicTotal,
      metadata_json: { ok: musicOk, total: musicTotal },
    });
    results.music_generation_success = { value: musicPct, sample: musicTotal };

    // ----- 2. api_latency_p95_ms -----
    // Approximation: use cost_events.metadata_json.duration_ms if present
    const { data: latencyEvents } = await admin
      .from("cost_events")
      .select("metadata_json")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(1000);

    const durations = (latencyEvents ?? [])
      .map((e) => Number((e.metadata_json as Record<string, unknown> | null)?.duration_ms))
      .filter((v) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);

    const p95 = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0;
    await admin.from("slo_measurements").insert({
      slo_key: "api_latency_p95_ms",
      value: p95,
      met: p95 <= 3000,
      sample_size: durations.length,
    });
    results.api_latency_p95_ms = { value: p95, sample: durations.length };

    // ----- 3. webhook_delivery_success -----
    // Best-effort: read webhook_events table if exists, else assume 100
    let webhookPct = 100;
    let webhookTotal = 0;
    try {
      const { data: webhookEvents } = await admin
        .from("webhook_events" as never)
        .select("status")
        .gte("received_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(1000);
      const arr = (webhookEvents ?? []) as Array<{ status?: string }>;
      webhookTotal = arr.length;
      const ok = arr.filter((w) => w.status === "processed" || w.status === "ok").length;
      webhookPct = webhookTotal === 0 ? 100 : (ok / webhookTotal) * 100;
    } catch {
      // table optional
    }
    await admin.from("slo_measurements").insert({
      slo_key: "webhook_delivery_success",
      value: webhookPct,
      met: webhookPct >= 99,
      sample_size: webhookTotal,
    });
    results.webhook_delivery_success = { value: webhookPct, sample: webhookTotal };

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compute-slos error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
