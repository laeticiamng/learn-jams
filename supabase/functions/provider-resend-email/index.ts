// ============================================================
// Edge Function: provider-resend-email
// Proxy to Resend Email API
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
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("RESEND_API_KEY not configured");

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@learn-jams.app";

    const body = await req.json();
    const { to, subject, html, text, reply_to, tags } = body;

    if (!to || !subject) {
      return new Response(JSON.stringify({ error: "to and subject are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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

    const data = await response.json();
    return new Response(JSON.stringify({
      id: data.id,
      status: "sent",
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
