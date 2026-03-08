import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Centralized Suno lyrics sanitizer — replaces terms that trigger SENSITIVE_WORD_ERROR
function sanitizeForSuno(text: string): { cleaned: string; replacedCount: number; replacedWords: string[] } {
  const WORD_REPLACEMENTS: Record<string, string> = {
    // Phosphorus family
    "phosphate": "P-group",
    "phosphates": "P-groups",
    "phosphorylation": "P-transfer",
    "phosphorylated": "P-transferred",
    "dephosphorylation": "de-P-transfer",
    "phospholipid": "P-lipid",
    "phospholipids": "P-lipids",
    "phosphorus": "P-element",
    "phosphodiester": "P-linkage",
    "phosphoenolpyruvate": "PEP-molecule",
    // Nucleotides & energy
    "adenosine": "A-nucleoside",
    "triphosphate": "tri-P-group",
    "diphosphate": "di-P-group",
    "monophosphate": "mono-P-group",
    "guanosine": "G-nucleoside",
    "cytidine": "C-nucleoside",
    "thymidine": "T-nucleoside",
    "uridine": "U-nucleoside",
    "nucleotide": "base-unit",
    "nucleotides": "base-units",
    // Metabolism
    "glycolysis": "sugar-splitting",
    "gluconeogenesis": "sugar-building",
    "glycogenolysis": "glyco-breakdown",
    "glycogenesis": "glyco-synthesis",
    "ketogenesis": "keto-formation",
    "lipolysis": "fat-splitting",
    "proteolysis": "protein-splitting",
    "hydrolysis": "water-splitting",
    "oxidative phosphorylation": "oxy-P-chain",
    // Enzymes commonly flagged
    "ATP synthase": "energy-enzyme",
    "kinase": "transfer-enzyme",
    "kinases": "transfer-enzymes",
    "phosphatase": "P-remover",
    "phosphatases": "P-removers",
    "dehydrogenase": "H-remover",
    "synthetase": "builder-enzyme",
    "synthase": "maker-enzyme",
    // Organelles
    "mitochondria": "power-house",
    "mitochondrial": "power-house",
    "mitochondrion": "power-unit",
    "endoplasmic reticulum": "ER-network",
    "ribosomes": "protein-factories",
    "ribosome": "protein-factory",
    // Photosynthesis & ATP
    "photosynthesis": "light-energy-process",
    "ATP": "energy-molecule",
    "ADP": "spent-energy-molecule",
    "NADH": "electron-shuttle",
    "NADPH": "electron-donor",
    "FADH2": "electron-pair",
    // Other sensitive scientific terms
    "cytochrome": "electron-carrier",
    "ubiquinone": "Q-carrier",
    "nicotinamide": "NAD-base",
    "coenzyme": "co-factor",
    "substrate": "starting-material",
  };

  let cleaned = text;
  const replacedWords: string[] = [];

  for (const [word, replacement] of Object.entries(WORD_REPLACEMENTS)) {
    const pattern = `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`;
    if (new RegExp(pattern, "i").test(cleaned)) {
      replacedWords.push(word);
      cleaned = cleaned.replace(new RegExp(pattern, "gi"), replacement);
    }
  }

  // Remove producer-tag patterns
  cleaned = cleaned.replace(/\b(feat\.?\s+\w+)/gi, "");
  cleaned = cleaned.replace(/\b(produced\s+by\s+\w+)/gi, "");
  cleaned = cleaned.replace(/\b(mixed\s+by\s+\w+)/gi, "");
  cleaned = cleaned.replace(/\b(mastered\s+by\s+\w+)/gi, "");

  return { cleaned, replacedCount: replacedWords.length, replacedWords };
}

