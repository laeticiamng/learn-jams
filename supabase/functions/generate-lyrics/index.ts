// ============================================================
// Edge Function: generate-lyrics (Refactored — Audience-Adaptive)
// Modular prompt with learner profile adaptation
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://learn-jams.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------- Types ----------

interface LearnerLyricsProfile {
  age_band: string;
  education_stage: string;
  declared_level: string;
  language_preference: string;
  explanation_style: string;
  memorization_goal: string;
  confidence: number;
}

interface AudienceAdaptation {
  vocabulary_level: string;
  density_level: string;
  max_concepts_per_verse: number;
  reformulation_intensity: string;
  hook_style: string;
  refrain_style: string;
  punchline_style: string;
  analogy_type: string;
  sentence_length: string;
}

interface GenerateLyricsRequest {
  text: string;
  style: string;
  title?: string;
  language?: string;
  learnerLyricsProfile?: LearnerLyricsProfile;
  subject?: string;
  objective?: string;
}

const DEFAULT_PROFILE: LearnerLyricsProfile = {
  age_band: "unknown",
  education_stage: "unknown",
  declared_level: "unknown",
  language_preference: "auto",
  explanation_style: "balanced",
  memorization_goal: "revise",
  confidence: 0.5,
};

// ---------- Language Utils ----------

function normalizeLanguage(lang: string | undefined | null): string {
  if (!lang) return "fr";
  const base = lang.split("-")[0].split("_")[0].toLowerCase().trim();
  const supported = ["fr", "en", "de", "es", "ar", "zh", "hi"];
  return supported.includes(base) ? base : "fr";
}

const LANG_NAMES: Record<string, string> = {
  fr: "français", en: "English", de: "Deutsch", es: "español",
  ar: "العربية", zh: "中文", hi: "हिन्दी",
};

// ---------- Audience Resolution ----------

const STAGE_ADAPTATIONS: Record<string, AudienceAdaptation> = {
  primary: { vocabulary_level: "simple", density_level: "light", max_concepts_per_verse: 2, reformulation_intensity: "high", hook_style: "direct_concrete", refrain_style: "catchy_simple", punchline_style: "accessible", analogy_type: "everyday_concrete", sentence_length: "short" },
  middle_school: { vocabulary_level: "simple", density_level: "light", max_concepts_per_verse: 3, reformulation_intensity: "high", hook_style: "direct_concrete", refrain_style: "catchy_simple", punchline_style: "accessible", analogy_type: "everyday_concrete", sentence_length: "short" },
  high_school: { vocabulary_level: "intermediate", density_level: "moderate", max_concepts_per_verse: 4, reformulation_intensity: "medium", hook_style: "balanced", refrain_style: "structured", punchline_style: "revision", analogy_type: "mixed", sentence_length: "medium" },
  undergrad: { vocabulary_level: "academic", density_level: "dense", max_concepts_per_verse: 5, reformulation_intensity: "low", hook_style: "balanced", refrain_style: "structured", punchline_style: "exam_precision", analogy_type: "mixed", sentence_length: "medium" },
  graduate: { vocabulary_level: "technical", density_level: "very_dense", max_concepts_per_verse: 6, reformulation_intensity: "none", hook_style: "conceptual_sober", refrain_style: "high_level_anchor", punchline_style: "technical", analogy_type: "abstract_domain", sentence_length: "long" },
  professional: { vocabulary_level: "technical", density_level: "very_dense", max_concepts_per_verse: 6, reformulation_intensity: "none", hook_style: "conceptual_sober", refrain_style: "high_level_anchor", punchline_style: "technical", analogy_type: "abstract_domain", sentence_length: "long" },
  adult_reskilling: { vocabulary_level: "intermediate", density_level: "moderate", max_concepts_per_verse: 4, reformulation_intensity: "medium", hook_style: "balanced", refrain_style: "structured", punchline_style: "revision", analogy_type: "everyday_concrete", sentence_length: "medium" },
  unknown: { vocabulary_level: "intermediate", density_level: "moderate", max_concepts_per_verse: 4, reformulation_intensity: "medium", hook_style: "balanced", refrain_style: "structured", punchline_style: "revision", analogy_type: "mixed", sentence_length: "medium" },
};

