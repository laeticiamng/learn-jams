import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { songId, lyrics, style, title } = await req.json();
    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!SUNO_API_KEY) {
      // Demo mode: mark song as ready with no audio
      await supabase.from("songs").update({
        status: "ready",
        generated_lyrics: lyrics,
      }).eq("id", songId);

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Demo mode - Suno API key not configured. Song saved without audio.",
        songId 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Suno API
    const styleMap: Record<string, string> = {
      rap: "hip hop rap",
      lofi: "lo-fi chill beats",
      pop: "catchy pop",
      jazz: "smooth jazz",
      rock: "indie rock",
      "spoken-word": "spoken word poetry",
      reggaeton: "reggaeton latin",
      classique: "classical orchestral",
    };

    const response = await fetch("https://api.sunoapi.org/api/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: lyrics.slice(0, 1500),
        style: styleMap[style] || "pop",
        title: title,
        customMode: true,
        instrumental: false,
        model: "V4",
        callBackUrl: `${supabaseUrl}/functions/v1/suno-callback?songId=${songId}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Suno API error:", errorText);
      await supabase.from("songs").update({ status: "error" }).eq("id", songId);
      throw new Error("Music generation failed");
    }

    const data = await response.json();
    
    await supabase.from("songs").update({
      suno_task_id: data.data?.taskId || null,
      status: "generating",
    }).eq("id", songId);

    return new Response(JSON.stringify({ success: true, taskId: data.data?.taskId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-music error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
