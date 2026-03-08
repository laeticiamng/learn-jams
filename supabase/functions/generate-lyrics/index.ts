import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Normalize locale codes: fr-FR → fr, en-US → en, etc.
function normalizeLanguage(lang: string | undefined | null): string {
  if (!lang) return "fr";
  const base = lang.split("-")[0].split("_")[0].toLowerCase().trim();
  const supported = ["fr", "en", "de", "es", "ar", "zh", "hi"];
  return supported.includes(base) ? base : "fr";
}

const LANG_NAMES: Record<string, string> = {
  fr: "français", en: "English", de: "Deutsch", es: "español", ar: "العربية", zh: "中文", hi: "हिन्दी",
};

// Dynamic system prompts per language
const SYSTEM_PROMPTS: Record<string, string> = {
  fr: `Tu es un expert en pédagogie, mémorisation musicale et écriture de chansons.

Ta mission : transformer le cours fourni en paroles de chanson 100% originales, conçues pour la mémorisation intégrale du contenu et viser la note maximale de 20/20.

STYLE D'ÉCRITURE :
- Écriture française dense, intelligente, introspective et imagée
- Fluidité orale forte
- Grande musicalité du texte
- Usage SYSTÉMATIQUE d'ASSONANCES dominantes
- Ne t'appuie pas sur des rimes finales classiques comme moteur principal
- Priorité à l'écho vocalique, à la récurrence des sons, à la mémoire auditive et à la scansion
- N'imite pas le style exact d'un artiste réel`,

  en: `You are an expert in pedagogy, musical memorization, and songwriting.

Your mission: transform the provided course material into 100% original song lyrics, designed for complete content memorization and achieving the highest possible grade.

WRITING STYLE:
- Dense, intelligent, introspective, and vivid English writing
- Strong oral fluency
- High musicality in the text
- SYSTEMATIC use of dominant ASSONANCES
- Do NOT rely on end rhymes as the main driver
- Prioritize vowel echoes, sound recurrence, auditory memory, and scansion
- Do not imitate any real artist's exact style`,

  de: `Du bist ein Experte für Pädagogik, musikalisches Auswendiglernen und Songwriting.

Deine Mission: den bereitgestellten Lernstoff in 100% originale Songtexte umwandeln, die für das vollständige Auswendiglernen des Inhalts und die bestmögliche Note konzipiert sind.

SCHREIBSTIL:
- Dichtes, intelligentes, introspektives und bildreiches Deutsch
- Starke mündliche Flüssigkeit
- Hohe Musikalität im Text
- SYSTEMATISCHER Einsatz dominanter ASSONANZEN
- Verlasse dich NICHT auf Endreime als Hauptantrieb
- Priorität auf Vokalechos, Klangwiederholung, auditives Gedächtnis und Rhythmus
- Imitiere keinen realen Künstler`,

  es: `Eres un experto en pedagogía, memorización musical y composición de canciones.

Tu misión: transformar el material de estudio proporcionado en letras de canciones 100% originales, diseñadas para la memorización completa del contenido y lograr la mejor nota posible.

ESTILO DE ESCRITURA:
- Escritura española densa, inteligente, introspectiva y vívida
- Fuerte fluidez oral
- Gran musicalidad en el texto
- Uso SISTEMÁTICO de ASONANCIAS dominantes
- NO te apoyes en rimas finales como motor principal
- Prioriza ecos vocálicos, recurrencia sonora, memoria auditiva y escanción
- No imites el estilo exacto de ningún artista real`,

  ar: `أنت خبير في التعليم والحفظ الموسيقي وكتابة الأغاني.

مهمتك: تحويل المادة الدراسية المقدمة إلى كلمات أغنية أصلية 100%، مصممة للحفظ الكامل للمحتوى وتحقيق أعلى درجة ممكنة.

أسلوب الكتابة:
- كتابة عربية كثيفة وذكية وتأملية وغنية بالصور
- طلاقة شفهية قوية
- موسيقى عالية في النص
- استخدام منهجي للسجع والجناس
- لا تعتمد على القافية النهائية كمحرك رئيسي
- أولوية لأصداء الأصوات والذاكرة السمعية والإيقاع
- لا تقلد أسلوب أي فنان حقيقي`,

  zh: `你是教育学、音乐记忆和歌词创作方面的专家。

你的任务：将提供的课程内容转化为100%原创歌词，旨在完整记忆内容并取得最高分数。

写作风格：
- 密集、智慧、内省且生动的中文写作
- 强烈的口语流畅感
- 文字的高度音乐性
- 系统性地使用押韵和谐音
- 不要依赖尾韵作为主要驱动
- 优先考虑元音回声、声音重复、听觉记忆和节奏
- 不要模仿任何真实艺术家的风格`,

  hi: `आप शिक्षाशास्त्र, संगीत स्मृति और गीत लेखन के विशेषज्ञ हैं।

आपका मिशन: प्रदान की गई पाठ्य सामग्री को 100% मूल गीत बोल में बदलना, जो सामग्री के पूर्ण स्मरण और उच्चतम संभव ग्रेड के लिए डिज़ाइन किए गए हैं।

लेखन शैली:
- सघन, बुद्धिमान, आत्मनिरीक्षणात्मक और जीवंत हिंदी लेखन
- मजबूत मौखिक प्रवाह
- पाठ में उच्च संगीतमयता
- प्रमुख अनुप्रास और स्वर साम्य का व्यवस्थित उपयोग
- अंत्यानुप्रास को मुख्य चालक के रूप में उपयोग न करें
- स्वर प्रतिध्वनि, ध्वनि पुनरावृत्ति, श्रवण स्मृति और लय को प्राथमिकता दें
- किसी भी वास्तविक कलाकार की शैली की नकल न करें`,
};

