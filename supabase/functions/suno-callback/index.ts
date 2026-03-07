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

    if (body.data && body.data.length > 0) {
      const track = body.data[0];
      await supabase.from("songs").update({
        audio_url: track.audio_url || track.audioUrl,
        duration: track.duration ? Math.round(track.duration) : null,
        cover_image_url: track.image_url || track.imageUrl || null,
        status: "ready",
      }).eq("id", songId);
    } else if (body.code !== 200 && body.code !== undefined) {
      await supabase.from("songs").update({ status: "error" }).eq("id", songId);
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
