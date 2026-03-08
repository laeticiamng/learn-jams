import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (level: "info" | "warn" | "error", step: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({ fn: "suno-callback", level, step, ts: new Date().toISOString(), ...data }));
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const songId = url.searchParams.get("songId");
    const secret = url.searchParams.get("secret");

    if (!songId) throw new Error("Missing songId");

    // Validate callback secret
    const expectedSecret = Deno.env.get("SUNO_CALLBACK_SECRET");
    if (expectedSecret && secret !== expectedSecret) {
      log("error", "invalid_callback_secret", { song_id: songId });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    log("info", "callback_received", { song_id: songId, code: body.code, callback_type: body.data?.callbackType });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const code = body.code;
    const callbackType = body.data?.callbackType;
    const tracks = body.data?.data;

    // Handle error callbacks
    if (code !== 200 || callbackType === "error") {
      const errorMsg = body.msg || body.data?.msg || "Unknown Suno error";
      const errorCode = body.data?.errorCode || `HTTP_${code}`;
      log("error", "error_callback", { song_id: songId, error_code: errorCode, error_msg: errorMsg });

      await supabase.from("songs").update({ 
        status: "error",
        generation_error: errorMsg,
        generation_error_code: errorCode,
        generation_error_at: new Date().toISOString(),
      }).eq("id", songId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle "text" stage — lyrics generated, music still processing
    if (callbackType === "text") {
      log("info", "text_stage", { song_id: songId });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle "first" or "complete" — at least one track is ready
    if ((callbackType === "first" || callbackType === "complete") && Array.isArray(tracks) && tracks.length > 0) {
      const track = tracks[0];
      const audioUrl = track.audio_url || track.audioUrl || null;
      const coverUrl = track.image_url || track.imageUrl || null;
      const duration = track.duration ? Math.round(track.duration) : null;

      const updateData: Record<string, unknown> = {
        audio_url: audioUrl,
        duration,
        cover_image_url: coverUrl,
        status: audioUrl ? "ready" : (callbackType === "complete" ? "error" : "generating"),
        is_final_quality: callbackType === "complete" && !!audioUrl,
        generation_error: null,
        generation_error_code: null,
      };

      if (!audioUrl && callbackType === "complete") {
        updateData.generation_error = "Complete callback but no audio URL";
        updateData.generation_error_code = "NO_AUDIO_URL";
        updateData.generation_error_at = new Date().toISOString();
        log("error", "complete_no_audio", { song_id: songId });
      }

      await supabase.from("songs").update(updateData).eq("id", songId);
      log("UPDATE", `Song updated via ${callbackType}`, { 
        songId, 
        status: updateData.status, 
        isFinal: updateData.is_final_quality, 
        hasAudio: !!audioUrl, 
        hasCover: !!coverUrl, 
        duration 
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log("FATAL", "Unhandled error", { error: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