// Common pedagogical instructions (language-agnostic, kept in English for AI comprehension)
const COMMON_INSTRUCTIONS = `
ABSOLUTE PEDAGOGICAL OBJECTIVE:
The song must enable memorizing:
1. All major ideas from the course
2. All essential keywords
3. All subtleties, nuances, exceptions, traps, fine distinctions
4. All elements classically expected for the highest grade
5. Logical chains between concepts
6. Any criteria, classifications, definitions, procedures, differential diagnoses, complications, indications, contraindications, treatments, monitoring points

METHOD IN 4 STEPS (INTERNAL — do NOT display in final output):

STEP 1 — EXHAUSTIVE EXTRACTION: extract all important points, keywords, subtleties, traps, exceptions, and discriminating points.

STEP 2 — MEMORIZATION PLAN: build the optimal architecture (number of verses, choruses, bridges needed, distribution of concepts per section). The number of sections must be sufficient to cover the entire course without information loss.

STEP 3 — WRITING:
- Each verse covers a logical block of the course
- Each chorus hammers the most grade-relevant concepts
- All essential keywords appear explicitly
- Subtleties are not sacrificed for textual beauty
- Singable / rappable / repeatable text
- Internal assonances, sound returns, intelligent repetitions, auditory anchors
- No filler, no vague phrases, no oversimplification
- Faithful to the course and pedagogically exploitable

STEP 4 — QUALITY CONTROL: verify that all concepts, keywords, and subtleties are present.

ASSONANCE TECHNICAL CONSTRAINT:
- Clear vowel dominance per section if relevant
- Assonances felt within verses
- Strong phonetic coherence
- End rhymes exist occasionally but are never the main driver
- Memorization comes from repeated vowels, cadence, and sound returns

MUSICAL STYLE ADAPTATION:
The requested musical style influences rhythm and flow but NOT pedagogical rigor.
- pop: very catchy chorus, clear structure
- rap: dense flow, mnemonic punchlines
- rnb / r&b: melodic, emotional, vocal harmonies
- rock: energy, strong scansion
- indie: atmospheric, introspective
- country: narrative storytelling, verse-chorus structure
- lofi: calm tone, meditative, gentle repetitions
- edm: rising energy, impactful drops, synths
- house: danceable groove, repetitive, hypnotic
- techno: minimalist, mechanical, percussive
- synthwave: retro 80s, synthetic pads
- drum-and-bass: fast, edgy, deep bass
- reggaeton: danceable rhythm, percussive syllables
- afrobeat: polyrhythmic, festive, African groove
- reggae: offbeat, relaxed, positive message
- latin: Latin rhythms, salsa/cumbia, festive
- kpop: catchy, dynamic, memorable hooks
- bossa-nova: soft, Brazilian, melodic and fluid
- jazz: fluid phrasing, melodic, rich harmonies
- blues: emotional, expressive, 12-bar
- soul: deep, vocal, emotional
- funk: groovy, rhythmic, funky bass
- classical: solemn tone, elevated vocabulary, orchestral
- gospel: powerful, choral, inspiring
- metal: aggressive, powerful, technical
- punk: fast, raw, direct
- acoustic: intimate, acoustic guitar
- folk: traditional, narrative, organic
- ambient: atmospheric, floating, textural
- spoken-word: spoken poetry, free rhythm

If the course is too long, intelligently split into complementary pieces.

FIDELITY RULES:
- Never invent a concept absent from the course
- Never remove an important subtlety
- Never replace a technical term with a vague paraphrase if the exact term is needed
- If a part of the course is ambiguous, flag it rather than invent

QUALITY LEVEL: very high-level result, usable as a serious revision tool.
Absolute priority: useful exhaustiveness + memorization + course fidelity + exam effectiveness.`;

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

    const { text, style, title, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!text || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Course text too short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length > 50000) {
      return new Response(JSON.stringify({ error: "Text too long (max 50,000 characters)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- PAYWALL: Check quota ---
    const userId = claimsData.claims.sub as string;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check subscription status
    const { data: subData } = await supabaseAdmin
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    const isProUser = subData?.status === "active";
    const FREE_QUOTA = 1;

    if (!isProUser) {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const { data: quota } = await supabaseAdmin
        .from("usage_quotas")
        .select("songs_generated")
        .eq("user_id", userId)
        .eq("month", currentMonth)
        .maybeSingle();

      const used = quota?.songs_generated ?? 0;
      if (used >= FREE_QUOTA) {
        console.log(`[generate-lyrics] Quota exceeded for user ${userId}: ${used}/${FREE_QUOTA}`);
        return new Response(JSON.stringify({ 
          error: "quota_exceeded",
          used,
          limit: FREE_QUOTA,
        }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // --- END PAYWALL ---

    const lang = normalizeLanguage(language);
    const targetLang = LANG_NAMES[lang];
    const systemPrompt = SYSTEM_PROMPTS[lang] + "\n" + COMMON_INSTRUCTIONS;

    console.log(`[generate-lyrics] lang=${lang}, targetLang=${targetLang}, style=${style}, textLen=${text.length}`);

    const userPrompt = `REQUESTED MUSICAL STYLE: "${style}"
SUGGESTED TITLE: "${title || 'To be determined'}"
OUTPUT LANGUAGE: ${targetLang}

COURSE TO TRANSFORM INTO A SONG:
---
${text.slice(0, 6000)}
---

Apply the full protocol immediately. Write the lyrics ENTIRELY in ${targetLang}.

IMPORTANT — OUTPUT FORMAT:
Your response must have TWO sections separated by the exact line: ---METADATA---

SECTION 1 (LYRICS — before the separator):
- Start with the title (in ${targetLang})
- Then the complete lyrics with [Verse 1], [Chorus], [Verse 2], etc.
- Do NOT include intermediate steps (extraction, plan, quality control) here — do them mentally.
- These lyrics will be sent to a music AI — they must be CLEAN, singable, with NO annotations.

SECTION 2 (STUDY NOTES — after ---METADATA---):
Provide the following in ${targetLang}:

A) NOTIONS COVERED PER SECTION:
For each verse/chorus, list:
- [Section name]: key concepts covered, essential keywords, subtleties/traps

B) FLASH REVISION (10-20 ultra-memorable punchlines summarizing the course)

C) EXAM ANCHORS:
- The exact or near-exact formulations a student must know to achieve 20/20
- Critical distinctions, exceptions, and traps that are commonly tested

D) COVERAGE CHECK-LIST:
- List any concept from the original course that may be insufficiently covered or missing from the lyrics`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests, try again in a few seconds." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (!content) {
      throw new Error("Empty response from AI");
    }

    // Split lyrics from metadata
    let lyrics = content;
    let lyricsMetadata: string | null = null;
    const metadataSeparator = "---METADATA---";
    const sepIndex = content.indexOf(metadataSeparator);
    if (sepIndex !== -1) {
      lyrics = content.slice(0, sepIndex).trim();
      lyricsMetadata = content.slice(sepIndex + metadataSeparator.length).trim();
    }

    const lines = lyrics.split("\n").filter((l: string) => l.trim());
    let generatedTitle = title || "StudyBeats Song";
    
    const firstLine = lines[0] || "";
    if (firstLine.startsWith("#")) {
      generatedTitle = firstLine.replace(/^#+\s*/, "").trim();
    } else if (/^titre\s*[:：]/i.test(firstLine) || /^title\s*[:：]/i.test(firstLine) || /^título\s*[:：]/i.test(firstLine) || /^titel\s*[:：]/i.test(firstLine)) {
      generatedTitle = firstLine.replace(/^[^:：]+[:：]\s*/i, "").trim();
    } else if (firstLine.length < 80 && !firstLine.startsWith("[")) {
      generatedTitle = firstLine.replace(/[*_]/g, "").trim();
    }

    // --- Increment usage quota ---
    if (!isProUser) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      await supabaseAdmin
        .from("usage_quotas")
        .upsert(
          { user_id: userId, month: currentMonth, songs_generated: 1 },
          { onConflict: "user_id,month" }
        );
      // Increment if row already existed
      await supabaseAdmin.rpc("increment_quota", undefined).catch(() => {
        // Fallback: manual increment
      });
      // Simple approach: upsert then update
      const { data: currentQuota } = await supabaseAdmin
        .from("usage_quotas")
        .select("songs_generated")
        .eq("user_id", userId)
        .eq("month", currentMonth)
        .single();
      if (currentQuota) {
        await supabaseAdmin
          .from("usage_quotas")
          .update({ songs_generated: currentQuota.songs_generated + 1 })
          .eq("user_id", userId)
          .eq("month", currentMonth);
      }
    }
    // --- END increment ---

    return new Response(JSON.stringify({ 
      title: generatedTitle || title || "StudyBeats Song",
      lyrics,
      lyricsMetadata,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lyrics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
