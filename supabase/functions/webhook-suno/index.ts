// ============================================================
// Edge Function: webhook-suno
// Suno music generation callback handler
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-suno-signature",
};

const log = (level: string, step: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({ fn: "webhook-suno", level, step, ts: new Date().toISOString(), ...data }));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("x-suno-signature") ?? "";
    const secret = Deno.env.get("SUNO_CALLBACK_SECRET") ?? "";

    // Verify signature
    if (secret) {
      const expected = createHmac("sha256", secret).update(body).digest("hex");
      if (signature !== expected) {
        log("warn", "invalid_signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = JSON.parse(body);
    log("info", "callback_received", { task_id: payload.task_id, status: payload.status });

    // Log webhook event
    const { data: eventRecord } = await supabase
      .from("webhook_events")
      .insert({
        provider_key: "suno",
        event_type: payload.status ?? "callback",
        payload_json: payload,
      })
      .select("id")
      .single();

    // Update song record if task_id matches
    if (payload.task_id && payload.data?.audio_url) {
      const { data: songs } = await supabase
        .from("songs")
        .select("id")
        .eq("suno_task_id", payload.task_id);

      if (songs && songs.length > 0) {
        await supabase
          .from("songs")
          .update({
            audio_url: payload.data.audio_url,
            cover_image_url: payload.data.image_url ?? null,
            duration: payload.data.duration ?? null,
            status: payload.status === "completed" ? "completed" : "failed",
          })
          .eq("suno_task_id", payload.task_id);
      }
    }

    // Also update generation_jobs if linked
    if (payload.task_id) {
      const { data: jobs } = await supabase
        .from("generation_jobs")
        .select("id")
        .eq("domain", "music")
        .contains("input_json", { task_id: payload.task_id });

      if (jobs && jobs.length > 0) {
        const status = payload.status === "completed" ? "completed" : payload.status === "failed" ? "failed" : "running";
        await supabase
          .from("generation_jobs")
          .update({
            status,
            output_json: payload.data ?? {},
            actual_provider_key: "suno",
            finished_at: status !== "running" ? new Date().toISOString() : null,
          })
          .eq("id", jobs[0].id);
      }
    }

    // Mark processed
    if (eventRecord) {
      await supabase.from("webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", eventRecord.id);
    }

    log("info", "callback_processed", { task_id: payload.task_id });
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    log("error", "webhook_error", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
