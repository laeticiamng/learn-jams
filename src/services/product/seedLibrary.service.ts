// ============================================================
// Seed Library Service — Demo transformations
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { SeedTransformation, SeedTransformationSummary } from "@/domain/product/seed.types";

export async function getSeedTransformations(
  filters?: { format?: string; audience_level?: string },
): Promise<SeedTransformationSummary[]> {
  let query = supabase
    .from("seed_transformations")
    .select("id, title, subject, format, difficulty")
    .order("created_at", { ascending: true });

  if (filters?.format) query = query.eq("format", filters.format);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as SeedTransformationSummary[];
}

export async function getSeedTransformationById(id: string): Promise<SeedTransformation | null> {
  const { data, error } = await supabase
    .from("seed_transformations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as SeedTransformation;
}

// ---------- Local seed data for when DB is empty ----------

export function getLocalSeedTransformations(): SeedTransformationSummary[] {
  return LOCAL_SEEDS.map((s) => ({
    id: s.id,
    title: s.title,
    subject: s.subject,
    audience_level: s.audience_level,
    format: s.format,
  }));
}

export function getLocalSeedById(id: string): SeedTransformation | null {
  return LOCAL_SEEDS.find((s) => s.id === id) ?? null;
}

const LOCAL_SEEDS: SeedTransformation[] = [
  {
    id: "seed-lycee-bio-fiche",
    title: "La mitose cellulaire",
    subject: "Biologie",
    audience_level: "lycee",
    format: "fiche_dynamique",
    transformation_json: {
      transformation_id: "seed-lycee-bio-fiche",
      blocks: [
        { type: "hook", content: "Chaque seconde, ton corps produit 3.8 millions de cellules. Comment ? Par la mitose." },
        { type: "pedagogical_segment", content: "La mitose est la division d'une cellule mère en deux cellules filles identiques. Elle comporte 4 phases : prophase, métaphase, anaphase, télophase.", concepts_covered: ["mitose", "prophase", "metaphase", "anaphase", "telophase"] },
        { type: "contrast_box", content: "Ne pas confondre : mitose (division cellulaire somatique) et méiose (division des cellules reproductrices).", concept_a: "mitose", concept_b: "meiose" },
        { type: "consolidation", content: "Retiens PMAT : Prophase, Métaphase, Anaphase, Télophase." },
      ],
    },
    recall_tests_json: {
      test_id: "seed-test-bio",
      test_type: "final_test",
      items: [
        { id: "q1", type: "qcu", question: "Combien de phases comporte la mitose ?", options: ["2", "3", "4", "5"], expected_answer: "4", concepts_tested: ["mitose"] },
        { id: "q2", type: "qcu", question: "Quelle phase vient après la métaphase ?", options: ["Prophase", "Anaphase", "Télophase", "Interphase"], expected_answer: "Anaphase", concepts_tested: ["anaphase"] },
        { id: "q3", type: "qcu", question: "La mitose produit des cellules...", options: ["Différentes", "Identiques", "Plus petites", "Plus grandes"], expected_answer: "Identiques", concepts_tested: ["mitose"] },
      ],
    },
    debrief_demo_json: {
      score: 0.85,
      message: "Bonne maîtrise de la mitose. Revoir la distinction mitose/méiose.",
    },
    feature_flags_json: {},
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "seed-universite-droit-histoire",
    title: "La séparation des pouvoirs",
    subject: "Droit constitutionnel",
    audience_level: "universite",
    format: "histoire_animee",
    transformation_json: {
      transformation_id: "seed-universite-droit-histoire",
      title: "Montesquieu et la séparation des pouvoirs",
      scenes: [
        { scene_number: 1, title: "Le contexte", narrative: "France, 1748. Montesquieu publie De l'esprit des lois. Il observe que le pouvoir absolu corrompt.", concepts_introduced: ["separation_pouvoirs", "montesquieu"] },
        { scene_number: 2, title: "Les trois pouvoirs", narrative: "Législatif : fait les lois. Exécutif : les applique. Judiciaire : les interprète et sanctionne.", concepts_introduced: ["legislatif", "executif", "judiciaire"] },
        { scene_number: 3, title: "L'équilibre", narrative: "Aucun pouvoir ne doit dominer les autres. C'est le principe de checks and balances.", concepts_introduced: ["equilibre_pouvoirs"] },
      ],
    },
    recall_tests_json: {
      test_id: "seed-test-droit",
      test_type: "final_test",
      items: [
        { id: "q1", type: "qcu", question: "Qui a théorisé la séparation des pouvoirs ?", options: ["Rousseau", "Montesquieu", "Voltaire", "Locke"], expected_answer: "Montesquieu", concepts_tested: ["montesquieu"] },
        { id: "q2", type: "qcu", question: "Le pouvoir judiciaire...", options: ["Fait les lois", "Les applique", "Les interprète", "Les abroge"], expected_answer: "Les interprète", concepts_tested: ["judiciaire"] },
      ],
    },
    debrief_demo_json: { score: 0.9, message: "Excellente compréhension des fondements constitutionnels." },
    feature_flags_json: {},
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "seed-pro-management-fiche",
    title: "Les 5 forces de Porter",
    subject: "Stratégie d'entreprise",
    audience_level: "professionnel",
    format: "fiche_dynamique",
    transformation_json: {
      transformation_id: "seed-pro-management-fiche",
      blocks: [
        { type: "hook", content: "Pourquoi certaines industries sont ultra-rentables et d'autres non ? Michael Porter a la réponse." },
        { type: "pedagogical_segment", content: "Les 5 forces : 1) Rivalité entre concurrents 2) Pouvoir de négociation des clients 3) Pouvoir des fournisseurs 4) Menace des nouveaux entrants 5) Menace des produits de substitution.", concepts_covered: ["5_forces_porter", "rivalite", "pouvoir_clients", "pouvoir_fournisseurs", "nouveaux_entrants", "substitution"] },
        { type: "contrast_box", content: "Ne pas confondre : analyse SWOT (interne+externe) et 5 forces de Porter (uniquement l'environnement concurrentiel externe).", concept_a: "5_forces_porter", concept_b: "swot" },
        { type: "consolidation", content: "Les 5 forces analysent l'attractivité structurelle d'une industrie, pas d'une entreprise en particulier." },
      ],
    },
    recall_tests_json: {
      test_id: "seed-test-porter",
      test_type: "final_test",
      items: [
        { id: "q1", type: "qcu", question: "Combien de forces dans le modèle de Porter ?", options: ["3", "4", "5", "6"], expected_answer: "5", concepts_tested: ["5_forces_porter"] },
        { id: "q2", type: "qcu", question: "Quelle force N'est PAS dans le modèle de Porter ?", options: ["Pouvoir des clients", "Menace de substitution", "Analyse SWOT", "Nouveaux entrants"], expected_answer: "Analyse SWOT", concepts_tested: ["5_forces_porter", "swot"] },
      ],
    },
    debrief_demo_json: { score: 0.8, message: "Bonne compréhension du cadre analytique de Porter." },
    feature_flags_json: {},
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "seed-college-histoire-fiche",
    title: "La Révolution française : les grandes dates",
    subject: "Histoire",
    audience_level: "college",
    format: "fiche_dynamique",
    transformation_json: {
      transformation_id: "seed-college-histoire-fiche",
      blocks: [
        { type: "hook", content: "Le 14 juillet 1789, une foule de Parisiens prend d'assaut une forteresse. Ce jour change l'histoire du monde." },
        { type: "pedagogical_segment", content: "1789 : prise de la Bastille, abolition des privilèges (nuit du 4 août), Déclaration des droits de l'homme et du citoyen. 1792 : abolition de la monarchie, proclamation de la République. 1793 : exécution de Louis XVI.", concepts_covered: ["bastille", "abolition_privileges", "droits_homme", "republique", "louis_xvi"] },
        { type: "consolidation", content: "La Révolution transforme la France d'une monarchie absolue en une république fondée sur les droits individuels." },
      ],
    },
    recall_tests_json: {
      test_id: "seed-test-revolution",
      test_type: "final_test",
      items: [
        { id: "q1", type: "qcu", question: "En quelle année a lieu la prise de la Bastille ?", options: ["1789", "1792", "1793", "1799"], expected_answer: "1789", concepts_tested: ["bastille"] },
        { id: "q2", type: "qcu", question: "Quand la République est-elle proclamée ?", options: ["1789", "1791", "1792", "1793"], expected_answer: "1792", concepts_tested: ["republique"] },
      ],
    },
    debrief_demo_json: { score: 0.75, message: "Les grandes dates sont connues. Approfondir les causes." },
    feature_flags_json: {},
    status: "active",
    created_at: new Date().toISOString(),
  },
];
