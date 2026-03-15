// ============================================================
// COGNITIO Experience Generator Service
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { GenerateExperienceInput, GenerateExperienceOutput } from "@/domain/cognitio/contracts";
import type {
  BrickType,
  MissionContent,
  MissionRoom,
  MissionBossRoom,
  MissionItem,
  FallbackMode,
  QualityBand,
} from "@/domain/cognitio/types";
import {
  getQualityBand,
  getFallbackMode,
  getRoomCount,
  shouldIncludeBoss,
  validateRoomSequence,
} from "@/domain/cognitio/validators";
import { updateIngestionStatus } from "./ingestion.service";

const BRICK_TYPES: BrickType[] = ["TRI", "SEQUENCE", "ELIMINATION", "OBSERVATION", "DECISION"];

export async function runExperienceGenerator(
  input: GenerateExperienceInput
): Promise<GenerateExperienceOutput> {
  await updateIngestionStatus(input.document_id, "generating");

  try {
    const { data, error } = await supabase.functions.invoke("cognitio-generate-experience", {
      body: input,
    });

    if (error) throw new Error(`Experience generation failed: ${error.message}`);

    const result = data as GenerateExperienceOutput;

    // Save mission to database
    await saveMission(input, result);
    await updateIngestionStatus(input.document_id, "generated");

    return result;
  } catch (err) {
    await updateIngestionStatus(input.document_id, "error");
    throw err;
  }
}

// Client-side mission generation for MVP
export function generateMissionLocally(
  input: GenerateExperienceInput
): GenerateExperienceOutput {
  const qualityBand = getQualityBand(input.quality_score);
  const fallbackMode = getFallbackMode(qualityBand);
  const roomCount = getRoomCount(qualityBand);
  const includesBoss = shouldIncludeBoss(qualityBand);

  if (fallbackMode === "synthesis_only") {
    return {
      mission_id: crypto.randomUUID(),
      mission_json: buildSynthesisOnly(input),
      fallback_mode: fallbackMode,
      quality_band: qualityBand,
      room_count: 0,
      includes_boss: false,
    };
  }

  const rooms = buildRooms(input, roomCount);
  const boss = includesBoss ? buildBoss(input) : undefined;

  const mission_json: MissionContent = {
    title: `Mission: ${input.concepts[0]?.type ?? "Apprentissage"}`,
    narrative_intro: buildNarrativeIntro(input, qualityBand),
    rooms,
    boss,
    learning_contract: input.learning_contract,
    visual_anchors: input.visual_anchors,
  };

  return {
    mission_id: crypto.randomUUID(),
    mission_json,
    fallback_mode: fallbackMode,
    quality_band: qualityBand,
    room_count: rooms.length,
    includes_boss: !!boss,
  };
}

function buildNarrativeIntro(input: GenerateExperienceInput, qualityBand: QualityBand): string {
  const topic = input.concepts[0]?.type ?? "ce sujet";
  const base = `Bienvenue dans le service d'urgence pédagogique. Vous êtes confronté à un cas complexe portant sur ${topic}. Chaque salle vous mettra face à une épreuve cognitive.`;

  if (qualityBand === "medium") {
    return base + " Note : la qualité du contenu source est moyenne — certaines salles ont été simplifiées.";
  }
  if (qualityBand === "poor") {
    return base + " Attention : le contenu source est limité — mission réduite au minimum.";
  }
  return base;
}

function buildRooms(input: GenerateExperienceInput, roomCount: number): MissionRoom[] {
  const { concepts, confusion_pairs } = input;
  const rooms: MissionRoom[] = [];

  // Select brick types ensuring no consecutive duplicates
  const selectedBricks = selectBrickSequence(roomCount);

  for (let i = 0; i < roomCount; i++) {
    const brick = selectedBricks[i];
    const roomConcepts = concepts.slice(
      Math.floor((i * concepts.length) / roomCount),
      Math.floor(((i + 1) * concepts.length) / roomCount)
    );

    if (roomConcepts.length === 0) continue;

    rooms.push({
      room_index: i,
      title: `Salle ${i + 1} — ${getBrickLabel(brick)}`,
      narrative_context: getRoomNarrative(brick, i, roomCount),
      brick_type: brick,
      items: buildItems(brick, roomConcepts, confusion_pairs),
      hints: roomConcepts.slice(0, 2).map(c => `Indice : pensez à la définition de "${c.label}"`),
      target_concepts: roomConcepts.map(c => c.stable_key),
      time_limit_sec: 120,
    });
  }

  return rooms;
}

function selectBrickSequence(count: number): BrickType[] {
  const sequence: BrickType[] = [];
  const available = [...BRICK_TYPES];

  // OBSERVATION early, DECISION late
  if (count >= 2) {
    sequence.push("OBSERVATION");
    const remaining = count - 1;
    const middle = available.filter(b => b !== "OBSERVATION" && b !== "DECISION");

    for (let i = 0; i < remaining - 1 && i < middle.length; i++) {
      const next = middle[i % middle.length];
      if (sequence[sequence.length - 1] !== next) {
        sequence.push(next);
      } else {
        sequence.push(middle[(i + 1) % middle.length]);
      }
    }
    sequence.push("DECISION");
  } else {
    sequence.push("OBSERVATION");
  }

  return sequence.slice(0, count);
}

function getBrickLabel(brick: BrickType): string {
  switch (brick) {
    case "TRI": return "Triage";
    case "SEQUENCE": return "Séquençage";
    case "ELIMINATION": return "Élimination";
    case "OBSERVATION": return "Observation";
    case "DECISION": return "Décision";
  }
}

