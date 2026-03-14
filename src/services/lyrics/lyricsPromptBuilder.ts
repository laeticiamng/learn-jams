// ============================================================
// Lyrics Prompt Builder — Modular prompt construction
// ============================================================

import type { LearnerLyricsProfile, AudienceAdaptation } from "@/domain/lyrics/learnerProfile.types";
import type { LyricsPromptModules } from "@/domain/lyrics/lyricsPrompt.types";
import { DEFAULT_LEARNER_LYRICS_PROFILE } from "@/domain/lyrics/learnerProfile.types";
import { resolveAudienceAdaptation } from "./audienceLyricsAdaptation";

// ---------- Module A: System Core (immutable) ----------

function buildSystemCore(lang: string): string {
  const langPrompts: Record<string, string> = {
    fr: `Tu es un expert en pédagogie, mémorisation musicale et écriture de chansons.`,
    en: `You are an expert in pedagogy, musical memorization, and songwriting.`,
    de: `Du bist ein Experte für Pädagogik, musikalisches Auswendiglernen und Songwriting.`,
    es: `Eres un experto en pedagogía, memorización musical y composición de canciones.`,
    ar: `أنت خبير في التعليم والحفظ الموسيقي وكتابة الأغاني.`,
    zh: `你是教育学、音乐记忆和歌词创作方面的专家。`,
    hi: `आप शिक्षाशास्त्र, संगीत स्मृति और गीत लेखन के विशेषज्ञ हैं।`,
  };

  return `${langPrompts[lang] ?? langPrompts.fr}

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
}

// ---------- Module B: Audience Adaptation ----------

function buildAudienceModule(profile: LearnerLyricsProfile, adaptation: AudienceAdaptation): string {
  const stageLabel = profile.education_stage !== "unknown" ? profile.education_stage : "general";

  const vocabInstructions: Record<string, string> = {
    simple: `- Use SIMPLE, accessible vocabulary. Reformulate technical terms immediately after introducing them.
- Prefer concrete, everyday words. Avoid jargon unless absolutely necessary (and always explain it).
- Sentences should be SHORT (8-15 words max per line).`,
    intermediate: `- Use INTERMEDIATE vocabulary. Technical terms are OK but provide context clues.
- Balance precision with readability. Mix concrete and abstract.
- Sentences of moderate length (10-20 words per line).`,
    academic: `- Use ACADEMIC vocabulary freely. Assume the listener knows foundational terminology.
- Compress: fewer reformulations, more density. Technical terms stand alone.
- Sentences can be longer and more complex (15-25 words per line).`,
    technical: `- Use FULL TECHNICAL vocabulary. Zero infantilization. Precision is paramount.
- Assume expert-level familiarity with the domain. Use exact terminology.
- Dense, precise formulations. Subtleties and exceptions fully integrated.
- Hooks and refrains are sober, conceptual — NOT gimmicky or "jeuniste".`,
  };

  const densityInstructions: Record<string, string> = {
    light: `- Maximum ${adaptation.max_concepts_per_verse} NEW concepts per verse. More repetition, more reformulation.`,
    moderate: `- Maximum ${adaptation.max_concepts_per_verse} concepts per verse. Balanced density.`,
    dense: `- Up to ${adaptation.max_concepts_per_verse} concepts per verse. Compressed but clear.`,
    very_dense: `- Up to ${adaptation.max_concepts_per_verse}+ concepts per verse. Maximum information density. Trust the listener.`,
  };

  const hookInstructions: Record<string, string> = {
    direct_concrete: `- Hooks: direct, concrete, relatable to daily life. Grab attention with something tangible.`,
    balanced: `- Hooks: balanced — conceptual but accessible. Intriguing without being simplistic.`,
    conceptual_sober: `- Hooks: sober and conceptual. Intellectual elegance over catchy gimmicks.`,
  };

  const refrainInstructions: Record<string, string> = {
    catchy_simple: `- Refrains: very catchy, highly repeatable, simple phrasing. The listener should sing along after 1-2 hearings.`,
    structured: `- Refrains: structured around key concepts. Memorable AND informative.`,
    high_level_anchor: `- Refrains: high-level conceptual anchors. Synthesize the core thesis. NOT simplistic jingles.`,
  };

  return `AUDIENCE ADAPTATION — Target: ${stageLabel} (${adaptation.vocabulary_level} vocabulary, ${adaptation.density_level} density)

VOCABULARY REGISTER:
${vocabInstructions[adaptation.vocabulary_level] ?? vocabInstructions.intermediate}

INFORMATION DENSITY:
${densityInstructions[adaptation.density_level] ?? densityInstructions.moderate}

HOOKS:
${hookInstructions[adaptation.hook_style] ?? hookInstructions.balanced}

REFRAINS:
${refrainInstructions[adaptation.refrain_style] ?? refrainInstructions.structured}

REFORMULATION INTENSITY: ${adaptation.reformulation_intensity}
${adaptation.reformulation_intensity === "high" ? "- After each technical term, immediately provide a plain-language equivalent in the same line or next line." : ""}
${adaptation.reformulation_intensity === "none" ? "- No reformulations needed. The audience masters the terminology." : ""}

ANALOGIES: ${adaptation.analogy_type}
${adaptation.analogy_type === "everyday_concrete" ? "- Use everyday analogies (kitchen, sports, daily life) to anchor abstract concepts." : ""}
${adaptation.analogy_type === "abstract_domain" ? "- Analogies can stay within the academic domain. No need for everyday simplifications." : ""}

CRITICAL: Assonances remain MANDATORY at ALL levels. Adapting vocabulary does NOT mean removing sound patterns.`;
}

// ---------- Module C: Memory Optimization ----------

function buildMemoryModule(goal: string): string {
  const goalSpecific: Record<string, string> = {
    discover: `- Discovery mode: focus on making concepts INTERESTING and memorable on first listen.
- Strong hooks, vivid imagery, curiosity-driven structure.`,
    revise: `- Revision mode: structured recall aids. Each verse = a reviewable unit.
- Refrains summarize the most exam-critical concepts.`,
    exam: `- EXAM mode: every keyword, distinction, exception, and trap MUST appear.
- Punchlines use exam-style formulations. Chorus hammers grade-relevant concepts.
- Include mnemonic tricks for lists, sequences, classifications.`,
    max_retention: `- MAXIMUM RETENTION mode: aggressive use of repetition, sound patterns, and mnemonic structures.
- Refrains repeated strategically. Key concepts appear in multiple forms across verses.
- Prioritize long-term recall over single-listen comprehension.`,
  };

  return `MEMORY OPTIMIZATION:
${goalSpecific[goal] ?? goalSpecific.revise}

UNIVERSAL MEMORY RULES:
- Refrain = mnemonic hammer for the most critical notions.
- Distribute concepts logically across verses (no information dump).
- Use intelligent repetitions — same concept, varied phrasing.
- Sound returns (assonances) bind concepts to auditory memory.
- Distinguish traps / exceptions / confusions explicitly.
- Variations between verses to avoid monotony while reinforcing core ideas.`;
}

// ---------- Module D: Exam Precision ----------

function buildExamModule(): string {
  return `EXAM PRECISION REQUIREMENTS:
- ALL essential keywords from the course MUST appear in the lyrics.
- Fine distinctions and common confusions MUST be addressed explicitly.
- Traps and exceptions MUST be present — not hidden or simplified away.
- Formulations that match exam language are preferred over creative paraphrases.
- Classifications, lists, sequences: use mnemonic tricks (acronyms, phonetic patterns).
- If a concept has a canonical definition, include it or a faithful near-equivalent.`;
}

// ---------- Module E: Output Contract ----------

function buildOutputContract(lang: string, targetLangName: string): string {
  return `OUTPUT FORMAT — STRICT CONTRACT:
Your response MUST have TWO sections separated by the exact line: ---METADATA---

SECTION 1 (LYRICS — before the separator):
- Start with the title (in ${targetLangName})
- Then the complete lyrics with [Verse 1], [Chorus], [Verse 2], etc.
- Do NOT include intermediate steps (extraction, plan, quality control) — do them mentally.
- These lyrics will be sent to a music AI — they must be CLEAN, singable, with NO annotations.

SECTION 2 (STUDY NOTES — after ---METADATA---):
Provide the following in ${targetLangName}:

A) NOTIONS COVERED PER SECTION:
For each verse/chorus, list:
- [Section name]: key concepts covered, essential keywords, subtleties/traps

