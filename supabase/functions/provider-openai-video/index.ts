// ============================================================
// Edge Function: provider-openai-video
// Proxy to OpenAI Sora Video API
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const body = await req.json();

    // Status check
    if (body.action === "status" && body.generation_id) {
      const response = await fetch(
        `https://api.openai.com/v1/videos/generations/${body.generation_id}`,
        {
          headers: { "Authorization": `Bearer ${apiKey}` },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI Video status error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify({
        status: data.status,
        video_url: data.video_url ?? data.output?.url,
        error: data.error,
        progress_percent: data.progress_percent,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate video
    const { prompt, options } = body;

    const response = await fetch("https://api.openai.com/v1/videos/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.model ?? "sora",
        prompt,
        duration: options?.duration_sec ?? 10,
        resolution: options?.resolution ?? "1080p",
        aspect_ratio: options?.aspect_ratio ?? "16:9",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Video API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify({
      generation_id: data.id,
      status: data.status ?? "pending",
      video_url: data.video_url,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
