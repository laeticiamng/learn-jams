// ============================================================
// Edge Function: purge-deleted-accounts
// Hard-deletes all accounts whose 7-day grace period has expired.
// Triggered daily by a pg_cron job. Auth via shared PURGE_CRON_SECRET header.
// ============================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Internal-only: shared secret header set by the pg_cron job
  const expected = Deno.env.get("PURGE_CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: due, error: queryErr } = await supabaseAdmin
      .from("account_deletions")
      .select("user_id")
      .eq("status", "pending")
      .lte("scheduled_purge_at", new Date().toISOString())
      .limit(100);

    if (queryErr) throw queryErr;

    const purged: string[] = [];
    const failed: { user_id: string; error: string }[] = [];

    for (const row of due ?? []) {
      const uid = row.user_id;
      try {
        // Tables keyed by user_id
        const userIdTables = [
          "session_participants",
          "league_points",
          "song_ratings",
          "notifications",
          "favorites",
          "songs",
          "usage_quotas",
          "subscriptions",
          "profiles",
        ];
        for (const t of userIdTables) {
          await supabaseAdmin.from(t).delete().eq("user_id", uid);
        }
        // Tables keyed by creator_id
        await supabaseAdmin.from("collaborative_sessions").delete().eq("creator_id", uid);

        const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
        if (authErr) throw authErr;

        await supabaseAdmin
          .from("account_deletions")
          .update({ status: "purged", purged_at: new Date().toISOString() })
          .eq("user_id", uid);

        purged.push(uid);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        failed.push({ user_id: uid, error: msg });
        console.error(`[purge-deleted-accounts] failed for ${uid}:`, msg);
      }
    }

    console.log(`[purge-deleted-accounts] purged=${purged.length} failed=${failed.length}`);

    return new Response(
      JSON.stringify({ success: true, purged_count: purged.length, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("purge-deleted-accounts error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
