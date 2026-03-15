// ============================================================
// Escape Game / Mission — Premium Types
// ============================================================

import type { BloomLevel, BrickType, LearningObjective } from "./types";

// ---------- Extended Brick Types (beyond base 5) ----------

export const ESCAPE_BRICK_TYPES = [
  "TRI",
  "SEQUENCE",
  "ELIMINATION",
  "OBSERVATION",
  "DECISION",
  "CODE_RECONSTRUCT",
  "ASSOCIATION",
  "TRAP_DISTINCTION",
  "PUZZLE_STEPS",
  "ERROR_IDENTIFICATION",
  "COMPLETION",
  "DECISION_TREE",
  "LOCK_LOGIC",
  "ORDERING",
] as const;

export type EscapeBrickType = (typeof ESCAPE_BRICK_TYPES)[number];

// ---------- Mission Family Types ----------

export const MISSION_FAMILIES = [
  "exploration",
  "investigation",
  "crisis",
  "logic_sequencing",
  "clinical_simulation",
  "legal_reasoning",
  "scientific_discovery",
  "progressive_method",
] as const;

export type MissionFamily = (typeof MISSION_FAMILIES)[number];

// ---------- Age / Level Profiles ----------

export const AUDIENCE_LEVELS = [
  "college",
  "lycee",
  "prepa",
  "university",
  "medical",
  "law",
  "adult_pro",
] as const;

export type AudienceLevel = (typeof AUDIENCE_LEVELS)[number];

// ---------- Mission Universe Profile ----------

export interface MissionUniverseProfile {
  audience_level: AudienceLevel;
  tone: "playful" | "engaging" | "analytical" | "rigorous" | "direct";
  ambiance: "adventure" | "mystery" | "sci_fi" | "historical" | "professional" | "clinical" | "courtroom";
  narrative_style: "immersive" | "guided" | "minimal";
  tension_level: 1 | 2 | 3 | 4 | 5;
  abstraction_level: 1 | 2 | 3 | 4 | 5;
  hint_style: "generous" | "moderate" | "sparse";
  reward_style: "encouraging" | "informative" | "achievement_based";
  interface_style: "colorful" | "clean" | "minimal";
}

// ---------- Mission Structure (full escape game) ----------

export interface EscapeGameMission {
  // 1. Brief / Intro
  brief: MissionBrief;
  // 2. Universe
  universe: MissionUniverse;
  // 3. Progression
  stages: MissionStage[];
  // 4. Boss / Final Challenge
  final_challenge: FinalChallenge | null;
  // 5. Debrief
  debrief_template: DebriefTemplate;
  // Metadata
  mission_family: MissionFamily;
  universe_profile: MissionUniverseProfile;
  estimated_duration_sec: number;
  target_bloom_levels: BloomLevel[];
  mechanic_variety_count: number;
}

export interface MissionBrief {
  context: string;
  objective: string;
  rules: string[];
  learning_preview: string[];
}

export interface MissionUniverse {
  name: string;
  setting: string;
  ambiance_description: string;
  narrative_hook: string;
  coherence_with_course: string;
}

export interface MissionStage {
  stage_index: number;
  title: string;
  narrative_context: string;
  puzzles: EscapePuzzle[];
  hints: ProgressiveHint[];
  target_concepts: string[];
  difficulty_ramp: number; // 1-5, should increase
  time_limit_sec?: number;
}

export interface EscapePuzzle {
  id: string;
  mechanic: EscapeBrickType;
  prompt: string;
  instructions: string;
  options?: string[];
  correct_answer: string | string[];
  explanation: string;
  concept_key: string;
  bloom_level: BloomLevel;
  difficulty: number;
  trap_label?: string;
  serves_memorization: boolean;
}

export interface ProgressiveHint {
  level: 1 | 2 | 3;
  text: string;
  reveals_answer: boolean;
}

export interface FinalChallenge {
  title: string;
  narrative_context: string;
  mechanic_types: EscapeBrickType[]; // minimum 3 different
  puzzles: EscapePuzzle[];
  hints: ProgressiveHint[];
  target_concepts: string[];
  is_timed: boolean;
  time_limit_sec?: number;
}

export interface DebriefTemplate {
  key_takeaways: string[];
  global_logic: string;
  common_mistakes: string[];
  active_recall_prompts: string[];
  transfer_suggestions: string[];
}

// ---------- Retention Design Report ----------

export interface RetentionDesignReport {
  mission_id: string;
  concepts_covered: string[];
  traps_covered: string[];
  active_recalls_present: number;
  difficulty_level: number;
  mission_course_coherence: number; // 0-1
  mission_profile_coherence: number; // 0-1
  bloom_distribution: Partial<Record<BloomLevel, number>>;
  mechanic_distribution: Partial<Record<EscapeBrickType, number>>;
}

// ---------- Mission QA Checklist ----------

export interface MissionQACheck {
  check_id: string;
  check_name: string;
  passed: boolean;
  severity: "blocking" | "warning" | "info";
  details: string;
}

