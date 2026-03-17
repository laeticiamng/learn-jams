// ============================================================
// Test Fixtures — Deterministic course data for medical and
// non-medical domains to test the immersive engine pipeline.
// ============================================================

import type { AnalyzedConcept, AnalyzedConfusionPair } from "@/domain/cognitio/contracts";
import type { CourseFixture } from "@/domain/cognitio/immersiveEngine.types";

// ==================== MEDICAL FIXTURE ====================

const MEDICAL_CONCEPTS: AnalyzedConcept[] = [
  {
    stable_key: "hypertension_arterielle",
    label: "Hypertension artérielle",
    definition: "Élévation chronique de la pression artérielle systolique ≥ 140 mmHg et/ou diastolique ≥ 90 mmHg.",
    type: "principal",
    criticality: 1,
    criticality_score: 0.95,
    bloom_target: "understand",
    relations: [
      { target_key: "systeme_cardiovasculaire", relation_type: "part_of" },
      { target_key: "traitement_antihypertenseur", relation_type: "related" },
    ],
    prerequisites: ["anatomie_cardiaque", "physiologie_vasculaire"],
    source_confidence: 0.92,
    source_trace: [
      { segment_index: 0, excerpt: "Élévation chronique de la pression artérielle" },
      { segment_index: 1, excerpt: "systolique ≥ 140 mmHg et/ou diastolique ≥ 90 mmHg" },
    ],
    uncertain: false,
  },
  {
    stable_key: "anatomie_cardiaque",
    label: "Anatomie cardiaque",
    definition: "Structure du cœur : 4 cavités (2 oreillettes, 2 ventricules), valves, coronaires.",
    type: "prerequis",
    criticality: 2,
    criticality_score: 0.85,
    bloom_target: "remember",
    relations: [
      { target_key: "systeme_cardiovasculaire", relation_type: "part_of" },
    ],
    prerequisites: [],
    source_confidence: 0.95,
    source_trace: [
      { segment_index: 0, excerpt: "Structure du cœur : 4 cavités" },
    ],
    uncertain: false,
  },
  {
    stable_key: "physiologie_vasculaire",
    label: "Physiologie vasculaire",
    definition: "Fonctionnement des vaisseaux sanguins : artères, veines, capillaires. Régulation du débit sanguin.",
    type: "prerequis",
    criticality: 2,
    criticality_score: 0.82,
    bloom_target: "understand",
    relations: [
      { target_key: "systeme_cardiovasculaire", relation_type: "part_of" },
      { target_key: "anatomie_cardiaque", relation_type: "related" },
    ],
    prerequisites: [],
    source_confidence: 0.88,
    source_trace: [
      { segment_index: 1, excerpt: "Fonctionnement des vaisseaux sanguins" },
    ],
    uncertain: false,
  },
  {
    stable_key: "systeme_cardiovasculaire",
    label: "Système cardiovasculaire",
    definition: "Ensemble fonctionnel comprenant le cœur et les vaisseaux assurant la circulation sanguine.",
    type: "principal",
    criticality: 1,
    criticality_score: 0.92,
    bloom_target: "understand",
    relations: [],
    prerequisites: ["anatomie_cardiaque", "physiologie_vasculaire"],
    source_confidence: 0.9,
    source_trace: [
      { segment_index: 0, excerpt: "Ensemble fonctionnel comprenant le cœur" },
      { segment_index: 1, excerpt: "vaisseaux assurant la circulation sanguine" },
    ],
    uncertain: false,
  },
  {
    stable_key: "traitement_antihypertenseur",
    label: "Traitement antihypertenseur",
    definition: "Classes médicamenteuses : IEC, ARA2, inhibiteurs calciques, diurétiques, bêta-bloquants.",
    type: "principal",
    criticality: 1,
    criticality_score: 0.9,
    bloom_target: "apply",
    relations: [
      { target_key: "hypertension_arterielle", relation_type: "related" },
      { target_key: "effets_secondaires", relation_type: "related" },
    ],
    prerequisites: ["hypertension_arterielle"],
    source_confidence: 0.85,
    source_trace: [
      { segment_index: 2, excerpt: "Classes médicamenteuses : IEC, ARA2" },
    ],
    uncertain: false,
  },
  {
    stable_key: "effets_secondaires",
    label: "Effets secondaires des antihypertenseurs",
    definition: "Toux (IEC), hyperkaliémie (IEC/ARA2), œdèmes (inhibiteurs calciques), hyponatrémie (diurétiques).",
    type: "secondary",
    criticality: 2,
    criticality_score: 0.78,
    bloom_target: "analyze",
    relations: [
      { target_key: "traitement_antihypertenseur", relation_type: "related" },
    ],
    prerequisites: ["traitement_antihypertenseur"],
    source_confidence: 0.82,
    source_trace: [
      { segment_index: 2, excerpt: "Toux (IEC), hyperkaliémie (IEC/ARA2)" },
      { segment_index: 3, excerpt: "œdèmes (inhibiteurs calciques), hyponatrémie (diurétiques)" },
    ],
    uncertain: false,
  },
  {
    stable_key: "diagnostic_hta",
    label: "Diagnostic de l'HTA",
    definition: "Mesure répétée de la PA au cabinet, MAPA ou automesure. Recherche d'atteinte d'organes cibles.",
    type: "principal",
    criticality: 1,
    criticality_score: 0.88,
    bloom_target: "apply",
    relations: [
      { target_key: "hypertension_arterielle", relation_type: "related" },
    ],
    prerequisites: ["hypertension_arterielle"],
    source_confidence: 0.87,
    source_trace: [
      { segment_index: 1, excerpt: "Mesure répétée de la PA au cabinet" },
      { segment_index: 2, excerpt: "MAPA ou automesure" },
    ],
    uncertain: false,
  },
  {
    stable_key: "strategie_therapeutique",
    label: "Stratégie thérapeutique de l'HTA",
    definition: "Approche par étapes : règles hygiéno-diététiques puis monothérapie puis bithérapie si besoin.",
    type: "principal",
    criticality: 1,
    criticality_score: 0.93,
    bloom_target: "evaluate",
    relations: [
      { target_key: "traitement_antihypertenseur", relation_type: "prerequisite" },
      { target_key: "diagnostic_hta", relation_type: "prerequisite" },
    ],
    prerequisites: ["traitement_antihypertenseur", "diagnostic_hta"],
    source_confidence: 0.86,
    source_trace: [
      { segment_index: 3, excerpt: "Approche par étapes : règles hygiéno-diététiques" },
    ],
    uncertain: false,
  },
];