const log = (level: "info" | "warn" | "error", step: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({ fn: "generate-music", level, step, ts: new Date().toISOString(), ...data }));
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // JWT Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
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
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { songId, lyrics, style, title, language } = await req.json();
    const userId = claimsData.claims.sub as string;
    log("info", "generation_requested", { song_id: songId, user_id: userId, style, lyrics_len: lyrics?.length });

    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Ownership check — verify the song belongs to the authenticated user
    const { data: songOwner, error: ownerError } = await supabase
      .from("songs")
      .select("user_id")
      .eq("id", songId)
      .single();

    if (ownerError || !songOwner) {
      log("ERROR", "Song not found", { songId });
      return new Response(JSON.stringify({ error: "Song not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (songOwner.user_id !== userId) {
      log("AUTH", "Ownership check failed", { songId, userId, ownerId: songOwner.user_id });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!SUNO_API_KEY) {
      log("DEMO", "No Suno API key, saving as ready without audio", { songId });
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

    // Style mapping
    const styleMap: Record<string, string> = {
      pop: "catchy pop", rap: "hip hop rap", rnb: "r&b soul", rock: "indie rock",
      indie: "indie alternative", country: "country", lofi: "lo-fi chill beats",
      edm: "electronic dance music EDM", house: "deep house", techno: "techno",
      synthwave: "synthwave retro", "drum-and-bass": "drum and bass",
      reggaeton: "reggaeton latin", afrobeat: "afrobeat", reggae: "reggae",
      latin: "latin salsa cumbia", kpop: "k-pop", "bossa-nova": "bossa nova",
      jazz: "smooth jazz", blues: "blues", soul: "soul", funk: "funk groovy",
      classical: "classical orchestral", gospel: "gospel", metal: "heavy metal",
      punk: "punk rock", acoustic: "acoustic", folk: "folk", ambient: "ambient chill",
      "spoken-word": "spoken word poetry", classique: "classical orchestral",
    };

    const langMap: Record<string, string> = {
      fr: "sung in French, French pronunciation",
      en: "sung in English, English pronunciation",
      de: "sung in German, German pronunciation",
      es: "sung in Spanish, Spanish pronunciation",
      ar: "sung in Arabic, Arabic pronunciation",
      zh: "sung in Mandarin Chinese, Chinese pronunciation",
      hi: "sung in Hindi, Hindi pronunciation",
    };
    const langTag = langMap[language] || langMap["en"];
    const sunoStyle = `${styleMap[style] || "pop"}, ${langTag}`;

    // Apply centralized sanitizer
    const { cleaned: cleanLyrics, replacedCount, replacedWords } = sanitizeForSuno(lyrics);
    log("SANITIZE", `Sanitized lyrics`, { songId, replacedCount, replacedWords });

    const response = await fetch("https://api.sunoapi.org/api/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: cleanLyrics.slice(0, 5000),
        style: sunoStyle,
        title: (title || "StudyBeats").slice(0, 80),
        customMode: true,
        instrumental: false,
        model: "V4_5ALL",
        callBackUrl: `${supabaseUrl}/functions/v1/suno-callback?songId=${songId}&secret=${Deno.env.get("SUNO_CALLBACK_SECRET") || ""}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log("ERROR", "Suno API returned error", { songId, status: response.status, errorText });
      
      // Parse error code if possible
      let errorCode = "SUNO_API_ERROR";
      let errorMsg = errorText;
      try {
        const parsed = JSON.parse(errorText);
        errorCode = parsed.code || parsed.error || errorCode;
        errorMsg = parsed.message || parsed.msg || errorText;
      } catch {}

      await supabase.from("songs").update({ 
        status: "error",
        generation_error: errorMsg,
        generation_error_code: errorCode,
        generation_error_at: new Date().toISOString(),
      }).eq("id", songId);

      throw new Error(`Music generation failed: ${errorCode}`);
    }

    const data = await response.json();
    const taskId = data.data?.taskId || null;
    
    await supabase.from("songs").update({
      suno_task_id: taskId,
      status: "generating",
      generation_error: null,
      generation_error_code: null,
      generation_error_at: null,
    }).eq("id", songId);

    log("SUCCESS", "Suno task created", { songId, taskId });

    return new Response(JSON.stringify({ success: true, taskId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log("FATAL", "Unhandled error", { error: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
