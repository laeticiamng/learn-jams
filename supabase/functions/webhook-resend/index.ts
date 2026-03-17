// ============================================================
// Edge Function: webhook-resend
// Resend email delivery status webhooks
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

const log = (level: string, step: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({ fn: "webhook-resend", level, step, ts: new Date().toISOString(), ...data }));
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
    const payload = await req.json();
    const eventType = payload.type ?? "unknown";
    log("info", "webhook_received", { type: eventType });

    // Log webhook event
    const { data: eventRecord } = await supabase
      .from("webhook_events")
      .insert([{
        provider_key: "resend",
        event_type: eventType,
        payload_json: payload,
      }])
      .select("id")
      .single();

    // Map Resend events to guardian_notifications status
    const emailId = payload.data?.email_id;
    if (emailId) {
      let notifStatus: string | null = null;

      switch (eventType) {
        case "email.delivered":
          notifStatus = "delivered";
          break;
        case "email.bounced":
          notifStatus = "bounced";
          break;
        case "email.complained":
        case "email.delivery_delayed":
          notifStatus = "failed";
          break;
      }

      if (notifStatus) {
        // Update guardian notifications that match this email
        await supabase
          .from("guardian_notifications")
          .update({
            status: notifStatus,
            delivered_at: notifStatus === "delivered" ? new Date().toISOString() : null,
          })
          .eq("channel", "email")
          .contains("body_json", { resend_email_id: emailId });
      }
    }

    // Mark processed
    if (eventRecord) {
      await supabase.from("webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", eventRecord.id);
    }

    log("info", "webhook_processed", { type: eventType });
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
