// ============================================================
// Edge Function: guardian-send-weekly-summary
// Compile and send weekly activity summary to guardian
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://learn-jams.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SummaryRequest {
  guardian_id: string;
  user_id: string;
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

    const body: SummaryRequest = await req.json();

    if (!body.guardian_id || !body.user_id) {
      return new Response(
        JSON.stringify({ error: "guardian_id and user_id are required" }),
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

    // Get guardian info and preferences
    const { data: guardian } = await supabase
      .from("guardians")
      .select("email, display_name")
      .eq("id", body.guardian_id)
      .single();

    const { data: prefs } = await supabase
      .from("guardian_notification_preferences")
      .select("*")
      .eq("guardian_id", body.guardian_id)
      .maybeSingle();

    if (prefs && !prefs.weekly_summary_enabled) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "weekly_summary_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Compile weekly stats
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { count: sessionsCount } = await supabase
      .from("product_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", body.user_id)
      .eq("event_name", "transformation_started")
      .gte("created_at", weekAgo);

    const { data: recentEvents } = await supabase
      .from("product_events")
      .select("metadata_json")
      .eq("user_id", body.user_id)
      .gte("created_at", weekAgo)
      .limit(100);

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", body.user_id)
      .maybeSingle();

    const subjects = new Set<string>();
    for (const event of recentEvents ?? []) {
      const meta = event.metadata_json as Record<string, unknown> | null;
      if (meta?.subject && typeof meta.subject === "string") {
        subjects.add(meta.subject);
      }
    }

    const summaryPayload = {
      minor_display_name: profile?.display_name ?? "Votre enfant",
      period_start: weekAgo,
      period_end: new Date().toISOString(),
      sessions_count: sessionsCount ?? 0,
      subjects_studied: Array.from(subjects),
      content_flags: [],
    };

    // Create notification record
    const { data: notification, error: notifError } = await supabase
      .from("guardian_notifications")
      .insert([{
        guardian_id: body.guardian_id,
        user_id: body.user_id,
        notification_type: "weekly_summary",
        channel: prefs?.preferred_channel ?? "email",
        subject: `Résumé hebdomadaire — ${summaryPayload.minor_display_name}`,
        body_json: summaryPayload,
        status: "sent",
        sent_at: new Date().toISOString(),
      }])
      .select("id")
      .single();

    if (notifError) throw notifError;

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        summary: summaryPayload,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
