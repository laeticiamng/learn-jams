// ============================================================
// Edge Function: guardian-invite
// Create guardian record and send invite link
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  guardian_email: string;
  guardian_name?: string;
  relationship: string;
  minor_user_id: string;
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

    const body: InviteRequest = await req.json();

    if (!body.guardian_email || !body.minor_user_id || !body.relationship) {
      return new Response(
        JSON.stringify({ error: "guardian_email, minor_user_id, and relationship are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate invite token
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Check if guardian already exists
    const { data: existingGuardian } = await supabase
      .from("guardians")
      .select("id")
      .eq("email", body.guardian_email)
      .maybeSingle();

    let guardianId: string;

    if (existingGuardian) {
      guardianId = existingGuardian.id;
      // Update invite token
      await supabase
        .from("guardians")
        .update({ invite_token: inviteToken, invite_expires_at: expiresAt })
        .eq("id", guardianId);
    } else {
      // Create new guardian
      const { data: newGuardian, error: createError } = await supabase
        .from("guardians")
        .insert({
          email: body.guardian_email,
          display_name: body.guardian_name ?? null,
          invite_token: inviteToken,
          invite_expires_at: expiresAt,
        })
        .select("id")
        .single();

      if (createError) throw createError;
      guardianId = newGuardian.id;
    }

    // Create link (or update if revoked)
    const { data: existingLink } = await supabase
      .from("user_guardians")
      .select("id, status")
      .eq("user_id", body.minor_user_id)
      .eq("guardian_id", guardianId)
      .maybeSingle();

    if (existingLink && existingLink.status === "revoked") {
      await supabase
        .from("user_guardians")
        .update({ status: "pending", revoked_at: null })
        .eq("id", existingLink.id);
    } else if (!existingLink) {
      await supabase
        .from("user_guardians")
        .insert({
          user_id: body.minor_user_id,
          guardian_id: guardianId,
          relationship: body.relationship,
          status: "pending",
        });
    }

    // Record consent event
    await supabase.from("consent_events").insert({
      user_id: body.minor_user_id,
      guardian_id: guardianId,
      event_type: "guardian_invited",
      metadata_json: { guardian_email: body.guardian_email, relationship: body.relationship },
    });

    return new Response(
      JSON.stringify({ guardian_id: guardianId, invite_token: inviteToken }),
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
