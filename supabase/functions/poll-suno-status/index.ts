import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // JWT Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { songId } = await req.json();

    if (!songId) {
      return new Response(JSON.stringify({ error: "Missing songId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
    if (!SUNO_API_KEY) {
      return new Response(JSON.stringify({ error: "Suno API not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the song and verify ownership
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, suno_task_id, status, user_id, created_at")
      .eq("id", songId)
      .single();

    if (songError || !song) {
      return new Response(JSON.stringify({ error: "Song not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (song.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (song.status !== "generating" || !song.suno_task_id) {
      return new Response(JSON.stringify({ status: song.status, message: "No polling needed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Timeout: if generating for more than 10 minutes, mark as error
    const createdAt = new Date(song.created_at || Date.now()).getTime();
    const TEN_MINUTES = 10 * 60 * 1000;
    if (Date.now() - createdAt > TEN_MINUTES) {
      await supabase.from("songs").update({ status: "error" }).eq("id", songId);
      console.log(`[poll-suno] Song ${songId} timed out after 10 minutes`);
      return new Response(JSON.stringify({ status: "error", reason: "timeout" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Query Suno API for task status
    const sunoResponse = await fetch(
      `https://api.sunoapi.org/api/v1/generate/record-info?taskId=${song.suno_task_id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${SUNO_API_KEY}` },
      }
    );

    if (!sunoResponse.ok) {
      const errorText = await sunoResponse.text();
      console.error(`[poll-suno] Suno API error ${sunoResponse.status}:`, errorText);
      return new Response(JSON.stringify({ error: "Failed to poll Suno API" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sunoData = await sunoResponse.json();
    console.log(`[poll-suno] songId=${songId}, taskId=${song.suno_task_id}, sunoStatus=${sunoData.data?.status}`);

    const taskStatus = sunoData.data?.status;
    const tracks = sunoData.data?.response?.sunoData;

    // Map Suno status to our status
    if (taskStatus === "SUCCESS" && Array.isArray(tracks) && tracks.length > 0) {
      const track = tracks[0];
      await supabase.from("songs").update({
        audio_url: track.audioUrl || track.audio_url || null,
        duration: track.duration ? Math.round(track.duration) : null,
        cover_image_url: track.imageUrl || track.image_url || null,
        status: "ready",
      }).eq("id", songId);

      console.log(`[poll-suno] Song ${songId} updated to ready via polling`);
      return new Response(JSON.stringify({ status: "ready", updated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      taskStatus === "CREATE_TASK_FAILED" ||
      taskStatus === "GENERATE_AUDIO_FAILED" ||
      taskStatus === "SENSITIVE_WORD_ERROR" ||
      taskStatus === "CALLBACK_EXCEPTION"
    ) {
      await supabase.from("songs").update({ status: "error" }).eq("id", songId);
      console.log(`[poll-suno] Song ${songId} marked as error: ${taskStatus}`);
      return new Response(JSON.stringify({ status: "error", sunoStatus: taskStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Still processing (PENDING, TEXT_SUCCESS, FIRST_SUCCESS)
    return new Response(JSON.stringify({ status: "generating", sunoStatus: taskStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("poll-suno-status error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});