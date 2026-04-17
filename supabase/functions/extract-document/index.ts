import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkIdempotency } from "../_shared/idempotency.ts";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://learn-jams.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, idempotency-key",
};

const systemPrompts: Record<string, string> = {
  fr: `Tu es un extracteur de texte. Extrais TOUT le texte visible du document fourni, de manière fidèle et exhaustive. 
Conserve la structure (titres, paragraphes, listes, tableaux).
Ne résume PAS, ne reformule PAS, ne commente PAS.
Retourne uniquement le texte extrait tel quel.
Si le document contient des formules, retranscris-les en texte lisible.
Si certaines parties sont illisibles, indique [illisible].`,
  en: `You are a text extractor. Extract ALL visible text from the provided document, faithfully and exhaustively.
Preserve the structure (headings, paragraphs, lists, tables).
Do NOT summarize, do NOT rephrase, do NOT comment.
Return only the extracted text as-is.
If the document contains formulas, transcribe them as readable text.
If some parts are unreadable, indicate [unreadable].`,
  de: `Du bist ein Textextraktor. Extrahiere den GESAMTEN sichtbaren Text aus dem bereitgestellten Dokument, originalgetreu und vollständig.
Behalte die Struktur bei (Überschriften, Absätze, Listen, Tabellen).
Fasse NICHT zusammen, formuliere NICHT um, kommentiere NICHT.
Gib nur den extrahierten Text zurück.
Wenn das Dokument Formeln enthält, transkribiere sie als lesbaren Text.
Wenn Teile unleserlich sind, kennzeichne sie mit [unleserlich].`,
  es: `Eres un extractor de texto. Extrae TODO el texto visible del documento proporcionado, de manera fiel y exhaustiva.
Conserva la estructura (títulos, párrafos, listas, tablas).
NO resumas, NO reformules, NO comentes.
Devuelve únicamente el texto extraído tal cual.
Si el documento contiene fórmulas, transcríbelas como texto legible.
Si algunas partes son ilegibles, indica [ilegible].`,
};

const userPrompts: Record<string, string> = {
  fr: "Extrais tout le texte de ce document de cours. Retourne uniquement le texte brut extrait, sans commentaire.",
  en: "Extract all the text from this course document. Return only the raw extracted text, without commentary.",
  de: "Extrahiere den gesamten Text aus diesem Kursdokument. Gib nur den rohen extrahierten Text zurück, ohne Kommentar.",
  es: "Extrae todo el texto de este documento de curso. Devuelve solo el texto extraído sin comentarios.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

    const userId = claimsData.claims.sub as string;

    // Idempotency check (admin client for service-role RPC access)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const idem = await checkIdempotency(supabaseAdmin, req, userId, "extract-document", corsHeaders);
    if (idem.cached) return idem.replay();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as string) || "fr";

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 20MB)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const mimeType = file.type || "application/pdf";

    const systemPrompt = systemPrompts[language] || systemPrompts["en"];
    const userPrompt = userPrompts[language] || userPrompts["en"];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessaie dans quelques secondes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits AI épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI extraction failed: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";

    if (!extractedText.trim()) {
      return new Response(JSON.stringify({ error: "Aucun texte n'a pu être extrait du document." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ text: extractedText, fileName: file.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("extract-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
