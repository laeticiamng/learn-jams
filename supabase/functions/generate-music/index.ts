// ============================================================
// Edge Function: generate-music (Refactored — Canonical/Audio-Safe)
// Separates pedagogical lyrics from provider-sanitized version
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { checkIdempotency } from "../_shared/idempotency.ts";

// CORS headers are now dynamic per-request (see corsHeaders inside serve)
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://learn-jams.lovable.app";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, idempotency-key",
};

// ---------- Sanitizer with full report ----------

interface SanitizerReplacement {
  original: string;
  replacement: string;
  reason: string;
}

interface SanitizerReport {
  cleaned: string;
  replacedCount: number;
  replacedWords: string[];
  replacements: SanitizerReplacement[];
}

function sanitizeForProviderWithReport(text: string): SanitizerReport {
  const WORD_REPLACEMENTS: Record<string, { replacement: string; reason: string }> = {
    // Phosphorus family
    "phosphate": { replacement: "P-group", reason: "Suno content filter" },
    "phosphates": { replacement: "P-groups", reason: "Suno content filter" },
    "phosphorylation": { replacement: "P-transfer", reason: "Suno content filter" },
    "phosphorylated": { replacement: "P-transferred", reason: "Suno content filter" },
    "dephosphorylation": { replacement: "de-P-transfer", reason: "Suno content filter" },
    "phospholipid": { replacement: "P-lipid", reason: "Suno content filter" },
    "phospholipids": { replacement: "P-lipids", reason: "Suno content filter" },
    "phosphorus": { replacement: "P-element", reason: "Suno content filter" },
    "phosphodiester": { replacement: "P-linkage", reason: "Suno content filter" },
    "phosphoenolpyruvate": { replacement: "PEP-molecule", reason: "Suno content filter" },
    // Nucleotides & energy
    "adenosine": { replacement: "A-nucleoside", reason: "Suno content filter" },
    "triphosphate": { replacement: "tri-P-group", reason: "Suno content filter" },
    "diphosphate": { replacement: "di-P-group", reason: "Suno content filter" },
    "monophosphate": { replacement: "mono-P-group", reason: "Suno content filter" },
    "guanosine": { replacement: "G-nucleoside", reason: "Suno content filter" },
    "nucleotide": { replacement: "base-unit", reason: "Suno content filter" },
    "nucleotides": { replacement: "base-units", reason: "Suno content filter" },
    // Metabolism
    "glycolysis": { replacement: "sugar-splitting", reason: "Suno content filter" },
    "gluconeogenesis": { replacement: "sugar-building", reason: "Suno content filter" },
    "glycogenolysis": { replacement: "glyco-breakdown", reason: "Suno content filter" },
    "ketogenesis": { replacement: "keto-formation", reason: "Suno content filter" },
    "lipolysis": { replacement: "fat-splitting", reason: "Suno content filter" },
    "proteolysis": { replacement: "protein-splitting", reason: "Suno content filter" },
    "hydrolysis": { replacement: "water-splitting", reason: "Suno content filter" },
    "oxidative phosphorylation": { replacement: "oxy-P-chain", reason: "Suno content filter" },
    // Enzymes
    "ATP synthase": { replacement: "energy-enzyme", reason: "Suno content filter" },
    "kinase": { replacement: "transfer-enzyme", reason: "Suno content filter" },
    "kinases": { replacement: "transfer-enzymes", reason: "Suno content filter" },
    "phosphatase": { replacement: "P-remover", reason: "Suno content filter" },
    "dehydrogenase": { replacement: "H-remover", reason: "Suno content filter" },
    // Organelles
    "mitochondria": { replacement: "power-house", reason: "Suno content filter" },
    "mitochondrial": { replacement: "power-house", reason: "Suno content filter" },
    "endoplasmic reticulum": { replacement: "ER-network", reason: "Suno content filter" },
    "ribosomes": { replacement: "protein-factories", reason: "Suno content filter" },
    // Energy molecules
    "photosynthesis": { replacement: "light-energy-process", reason: "Suno content filter" },
    "ATP": { replacement: "energy-molecule", reason: "Suno content filter" },
    "ADP": { replacement: "spent-energy-molecule", reason: "Suno content filter" },
    "NADH": { replacement: "electron-shuttle", reason: "Suno content filter" },
    "NADPH": { replacement: "electron-donor", reason: "Suno content filter" },
    "FADH2": { replacement: "electron-pair", reason: "Suno content filter" },
    "cytochrome": { replacement: "electron-carrier", reason: "Suno content filter" },
  };

  let cleaned = text;
  const replacements: SanitizerReplacement[] = [];
  const replacedWords: string[] = [];

  // Sort by longest key first for multi-word matches
  const sortedEntries = Object.entries(WORD_REPLACEMENTS).sort(
    ([a], [b]) => b.length - a.length,
  );

  for (const [word, { replacement, reason }] of sortedEntries) {
    const pattern = `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`;
    const regex = new RegExp(pattern, "gi");
    if (regex.test(cleaned)) {
      replacedWords.push(word);
      replacements.push({ original: word, replacement, reason });
      cleaned = cleaned.replace(new RegExp(pattern, "gi"), replacement);
    }
  }

  // Remove producer-tag patterns
  cleaned = cleaned.replace(/\b(feat\.?\s+\w+)/gi, "");
  cleaned = cleaned.replace(/\b(produced\s+by\s+\w+)/gi, "");
  cleaned = cleaned.replace(/\b(mixed\s+by\s+\w+)/gi, "");
  cleaned = cleaned.replace(/\b(mastered\s+by\s+\w+)/gi, "");

  return { cleaned, replacedCount: replacedWords.length, replacedWords, replacements };
}