function getRoomNarrative(brick: BrickType, index: number, total: number): string {
  const narratives: Record<BrickType, string> = {
    OBSERVATION: "Vous entrez dans la salle d'observation. Examinez attentivement les éléments présentés et identifiez les concepts clés.",
    TRI: "La salle de triage exige de classer les éléments par catégorie. Chaque erreur de classification peut avoir des conséquences.",
    SEQUENCE: "Vous devez rétablir l'ordre correct des étapes. La chronologie est essentielle.",
    ELIMINATION: "Identifiez l'intrus parmi les propositions. Un seul élément ne correspond pas.",
    DECISION: "Salle de décision critique. Analysez le cas et prenez la meilleure décision fondée sur vos connaissances.",
  };
  return narratives[brick];
}

function buildItems(
  brick: BrickType,
  concepts: GenerateExperienceInput["concepts"],
  confusionPairs: GenerateExperienceInput["confusion_pairs"]
): MissionItem[] {
  return concepts.slice(0, 4).map((concept, i) => ({
    id: crypto.randomUUID(),
    type: brick,
    prompt: buildPrompt(brick, concept),
    options: buildOptions(brick, concept, concepts),
    correct_answer: concept.label,
    explanation: concept.definition,
    concept_key: concept.stable_key,
    bloom_level: concept.bloom_target,
    difficulty: concept.criticality <= 2 ? 4 : 2,
  }));
}

function buildPrompt(brick: BrickType, concept: GenerateExperienceInput["concepts"][0]): string {
  switch (brick) {
    case "OBSERVATION":
      return `Observez et identifiez : ${concept.definition}`;
    case "TRI":
      return `Classez "${concept.label}" dans la bonne catégorie`;
    case "SEQUENCE":
      return `Placez "${concept.label}" dans la séquence correcte`;
    case "ELIMINATION":
      return `Parmi ces éléments liés à "${concept.type}", lequel est l'intrus ?`;
    case "DECISION":
      return `Face à ce cas clinique, quelle est la bonne approche concernant "${concept.label}" ?`;
  }
}

function buildOptions(
  brick: BrickType,
  concept: GenerateExperienceInput["concepts"][0],
  allConcepts: GenerateExperienceInput["concepts"]
): string[] {
  const correct = concept.label;
  const distractors = allConcepts
    .filter(c => c.stable_key !== concept.stable_key)
    .slice(0, 3)
    .map(c => c.label);

  const options = [correct, ...distractors];
  // Shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

function buildBoss(input: GenerateExperienceInput): MissionBossRoom {
  const criticalConcepts = input.concepts.filter(c => c.criticality <= 2);
  const bossItems = criticalConcepts.slice(0, 6).map((concept, i) => {
    const bricks: BrickType[] = ["TRI", "DECISION", "ELIMINATION"];
    const brick = bricks[i % bricks.length];
    return {
      id: crypto.randomUUID(),
      type: brick,
      prompt: buildPrompt(brick, concept),
      options: buildOptions(brick, concept, input.concepts),
      correct_answer: concept.label,
      explanation: concept.definition,
      concept_key: concept.stable_key,
      bloom_level: concept.bloom_target,
      difficulty: 5,
    };
  });

  return {
    title: "Boss Final — Cas complexe",
    narrative_context: "Vous faites face au cas le plus complexe. Toutes vos connaissances seront mises à l'épreuve. Mobilisez tout ce que vous avez appris.",
    brick_types: ["TRI", "DECISION", "ELIMINATION"],
    items: bossItems,
    hints: ["Revenez aux fondamentaux", "Cherchez les distinctions clés"],
    target_concepts: criticalConcepts.map(c => c.stable_key),
    time_limit_sec: 180,
  };
}

function buildSynthesisOnly(input: GenerateExperienceInput): MissionContent {
  return {
    title: `Synthèse: ${input.concepts[0]?.type ?? "Contenu"}`,
    narrative_intro: "La qualité du contenu source ne permet pas de générer une mission interactive complète. Voici une synthèse des concepts identifiés.",
    rooms: [],
    learning_contract: input.learning_contract,
    visual_anchors: input.visual_anchors,
  };
}

async function saveMission(
  input: GenerateExperienceInput,
  result: GenerateExperienceOutput
) {
  const { error } = await (supabase as any)
    .from("generated_missions")
    .insert({
      id: result.mission_id,
      user_id: input.user_id,
      document_id: input.document_id,
      course_profile_id: input.course_profile_id,
      generation_mode: input.objective,
      chosen_format: input.chosen_format,
      narrative_template: "hospital",
      room_count: result.room_count,
      includes_boss: result.includes_boss,
      fallback_mode: result.fallback_mode,
      quality_band: result.quality_band,
      qa_score: 0,
      mission_json: result.mission_json,
      published_status: "draft",
    });

  if (error) throw new Error(`Mission save failed: ${error.message}`);
}

export async function getMission(missionId: string) {
  const { data, error } = await (supabase as any)
    .from("generated_missions")
    .select("*")
    .eq("id", missionId)
    .single();

  if (error) throw new Error(`Mission fetch failed: ${error.message}`);
  return data;
}

export async function getUserMissions(userId: string) {
  const { data, error } = await (supabase as any)
    .from("generated_missions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Missions fetch failed: ${error.message}`);
  return data ?? [];
}
