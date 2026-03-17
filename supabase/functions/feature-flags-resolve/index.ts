// ============================================================
// Edge Function: feature-flags-resolve
// Return resolved feature flags for user
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_FLAGS: Record<string, boolean> = {
  ff_dynamic_sheet_enabled: true,
  ff_animated_story_enabled: true,
  ff_seed_library_enabled: true,
  ff_guardian_loop_enabled: false,
  ff_institution_mode_enabled: false,
  ff_lyrics_adaptive_enabled: false,
  ff_audio_safe_lyrics_split_enabled: false,
  ff_experiments_enabled: false,
  ff_admin_dashboards_enabled: false,
  ff_extended_disclaimers_enabled: true,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Extract user
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id ?? null;
    }

    const { data, error } = await supabase
      .from("feature_flags")
      .select("flag_key, enabled, rules_json");

    if (error || !data) {
      return new Response(
        JSON.stringify({ flags: DEFAULT_FLAGS }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const flags = { ...DEFAULT_FLAGS };
    for (const row of data) {
      const key = row.flag_key as string;
      if (key in flags) {
        flags[key] = evaluateFlag(row.enabled, row.rules_json, userId);
      }
    }

    return new Response(
      JSON.stringify({ flags }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ flags: DEFAULT_FLAGS }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function evaluateFlag(
  enabled: boolean,
  rules: Record<string, unknown> | null,
  userId: string | null,
): boolean {
  if (!enabled) return false;
  if (!rules || Object.keys(rules).length === 0) return true;

  const blocklist = rules.blocklist as string[] | undefined;
  if (userId && blocklist?.includes(userId)) return false;

  const allowlist = rules.allowlist as string[] | undefined;
  if (userId && allowlist?.includes(userId)) return true;

  const rollout = rules.rollout_percentage as number | undefined;
  if (rollout !== undefined && rollout < 100) {
    if (!userId) return false;
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0;
    }
    return (Math.abs(hash) % 100) < rollout;
  }

  return true;
}