// ---------- Logger ----------

const log = (level: "info" | "warn" | "error", step: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({ fn: "generate-music", level, step, ts: new Date().toISOString(), ...data }));
};

// ---------- Main Handler ----------

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
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept both old format (lyrics) and new format (canonicalLyrics)
    const body = await req.json();
    const songId = body.songId;
    const canonicalLyrics = body.canonicalLyrics ?? body.lyrics ?? "";
    const style = body.style;
    const title = body.title;
    const language = body.language;

    const userId = claimsData.claims.sub as string;
    log("info", "generation_requested", { song_id: songId, user_id: userId, style, lyrics_len: canonicalLyrics.length });

    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Idempotency check (prevents duplicate Suno billing on retries/double-clicks)
    const idem = await checkIdempotency(supabase, req, userId, "generate-music", corsHeaders);
    if (idem.cached) return idem.replay();

    // Ownership check
    const { data: songOwner, error: ownerError } = await supabase
      .from("songs")
      .select("user_id")
      .eq("id", songId)
      .single();

    if (ownerError || !songOwner) {
      log("error", "song_not_found", { song_id: songId });
      return new Response(JSON.stringify({ error: "Song not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (songOwner.user_id !== userId) {
      log("error", "ownership_check_failed", { song_id: songId, user_id: userId, owner_id: songOwner.user_id });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate-limit: 10 song generations / hour / user (Suno is expensive)
    const rl = await enforceRateLimit(
      supabase, userId,
      { bucketKey: "generate:song", maxRequests: 10, windowSeconds: 3600 },
      buildCorsHeaders(req), req,
    );
    if (rl) return rl;

    // Apply sanitizer with full report
    const sanitizerReport = sanitizeForProviderWithReport(canonicalLyrics);
    log("info", "sanitized_lyrics", {
      song_id: songId,
      replaced_count: sanitizerReport.replacedCount,
      replaced_words: sanitizerReport.replacedWords,
    });

    // Store canonical and audio-safe lyrics separately
    const updatePayload: Record<string, unknown> = {
      canonical_lyrics: canonicalLyrics,
      generated_lyrics: canonicalLyrics, // Keep backward compat
    };

    if (sanitizerReport.replacedCount > 0) {
      updatePayload.audio_safe_lyrics = sanitizerReport.cleaned;
      updatePayload.sanitizer_report_json = {
        replacedCount: sanitizerReport.replacedCount,
        replacedWords: sanitizerReport.replacedWords,
        replacements: sanitizerReport.replacements,
      };
    }

    if (!SUNO_API_KEY) {
      log("info", "demo_mode", { song_id: songId });
      await supabase.from("songs").update({
        ...updatePayload,
        status: "ready",
      }).eq("id", songId);

      return new Response(JSON.stringify({
        success: true,
        message: "Demo mode - Suno API key not configured. Song saved without audio.",
        songId,
        audioSafeLyrics: sanitizerReport.cleaned,
        sanitizerReport: {
          replacedCount: sanitizerReport.replacedCount,
          replacedWords: sanitizerReport.replacedWords,
          replacements: sanitizerReport.replacements,
        },
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

    // Send audio-safe version to Suno
    const response = await fetch("https://api.sunoapi.org/api/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: sanitizerReport.cleaned.slice(0, 5000),
        style: sunoStyle,
        title: (title || "StudyBeats").slice(0, 80),
        customMode: true,
        instrumental: false,
        model: "V4_5ALL",
        callBackUrl: `${supabaseUrl}/functions/v1/suno-callback?songId=${songId}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log("error", "suno_api_error", { song_id: songId, status: response.status, error_text: errorText });

      let errorCode = "SUNO_API_ERROR";
      let errorMsg = errorText;
      try {
        const parsed = JSON.parse(errorText);
        errorCode = parsed.code || parsed.error || errorCode;
        errorMsg = parsed.message || parsed.msg || errorText;
      } catch {}

      await supabase.from("songs").update({
        ...updatePayload,
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
      ...updatePayload,
      suno_task_id: taskId,
      status: "generating",
      generation_error: null,
      generation_error_code: null,
      generation_error_at: null,
    }).eq("id", songId);

    log("info", "suno_task_created", { song_id: songId, task_id: taskId });

    return new Response(JSON.stringify({
      success: true,
      taskId,
      audioSafeLyrics: sanitizerReport.cleaned,
      sanitizerReport: {
        replacedCount: sanitizerReport.replacedCount,
        replacedWords: sanitizerReport.replacedWords,
        replacements: sanitizerReport.replacements,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    log("error", "unhandled_error", { error: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
