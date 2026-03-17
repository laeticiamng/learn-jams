// ============================================================
// COGNITIO Experience Generator Service
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
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
import { selectMissionFamily, selectMissionSubTheme, selectUniverseProfile, type AudienceLevel, type MissionFamily, type MissionSubTheme } from "@/domain/cognitio/escapeGame.types";
import { cleanMainTopic, isEditorialArtifact } from "@/lib/cognitio-semantic-cleaning";

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
  } catch (err: unknown) {
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

  // Determine mission theme from course subject
  const audienceLevel = resolveAudienceLevel(input.estimated_audience_level);
  const topicType = input.concepts[0]?.type ?? input.main_topic ?? "";
  const missionFamily = selectMissionFamily(topicType, audienceLevel);
  const subTheme = selectMissionSubTheme(missionFamily, topicType);
  const universeProfile = selectUniverseProfile(audienceLevel);

  const rooms = buildRooms(input, roomCount, subTheme);
  const boss = includesBoss ? buildBoss(input, subTheme) : undefined;

  // P0: Clean main topic to prevent editorial artifacts in mission title
  const rawTopicLabel = input.main_topic || input.concepts[0]?.type || "Apprentissage";
  const cleanedTopicLabel = cleanMainTopic(rawTopicLabel);
  const topicLabel = (cleanedTopicLabel.length >= 3 && !isEditorialArtifact(cleanedTopicLabel))
    ? cleanedTopicLabel
    : "Apprentissage";
  const mission_json: MissionContent = {
    title: `Mission: ${topicLabel}`,
    narrative_intro: buildThemedNarrativeIntro(topicLabel, subTheme, qualityBand),
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

// ---------- Audience Level Resolution ----------

function resolveAudienceLevel(raw?: string): AudienceLevel {
  if (!raw) return "university";
  const lower = raw.toLowerCase();
  if (lower.includes("collège") || lower.includes("college") || lower === "college") return "college";
  if (lower.includes("lycée") || lower.includes("lycee") || lower === "lycee") return "lycee";
  if (lower.includes("prépa") || lower.includes("prepa") || lower === "prepa") return "prepa";
  if (lower.includes("médec") || lower.includes("medic") || lower === "medical") return "medical";
  if (lower.includes("droit") || lower.includes("law") || lower === "law") return "law";
  if (lower.includes("pro") || lower === "adult_pro") return "adult_pro";
  return "university";
}

// ---------- Themed Narrative Generation ----------

const MISSION_FAMILY_NARRATIVES: Record<MissionFamily, {
  intro: (topic: string) => string;
  roomNarratives: Record<BrickType, string>;
  bossIntro: string;
}> = {
  clinical_simulation: {
    intro: (topic) => `Vous prenez en charge un dossier clinique complexe portant sur "${topic}". Chaque salle représente une étape de votre raisonnement médical. Mobilisez vos connaissances pour prendre les bonnes décisions.`,
    roomNarratives: {
      OBSERVATION: "Consultez le dossier du patient. Analysez les éléments cliniques et identifiez les données pertinentes.",
      TRI: "Triez les informations cliniques. Classez les éléments selon leur pertinence diagnostique.",
      SEQUENCE: "Organisez les étapes de la prise en charge. L'ordre est crucial pour la sécurité du patient.",
      ELIMINATION: "Éliminez les diagnostics différentiels. Un seul élément ne correspond pas au tableau clinique.",
      DECISION: "Décision thérapeutique. Choisissez la conduite à tenir la plus adaptée au contexte clinique.",
    },
    bossIntro: "Cas complexe final — Toutes les dimensions de votre raisonnement clinique sont mises à l'épreuve.",
  },
  legal_reasoning: {
    intro: (topic) => `Un dossier juridique vous est confié sur le thème "${topic}". Chaque salle est une étape de votre analyse. Construisez un raisonnement rigoureux pour résoudre ce cas.`,
    roomNarratives: {
      OBSERVATION: "Étudiez les pièces du dossier. Identifiez les faits et les normes applicables.",
      TRI: "Qualifiez les faits juridiques. Distinguez les éléments de droit des éléments de fait.",
      SEQUENCE: "Reconstituez la chronologie juridique. L'ordre des événements détermine l'issue du litige.",
      ELIMINATION: "Écartez les arguments non pertinents. Un seul ne résiste pas à l'examen juridique.",
      DECISION: "Rendez votre décision. Appliquez le droit aux faits pour trancher cette question.",
    },
    bossIntro: "Plaidoirie finale — Mobilisez l'ensemble de votre raisonnement juridique.",
  },
  scientific_discovery: {
    intro: (topic) => `Vous menez une investigation scientifique sur "${topic}". Chaque salle est une étape de votre démarche expérimentale. Observez, analysez, et concluez.`,
    roomNarratives: {
      OBSERVATION: "Observez les données expérimentales. Identifiez les variables et les constantes.",
      TRI: "Classifiez les résultats. Organisez les données selon les catégories scientifiques pertinentes.",
      SEQUENCE: "Ordonnez les étapes du protocole. La rigueur méthodologique est essentielle.",
      ELIMINATION: "Identifiez l'anomalie. Un résultat est incompatible avec les autres observations.",
      DECISION: "Formulez votre conclusion scientifique. Quelle hypothèse les données valident-elles ?",
    },
    bossIntro: "Épreuve de synthèse — Intégrez toutes vos observations pour résoudre le problème.",
  },
  logic_sequencing: {
    intro: (topic) => `Un système complexe lié à "${topic}" nécessite votre expertise. Chaque salle teste votre capacité de raisonnement logique et de résolution de problèmes.`,
    roomNarratives: {
      OBSERVATION: "Analysez les données du système. Repérez les patterns et les relations logiques.",
      TRI: "Catégorisez les éléments. Chaque composant a sa place dans l'architecture logique.",
      SEQUENCE: "Reconstituez l'algorithme. L'ordre des opérations détermine le résultat.",
      ELIMINATION: "Détectez l'erreur logique. Un élément ne respecte pas la cohérence du système.",
      DECISION: "Concevez la solution optimale. Quel choix architectural résout le problème ?",
    },
    bossIntro: "Diagnostic système final — Résolvez le problème en mobilisant toutes vos compétences.",
  },
  investigation: {
    intro: (topic) => `Vous menez une enquête approfondie sur "${topic}". Chaque salle révèle de nouveaux indices. Reconstituez le puzzle pour comprendre la situation dans sa globalité.`,
    roomNarratives: {
      OBSERVATION: "Examinez les indices disponibles. Chaque détail peut être significatif.",
      TRI: "Classez les témoignages et les preuves. Distinguez les faits des interprétations.",
      SEQUENCE: "Reconstituez la chronologie des événements. L'ordre éclaire les causes.",
      ELIMINATION: "Écartez les fausses pistes. Une seule hypothèse ne tient pas à l'examen.",
      DECISION: "Formulez votre conclusion. Quelle explication est la plus cohérente avec les faits ?",
    },
    bossIntro: "Synthèse finale — Rassemblez tous les éléments pour résoudre l'enquête.",
  },
  exploration: {
    intro: (topic) => `Bienvenue dans cette expédition à la découverte de "${topic}". Chaque salle recèle des défis à relever. Explorez, apprenez et progressez !`,
    roomNarratives: {
      OBSERVATION: "Explorez votre environnement. Repérez les éléments importants autour de vous.",
      TRI: "Organisez vos découvertes. Classez les éléments pour mieux les comprendre.",
      SEQUENCE: "Remettez les étapes dans l'ordre. La chronologie révèle le sens.",
      ELIMINATION: "Trouvez l'intrus ! Un élément n'a pas sa place parmi les autres.",
      DECISION: "À vous de choisir ! Quelle est la meilleure réponse selon ce que vous avez appris ?",
    },
    bossIntro: "Défi final — Montrez tout ce que vous avez appris durant cette exploration !",
  },
  crisis: {
    intro: (topic) => `Alerte ! Une situation critique liée à "${topic}" nécessite votre intervention immédiate. Chaque salle est une étape de la gestion de crise. Restez concentré et prenez les bonnes décisions.`,
    roomNarratives: {
      OBSERVATION: "Évaluez la situation. Identifiez rapidement les éléments critiques.",
      TRI: "Priorisez les actions. Dans l'urgence, le triage est essentiel.",
      SEQUENCE: "Appliquez le protocole dans l'ordre. Chaque étape compte.",
      ELIMINATION: "Écartez les fausses alarmes. Concentrez-vous sur les vrais problèmes.",
      DECISION: "Décision d'urgence. Le temps presse — prenez la meilleure décision possible.",
    },
    bossIntro: "Gestion de crise finale — Résolvez la situation en mobilisant toutes vos compétences.",
  },
  progressive_method: {
    intro: (topic) => `Vous suivez un parcours d'apprentissage progressif sur "${topic}". Chaque salle construit sur la précédente. Maîtrisez les fondamentaux avant de passer au niveau suivant.`,
    roomNarratives: {
      OBSERVATION: "Découvrez les fondamentaux. Observez et identifiez les concepts de base.",
      TRI: "Structurez vos connaissances. Organisez les notions par catégorie.",
      SEQUENCE: "Construisez la progression. Chaque notion s'appuie sur la précédente.",
      ELIMINATION: "Testez votre compréhension. Identifiez ce qui ne correspond pas.",
      DECISION: "Appliquez vos connaissances. Résolvez ce cas en intégrant tout ce que vous avez appris.",
    },
    bossIntro: "Évaluation finale — Démontrez votre maîtrise complète du sujet.",
  },
};

function buildThemedNarrativeIntro(topic: string, subTheme: MissionSubTheme, qualityBand: QualityBand): string {
  const base = subTheme.intro(topic);

  if (qualityBand === "medium") {
    return base + " Note : la qualité du contenu source est moyenne — certaines salles ont été simplifiées.";
  }
  if (qualityBand === "poor") {
    return base + " Attention : le contenu source est limité — mission réduite au minimum.";
  }
  return base;
}

function buildRooms(input: GenerateExperienceInput, roomCount: number, subTheme: MissionSubTheme): MissionRoom[] {
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

    // P0 FIX: Use rooms.length for sequential indexing instead of loop index
    // to prevent gaps when rooms are skipped (e.g., "Salle 2" without "Salle 1")
    const roomNumber = rooms.length;
    rooms.push({
      room_index: roomNumber,
      title: `Salle ${roomNumber + 1} — ${getBrickLabel(brick)}`,
      narrative_context: subTheme.roomNarratives[brick],
      brick_type: brick,
      items: buildItems(brick, roomConcepts, confusion_pairs),
      hints: buildProgressiveHints(roomConcepts),
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

// getThemedRoomNarrative kept for backward compat with flat family narratives
function getThemedRoomNarrative(brick: BrickType, family: MissionFamily): string {
  return MISSION_FAMILY_NARRATIVES[family].roomNarratives[brick];
}

function buildProgressiveHints(concepts: GenerateExperienceInput["concepts"]): string[] {
  const hints: string[] = [];
  if (concepts.length > 0) {
    hints.push(`Indice 1 : Pensez à la définition de "${concepts[0].label}".`);
  }
  if (concepts.length > 1) {
    hints.push(`Indice 2 : Comparez "${concepts[0].label}" avec "${concepts[1].label}" — qu'est-ce qui les distingue ?`);
  }
  if (concepts.length > 0 && concepts[0].definition) {
    hints.push(`Indice 3 : ${concepts[0].definition.slice(0, 100)}${concepts[0].definition.length > 100 ? "…" : ""}`);
  }
  return hints;
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

function buildBoss(input: GenerateExperienceInput, subTheme: MissionSubTheme): MissionBossRoom {
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
    narrative_context: subTheme.bossIntro,
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

export async function saveMission(
  input: GenerateExperienceInput,
  result: GenerateExperienceOutput
) {
  const { error } = await supabase
    .from("generated_missions")
    .insert([{
      id: result.mission_id,
      user_id: input.user_id,
      document_id: input.document_id,
      course_profile_id: input.course_profile_id,
      generation_mode: input.objective,
      chosen_format: input.chosen_format,
      narrative_template: selectMissionFamily(input.main_topic ?? input.concepts[0]?.type ?? "", resolveAudienceLevel(input.estimated_audience_level)),
      room_count: result.room_count,
      includes_boss: result.includes_boss,
      fallback_mode: result.fallback_mode,
      quality_band: result.quality_band,
      qa_score: 0,
      mission_json: result.mission_json as unknown as Json,
      published_status: "draft",
    }]);

  if (error) throw new Error(`Mission save failed: ${error.message}`);
}

export async function getMission(missionId: string) {
  const { data, error } = await supabase
    .from("generated_missions")
    .select("*")
    .eq("id", missionId)
    .single();

  if (error) throw new Error(`Mission fetch failed: ${error.message}`);
  return data;
}

export async function getUserMissions(userId: string) {
  const { data, error } = await supabase
    .from("generated_missions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Missions fetch failed: ${error.message}`);
  return data ?? [];
}