export interface MissionQAResult {
  mission_id: string;
  overall_score: number; // 0-100
  checks: MissionQACheck[];
  publish_blocked: boolean;
  blocking_violations: string[];
  warnings: string[];
}

// ---------- Mission Sub-Themes ----------

export interface MissionSubTheme {
  id: string;
  family: MissionFamily;
  name: string;
  setting: string;
  intro: (topic: string) => string;
  roomNarratives: Record<BrickType, string>;
  bossIntro: string;
}

export const MISSION_SUB_THEMES: Record<MissionFamily, MissionSubTheme[]> = {
  clinical_simulation: [
    {
      id: "cs_emergency",
      family: "clinical_simulation",
      name: "Urgences hospitalières",
      setting: "Service des urgences d'un grand hôpital universitaire",
      intro: (topic) => `Nuit de garde aux urgences. Un patient arrive avec un cas complexe lié à "${topic}". L'équipe médicale compte sur vous pour poser le diagnostic et coordonner la prise en charge. Chaque salle représente une étape cruciale de votre raisonnement clinique.`,
      roomNarratives: {
        OBSERVATION: "Le patient vient d'arriver au triage. Analysez les constantes vitales et le motif de consultation.",
        TRI: "Les résultats d'examens arrivent. Classez les données selon leur urgence diagnostique.",
        SEQUENCE: "Établissez le protocole de soins. L'ordre des interventions peut sauver le patient.",
        ELIMINATION: "Diagnostic différentiel : éliminez les hypothèses incompatibles avec le tableau clinique.",
        DECISION: "Le médecin senior vous consulte. Quelle est votre recommandation thérapeutique ?",
      },
      bossIntro: "Code rouge — Le patient décompense. Mobilisez toutes vos connaissances pour stabiliser la situation.",
    },
    {
      id: "cs_epidemic",
      family: "clinical_simulation",
      name: "Investigation épidémiologique",
      setting: "Centre de veille sanitaire lors d'une alerte épidémique",
      intro: (topic) => `Une alerte sanitaire a été déclenchée. Plusieurs cas liés à "${topic}" émergent dans la région. En tant qu'épidémiologiste de terrain, vous devez identifier la source, comprendre la transmission et proposer des mesures de contrôle.`,
      roomNarratives: {
        OBSERVATION: "Les premiers signalements arrivent. Analysez les données épidémiologiques et identifiez les clusters.",
        TRI: "Classez les cas selon leur gravité et leur lien épidémiologique. La chaîne de transmission se dessine.",
        SEQUENCE: "Reconstituez la chronologie de l'épidémie. Le patient zéro est la clé.",
        ELIMINATION: "Plusieurs hypothèses de transmission sont sur la table. Éliminez celle qui ne colle pas aux données.",
        DECISION: "Le préfet attend vos recommandations. Quelles mesures de santé publique préconisez-vous ?",
      },
      bossIntro: "Cellule de crise — L'épidémie s'étend. Synthétisez toutes les données pour endiguer la propagation.",
    },
    {
      id: "cs_surgery",
      family: "clinical_simulation",
      name: "Décision chirurgicale",
      setting: "Bloc opératoire d'un centre hospitalier de référence",
      intro: (topic) => `Vous êtes appelé au bloc pour un cas complexe concernant "${topic}". Entre l'imagerie, le dossier patient et l'avis des collègues, vous devez trancher : opérer ou non, et comment. Chaque décision compte.`,
      roomNarratives: {
        OBSERVATION: "Le dossier pré-opératoire est devant vous. Analysez l'imagerie et les antécédents du patient.",
        TRI: "Plusieurs stratégies chirurgicales sont envisageables. Classez-les selon le rapport bénéfice/risque.",
        SEQUENCE: "Planifiez les temps opératoires. La précision de votre protocole détermine l'issue.",
        ELIMINATION: "Une complication survient. Écartez les diagnostics per-opératoires incompatibles.",
        DECISION: "Moment critique : quelle technique appliquez-vous face à cette situation imprévue ?",
      },
      bossIntro: "Complication majeure — Tout votre savoir chirurgical est mis à l'épreuve en temps réel.",
    },
  ],
  legal_reasoning: [
    {
      id: "lr_trial",
      family: "legal_reasoning",
      name: "Procès d'assises",
      setting: "Cour d'assises lors d'un procès très médiatisé",
      intro: (topic) => `L'audience est ouverte. Vous défendez un dossier complexe portant sur "${topic}". Les jurés vous observent. Construisez votre argumentation pièce par pièce et emportez la conviction de la cour.`,
      roomNarratives: {
        OBSERVATION: "Le président lit l'acte d'accusation. Repérez les éléments de fait et les points de droit.",
        TRI: "Les pièces à conviction sont présentées. Distinguez les preuves recevables des irrecevables.",
        SEQUENCE: "Reconstituez la chronologie des faits. L'enchaînement des événements éclaire les responsabilités.",
        ELIMINATION: "L'accusation avance ses arguments. Identifiez la faille dans son raisonnement.",
        DECISION: "Plaidoirie finale. Quel argument juridique emportera la conviction des jurés ?",
      },
      bossIntro: "Délibéré — La cour se retire. Votre maîtrise de l'ensemble du dossier sera déterminante.",
    },
    {
      id: "lr_negotiation",
      family: "legal_reasoning",
      name: "Négociation contractuelle",
      setting: "Cabinet d'avocats d'affaires lors d'une fusion-acquisition",
      intro: (topic) => `Un contrat majeur lié à "${topic}" doit être finalisé avant la deadline. Les deux parties ont des intérêts divergents. Analysez chaque clause, anticipez les risques et trouvez l'équilibre juridique.`,
      roomNarratives: {
        OBSERVATION: "Le projet de contrat arrive sur votre bureau. Identifiez les clauses sensibles et les zones de risque.",
        TRI: "Classez les demandes de chaque partie : essentielles, négociables ou inacceptables.",
        SEQUENCE: "Ordonnez les étapes de la négociation. La stratégie procédurale conditionne le résultat.",
        ELIMINATION: "Une clause viole le cadre réglementaire. Trouvez laquelle et proposez une alternative.",
        DECISION: "Dernière offre. Quel compromis juridique satisfait les deux parties sans créer de risque ?",
      },
      bossIntro: "Signature imminente — Vérifiez une dernière fois que l'accord est juridiquement inattaquable.",
    },
    {
      id: "lr_constitutional",
      family: "legal_reasoning",
      name: "Question prioritaire de constitutionnalité",
      setting: "Conseil constitutionnel saisi d'une QPC",
      intro: (topic) => `Une QPC a été transmise sur un sujet lié à "${topic}". Vous devez analyser la conformité de la disposition contestée aux droits et libertés constitutionnels. La rigueur de votre raisonnement sera scrutée.`,
      roomNarratives: {
        OBSERVATION: "Étudiez la disposition législative contestée et les mémoires des parties.",
        TRI: "Identifiez les principes constitutionnels en jeu. Distinguez droits fondamentaux et objectifs à valeur constitutionnelle.",
        SEQUENCE: "Retracez l'évolution jurisprudentielle. Les précédents éclairent la décision à venir.",
        ELIMINATION: "Parmi les griefs soulevés, un seul ne relève pas du contrôle de constitutionnalité. Lequel ?",
        DECISION: "Prononcez votre décision : conformité, non-conformité, ou réserve d'interprétation ?",
      },
      bossIntro: "Délibéré constitutionnel — L'équilibre entre droits fondamentaux exige une synthèse magistrale.",
    },
  ],
  scientific_discovery: [
    {
      id: "sd_laboratory",
      family: "scientific_discovery",
      name: "Laboratoire de recherche",
      setting: "Laboratoire de pointe lors d'une découverte inattendue",
      intro: (topic) => `Vos expériences sur "${topic}" ont produit des résultats inattendus. Une anomalie dans les données pourrait mener à une découverte majeure. Suivez la méthode scientifique pour valider — ou invalider — cette hypothèse prometteuse.`,
      roomNarratives: {
        OBSERVATION: "Les instruments affichent des données inhabituelles. Analysez les mesures et identifiez l'anomalie.",
        TRI: "Classez les variables expérimentales. Distinguez les corrélations des causalités.",
        SEQUENCE: "Concevez le protocole de vérification. La reproductibilité dépend de la rigueur méthodologique.",
        ELIMINATION: "Plusieurs biais pourraient expliquer vos résultats. Éliminez celui qui est absent de votre expérience.",
        DECISION: "Vos résultats sont probants. Quelle conclusion scientifique pouvez-vous formuler avec certitude ?",
      },
      bossIntro: "Peer review — Défendez vos travaux devant le comité scientifique international.",
    },
    {
      id: "sd_expedition",
      family: "scientific_discovery",
      name: "Expédition de terrain",
      setting: "Expédition scientifique dans un environnement extrême",
      intro: (topic) => `Votre expédition vous mène dans un environnement exceptionnel pour étudier "${topic}". Les conditions sont difficiles mais les échantillons récoltés sont précieux. Chaque observation compte pour faire avancer la science.`,
      roomNarratives: {
        OBSERVATION: "Vous arrivez sur le site d'étude. Documentez vos premières observations de terrain.",
        TRI: "Les échantillons récoltés doivent être classés. Appliquez la taxonomie appropriée.",
        SEQUENCE: "Reconstituez l'histoire naturelle de ce phénomène. Les strates temporelles se lisent dans l'ordre.",
        ELIMINATION: "Un échantillon ne correspond pas au biotope local. Identifiez le contaminant.",
        DECISION: "Votre théorie de terrain est prête. Quelle hypothèse les données de l'expédition soutiennent-elles ?",
      },
      bossIntro: "Publication finale — Synthétisez vos découvertes de terrain en une conclusion solide.",
    },
    {
      id: "sd_space",
      family: "scientific_discovery",
      name: "Mission spatiale",
      setting: "Station de recherche spatiale en orbite",
      intro: (topic) => `Depuis la station orbitale, vous menez des expériences sur "${topic}" en microgravité. Les résultats diffèrent de ceux obtenus sur Terre. Analysez les données et faites progresser notre compréhension de l'univers.`,
      roomNarratives: {
        OBSERVATION: "Les capteurs de la station transmettent de nouvelles données. Analysez les relevés instrumentaux.",
        TRI: "Catégorisez les phénomènes observés. Microgravité, rayonnement, vide — chaque facteur a son rôle.",
        SEQUENCE: "Le protocole expérimental spatial est strict. Respectez l'ordre des manipulations en apesanteur.",
        ELIMINATION: "Une mesure est aberrante. Est-ce un artefact instrumental ou une vraie découverte ?",
        DECISION: "Houston attend votre rapport. Quelle conclusion envoyez-vous au centre de contrôle ?",
      },
      bossIntro: "Transmission Terre — Présentez vos découvertes lors de la conférence en liaison directe.",
    },
  ],
  logic_sequencing: [
    {
      id: "ls_hacker",
      family: "logic_sequencing",
      name: "Cybersécurité",
      setting: "Centre opérationnel de cybersécurité sous attaque",
      intro: (topic) => `Alerte intrusion ! Le système central lié à "${topic}" est compromis. En tant qu'analyste cybersécurité, vous devez tracer l'attaque, comprendre l'exploit et restaurer l'intégrité du système. Chaque salle est un nœud du réseau à sécuriser.`,
      roomNarratives: {
        OBSERVATION: "Les logs défilent. Analysez les traces réseau pour identifier le vecteur d'attaque.",
        TRI: "Classez les alertes par criticité. Distinguez les faux positifs des vraies menaces.",
        SEQUENCE: "Reconstituez la kill chain de l'attaquant. Chaque étape mène à la suivante.",
        ELIMINATION: "Plusieurs vulnérabilités sont candidates. Éliminez celle qui n'est pas exploitable ici.",
        DECISION: "Contre-mesure immédiate. Quel patch appliquez-vous pour stopper la propagation ?",
      },
      bossIntro: "Attaque coordonnée — L'adversaire lance son assaut final. Défendez tous les systèmes simultanément.",
    },
    {
      id: "ls_architect",
      family: "logic_sequencing",
      name: "Architecture de systèmes",
      setting: "Salle de conception d'un système complexe",
      intro: (topic) => `On vous confie la conception d'un système complexe lié à "${topic}". Contraintes de performance, de fiabilité et de scalabilité : chaque décision architecturale a des conséquences en cascade. Pensez logiquement.`,
      roomNarratives: {
        OBSERVATION: "Le cahier des charges est posé. Identifiez les contraintes et les dépendances du système.",
        TRI: "Priorisez les composants. Classez-les par criticité et ordre de développement.",
        SEQUENCE: "Définissez le pipeline d'exécution. L'ordonnancement des opérations est la clé.",
        ELIMINATION: "Un composant crée un goulet d'étranglement. Identifiez le maillon faible.",
        DECISION: "Choix architectural final. Quelle solution garantit performance et maintenabilité ?",
      },
      bossIntro: "Stress test — Le système est mis à l'épreuve dans les conditions les plus extrêmes.",
    },
    {
      id: "ls_puzzle",
      family: "logic_sequencing",
      name: "Salle des énigmes",
      setting: "Tour mystérieuse remplie d'engrenages et de mécanismes",
      intro: (topic) => `Vous entrez dans la Tour des Logiciens, où chaque étage est un défi lié à "${topic}". Engrenages, leviers et codes secrets : seule la pensée logique vous permettra d'atteindre le sommet.`,
      roomNarratives: {
        OBSERVATION: "Premier mécanisme. Examinez les rouages et comprenez le système qui se cache derrière.",
        TRI: "Les pièces du puzzle sont éparpillées. Classez-les par fonction avant de les assembler.",
        SEQUENCE: "Les leviers doivent être actionnés dans le bon ordre pour ouvrir la porte suivante.",
        ELIMINATION: "Un engrenage est de trop dans le mécanisme. Retirez-le pour que tout fonctionne.",
        DECISION: "Dernier verrou. Quel est le code qui débloque l'accès au niveau supérieur ?",
      },
      bossIntro: "Sommet de la Tour — Tous les mécanismes convergent vers cette ultime épreuve de logique.",
    },
  ],
  investigation: [
    {
      id: "inv_detective",
      family: "investigation",
      name: "Enquête criminelle",
      setting: "Bureau d'un détective privé dans une ville pluvieuse",
      intro: (topic) => `Un nouveau dossier atterrit sur votre bureau : une affaire liée à "${topic}". Témoignages contradictoires, indices matériels, fausses pistes... Remontez la piste et découvrez la vérité.`,
      roomNarratives: {
        OBSERVATION: "La scène de crime est encore fraîche. Examinez chaque indice avec attention.",
        TRI: "Les témoignages s'accumulent. Séparez les faits vérifiables des simples rumeurs.",
        SEQUENCE: "Reconstituez le fil des événements. La timeline révèle les contradictions.",
        ELIMINATION: "Trois suspects, mais un seul alibi ne tient pas. Identifiez l'incohérence.",
        DECISION: "Vous avez tous les éléments. Qui est le coupable et quel était le mobile ?",
      },
      bossIntro: "Confrontation finale — Présentez votre reconstitution complète face au suspect principal.",
    },
    {
      id: "inv_journalist",
      family: "investigation",
      name: "Enquête journalistique",
      setting: "Rédaction d'un grand journal d'investigation",
      intro: (topic) => `Votre rédacteur en chef vous confie une enquête sensible sur "${topic}". Sources anonymes, documents confidentiels, pressions politiques... Vérifiez chaque information et construisez un article irréfutable.`,
      roomNarratives: {
        OBSERVATION: "Un informateur vous transmet des documents. Analysez leur authenticité et leur contenu.",
        TRI: "Croisez les sources. Distinguez les informations confirmées des allégations non vérifiées.",
        SEQUENCE: "Reconstituez la chronologie de l'affaire. Les dates clés racontent l'histoire vraie.",
        ELIMINATION: "Un document est un faux. Identifiez-le avant qu'il ne discrédite votre enquête.",
        DECISION: "Le bouclage approche. Quel angle et quelle conclusion votre article doit-il défendre ?",
      },
      bossIntro: "Publication — Votre article sera lu par des millions de personnes. Vérifiez tout une dernière fois.",
    },
    {
      id: "inv_archaeo",
      family: "investigation",
      name: "Fouille archéologique",
      setting: "Site de fouilles antique récemment découvert",
      intro: (topic) => `Des fouilles ont mis au jour un site exceptionnel lié à "${topic}". Fragments, inscriptions, artéfacts : chaque découverte est un indice sur une civilisation disparue. Reconstituez le puzzle du passé.`,
      roomNarratives: {
        OBSERVATION: "La première couche de fouille révèle des artéfacts. Documentez et identifiez chaque trouvaille.",
        TRI: "Classez les découvertes par époque et par fonction. La stratigraphie raconte l'histoire.",
        SEQUENCE: "Datez les différentes strates. L'ordre chronologique révèle l'évolution du site.",
        ELIMINATION: "Un artéfact est anachronique — il n'appartient pas à cette période. Lequel ?",
        DECISION: "Rédigez votre rapport de fouille. Quelle hypothèse sur cette civilisation vos découvertes soutiennent-elles ?",
      },
      bossIntro: "Conférence internationale — Présentez votre interprétation globale du site devant les experts.",
    },
  ],
  exploration: [
    {
      id: "exp_treasure",
      family: "exploration",
      name: "Chasse au trésor",
      setting: "Île mystérieuse remplie d'énigmes et de passages secrets",
      intro: (topic) => `Vous débarquez sur une île légendaire où un trésor lié à "${topic}" est caché depuis des siècles. Chaque salle de ce temple ancien renferme une épreuve. Résolvez-les toutes pour atteindre la chambre du trésor !`,
      roomNarratives: {
        OBSERVATION: "La première salle du temple s'illumine. Observez les symboles gravés sur les murs.",
        TRI: "Des coffres contiennent des artefacts mélangés. Classez-les correctement pour ouvrir la porte.",
        SEQUENCE: "Les dalles du sol forment un chemin codé. Trouvez la bonne séquence pour avancer.",
        ELIMINATION: "Quatre clés sont posées devant vous, mais une est piégée. Trouvez l'intrus !",
        DECISION: "La chambre du trésor a deux portes. Vos connaissances vous guideront vers la bonne.",
      },
      bossIntro: "Gardien du trésor — L'ultime épreuve avant d'accéder à la récompense finale !",
    },
    {
      id: "exp_ocean",
      family: "exploration",
      name: "Odyssée sous-marine",
      setting: "Bathyscaphe explorant les profondeurs abyssales",
      intro: (topic) => `À bord de votre submersible, vous plongez dans les abysses à la recherche de connaissances sur "${topic}". Chaque palier de profondeur révèle de nouveaux mystères. Explorez, documentez et remontez avec le savoir !`,
      roomNarratives: {
        OBSERVATION: "Premier palier de plongée. Les hublots révèlent un écosystème fascinant. Que voyez-vous ?",
        TRI: "Des spécimens bioluminescents flottent autour du submersible. Classez-les par caractéristiques.",
        SEQUENCE: "Les courants sous-marins suivent un schéma précis. Identifiez l'ordre du cycle.",
        ELIMINATION: "Un élément ne correspond pas à cet environnement abyssal. Identifiez l'anomalie.",
        DECISION: "Vous avez atteint le fond. Quelle découverte allez-vous rapporter à la surface ?",
      },
      bossIntro: "Fosse des abysses — La pression est maximale. Prouvez que vous maîtrisez les profondeurs !",
    },
    {
      id: "exp_jungle",
      family: "exploration",
      name: "Expédition en jungle",
      setting: "Forêt tropicale dense abritant un temple oublié",
      intro: (topic) => `Votre expédition en pleine jungle vous mène vers un temple oublié dédié au savoir de "${topic}". Lianes, rivières et énigmes anciennes barrent votre route. Progressez étape par étape vers le cœur du sanctuaire.`,
      roomNarratives: {
        OBSERVATION: "La canopée s'ouvre sur une clairière. Observez les indices laissés par les anciens explorateurs.",
        TRI: "Des symboles sont gravés sur les arbres. Organisez-les selon leur signification.",
        SEQUENCE: "Le sentier se divise en embranchements. L'ordre des marqueurs indique la bonne route.",
        ELIMINATION: "Quatre fruits sont posés sur l'autel. Un seul est un leurre. Identifiez-le !",
        DECISION: "Le temple est devant vous. Quel passage secret mène à la salle de connaissance ?",
      },
      bossIntro: "Sanctuaire du savoir — Le gardien du temple teste votre maîtrise avant de vous livrer ses secrets.",
    },
  ],
  crisis: [
    {
      id: "cr_natural",
      family: "crisis",
      name: "Catastrophe naturelle",
      setting: "Centre de commandement lors d'un événement sismique majeur",
      intro: (topic) => `Alerte rouge ! Un séisme majeur frappe la région. La gestion de cette crise implique des connaissances sur "${topic}". En tant que coordinateur des secours, chaque décision que vous prenez affecte des milliers de vies.`,
      roomNarratives: {
        OBSERVATION: "Les premières informations arrivent au poste de commandement. Évaluez l'ampleur des dégâts.",
        TRI: "Les appels au secours affluent de partout. Priorisez les interventions par urgence vitale.",
        SEQUENCE: "Déployez les secours dans l'ordre optimal. La logistique de crise a ses règles.",
        ELIMINATION: "Un rapport de terrain est erroné. Identifiez la fausse information avant qu'elle ne dévie les secours.",
        DECISION: "Décision critique : faut-il évacuer le secteur nord ou concentrer les secours au centre ?",
      },
      bossIntro: "Réplique majeure — La terre tremble à nouveau. Gérez cette cascade de crises simultanées.",
    },
    {
      id: "cr_outbreak",
      family: "crisis",
      name: "Gestion de pandémie",
      setting: "Salle de crise du ministère de la Santé",
      intro: (topic) => `Un pathogène inconnu se propage. La compréhension de "${topic}" est essentielle pour endiguer la crise. Vous êtes à la tête de la cellule de crise nationale. Le compte à rebours a commencé.`,
      roomNarratives: {
        OBSERVATION: "Les premiers bilans sanitaires arrivent. Analysez la vitesse de propagation et les symptômes.",
        TRI: "Les mesures possibles sont nombreuses. Classez-les par efficacité et faisabilité.",
        SEQUENCE: "Le plan de réponse doit être déployé par phases. L'ordre des mesures est critique.",
        ELIMINATION: "Une information virale sur les réseaux est fausse. Identifiez-la pour éviter la panique.",
        DECISION: "Le Premier ministre attend votre recommandation. Confinement ciblé ou mesures généralisées ?",
      },
      bossIntro: "Pic épidémique — Toutes les ressources sont mobilisées. Votre stratégie globale doit tenir.",
    },
    {
      id: "cr_industrial",
      family: "crisis",
      name: "Incident industriel",
      setting: "Salle de contrôle d'une installation industrielle critique",
      intro: (topic) => `Une alarme retentit dans l'installation. Un incident lié à "${topic}" menace la sécurité. Le protocole d'urgence est activé. Vous avez quelques minutes pour diagnostiquer le problème et empêcher la catastrophe.`,
      roomNarratives: {
        OBSERVATION: "Les voyants passent au rouge. Lisez les indicateurs et identifiez la source de l'anomalie.",
        TRI: "Plusieurs systèmes sont affectés. Classez les défaillances par ordre de dangerosité.",
        SEQUENCE: "Appliquez la procédure de sécurité. Chaque geste doit être fait dans l'ordre exact.",
        ELIMINATION: "Un capteur donne des données aberrantes. Est-ce le capteur ou le système qui dysfonctionne ?",
        DECISION: "Arrêt d'urgence ou tentative de stabilisation ? Le temps presse.",
      },
      bossIntro: "Point de non-retour — Le système est au bord de la rupture. Votre dernière chance de tout sauver.",
    },
  ],
  progressive_method: [
    {
      id: "pm_master",
      family: "progressive_method",
      name: "Atelier du maître",
      setting: "Atelier d'un maître artisan transmettant son savoir",
      intro: (topic) => `Vous entrez dans l'atelier d'un maître reconnu qui enseigne "${topic}". Comme tout apprenti, vous commencerez par les bases avant de vous attaquer aux techniques avancées. Chaque salle est une leçon à maîtriser.`,
      roomNarratives: {
        OBSERVATION: "Le maître vous montre les outils. Observez et identifiez les fondamentaux de la discipline.",
        TRI: "Les matériaux sont devant vous. Classez-les selon les principes que le maître vous a enseignés.",
        SEQUENCE: "La technique demande un geste précis, étape par étape. Respectez l'ordre du maître.",
        ELIMINATION: "L'un des outils ne convient pas pour cette tâche. Le maître attend que vous le trouviez.",
        DECISION: "Le maître vous confie un projet seul. Appliquez ce que vous avez appris pour le réaliser.",
      },
      bossIntro: "Chef-d'œuvre — Réalisez votre pièce de maîtrise en intégrant toutes les techniques apprises.",
    },
    {
      id: "pm_academy",
      family: "progressive_method",
      name: "Académie des savoirs",
      setting: "Grande bibliothèque-école avec niveaux d'accès progressifs",
      intro: (topic) => `Bienvenue à l'Académie. Votre parcours d'apprentissage sur "${topic}" vous mènera du premier au dernier étage. Chaque palier débloque de nouvelles connaissances. Prouvez votre maîtrise pour monter en grade.`,
      roomNarratives: {
        OBSERVATION: "Premier cours à l'Académie. Le professeur expose les fondamentaux. Assimilez les bases.",
        TRI: "Exercice de classement. Organisez vos connaissances dans les bonnes catégories.",
        SEQUENCE: "Travaux dirigés : démontrez que vous maîtrisez l'enchaînement logique des notions.",
        ELIMINATION: "Examen intermédiaire. Parmi ces affirmations, laquelle est incorrecte ?",
        DECISION: "Mise en situation finale. Appliquez vos connaissances à un cas concret.",
      },
      bossIntro: "Grand oral — Défendez votre compréhension du sujet devant le jury de l'Académie.",
    },
    {
      id: "pm_dojo",
      family: "progressive_method",
      name: "Dojo de la connaissance",
      setting: "Dojo zen où l'apprentissage est un art martial intellectuel",
      intro: (topic) => `Entrez dans le Dojo de la Connaissance. L'art de maîtriser "${topic}" s'apprend comme un art martial : discipline, progression et persévérance. Chaque kata intellectuel vous rapproche de la ceinture noire.`,
      roomNarratives: {
        OBSERVATION: "Première position : observation. Le sensei montre. Vous regardez. Vous comprenez.",
        TRI: "Kata de classification. Organisez les techniques selon les enseignements du sensei.",
        SEQUENCE: "Enchaînement de mouvements. Chaque notion s'enchaîne avec la précédente dans un flux continu.",
        ELIMINATION: "Le sensei glisse une erreur dans sa démonstration. Montrez que vous avez l'œil.",
        DECISION: "Combat libre. Face à ce défi, quelle technique allez-vous appliquer ?",
      },
      bossIntro: "Passage de grade — Le Grand Maître teste votre maîtrise totale de la discipline.",
    },
  ],
};

