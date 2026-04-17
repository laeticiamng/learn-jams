// ============================================================
// Edge Function: provider-resend-email
// Proxy to Resend Email API (rate-limited + circuit-breaker)
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

    // Anti-spam: 20 emails / hour / user
    const rl = await enforceRateLimit(
      supabaseAdmin, user.id,
      { bucketKey: "provider:resend-email", maxRequests: 20, windowSeconds: 3600 },
      corsHeaders, req,
    );
    if (rl) return rl;

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("RESEND_API_KEY not configured");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@learn-jams.app";

    const body = await req.json();
    const { to, subject, html, text, reply_to, tags } = body;
    if (!to || !subject) {
      return new Response(JSON.stringify({ error: "to and subject are required" }), {
        status: 400, headers: buildResponseHeaders(req, { "Content-Type": "application/json" }),
      });
    }

    const data = await withCircuitBreaker(supabaseAdmin, "resend", async () => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: body.from ?? fromEmail,
          to: Array.isArray(to) ? to : [to],
          subject,
          html: html ?? undefined,
          text: text ?? undefined,
          reply_to: reply_to ?? undefined,
          tags: tags ?? undefined,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error: ${response.status} ${errorText}`);
      }
      return response.json();
    });

    return new Response(JSON.stringify({ id: data.id, status: "sent" }), {
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
