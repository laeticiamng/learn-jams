// ============================================================
// Edge Function: webhook-stripe
// Unified Stripe webhook handler with event logging
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (level: string, step: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({ fn: "webhook-stripe", level, step, ts: new Date().toISOString(), ...data }));
};

const SUPPORTED_EVENTS = new Set([
  "checkout.session.completed",
  "invoice.paid",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    log("info", "event_received", { type: event.type, id: event.id });

    // Log webhook event
    const { data: eventRecord } = await supabase
      .from("webhook_events")
      .insert([{
        provider_key: "stripe",
        event_type: event.type,
        payload_json: event.data.object as Record<string, unknown>,
      }])
      .select("id")
      .single();

    if (!SUPPORTED_EVENTS.has(event.type)) {
      log("info", "event_skipped", { type: event.type });
      if (eventRecord) {
        await supabase.from("webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", eventRecord.id);
      }
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotence: check replay protection table
    const { data: existing } = await supabase
      .from("webhook_replay_protection")
      .select("id")
      .eq("event_id", event.id)
      .maybeSingle();
    if (existing) {
      log("info", "event_already_processed", { type: event.type, id: event.id });
      return new Response(JSON.stringify({ received: true, deduplicated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await supabase.from("webhook_replay_protection").insert([{
      event_id: event.id,
      provider: "stripe",
      event_type: event.type,
    }]);

    // Process event
    const obj = event.data.object as Record<string, unknown>;

    switch (event.type) {
      case "checkout.session.completed": {
        const metadata = obj.metadata as Record<string, string> | undefined;
        const userId = metadata?.user_id ?? (obj.client_reference_id as string | undefined);
        if (userId) {
          await supabase.from("subscriptions").upsert({
            user_id: userId,
            stripe_customer_id: obj.customer as string,
            stripe_subscription_id: obj.subscription as string,
            status: "active",
            current_period_start: new Date().toISOString(),
          }, { onConflict: "user_id" });
        }
        break;
      }

      case "invoice.paid": {
        const subId = obj.subscription as string | undefined;
        if (subId) {
          await supabase.from("subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const periodStart = obj.current_period_start as number | undefined;
        const periodEnd = obj.current_period_end as number | undefined;
        await supabase.from("subscriptions")
          .update({
            status: obj.status as string,
            ...(periodStart ? { current_period_start: new Date(periodStart * 1000).toISOString() } : {}),
            ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
          })
          .eq("stripe_subscription_id", obj.id as string);
        break;
      }

      case "customer.subscription.deleted": {
        await supabase.from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", obj.id as string);
        break;
      }
    }

    // Mark processed
    if (eventRecord) {
      await supabase.from("webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", eventRecord.id);
    }

    log("info", "event_processed", { type: event.type });
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
