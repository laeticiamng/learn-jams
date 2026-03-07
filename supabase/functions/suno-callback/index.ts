import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const songId = url.searchParams.get("songId");
    
    if (!songId) throw new Error("Missing songId");

    const body = await req.json();
    console.log("Suno callback received:", JSON.stringify(body));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const code = body.code;
    const callbackType = body.data?.callbackType;
    const tracks = body.data?.data;

    console.log(`[suno-callback] songId=${songId}, code=${code}, callbackType=${callbackType}, tracks=${tracks?.length || 0}`);

    // Handle error callbacks
    if (code !== 200 || callbackType === "error") {
      console.error(`[suno-callback] Error callback: code=${code}, msg=${body.msg}`);
      await supabase.from("songs").update({ status: "error" }).eq("id", songId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle "text" stage — lyrics generated, music still processing
    if (callbackType === "text") {
      console.log(`[suno-callback] Text stage received, still generating music...`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle "first" or "complete" — at least one track is ready
    if ((callbackType === "first" || callbackType === "complete") && Array.isArray(tracks) && tracks.length > 0) {
      const track = tracks[0];
      const audioUrl = track.audio_url || track.audioUrl || null;
      const updateData: Record<string, unknown> = {
        audio_url: audioUrl,
        duration: track.duration ? Math.round(track.duration) : null,
        cover_image_url: track.image_url || track.imageUrl || null,
        // "first" with audio → ready immediately (streaming ~20s), "complete" → ready with final quality
        status: audioUrl ? "ready" : (callbackType === "complete" ? "error" : "generating"),
      };

      if (!audioUrl && callbackType === "complete") {
        console.error(`[suno-callback] Complete but no audio_url, marking error`);
      }

      await supabase.from("songs").update(updateData).eq("id", songId);
      console.log(`[suno-callback] Updated song ${songId}: status=${updateData.status}, audio=${!!updateData.audio_url}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suno-callback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});