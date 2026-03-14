// ============================================================
// Edge Function: provider-openai-llm
// Proxy to OpenAI Responses API (keeps API key server-side)
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
    const { prompt, schema, options, structured } = body;

    const model = options?.model ?? "gpt-4o";
    const messages = [
      ...(options?.system_prompt ? [{ role: "system", content: options.system_prompt }] : []),
      { role: "user", content: prompt },
    ];

    const requestBody: Record<string, unknown> = {
      model,
      input: messages,
      temperature: options?.temperature ?? 0.7,
    };

    if (options?.max_tokens) requestBody.max_output_tokens = options.max_tokens;

    if (structured && schema) {
      requestBody.text = {
        format: {
          type: "json_schema",
          name: "structured_output",
          schema,
        },
      };
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const outputText = data.output?.[0]?.content?.[0]?.text ?? "";

    if (structured) {
      try {
        const result = JSON.parse(outputText);
        return new Response(JSON.stringify({ result, usage: data.usage }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ result: outputText, usage: data.usage }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({
      text: outputText,
      usage: data.usage,
      model: data.model,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
