// ============================================================
// Edge Function: provider-openai-tts
// Proxy to OpenAI Audio/Speech API (rate-limited + circuit-breaker)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, buildResponseHeaders } from "../_shared/cors.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { withCircuitBreaker, isCircuitOpenError } from "../_shared/circuitBreaker.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: buildResponseHeaders(req, { "Content-Type": "application/json" }),
      });
    }
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: buildResponseHeaders(req, { "Content-Type": "application/json" }),
      });
    }

    const rl = await enforceRateLimit(
      supabaseAdmin, user.id,
      { bucketKey: "provider:openai-tts", maxRequests: 30, windowSeconds: 3600 },
      corsHeaders, req,
    );
    if (rl) return rl;

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const body = await req.json();
    const { text, options } = body;
    if (!text) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400, headers: buildResponseHeaders(req, { "Content-Type": "application/json" }),
      });
    }
    const format = options?.format ?? "mp3";

    const audioBuffer = await withCircuitBreaker(supabaseAdmin, "openai", async () => {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: options?.voice ?? "alloy",
          speed: options?.speed ?? 1.0,
          response_format: format,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI TTS error: ${response.status} ${errorText}`);
      }
      return response.arrayBuffer();
    });

    return new Response(JSON.stringify({
      audio_base64: base64Encode(audioBuffer),
      format,
    }), {
      headers: buildResponseHeaders(req, { "Content-Type": "application/json" }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    const isCb = isCircuitOpenError(err);
    return new Response(JSON.stringify({ error: message, circuit_open: isCb }), {
      status: isCb ? 503 : 500,
      headers: buildResponseHeaders(req, { "Content-Type": "application/json" }),
    });
  }
});
