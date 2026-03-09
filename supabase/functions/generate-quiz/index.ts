import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  fr: `Tu es un générateur de quiz pédagogique. À partir d'un cours et de paroles de chanson créées pour mémoriser ce cours, tu dois générer exactement 10 questions QCM.

Règles :
- Chaque question a exactement 4 options (A, B, C, D)
- Varie les types : définitions, associations de concepts, vrai/faux reformulé en QCM, compléter une phrase des paroles
- Les questions doivent tester la compréhension des notions-clés du cours
- Inclus une explication courte (1-2 phrases) pour chaque bonne réponse
- Les mauvaises réponses doivent être plausibles mais clairement fausses
- Mélange des questions sur le contenu du cours et des questions sur les paroles
- Réponds en français`,

  en: `You are a pedagogical quiz generator. From a course and song lyrics created to memorize that course, generate exactly 10 multiple-choice questions.

Rules:
- Each question has exactly 4 options (A, B, C, D)
- Vary types: definitions, concept associations, true/false reformulated as MCQ, complete a phrase from the lyrics
- Questions must test understanding of key course concepts
- Include a short explanation (1-2 sentences) for each correct answer
- Wrong answers must be plausible but clearly incorrect
- Mix questions about course content and lyrics
- Answer in English`,

  de: `Du bist ein pädagogischer Quiz-Generator. Erstelle aus einem Kurs und Songtexten, die zum Auswendiglernen erstellt wurden, genau 10 Multiple-Choice-Fragen. Antworte auf Deutsch.`,

  es: `Eres un generador de cuestionarios pedagógicos. A partir de un curso y letras de canciones creadas para memorizar, genera exactamente 10 preguntas de opción múltiple. Responde en español.`,

  ar: `أنت مولد اختبارات تعليمية. من الدرس وكلمات الأغاني المُنشأة للحفظ، أنشئ 10 أسئلة اختيار من متعدد بالضبط. أجب بالعربية.`,

  zh: `你是一个教育测验生成器。根据课程和为记忆而创建的歌词，生成恰好10道选择题。请用中文回答。`,

  hi: `आप एक शैक्षिक क्विज़ जनरेटर हैं। पाठ्यक्रम और याद रखने के लिए बनाए गए गीत के बोलों से ठीक 10 बहुविकल्पीय प्रश्न उत्पन्न करें। हिंदी में उत्तर दें।`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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
    const { songId, lang } = await req.json();
    if (!songId) {
      return new Response(JSON.stringify({ error: "songId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userLang = (lang || "fr").substring(0, 2).toLowerCase();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: song, error } = await supabase
      .from("songs")
      .select("title, original_text, generated_lyrics, style, subject, user_id")
      .eq("id", songId)
      .single();

    if (error || !song) {
      return new Response(JSON.stringify({ error: "Song not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (song.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = SYSTEM_PROMPTS[userLang] || SYSTEM_PROMPTS["en"];

    const userPrompt = `Course content:
---
${song.original_text}
---

Generated lyrics (style: ${song.style}):
---
${song.generated_lyrics || "No lyrics available"}
---

Subject: ${song.subject || "Not specified"}

Generate 10 MCQ questions.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_quiz",
            description: "Generate a quiz with multiple choice questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                      correctIndex: { type: "number", description: "0-based index of correct option" },
                      explanation: { type: "string" },
                    },
                    required: ["question", "options", "correctIndex", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_quiz" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const quiz = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
