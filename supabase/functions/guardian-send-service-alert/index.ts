// ============================================================
// Edge Function: guardian-send-service-alert
// Send real-time alert to guardian (content flag, usage spike, etc.)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRequest {
  guardian_id: string;
  user_id: string;
  alert_type: string;
  message: string;
  severity: "info" | "warning" | "critical";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body: AlertRequest = await req.json();

    if (!body.guardian_id || !body.user_id || !body.alert_type || !body.message) {
      return new Response(
        JSON.stringify({ error: "guardian_id, user_id, alert_type, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify guardian link is active
    const { data: link } = await supabase
      .from("user_guardians")
      .select("status")
      .eq("user_id", body.user_id)
      .eq("guardian_id", body.guardian_id)
      .eq("status", "active")
      .maybeSingle();

    if (!link) {
      return new Response(
        JSON.stringify({ error: "No active guardian link found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check preferences
    const { data: prefs } = await supabase
      .from("guardian_notification_preferences")
      .select("*")
      .eq("guardian_id", body.guardian_id)
      .maybeSingle();

    // Check if alert type is enabled in preferences
    if (prefs) {
      if (body.alert_type === "content_flag" && !prefs.alert_on_content_flag) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "content_alerts_disabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (body.alert_type === "usage_spike" && !prefs.alert_on_usage_spike) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "usage_alerts_disabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (body.alert_type === "new_subject" && !prefs.alert_on_new_subject) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "new_subject_alerts_disabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Check quiet hours
      const now = new Date();
      const hour = now.getHours();
      const quietStart = prefs.quiet_hours_start ?? 22;
      const quietEnd = prefs.quiet_hours_end ?? 7;
      if (body.severity !== "critical") {
        if (quietStart > quietEnd) {
          // Overnight quiet hours (e.g., 22-7)
          if (hour >= quietStart || hour < quietEnd) {
            return new Response(
              JSON.stringify({ skipped: true, reason: "quiet_hours" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        } else if (hour >= quietStart && hour < quietEnd) {
          return new Response(
            JSON.stringify({ skipped: true, reason: "quiet_hours" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // Map alert type to notification type
    const notificationType = body.alert_type === "content_flag"
      ? "content_alert"
      : body.alert_type === "usage_spike"
        ? "usage_alert"
        : "service_alert";

    const alertPayload = {
      alert_type: body.alert_type,
      message: body.message,
      severity: body.severity,
    };

    // Create notification record
    const { data: notification, error: notifError } = await supabase
      .from("guardian_notifications")
      .insert({
        guardian_id: body.guardian_id,
        user_id: body.user_id,
        notification_type: notificationType,
        channel: prefs?.preferred_channel ?? "email",
        subject: `[${body.severity.toUpperCase()}] Alerte — ${body.alert_type}`,
        body_json: alertPayload,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (notifError) throw notifError;

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        alert: alertPayload,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
