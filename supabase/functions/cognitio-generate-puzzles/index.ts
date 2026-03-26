// ============================================================
// Edge Function: cognitio-generate-puzzles
// Uses Lovable AI to generate high-quality escape game puzzles
// from analyzed concepts.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConceptInput {
  label: string;
  definition: string;
  compressed_definition?: string;
  criticality: number;
  category?: string;
}

interface PuzzleRequest {
  concepts: ConceptInput[];
  room_type: string;
  difficulty: number; // 1-5
  brick_types: string[]; // OBSERVATION, TRI, SEQUENCE, ELIMINATION, DECISION
  main_topic: string;
  room_index: number;
  total_rooms: number;
}

interface GeneratedPuzzle {
  prompt: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  brick_type: string;
  puzzle_type: string;
  concept_key: string;
  bloom_level: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: PuzzleRequest = await req.json();
    const { concepts, room_type, difficulty, brick_types, main_topic, room_index, total_rooms } = body;

    if (!concepts?.length) {
      return new Response(
        JSON.stringify({ error: "No concepts provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the prompt for AI puzzle generation
    const systemPrompt = `Tu es un expert en pédagogie et en conception de quiz. Tu crées des questions de type escape game éducatif pour aider les étudiants à maîtriser des concepts.

RÈGLES STRICTES :
1. Chaque question doit tester la COMPRÉHENSION réelle, pas la mémorisation brute.
2. Les distracteurs (mauvaises réponses) doivent être PLAUSIBLES et refléter des erreurs courantes.
3. Les questions doivent être variées : pas toujours le même format.
4. L'explication doit clarifier POURQUOI la bonne réponse est correcte ET pourquoi les distracteurs sont faux.
5. Adapte la difficulté : niveau ${difficulty}/5.
6. Ne mentionne JAMAIS de marques éditoriales (CODEX, iKB, S-ECN, etc.).
7. Les options doivent avoir entre 2 et 4 choix.
8. La bonne réponse doit être EXACTEMENT l'une des options.

FORMAT DE SORTIE : Un tableau JSON de puzzles.`;

    const conceptDescriptions = concepts.slice(0, 6).map((c, i) => {
      const def = c.compressed_definition || c.definition;
      return `${i + 1}. "${c.label}" : ${def}${c.category ? ` (catégorie: ${c.category})` : ""}${c.criticality >= 4 ? " [CRITIQUE]" : ""}`;
    }).join("\n");

    const brickInstructions = brick_types.map(b => {
      switch (b) {
        case "OBSERVATION": return "OBSERVATION : Question d'identification ou de reconnaissance. Ex: 'Quel élément correspond à cette description ?'";
        case "TRI": return "TRI : Question de classification. Ex: 'Dans quelle catégorie se classe ce concept ?'";
        case "SEQUENCE": return "SÉQUENCE : Question d'ordonnancement. Ex: 'Quelle est la première étape de ce processus ?'";
        case "ELIMINATION": return "ÉLIMINATION : Question d'intrus. Ex: 'Lequel de ces éléments n'appartient PAS à ce groupe ?'";
        case "DECISION": return "DÉCISION : Question de jugement. Ex: 'Quelle serait la meilleure approche dans ce cas ?'";
        default: return "";
      }
    }).filter(Boolean).join("\n");

    const bloomLevel = difficulty <= 1 ? "remember" : difficulty <= 2 ? "understand" : difficulty <= 3 ? "apply" : difficulty <= 4 ? "analyze" : "evaluate";

    const userPrompt = `Sujet principal : "${main_topic}"
Salle ${room_index + 1}/${total_rooms} (type: ${room_type})
Difficulté : ${difficulty}/5 (niveau Bloom visé : ${bloomLevel})

CONCEPTS À ÉVALUER :
${conceptDescriptions}

TYPES DE PUZZLES À GÉNÉRER :
${brickInstructions}

Génère exactement ${Math.min(concepts.length, 4)} questions, une par concept (dans l'ordre). Chaque question doit correspondre au type de puzzle assigné (dans l'ordre des types fournis, en boucle si nécessaire).

Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans backticks. Chaque élément :
{
  "prompt": "La question posée",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "L'option correcte (texte exact d'une des options)",
  "explanation": "Explication pédagogique détaillée (2-3 phrases)",
  "brick_type": "OBSERVATION|TRI|SEQUENCE|ELIMINATION|DECISION",
  "concept_key": "Le label du concept testé",
  "bloom_level": "${bloomLevel}"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limited", puzzles: [] }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "payment_required", puzzles: [] }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "ai_error", puzzles: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content ?? "";

    // Parse the JSON array from AI response
    let puzzles: GeneratedPuzzle[] = [];
    try {
      // Strip any markdown fencing if present
      const cleaned = content.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
      puzzles = JSON.parse(cleaned);

      // Validate each puzzle
      puzzles = puzzles.filter((p: any) => {
        if (!p.prompt || !p.options || !p.correct_answer || !p.explanation) return false;
        if (!Array.isArray(p.options) || p.options.length < 2) return false;
        // Ensure correct_answer is in options
        if (!p.options.includes(p.correct_answer)) {
          // Try to fix by finding closest match
          const match = p.options.find((o: string) =>
            o.toLowerCase().trim() === p.correct_answer.toLowerCase().trim()
          );
          if (match) {
            p.correct_answer = match;
          } else {
            return false;
          }
        }
        return true;
      });

      // Add puzzle_type mapping
      puzzles = puzzles.map((p: any) => ({
        ...p,
        puzzle_type: mapBrickToPuzzleType(p.brick_type),
      }));
    } catch (parseErr) {
      console.error("Failed to parse AI puzzles:", parseErr, "Content:", content.slice(0, 500));
      puzzles = [];
    }

    return new Response(
      JSON.stringify({ puzzles, ai_generated: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("cognitio-generate-puzzles error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error", puzzles: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapBrickToPuzzleType(brick: string): string {
  const map: Record<string, string> = {
    OBSERVATION: "observation",
    TRI: "classification",
    SEQUENCE: "sequencing",
    ELIMINATION: "elimination",
    DECISION: "decision",
  };
  return map[brick] ?? "observation";
}