/**
 * Select a sub-theme within a mission family.
 * Uses topic keywords to pick the best match, or falls back to random.
 */
export function selectMissionSubTheme(
  family: MissionFamily,
  topic: string,
): MissionSubTheme {
  const subThemes = MISSION_SUB_THEMES[family];
  const normalized = topic.toLowerCase();

  // Keyword matching per family
  const keywordMap: Record<string, string[]> = {
    // clinical_simulation
    cs_emergency: ["urgence", "emergency", "garde", "aigu", "réanima"],
    cs_epidemic: ["épidémi", "pandém", "transmis", "santé publique", "vaccin", "infecti"],
    cs_surgery: ["chirurg", "opérat", "bloc", "intervention", "greff"],
    // legal_reasoning
    lr_trial: ["pénal", "crime", "assise", "procès", "infraction", "délit"],
    lr_negotiation: ["contrat", "commercial", "entreprise", "fusion", "affaires", "société"],
    lr_constitutional: ["constitut", "liberté", "fondament", "qpc", "droits de l'homme"],
    // scientific_discovery
    sd_laboratory: ["chimie", "moléc", "cellul", "microscop", "réaction", "enzyme"],
    sd_expedition: ["terrain", "géolog", "écolog", "faune", "flore", "fossil"],
    sd_space: ["astro", "spatial", "planète", "orbit", "cosmos", "gravit", "étoile"],
    // logic_sequencing
    ls_hacker: ["cyber", "réseau", "sécurité", "informatique", "programme", "code"],
    ls_architect: ["architect", "système", "infrastructure", "scalab", "performance"],
    ls_puzzle: ["math", "logique", "énigme", "calcul", "théorème", "preuve"],
    // investigation
    inv_detective: ["crime", "police", "meurtre", "vol", "suspect", "mobile"],
    inv_journalist: ["média", "journal", "presse", "source", "article", "info"],
    inv_archaeo: ["archéo", "antiq", "civilis", "fouille", "histoir", "patrimoin"],
    // exploration
    exp_treasure: ["trésor", "pirate", "aventure", "carte", "mystère"],
    exp_ocean: ["mer", "océan", "marin", "aqua", "sous-marin", "poisson"],
    exp_jungle: ["forêt", "jungle", "nature", "animal", "plante", "tropic"],
    // crisis
    cr_natural: ["séisme", "inondation", "tempête", "climatique", "catastroph", "terre"],
    cr_outbreak: ["pandém", "épidém", "virus", "contagi", "quarantain", "santé"],
    cr_industrial: ["industri", "nucléa", "chimique", "usine", "pétrol", "énergi"],
    // progressive_method
    pm_master: ["artisan", "métier", "pratique", "manual", "technique", "savoir-faire"],
    pm_academy: ["université", "académi", "cours", "professeur", "étude", "diplôme"],
    pm_dojo: ["sport", "entraîne", "disciplin", "martial", "performa"],
  };

  // Score each sub-theme by keyword matches
  let bestMatch: MissionSubTheme | null = null;
  let bestScore = 0;

  for (const st of subThemes) {
    const keywords = keywordMap[st.id] ?? [];
    let score = 0;
    for (const kw of keywords) {
      if (normalized.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = st;
    }
  }

  if (bestMatch && bestScore > 0) return bestMatch;

  // Deterministic pseudo-random selection based on topic string
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    hash = ((hash << 5) - hash + topic.charCodeAt(i)) | 0;
  }
  return subThemes[Math.abs(hash) % subThemes.length];
}