B) FLASH REVISION (10-20 ultra-memorable punchlines summarizing the course)

C) EXAM ANCHORS:
- The exact or near-exact formulations a student must know for the highest grade
- Critical distinctions, exceptions, and traps that are commonly tested

D) COVERAGE CHECK-LIST:
- List any concept from the original course that may be insufficiently covered or missing from the lyrics

E) AUDIENCE FIT:
- Target level used
- Vocabulary register applied
- Density level
- Simplifications made (if any)
- Technical terms kept deliberately`;
}

// ---------- Exports ----------

const LANG_NAMES: Record<string, string> = {
  fr: "français", en: "English", de: "Deutsch", es: "español",
  ar: "العربية", zh: "中文", hi: "हिन्दी",
};

export function buildPromptModules(
  lang: string,
  profile?: LearnerLyricsProfile | null,
): LyricsPromptModules {
  const effectiveProfile = profile ?? DEFAULT_LEARNER_LYRICS_PROFILE;
  const adaptation = resolveAudienceAdaptation(effectiveProfile);
  const targetLangName = LANG_NAMES[lang] ?? "français";

  return {
    systemCore: buildSystemCore(lang),
    audienceAdaptation: buildAudienceModule(effectiveProfile, adaptation),
    memoryOptimization: buildMemoryModule(effectiveProfile.memorization_goal),
    examPrecision: buildExamModule(),
    outputContract: buildOutputContract(lang, targetLangName),
  };
}

export function assembleSystemPrompt(modules: LyricsPromptModules): string {
  return [
    modules.systemCore,
    "",
    modules.audienceAdaptation,
    "",
    modules.memoryOptimization,
    "",
    modules.examPrecision,
    "",
    modules.outputContract,
  ].join("\n");
}

export function buildUserPrompt(input: {
  text: string;
  style: string;
  title?: string;
  targetLangName: string;
  subject?: string;
}): string {
  return `REQUESTED MUSICAL STYLE: "${input.style}"
SUGGESTED TITLE: "${input.title || 'To be determined'}"
OUTPUT LANGUAGE: ${input.targetLangName}
${input.subject ? `SUBJECT: "${input.subject}"` : ""}

COURSE TO TRANSFORM INTO A SONG:
---
${input.text.slice(0, 6000)}
---

Apply the full protocol immediately. Write the lyrics ENTIRELY in ${input.targetLangName}.

MUSICAL STYLE ADAPTATION:
The requested musical style influences rhythm and flow but NOT pedagogical rigor.
- pop: very catchy chorus, clear structure
- rap: dense flow, mnemonic punchlines
- rnb / r&b: melodic, emotional, vocal harmonies
- rock: energy, strong scansion
- lofi: calm tone, meditative, gentle repetitions
- edm: rising energy, impactful drops
- spoken-word: spoken poetry, free rhythm
If the course is too long, intelligently split into complementary pieces.`;
}
