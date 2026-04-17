// ============================================================
// Edge Function: provider-openai-llm
// Proxy to OpenAI Responses API (rate-limited + circuit-breaker)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, buildResponseHeaders } from "../_shared/cors.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { withCircuitBreaker, isCircuitOpenError } from "../_shared/circuitBreaker.ts";
import { logAuditEvent, getClientIp } from "../_shared/auditLog.ts";

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

    // Rate-limit: 30 req / hour for LLM
    const rl = await enforceRateLimit(
      supabaseAdmin, user.id,
      { bucketKey: "provider:openai-llm", maxRequests: 30, windowSeconds: 3600 },
      corsHeaders, req,
    );
    if (rl) return rl;

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
      model, input: messages, temperature: options?.temperature ?? 0.7,
    };
    if (options?.max_tokens) requestBody.max_output_tokens = options.max_tokens;
    if (structured && schema) {
      requestBody.text = { format: { type: "json_schema", name: "structured_output", schema } };
    }

    const data = await withCircuitBreaker(supabaseAdmin, "openai", async () => {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
      }
      return response.json();
    });

    const outputText = data.output?.[0]?.content?.[0]?.text ?? "";
    if (structured) {
      try {
        const result = JSON.parse(outputText);
        return new Response(JSON.stringify({ result, usage: data.usage }), {
          headers: buildResponseHeaders(req, { "Content-Type": "application/json" }),
        });
      } catch {
        return new Response(JSON.stringify({ result: outputText, usage: data.usage }), {
          headers: buildResponseHeaders(req, { "Content-Type": "application/json" }),
        });
      }
    }
    return new Response(JSON.stringify({ text: outputText, usage: data.usage, model: data.model }), {
      headers: buildResponseHeaders(req, { "Content-Type": "application/json" }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    const isCb = isCircuitOpenError(err);
    if (!isCb) {
      await logAuditEvent(supabaseAdmin, {
        eventType: "edge_function_error",
        severity: "warning",
        details: { fn: "provider-openai-llm", error: message },
        ipAddress: getClientIp(req),
      }).catch(() => undefined);
    }
    return new Response(JSON.stringify({ error: message, circuit_open: isCb }), {
      status: isCb ? 503 : 500,
      headers: buildResponseHeaders(req, { "Content-Type": "application/json" }),
    });
  }
});
