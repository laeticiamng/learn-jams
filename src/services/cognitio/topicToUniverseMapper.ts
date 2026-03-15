// ============================================================
// Topic-to-Universe Mapper — Maps course topics and domains
// to the correct mission universe profile
// ============================================================

import type { ReasoningType, LearningObjective } from "@/domain/cognitio/types";
import type { AudienceLevel, MissionFamily } from "@/domain/cognitio/escapeGame.types";

// ---------- Types ----------

export interface UniverseMappingInput {
  domain: string;
  topic: string;
  reasoning_type?: ReasoningType | string;
  pedagogical_goal?: LearningObjective;
  learner_level?: AudienceLevel;
}

export interface UniverseMappingResult {
  universe_key: string;
  mission_family: MissionFamily;
  confidence: number;
  matched_keywords: string[];
  domain_detected: string;
}

// ---------- Domain Detection Keywords ----------

const DOMAIN_KEYWORDS: { domain: string; universe_key: string; mission_family: MissionFamily; keywords: string[] }[] = [
  // Medical - Acute/Clinical
  {
    domain: "médecine",
    universe_key: "medicine_clinical_acute",
    mission_family: "clinical_simulation",
    keywords: [
      "médecine", "médical", "clinique", "diagnostic", "thérapeutique", "pathologie",
      "sémiologie", "symptôme", "syndrome", "maladie", "patient", "traitement",
      "urgence", "aigu", "réanimation", "chirurgi", "cardiolog", "pneumolog",
      "neurolog", "gastro", "endocrin", "hématolog", "néphrolog", "rhumatolog",
      "infecti", "oncolog", "pédiatr", "gériatr", "gynécolog", "obstétri",
      "ophtalmolog", "dermatolog", "ORL", "urolog",
    ],
  },
  // Medical - Prevention/Public Health
  {
    domain: "médecine",
    universe_key: "medicine_prevention",
    mission_family: "clinical_simulation",
    keywords: [
      "prévention", "hygiène", "santé publique", "épidémiolog", "vaccin",
      "dépistage", "ETP", "éducation thérapeutique", "santé communautaire",
    ],
  },
  // Pharmacy
  {
    domain: "pharmacie",
    universe_key: "pharmacy",
    mission_family: "scientific_discovery",
    keywords: [
      "pharmacie", "pharmacolog", "médicament", "molécule", "posologie",
      "pharmacocinétique", "pharmacodynamie", "galénique", "toxicolog",
      "interactions", "effets indésirables", "prescription",
    ],
  },
  // Law
  {
    domain: "droit",
    universe_key: "law_general",
    mission_family: "legal_reasoning",
    keywords: [
      "droit", "juridique", "loi", "législat", "jurisprudence", "code",
      "constitution", "contrat", "obligation", "responsabilité", "pénal",
      "civil", "commercial", "administratif", "européen", "international",
      "tribunal", "cour", "jugement", "arrêt", "procédure", "litige",
    ],
  },
  // Computer Science
  {
    domain: "informatique",
    universe_key: "computer_science",
    mission_family: "logic_sequencing",
    keywords: [
      "informatique", "programme", "algorithme", "code", "logiciel",
      "base de données", "réseau", "système", "web", "API", "serveur",
      "sécurité", "cybersécurité", "intelligence artificielle", "machine learning",
      "architecture", "framework", "développement", "compilation",
    ],
  },
  // History
  {
    domain: "histoire",
    universe_key: "history",
    mission_family: "investigation",
    keywords: [
      "histoire", "historique", "siècle", "époque", "civilisation", "guerre",
      "révolution", "empire", "république", "monarchie", "antiquité", "moyen âge",
      "renaissance", "moderne", "contemporain", "archéolog", "patrimoine",
    ],
  },
  // Biology
  {
    domain: "biologie",
    universe_key: "biology",
    mission_family: "scientific_discovery",
    keywords: [
      "biologie", "cellule", "ADN", "ARN", "gène", "protéine", "enzyme",
      "métabolisme", "physiologie", "anatomie", "écologie", "évolution",
      "botanique", "zoologie", "microbiologie", "biochimie", "génétique",
    ],
  },
  // Physics/Chemistry
  {
    domain: "sciences physiques",
    universe_key: "physics_chemistry",
    mission_family: "scientific_discovery",
    keywords: [
      "physique", "chimie", "atome", "molécule", "réaction", "énergie",
      "force", "mouvement", "thermodynamique", "électromagnétisme", "optique",
      "mécanique", "quantique", "relativité", "organique", "inorganique",
    ],
  },
  // Mathematics
  {
    domain: "mathématiques",
    universe_key: "mathematics",
    mission_family: "logic_sequencing",
    keywords: [
      "mathématique", "algèbre", "analyse", "géométrie", "probabilité",
      "statistique", "calcul", "théorème", "démonstration", "équation",
      "fonction", "intégrale", "dérivée", "matrice", "vecteur", "topolog",
    ],
  },
  // Economics
  {
    domain: "économie",
    universe_key: "economics",
    mission_family: "investigation",
    keywords: [
      "économie", "économique", "marché", "entreprise", "gestion",
      "finance", "comptabilité", "marketing", "management", "stratégie",
      "macroéconomie", "microéconomie", "PIB", "inflation", "commerce",
    ],
  },
  // Literature/Philosophy
  {
    domain: "lettres",
    universe_key: "literature_philosophy",
    mission_family: "exploration",
    keywords: [
      "littérature", "philosophie", "auteur", "œuvre", "roman", "poésie",
      "théâtre", "essai", "critique", "linguistique", "grammaire", "stylistique",
      "rhétorique", "sémiotique", "phénoménologie", "existentialisme", "éthique",
    ],
  },
];

// ---------- Main Mapping ----------

/**
 * Map a course topic and domain to the most appropriate universe profile.
 */
export function mapTopicToUniverse(input: UniverseMappingInput): UniverseMappingResult {
  const searchText = `${input.domain} ${input.topic}`.toLowerCase();
  const matchedKeywords: string[] = [];

  let bestMatch: typeof DOMAIN_KEYWORDS[0] | null = null;
  let bestScore = 0;

  for (const entry of DOMAIN_KEYWORDS) {
    let score = 0;
    const matched: string[] = [];

    for (const keyword of entry.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score++;
        matched.push(keyword);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
      matchedKeywords.length = 0;
      matchedKeywords.push(...matched);
    }
  }

  // Audience level can override mission family
  let missionFamily = bestMatch?.mission_family ?? "exploration";
  if (input.learner_level === "medical" && missionFamily !== "clinical_simulation") {
    missionFamily = "clinical_simulation";
  }
  if (input.learner_level === "law" && missionFamily !== "legal_reasoning") {
    missionFamily = "legal_reasoning";
  }

  // Reasoning type can refine choice
  if (input.reasoning_type === "procedural" && !bestMatch) {
    missionFamily = "progressive_method";
  }
  if (input.reasoning_type === "conditionnel" && !bestMatch) {
    missionFamily = "crisis";
  }

  const confidence = bestScore > 0
    ? Math.min(1, 0.3 + bestScore * 0.15)
    : 0.2;

  return {
    universe_key: bestMatch?.universe_key ?? "general",
    mission_family: missionFamily,
    confidence,
    matched_keywords: matchedKeywords,
    domain_detected: bestMatch?.domain ?? "général",
  };
}
