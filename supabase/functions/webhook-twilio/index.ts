// ============================================================
// Edge Function: webhook-twilio
// Twilio SMS delivery status callbacks
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (level: string, step: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({ fn: "webhook-twilio", level, step, ts: new Date().toISOString(), ...data }));
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
    // Twilio sends form-urlencoded data
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    const messageSid = payload.MessageSid ?? "";
    const messageStatus = payload.MessageStatus ?? payload.SmsStatus ?? "";
    log("info", "status_callback", { sid: messageSid, status: messageStatus });

    // Log webhook event
    const { data: eventRecord } = await supabase
      .from("webhook_events")
      .insert([{
        provider_key: "twilio",
        event_type: messageStatus,
        payload_json: payload as unknown as Record<string, unknown>,
      }])
      .select("id")
      .single();

    // Map Twilio statuses to guardian_notifications
    if (messageSid) {
      let notifStatus: string | null = null;

      switch (messageStatus) {
        case "delivered":
          notifStatus = "delivered";
          break;
        case "sent":
          notifStatus = "sent";
          break;
        case "failed":
        case "undelivered":
          notifStatus = "failed";
          break;
      }

      if (notifStatus) {
        await supabase
          .from("guardian_notifications")
          .update({
            status: notifStatus,
            delivered_at: notifStatus === "delivered" ? new Date().toISOString() : null,
            error_message: messageStatus === "failed" ? (payload.ErrorMessage ?? null) : null,
          })
          .eq("channel", "sms")
          .contains("body_json", { twilio_message_sid: messageSid });
      }
    }

    // Mark processed
    if (eventRecord) {
      await supabase.from("webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", eventRecord.id);
    }

    log("info", "callback_processed", { sid: messageSid });
    // Twilio expects 200 with XML or empty body
    return new Response("<Response></Response>", {
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    log("error", "webhook_error", { message });
    return new Response("<Response></Response>", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  }
});
