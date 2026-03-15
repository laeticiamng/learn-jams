import { describe, it, expect } from "vitest";
import { extractAndAnalyzeText } from "./ingestion.service";

describe("extractAndAnalyzeText", () => {
  it("returns blocking issue for empty text", () => {
    const result = extractAndAnalyzeText("");
    expect(result.clean_text).toBe("");
    expect(result.word_count).toBe(0);
    expect(result.issues.some((i) => i.code === "EMPTY_DOCUMENT")).toBe(true);
    expect(result.issues.some((i) => i.severity === "blocking")).toBe(true);
  });

  it("returns blocking issue for whitespace-only text", () => {
    const result = extractAndAnalyzeText("   \n\n   ");
    expect(result.issues.some((i) => i.code === "EMPTY_DOCUMENT")).toBe(true);
  });

  it("extracts text and computes word count", () => {
    const text = "Le système cardiovasculaire est responsable du transport du sang dans l'organisme. Il comprend le cœur et les vaisseaux sanguins. Les artères transportent le sang oxygéné du cœur vers les tissus. Les veines ramènent le sang désoxygéné vers le cœur. La pression artérielle est régulée par de multiples mécanismes physiologiques complexes qui interagissent entre eux de manière continue et adaptative. Le débit cardiaque dépend de la fréquence cardiaque et du volume d'éjection systolique. L'insuffisance cardiaque est une pathologie fréquente et grave.";
    const result = extractAndAnalyzeText(text);
    expect(result.clean_text.length).toBeGreaterThan(0);
    expect(result.word_count).toBeGreaterThan(50);
    expect(result.language).toBe("fr");
  });

  it("detects French language", () => {
    const text = "Les cellules sont les unités fondamentales de la vie. Chaque cellule possède une membrane, un cytoplasme et un noyau. Les organites cellulaires remplissent des fonctions spécifiques dans le métabolisme. La mitose est le processus de division cellulaire qui permet la croissance de l'organisme.";
    const result = extractAndAnalyzeText(text);
    expect(result.language).toBe("fr");
  });

  it("detects English language", () => {
    const text = "The cardiovascular system is responsible for transporting blood throughout the body. It includes the heart and blood vessels. Arteries carry oxygenated blood from the heart to the tissues. Veins return deoxygenated blood back to the heart for reoxygenation in the lungs.";
    const result = extractAndAnalyzeText(text);
    expect(result.language).toBe("en");
  });

  it("warns for short documents", () => {
    const text = "Un court texte de test qui contient très peu de mots pour être analysé correctement par le moteur.";
    const result = extractAndAnalyzeText(text);
    expect(result.issues.some((i) => i.code === "DOCUMENT_TOO_SHORT")).toBe(true);
  });

  it("detects prose structure for continuous text", () => {
    const text = Array(30).fill("Ceci est une phrase de texte continu qui forme un paragraphe de prose.").join(" ");
    const result = extractAndAnalyzeText(text);
    expect(result.detected_structure).toBe("prose");
  });

  it("detects bullet structure", () => {
    const text = "- Premier point important\n- Deuxième point\n- Troisième point\n- Quatrième point\n- Cinquième point\n\nUn paragraphe final.";
    const result = extractAndAnalyzeText(text);
    expect(result.detected_structure).toBe("bullets");
  });

  it("detects minimal structure for short unstructured text", () => {
    const text = "Un simple texte.";
    const result = extractAndAnalyzeText(text);
    expect(result.detected_structure).toBe("minimal");
  });

  it("removes repeated lines (headers/footers)", () => {
    const repeated = "Page Header - Université de Paris";
    const content = "Contenu important du cours sur la biologie.";
    const lines: string[] = [];
    for (let i = 0; i < 5; i++) {
      lines.push(repeated, content + ` Paragraphe ${i + 1}.`, "");
    }
    const result = extractAndAnalyzeText(lines.join("\n"));
    expect(result.clean_text).not.toContain(repeated);
    expect(result.clean_text).toContain("Contenu important");
  });

  it("removes standalone page numbers", () => {
    const text = "Premier paragraphe de texte.\n\n42\n\nDeuxième paragraphe de texte.";
    const result = extractAndAnalyzeText(text);
    expect(result.clean_text).not.toMatch(/^\s*42\s*$/m);
  });

  it("segments text by double newlines", () => {
    const text = "# Section 1\n\nContenu de la section un avec assez de texte.\n\n# Section 2\n\nContenu de la section deux avec du texte supplémentaire.";
    const result = extractAndAnalyzeText(text);
    expect(result.segments.length).toBeGreaterThanOrEqual(2);
  });

  it("detects headings in segments", () => {
    const text = "# Introduction\n\nLe cours commence ici avec une introduction complète.\n\n# Chapitre 1\n\nLe premier chapitre traite de la biologie cellulaire.";
    const result = extractAndAnalyzeText(text);
    const headingSegments = result.segments.filter((s) => s.title !== null);
    expect(headingSegments.length).toBeGreaterThanOrEqual(1);
  });

  it("computes confidence > 0 for structured content", () => {
    const text = "# Pharmacologie\n\nLes médicaments agissent sur des cibles moléculaires spécifiques. Les récepteurs membranaires sont les cibles les plus fréquentes.\n\n# Pharmacocinétique\n\nL'absorption, la distribution, le métabolisme et l'élimination des médicaments déterminent leur pharmacocinétique.\n\n# Pharmacodynamique\n\nL'effet des médicaments sur l'organisme dépend de la dose et de la sensibilité du patient.";
    const result = extractAndAnalyzeText(text);
    expect(result.confidence_level).toBeGreaterThan(0.3);
  });

  it("issues are always an array, even when no issues", () => {
    const text = Array(20).fill("Ceci est une phrase assez longue pour former un document viable pour l'analyse pédagogique.").join(" ");
    const result = extractAndAnalyzeText(text);
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it("detects institutional source type", () => {
    const text = "Article 1 — Selon le décret n°2024-123, le protocole de prise en charge doit suivre les recommandations de la circulaire ministérielle. Le référentiel national définit les bonnes pratiques cliniques. Cette recommandation s'applique à tous les établissements.";
    const result = extractAndAnalyzeText(text);
    expect(result.source_type).toBe("institutional");
  });

  it("detects personal_notes for short unstructured text", () => {
    const text = "Quelques notes rapides sur le cours d'aujourd'hui. Le prof a parlé de la cellule.";
    const result = extractAndAnalyzeText(text);
    expect(result.source_type).toBe("personal_notes");
  });
});
