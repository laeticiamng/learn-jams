// ============================================================
// DEPRECATED: This handler has been consolidated into stripe-webhook.
// Configure your Stripe webhook to point to the stripe-webhook
// function instead. This stub returns 410 Gone.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  console.warn("[webhook-stripe] DEPRECATED — use stripe-webhook instead");
  return new Response(
    JSON.stringify({
      error: "This webhook endpoint is deprecated. Use stripe-webhook instead.",
    }),
    {
      status: 410,
      headers: { "Content-Type": "application/json" },
    },
  );
});
