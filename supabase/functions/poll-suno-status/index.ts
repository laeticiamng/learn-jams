import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://learn-jams.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (level: "info" | "warn" | "error", step: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({ fn: "poll-suno-status", level, step, ts: new Date().toISOString(), ...data }));
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
      log("info", "skip_no_polling", { song_id: songId, status: song.status, has_task_id: !!song.suno_task_id });
      return new Response(JSON.stringify({ status: song.status, message: "No polling needed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Timeout: if generating for more than 10 minutes, mark as error
    const createdAt = new Date(song.created_at || Date.now()).getTime();
    const TEN_MINUTES = 10 * 60 * 1000;
    if (Date.now() - createdAt > TEN_MINUTES) {
      await supabase.from("songs").update({ 
        status: "error",
        generation_error: "Generation timed out after 10 minutes",
        generation_error_code: "TIMEOUT",
        generation_error_at: new Date().toISOString(),
      }).eq("id", songId);
      log("warn", "timeout", { song_id: songId, elapsed: Date.now() - createdAt });
      return new Response(JSON.stringify({ status: "error", reason: "timeout" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Query Suno API for task status
    log("info", "polling_suno", { song_id: songId, task_id: song.suno_task_id });
    const sunoResponse = await fetch(
      `https://api.sunoapi.org/api/v1/generate/record-info?taskId=${song.suno_task_id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${SUNO_API_KEY}` },
      }
    );

    if (!sunoResponse.ok) {
      const errorText = await sunoResponse.text();
      log("error", "suno_api_error", { song_id: songId, status: sunoResponse.status, error_text: errorText });
      return new Response(JSON.stringify({ error: "Failed to poll Suno API" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sunoData = await sunoResponse.json();
    const taskStatus = sunoData.data?.status;
    const tracks = sunoData.data?.response?.sunoData;
    log("info", "suno_response", { song_id: songId, task_id: song.suno_task_id, task_status: taskStatus, track_count: tracks?.length || 0 });

    // Map Suno status to our status
    if (taskStatus === "SUCCESS" && Array.isArray(tracks) && tracks.length > 0) {
      const track = tracks[0];
      const audioUrl = track.audioUrl || track.audio_url || null;
      const coverUrl = track.imageUrl || track.image_url || null;
      const duration = track.duration ? Math.round(track.duration) : null;

      await supabase.from("songs").update({
        audio_url: audioUrl,
        duration,
        cover_image_url: coverUrl,
        status: "ready",
        is_final_quality: true,
        generation_error: null,
        generation_error_code: null,
      }).eq("id", songId);

      log("info", "song_ready", { song_id: songId, has_audio: !!audioUrl, duration });
      return new Response(JSON.stringify({ status: "ready", updated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ERROR_STATUSES = [
      "CREATE_TASK_FAILED",
      "GENERATE_AUDIO_FAILED", 
      "SENSITIVE_WORD_ERROR",
      "CALLBACK_EXCEPTION",
    ];

    if (ERROR_STATUSES.includes(taskStatus)) {
      await supabase.from("songs").update({ 
        status: "error",
        generation_error: `Suno generation failed: ${taskStatus}`,
        generation_error_code: taskStatus,
        generation_error_at: new Date().toISOString(),
      }).eq("id", songId);
      log("error", "song_error", { song_id: songId, task_status: taskStatus });
      return new Response(JSON.stringify({ status: "error", sunoStatus: taskStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Still processing
    log("info", "still_generating", { song_id: songId, task_status: taskStatus });
    return new Response(JSON.stringify({ status: "generating", sunoStatus: taskStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log("error", "unhandled_error", { error: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