const LEVEL_TO_STAGE: Record<string, string> = {
  beginner: "middle_school", intermediate: "high_school", advanced: "undergrad", unknown: "high_school",
};

function resolveAdaptation(profile: LearnerLyricsProfile): AudienceAdaptation {
  if (profile.education_stage !== "unknown" && STAGE_ADAPTATIONS[profile.education_stage]) {
    return STAGE_ADAPTATIONS[profile.education_stage];
  }
  if (profile.declared_level !== "unknown" && LEVEL_TO_STAGE[profile.declared_level]) {
    return STAGE_ADAPTATIONS[LEVEL_TO_STAGE[profile.declared_level]];
  }
  switch (profile.age_band) {
    case "child": case "preteen": return STAGE_ADAPTATIONS.middle_school;
    case "teen": return STAGE_ADAPTATIONS.high_school;
    case "young_adult": return STAGE_ADAPTATIONS.undergrad;
    case "adult": return STAGE_ADAPTATIONS.professional;
    default: return STAGE_ADAPTATIONS.high_school;
  }
}

// ---------- Modular Prompt Builder ----------

function buildSystemPrompt(lang: string, profile: LearnerLyricsProfile): string {
  const adaptation = resolveAdaptation(profile);
  const stageLabel = profile.education_stage !== "unknown" ? profile.education_stage : "general";
  const targetLangName = LANG_NAMES[lang] ?? "français";

  const langIntros: Record<string, string> = {
    fr: `Tu es un expert en pédagogie, mémorisation musicale et écriture de chansons.`,
    en: `You are an expert in pedagogy, musical memorization, and songwriting.`,
    de: `Du bist ein Experte für Pädagogik, musikalisches Auswendiglernen und Songwriting.`,
    es: `Eres un experto en pedagogía, memorización musical y composición de canciones.`,
    ar: `أنت خبير في التعليم والحفظ الموسيقي وكتابة الأغاني.`,
    zh: `你是教育学、音乐记忆和歌词创作方面的专家。`,
    hi: `आप शिक्षाशास्त्र, संगीत स्मृति और गीत लेखन के विशेषज्ञ हैं।`,
  };

  // ── MODULE A: SYSTEM CORE (immutable) ──
  const coreModule = `${langIntros[lang] ?? langIntros.fr}

IMMUTABLE CORE RULES:
1. Transform the course into 100% ORIGINAL song lyrics for MEMORIZATION.
2. SYSTEMATIC use of dominant ASSONANCES — vowel echoes, sound recurrence, auditory memory, scansion.
3. End rhymes exist occasionally but are NEVER the main driver.
4. ABSOLUTE FIDELITY to the source material — never invent a concept absent from the course.
5. Never remove an important subtlety for textual beauty.
6. Never replace a technical term with vague paraphrase if the exact term is needed for exams.
7. Do NOT imitate any real artist's exact style.
8. No filler, no vague phrases, no oversimplification.
9. Priority: useful exhaustiveness + memorization + course fidelity + exam effectiveness.
10. Refrains MUST carry the most critical notions — they are mnemonic hammers, not decoration.`;

  // ── MODULE B: AUDIENCE ADAPTATION ──
  const vocabMap: Record<string, string> = {
    simple: `Use SIMPLE, accessible vocabulary. Reformulate technical terms immediately. SHORT sentences (8-15 words).`,
    intermediate: `Use INTERMEDIATE vocabulary. Technical terms OK with context clues. Moderate sentences (10-20 words).`,
    academic: `Use ACADEMIC vocabulary freely. Fewer reformulations, more density. Technical terms stand alone. (15-25 words).`,
    technical: `Use FULL TECHNICAL vocabulary. Zero infantilization. Precision paramount. Dense, precise formulations. Hooks sober, conceptual — NOT gimmicky.`,
  };

  const densityMap: Record<string, string> = {
    light: `Max ${adaptation.max_concepts_per_verse} NEW concepts per verse. More repetition, more reformulation.`,
    moderate: `Max ${adaptation.max_concepts_per_verse} concepts per verse. Balanced density.`,
    dense: `Up to ${adaptation.max_concepts_per_verse} concepts per verse. Compressed but clear.`,
    very_dense: `Up to ${adaptation.max_concepts_per_verse}+ concepts per verse. Maximum density. Trust the listener.`,
  };

  const hookMap: Record<string, string> = {
    direct_concrete: `Hooks: direct, concrete, relatable to daily life.`,
    balanced: `Hooks: balanced — conceptual but accessible.`,
    conceptual_sober: `Hooks: sober and conceptual. Intellectual elegance.`,
  };

  const refrainMap: Record<string, string> = {
    catchy_simple: `Refrains: very catchy, highly repeatable, simple phrasing.`,
    structured: `Refrains: structured around key concepts. Memorable AND informative.`,
    high_level_anchor: `Refrains: high-level conceptual anchors. NOT simplistic jingles.`,
  };

  const audienceModule = `
AUDIENCE ADAPTATION — Target: ${stageLabel} (${adaptation.vocabulary_level} vocabulary, ${adaptation.density_level} density)
VOCABULARY: ${vocabMap[adaptation.vocabulary_level] ?? vocabMap.intermediate}
DENSITY: ${densityMap[adaptation.density_level] ?? densityMap.moderate}
${hookMap[adaptation.hook_style] ?? hookMap.balanced}
${refrainMap[adaptation.refrain_style] ?? refrainMap.structured}
REFORMULATION INTENSITY: ${adaptation.reformulation_intensity}${adaptation.reformulation_intensity === "high" ? " — After each technical term, immediately provide a plain-language equivalent." : ""}${adaptation.reformulation_intensity === "none" ? " — No reformulations needed. The audience masters the terminology." : ""}
ANALOGIES: ${adaptation.analogy_type}${adaptation.analogy_type === "everyday_concrete" ? " — Use everyday analogies to anchor abstract concepts." : ""}${adaptation.analogy_type === "abstract_domain" ? " — Analogies can stay within the academic domain." : ""}
CRITICAL: Assonances remain MANDATORY at ALL levels. Adapting vocabulary does NOT mean removing sound patterns.`;

  // ── MODULE C: MEMORY OPTIMIZATION ──
  const goalInstructions: Record<string, string> = {
    discover: `Discovery mode: make concepts INTERESTING and memorable on first listen. Strong hooks, vivid imagery.`,
    revise: `Revision mode: structured recall aids. Each verse = a reviewable unit. Refrains summarize exam-critical concepts.`,
    exam: `EXAM mode: every keyword, distinction, exception, trap MUST appear. Punchlines use exam-style formulations. Include mnemonic tricks.`,
    max_retention: `MAXIMUM RETENTION: aggressive repetition, sound patterns, mnemonic structures. Key concepts appear in multiple forms.`,
  };

  const memoryModule = `
MEMORY OPTIMIZATION:
${goalInstructions[profile.memorization_goal] ?? goalInstructions.revise}
- Refrain = mnemonic hammer for most critical notions.
- Distribute concepts logically across verses.
- Intelligent repetitions — same concept, varied phrasing.
- Sound returns (assonances) bind concepts to auditory memory.
- Distinguish traps / exceptions / confusions explicitly.`;

  // ── MODULE D: EXAM PRECISION ──
  const examModule = `
EXAM PRECISION:
- ALL essential keywords MUST appear in the lyrics.
- Fine distinctions and common confusions addressed explicitly.
- Traps and exceptions present — not hidden or simplified away.
- Formulations matching exam language preferred.
- Classifications, lists, sequences: use mnemonic tricks.`;

  // ── MODULE E: OUTPUT CONTRACT ──
  const outputModule = `
OUTPUT FORMAT — STRICT CONTRACT:
Your response MUST have TWO sections separated by the exact line: ---METADATA---

SECTION 1 (LYRICS — before the separator):
- Start with the title (in ${targetLangName})
- Complete lyrics with [Verse 1], [Chorus], [Verse 2], etc.
- Do NOT include intermediate steps — do them mentally.
- Clean, singable lyrics with NO annotations.

SECTION 2 (STUDY NOTES — after ---METADATA---):
In ${targetLangName}:

A) NOTIONS COVERED PER SECTION:
For each verse/chorus: [Section name]: key concepts, keywords, subtleties/traps

B) FLASH REVISION (10-20 ultra-memorable punchlines)

C) EXAM ANCHORS:
- Exact formulations for highest grade
- Critical distinctions, exceptions, traps

D) COVERAGE CHECK-LIST:
- Concepts insufficiently covered or missing

E) AUDIENCE FIT:
- Target level: ${stageLabel}
- Vocabulary register: ${adaptation.vocabulary_level}
- Density: ${adaptation.density_level}
- Simplifications made (if any)
- Technical terms kept deliberately`;

  return [coreModule, audienceModule, memoryModule, examModule, outputModule].join("\n");
}