const MEDICAL_CONFUSION_PAIRS: AnalyzedConfusionPair[] = [
  {
    concept_a_key: "hypertension_arterielle",
    concept_b_key: "diagnostic_hta",
    distinction_key: "hta_vs_diagnostic",
    frequency: 0.7,
  },
  {
    concept_a_key: "traitement_antihypertenseur",
    concept_b_key: "effets_secondaires",
    distinction_key: "traitement_vs_effets",
    frequency: 0.5,
  },
];

export const MEDICAL_FIXTURE: CourseFixture = {
  id: "fixture_medical_hta",
  domain: "medical_clinical",
  title: "Hypertension artérielle : du diagnostic au traitement",
  concepts: MEDICAL_CONCEPTS,
  confusion_pairs: MEDICAL_CONFUSION_PAIRS,
  reasoning_type: "conditionnel",
  main_topic: "Prise en charge de l'hypertension artérielle",
  section_map: [
    { title: "Anatomie et physiologie cardiovasculaire", level: 1, content_summary: "Structure du cœur et vaisseaux" },
    { title: "Définition et classification de l'HTA", level: 1, content_summary: "Critères diagnostiques" },
    { title: "Bilan et diagnostic", level: 1, content_summary: "MAPA, automesure, bilan étiologique" },
    { title: "Traitement", level: 1, content_summary: "Classes thérapeutiques et stratégie" },
  ],
  learning_core: ["hypertension_arterielle", "diagnostic_hta", "strategie_therapeutique"],
};

// ==================== COMPUTER SCIENCE FIXTURE ====================

