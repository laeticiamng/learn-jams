import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un expert en pédagogie, mémorisation musicale et écriture rap française.

Ta mission : transformer le cours fourni en paroles de chanson 100% originales, conçues pour la mémorisation intégrale du contenu et viser la note maximale de 20/20.

STYLE D'ÉCRITURE :
- Écriture française dense, intelligente, introspective et imagée
- Fluidité orale forte
- Grande musicalité du texte
- Usage SYSTÉMATIQUE d'ASSONANCES dominantes
- Ne t'appuie pas sur des rimes finales classiques comme moteur principal
- Priorité à l'écho vocalique, à la récurrence des sons, à la mémoire auditive et à la scansion
- N'imite pas le style exact d'un artiste réel

OBJECTIF PÉDAGOGIQUE ABSOLU :
La chanson doit permettre de retenir :
1. Toutes les idées majeures du cours
2. Tous les mots-clés indispensables
3. Toutes les subtilités, nuances, exceptions, pièges, distinctions fines
4. Tous les éléments classiquement attendus pour obtenir 20/20
5. Les enchaînements logiques entre les notions
6. Les éventuels critères, classifications, définitions, conduites à tenir, diagnostics différentiels, complications, indications, contre-indications, traitements, surveillances ou points de vigilance

MÉTHODE EN 4 ÉTAPES (INTERNES — ne pas afficher dans la sortie finale) :

ÉTAPE 1 — EXTRACTION EXHAUSTIVE : extraire tous les points importants, mots-clés, subtilités, pièges, exceptions et points discriminants.

ÉTAPE 2 — PLAN DE MÉMORISATION : construire l'architecture optimale (nombre de couplets, refrains, ponts nécessaires, répartition des notions par section). Le nombre de sections doit être suffisant pour couvrir tout le cours sans perte d'information.

ÉTAPE 3 — RÉDACTION : 
- Chaque couplet couvre un bloc logique du cours
- Chaque refrain martèle les notions les plus rentables pour le 20/20
- Tous les mots-clés essentiels apparaissent explicitement
- Les subtilités ne sont pas sacrifiées au profit de la beauté du texte
- Texte chantable / rappable / répétable
- Assonances internes, retours de sons, répétitions intelligentes, ancrages auditifs
- Pas de remplissage, pas de phrases vagues, pas de simplification excessive
- Fidèle au cours et pédagogiquement exploitable

ÉTAPE 4 — CONTRÔLE QUALITÉ : vérifier que toutes les notions, mots-clés et subtilités sont présents.

CONTRAINTE TECHNIQUE SUR LES ASSONANCES :
- Dominante vocalique claire par section si pertinent
- Assonances ressenties à l'intérieur des vers
- Cohérence phonétique forte
- Les rimes finales existent ponctuellement mais ne sont jamais le moteur principal
- La mémorisation vient des voyelles répétées, de la cadence et des retours sonores

ADAPTATION AU STYLE MUSICAL :
Le style musical demandé influence le rythme et le flow mais PAS la rigueur pédagogique.
- pop : refrain très accrocheur, structure claire
- rap : flow dense, punchlines mnémoniques
- rnb / r&b : mélodique, émotionnel, harmonies vocales
- rock : énergie, scansion forte
- indie : atmosphérique, introspectif
- country : storytelling narratif, structure couplet-refrain
- lofi : ton posé, méditatif, répétitions douces
- edm : énergie montante, drops percutants, synthés
- house : groove dansant, répétitif, hypnotique
- techno : minimaliste, mécanique, percussif
- synthwave : rétro 80s, nappes synthétiques
- drum-and-bass : rapide, nerveux, basse profonde
- reggaeton : rythme dansant, syllabes percussives
- afrobeat : polyrythmique, festif, groove africain
- reggae : offbeat, décontracté, message positif
- latin : rythmes latins, salsa/cumbia, festif
- kpop : accrocheur, dynamique, hooks mémorables
- bossa-nova : doux, brésilien, mélodique et fluide
- jazz : phrasé fluide, mélodique, harmonies riches
- blues : émotionnel, expressif, 12 mesures
- soul : profond, vocal, émotionnel
- funk : groovy, rythmique, basse funky
- classical : ton solennel, vocabulaire soutenu, orchestral
- gospel : puissant, choral, inspirant
- metal : agressif, puissant, technique
- punk : rapide, brut, direct
- acoustic : intimiste, guitare acoustique
- folk : traditionnel, narratif, organique
- ambient : atmosphérique, planant, textural
- spoken-word : poésie parlée, rythme libre

Si le cours est trop long, découpe intelligemment en plusieurs morceaux complémentaires.

RÈGLES DE FIDÉLITÉ :
- Ne jamais inventer une notion absente du cours
- Ne jamais supprimer une subtilité importante
- Ne jamais remplacer un terme technique par une paraphrase floue si le terme exact est nécessaire
- Si une partie du cours est ambiguë, signaler plutôt qu'inventer

NIVEAU D'EXIGENCE : résultat de très haut niveau, utilisable comme outil de révision sérieux.
Priorité absolue : exhaustivité utile + mémorisation + fidélité au cours + efficacité examen.`;

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

    const { text, style, title, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!text || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Texte du cours trop court" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side text size validation (max 50,000 chars)
    if (text.length > 50000) {
      return new Response(JSON.stringify({ error: "Texte trop long (max 50 000 caractères)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `STYLE MUSICAL DEMANDÉ : "${style}"
TITRE SUGGÉRÉ : "${title || 'À déterminer'}"

COURS À TRANSFORMER EN CHANSON :
---
${text.slice(0, 6000)}
---

Applique immédiatement le protocole complet.

IMPORTANT — FORMAT DE SORTIE :
Réponds UNIQUEMENT avec les paroles finales de la chanson, prêtes à être chantées.
- Commence par le titre
- Puis les paroles complètes avec [Couplet 1], [Refrain], [Couplet 2], etc.
- À la fin, ajoute 5-10 punchlines "révision flash" ultra mémorisables résumant le cours
- N'inclus PAS les étapes intermédiaires (extraction, plan, contrôle) dans la sortie — fais-les mentalement.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
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
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (!content) {
      throw new Error("Empty response from AI");
    }

    const lines = content.split("\n").filter((l: string) => l.trim());
    let generatedTitle = title || "Ma chanson StudyBeats";
    
    const firstLine = lines[0] || "";
    if (firstLine.startsWith("#")) {
      generatedTitle = firstLine.replace(/^#+\s*/, "").trim();
    } else if (firstLine.toLowerCase().startsWith("titre")) {
      generatedTitle = firstLine.replace(/^titre\s*[:：]\s*/i, "").trim();
    } else if (firstLine.length < 80 && !firstLine.startsWith("[")) {
      generatedTitle = firstLine.replace(/[*_]/g, "").trim();
    }

    return new Response(JSON.stringify({ 
      title: generatedTitle || title || "Ma chanson StudyBeats",
      lyrics: content 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lyrics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
