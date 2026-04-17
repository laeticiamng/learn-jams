// ============================================================
// Edge Function: provider-openai-image
// Proxy to OpenAI GPT Image API (rate-limited + circuit-breaker)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    // Image generation is expensive: 10 req / hour
    const rl = await enforceRateLimit(
      supabaseAdmin, user.id,
      { bucketKey: "provider:openai-image", maxRequests: 10, windowSeconds: 3600 },
      corsHeaders, req,
    );
    if (rl) return rl;

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const body = await req.json();
    const { prompt, options } = body;

    const data = await withCircuitBreaker(supabaseAdmin, "openai", async () => {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          n: options?.n ?? 1,
          size: options?.size ?? "1024x1024",
          quality: options?.quality ?? "standard",
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI Image API error: ${response.status} ${errorText}`);
      }
      return response.json();
    });

    return new Response(JSON.stringify({
      images: data.data.map((img: any) => ({ url: img.url, base64: img.b64_json })),
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
