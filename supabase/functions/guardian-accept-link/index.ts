// ============================================================
// Edge Function: guardian-accept-link
// Verify invite token and activate guardian link
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptRequest {
  token: string;
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

    const body: AcceptRequest = await req.json();

    if (!body.token) {
      return new Response(
        JSON.stringify({ error: "token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Find guardian by invite token
    const { data: guardian, error: findError } = await supabase
      .from("guardians")
      .select("*")
      .eq("invite_token", body.token)
      .maybeSingle();

    if (findError || !guardian) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired invite token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check expiration
    if (guardian.invite_expires_at && new Date(guardian.invite_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Invite token has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Link guardian to auth user if authenticated
    const authHeader = req.headers.get("Authorization");
    let authUserId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      authUserId = user?.id ?? null;
    }

    const now = new Date().toISOString();

    // Update guardian record
    await supabase
      .from("guardians")
      .update({
        verified_at: now,
        auth_user_id: authUserId,
        invite_token: null,
        invite_expires_at: null,
      })
      .eq("id", guardian.id);

    // Activate all pending links for this guardian
    const { data: links } = await supabase
      .from("user_guardians")
      .select("id, user_id")
      .eq("guardian_id", guardian.id)
      .eq("status", "pending");

    if (links && links.length > 0) {
      await supabase
        .from("user_guardians")
        .update({ status: "active", granted_at: now })
        .eq("guardian_id", guardian.id)
        .eq("status", "pending");

      // Record consent events for each link
      for (const link of links) {
        await supabase.from("consent_events").insert({
          user_id: link.user_id,
          guardian_id: guardian.id,
          event_type: "guardian_accepted",
          metadata_json: { accepted_by_auth_user: authUserId },
        });
      }
    }

    // Create default notification preferences
    await supabase
      .from("guardian_notification_preferences")
      .upsert(
        {
          guardian_id: guardian.id,
          weekly_summary_enabled: true,
          alert_on_content_flag: true,
          alert_on_usage_spike: false,
          alert_on_new_subject: false,
          preferred_channel: "email",
          preferred_locale: "fr",
        },
        { onConflict: "guardian_id" },
      );

    return new Response(
      JSON.stringify({ success: true, guardian_id: guardian.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