const CS_CONCEPTS: AnalyzedConcept[] = [
  {
    stable_key: "algorithme",
    label: "Algorithme",
    definition: "Suite finie et ordonnée d'opérations permettant de résoudre un problème.",
    type: "prerequis",
    criticality: 1,
    criticality_score: 0.95,
    bloom_target: "understand",
    relations: [
      { target_key: "complexite_algorithmique", relation_type: "related" },
    ],
    prerequisites: [],
    source_confidence: 0.95,
    source_trace: [
      { segment_index: 0, excerpt: "Suite finie et ordonnée d'opérations" },
    ],
    uncertain: false,
  },
  {
    stable_key: "structure_donnees",
    label: "Structures de données",
    definition: "Organisation des données en mémoire : tableaux, listes chaînées, piles, files, arbres, graphes.",
    type: "prerequis",
    criticality: 1,
    criticality_score: 0.92,
    bloom_target: "understand",
    relations: [
      { target_key: "algorithme", relation_type: "related" },
    ],
    prerequisites: [],
    source_confidence: 0.92,
    source_trace: [
      { segment_index: 0, excerpt: "Organisation des données en mémoire" },
      { segment_index: 1, excerpt: "tableaux, listes chaînées, piles, files" },
    ],
    uncertain: false,
  },
  {
    stable_key: "complexite_algorithmique",
    label: "Complexité algorithmique",
    definition: "Mesure des ressources (temps, espace) nécessaires à l'exécution d'un algorithme en fonction de la taille de l'entrée.",
    type: "principal",
    criticality: 1,
    criticality_score: 0.9,
    bloom_target: "analyze",
    relations: [
      { target_key: "algorithme", relation_type: "prerequisite" },
    ],
    prerequisites: ["algorithme"],
    source_confidence: 0.88,
    source_trace: [
      { segment_index: 1, excerpt: "Mesure des ressources nécessaires à l'exécution" },
    ],
    uncertain: false,
  },
  {
    stable_key: "tri_algorithmes",
    label: "Algorithmes de tri",
    definition: "Tri par insertion, sélection, fusion, rapide. Complexité moyenne et pire cas.",
    type: "principal",
    criticality: 2,
    criticality_score: 0.85,
    bloom_target: "apply",
    relations: [
      { target_key: "complexite_algorithmique", relation_type: "prerequisite" },
      { target_key: "structure_donnees", relation_type: "prerequisite" },
    ],
    prerequisites: ["complexite_algorithmique", "structure_donnees"],
    source_confidence: 0.85,
    source_trace: [
      { segment_index: 2, excerpt: "Tri par insertion, sélection, fusion, rapide" },
    ],
    uncertain: false,
  },
  {
    stable_key: "recherche_algorithmes",
    label: "Algorithmes de recherche",
    definition: "Recherche séquentielle O(n), recherche dichotomique O(log n). Application aux tableaux triés.",
    type: "principal",
    criticality: 2,
    criticality_score: 0.83,
    bloom_target: "apply",
    relations: [
      { target_key: "complexite_algorithmique", relation_type: "prerequisite" },
      { target_key: "tri_algorithmes", relation_type: "related" },
    ],
    prerequisites: ["complexite_algorithmique"],
    source_confidence: 0.84,
    source_trace: [
      { segment_index: 2, excerpt: "Recherche séquentielle O(n)" },
      { segment_index: 3, excerpt: "recherche dichotomique O(log n)" },
    ],
    uncertain: false,
  },
  {
    stable_key: "recursivite",
    label: "Récursivité",
    definition: "Technique de programmation où une fonction s'appelle elle-même. Cas de base et cas récursif.",
    type: "principal",
    criticality: 1,
    criticality_score: 0.88,
    bloom_target: "apply",
    relations: [
      { target_key: "algorithme", relation_type: "prerequisite" },
      { target_key: "tri_algorithmes", relation_type: "related" },
    ],
    prerequisites: ["algorithme"],
    source_confidence: 0.9,
    source_trace: [
      { segment_index: 3, excerpt: "Technique de programmation où une fonction s'appelle elle-même" },
    ],
    uncertain: false,
  },
  {
    stable_key: "optimisation",
    label: "Optimisation algorithmique",
    definition: "Techniques pour améliorer les performances : mémoïsation, programmation dynamique, diviser pour régner.",
    type: "principal",
    criticality: 1,
    criticality_score: 0.87,
    bloom_target: "evaluate",
    relations: [
      { target_key: "complexite_algorithmique", relation_type: "prerequisite" },
      { target_key: "recursivite", relation_type: "prerequisite" },
    ],
    prerequisites: ["complexite_algorithmique", "recursivite"],
    source_confidence: 0.83,
    source_trace: [
      { segment_index: 4, excerpt: "mémoïsation, programmation dynamique, diviser pour régner" },
    ],
    uncertain: false,
  },
];

const CS_CONFUSION_PAIRS: AnalyzedConfusionPair[] = [
  {
    concept_a_key: "tri_algorithmes",
    concept_b_key: "recherche_algorithmes",
    distinction_key: "tri_vs_recherche",
    frequency: 0.6,
  },
  {
    concept_a_key: "complexite_algorithmique",
    concept_b_key: "optimisation",
    distinction_key: "mesure_vs_amelioration",
    frequency: 0.4,
  },
];

export const CS_FIXTURE: CourseFixture = {
  id: "fixture_cs_algorithms",
  domain: "computer_science",
  title: "Algorithmique : structures, complexité et optimisation",
  concepts: CS_CONCEPTS,
  confusion_pairs: CS_CONFUSION_PAIRS,
  reasoning_type: "procedural",
  main_topic: "Algorithmique et structures de données",
  section_map: [
    { title: "Fondements algorithmiques", level: 1, content_summary: "Définition et propriétés" },
    { title: "Structures de données", level: 1, content_summary: "Tableaux, listes, arbres" },
    { title: "Tri et recherche", level: 1, content_summary: "Algorithmes classiques" },
    { title: "Récursivité", level: 1, content_summary: "Principe et applications" },
    { title: "Optimisation", level: 1, content_summary: "Techniques avancées" },
  ],
  learning_core: ["complexite_algorithmique", "tri_algorithmes", "optimisation"],
};