function buildUserPrompt(text: string, style: string, title: string | undefined, targetLangName: string, subject?: string): string {
  return `REQUESTED MUSICAL STYLE: "${style}"
SUGGESTED TITLE: "${title || 'To be determined'}"
OUTPUT LANGUAGE: ${targetLangName}
${subject ? `SUBJECT: "${subject}"` : ""}

MUSICAL STYLE ADAPTATION (affects rhythm/flow, NOT pedagogical rigor):
- pop: catchy chorus, clear structure | rap: dense flow, punchlines | rnb: melodic, emotional
- rock: energy, scansion | lofi: calm, meditative | edm: rising energy, drops
- spoken-word: poetry, free rhythm | jazz: fluid phrasing | folk: narrative, organic

COURSE TO TRANSFORM INTO A SONG:
---
${text.slice(0, 6000)}
---

Apply the full protocol immediately. Write the lyrics ENTIRELY in ${targetLangName}.
If the course is too long, intelligently split into complementary pieces.`;
}

// ---------- Main Handler ----------

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
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: GenerateLyricsRequest = await req.json();
    const { text, style, title, language, learnerLyricsProfile, subject, objective } = body;
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

    // --- PAYWALL ---
    const userId = claimsData.claims.sub as string;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subData } = await supabaseAdmin
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    const isProUser = subData?.status === "active";
    const FREE_QUOTA = 1;

    if (!isProUser) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: quotaResult, error: quotaError } = await supabaseAdmin.rpc(
        "increment_quota_atomic",
        { p_user_id: userId, p_month: currentMonth, p_limit: FREE_QUOTA },
      );

      if (quotaError) {
        console.error("[generate-lyrics] Quota check error:", quotaError);
        throw new Error("Quota check failed");
      }

      if (!quotaResult.allowed) {
        return new Response(JSON.stringify({
          error: "quota_exceeded",
          used: quotaResult.used,
          limit: FREE_QUOTA,
        }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // --- END PAYWALL ---

    const lang = normalizeLanguage(language);
    const targetLangName = LANG_NAMES[lang];
    const effectiveProfile = learnerLyricsProfile ?? DEFAULT_PROFILE;
    const adaptation = resolveAdaptation(effectiveProfile);

    const systemPrompt = buildSystemPrompt(lang, effectiveProfile);
    const userPrompt = buildUserPrompt(text, style, title, targetLangName, subject);

    console.log(`[generate-lyrics] lang=${lang}, style=${style}, stage=${effectiveProfile.education_stage}, vocab=${adaptation.vocabulary_level}, density=${adaptation.density_level}, goal=${effectiveProfile.memorization_goal}, textLen=${text.length}`);

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

    // Extract title
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

    const adaptationNotes: string[] = [];
    if (effectiveProfile.education_stage !== "unknown") {
      adaptationNotes.push(`Adapted for ${effectiveProfile.education_stage}`);
    }
    if (adaptation.vocabulary_level !== "intermediate") {
      adaptationNotes.push(`Vocabulary: ${adaptation.vocabulary_level}`);
    }
    if (adaptation.density_level !== "moderate") {
      adaptationNotes.push(`Density: ${adaptation.density_level}`);
    }

    // Return enhanced response (backward-compatible: title, lyrics, lyricsMetadata still present)
    return new Response(JSON.stringify({
      title: generatedTitle || title || "StudyBeats Song",
      lyrics,
      canonicalLyrics: lyrics,
      lyricsMetadata,
      audienceProfileUsed: effectiveProfile,
      vocabularyLevel: adaptation.vocabulary_level,
      densityLevel: adaptation.density_level,
      adaptationNotes,
      coverageReport: null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("generate-lyrics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