// ---------- Universe Selection Logic ----------

export function selectUniverseProfile(level: AudienceLevel): MissionUniverseProfile {
  switch (level) {
    case "college":
      return {
        audience_level: "college",
        tone: "playful",
        ambiance: "adventure",
        narrative_style: "immersive",
        tension_level: 2,
        abstraction_level: 2,
        hint_style: "generous",
        reward_style: "encouraging",
        interface_style: "colorful",
      };
    case "lycee":
      return {
        audience_level: "lycee",
        tone: "engaging",
        ambiance: "mystery",
        narrative_style: "immersive",
        tension_level: 3,
        abstraction_level: 3,
        hint_style: "moderate",
        reward_style: "achievement_based",
        interface_style: "clean",
      };
    case "prepa":
      return {
        audience_level: "prepa",
        tone: "rigorous",
        ambiance: "sci_fi",
        narrative_style: "guided",
        tension_level: 4,
        abstraction_level: 4,
        hint_style: "sparse",
        reward_style: "informative",
        interface_style: "clean",
      };
    case "university":
      return {
        audience_level: "university",
        tone: "analytical",
        ambiance: "historical",
        narrative_style: "guided",
        tension_level: 3,
        abstraction_level: 4,
        hint_style: "moderate",
        reward_style: "informative",
        interface_style: "clean",
      };
    case "medical":
      return {
        audience_level: "medical",
        tone: "rigorous",
        ambiance: "clinical",
        narrative_style: "guided",
        tension_level: 4,
        abstraction_level: 5,
        hint_style: "sparse",
        reward_style: "informative",
        interface_style: "minimal",
      };
    case "law":
      return {
        audience_level: "law",
        tone: "analytical",
        ambiance: "courtroom",
        narrative_style: "guided",
        tension_level: 4,
        abstraction_level: 5,
        hint_style: "moderate",
        reward_style: "informative",
        interface_style: "clean",
      };
    case "adult_pro":
      return {
        audience_level: "adult_pro",
        tone: "direct",
        ambiance: "professional",
        narrative_style: "minimal",
        tension_level: 3,
        abstraction_level: 4,
        hint_style: "moderate",
        reward_style: "achievement_based",
        interface_style: "minimal",
      };
  }
}

// ---------- Mission Family Selection ----------

export function selectMissionFamily(
  courseType: string,
  level: AudienceLevel,
): MissionFamily {
  const normalized = courseType.toLowerCase();

  if (level === "medical" || normalized.includes("médec") || normalized.includes("santé") || normalized.includes("clinic")) {
    return "clinical_simulation";
  }
  if (level === "law" || normalized.includes("droit") || normalized.includes("jurid")) {
    return "legal_reasoning";
  }
  if (normalized.includes("math") || normalized.includes("logiq") || normalized.includes("algo")) {
    return "logic_sequencing";
  }
  if (normalized.includes("scien") || normalized.includes("phys") || normalized.includes("chim") || normalized.includes("bio")) {
    return "scientific_discovery";
  }
  if (normalized.includes("histoi") || normalized.includes("géo") || normalized.includes("socio")) {
    return "investigation";
  }
  if (normalized.includes("méthod") || normalized.includes("apprenti")) {
    return "progressive_method";
  }
  if (level === "college") {
    return "exploration";
  }

  return "exploration";
}
