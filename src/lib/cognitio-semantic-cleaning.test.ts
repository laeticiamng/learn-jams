// ============================================================
// Tests for COGNITIO Semantic Cleaning
// ============================================================

import { describe, it, expect } from "vitest";
import {
  cleanSourceNoise,
  isEditorialArtifact,
  normalizeConceptLabel,
  isValidConceptLabel,
  rejectConceptArtifact,
  mergeDuplicateOrNoisyConcepts,
  compressDefinition,
} from "./cognitio-semantic-cleaning";

// ---------- cleanSourceNoise ----------

describe("cleanSourceNoise", () => {
  it("removes Rang labels from text", () => {
    const input = "COM R2C : Rang A\nPneumonie aiguë communautaire\nRang B\nTraitement antibiotique";
    const result = cleanSourceNoise(input);
    expect(result).not.toContain("COM R2C : Rang A");
    expect(result).not.toContain("Rang B");
    expect(result).toContain("Pneumonie aiguë communautaire");
    expect(result).toContain("Traitement antibiotique");
  });

  it("removes revision metadata lines", () => {
    const input = "Mise à jour : 15/03/2024\nContenu médical important\nVersion 3.2";
    const result = cleanSourceNoise(input);
    expect(result).not.toContain("Mise à jour");
    expect(result).not.toContain("Version 3.2");
    expect(result).toContain("Contenu médical important");
  });

  it("removes course metadata headers", () => {
    const input = "UE7 Item 151\nDFGSM2\nPneumonie aiguë communautaire";
    const result = cleanSourceNoise(input);
    expect(result).not.toContain("UE7");
    expect(result).not.toContain("DFGSM2");
    expect(result).toContain("Pneumonie aiguë communautaire");
  });

  it("removes copyright and page markers", () => {
    const input = "© Collège National\nPage 12\nTous droits réservés\nContenu utile";
    const result = cleanSourceNoise(input);
    expect(result).not.toContain("©");
    expect(result).not.toContain("Page 12");
    expect(result).not.toContain("Tous droits réservés");
    expect(result).toContain("Contenu utile");
  });

  it("cleans inline Rang labels", () => {
    const input = "La pneumonie (Rang A) est une infection pulmonaire";
    const result = cleanSourceNoise(input);
    expect(result).not.toContain("Rang A");
    expect(result).toContain("La pneumonie");
    expect(result).toContain("infection pulmonaire");
  });

  it("removes punctuation-only lines", () => {
    const input = "Contenu\n---\n) - \nAutre contenu";
    const result = cleanSourceNoise(input);
    expect(result).toContain("Contenu");
    expect(result).toContain("Autre contenu");
    expect(result).not.toMatch(/^---$/m);
  });

  it("preserves meaningful content", () => {
    const input = "La pneumonie aiguë communautaire (PAC) est définie comme une infection du parenchyme pulmonaire acquise en milieu extrahospitalier.";
    const result = cleanSourceNoise(input);
    expect(result).toBe(input);
  });
});

// ---------- isEditorialArtifact ----------

describe("isEditorialArtifact", () => {
  it("detects Rang labels", () => {
    expect(isEditorialArtifact("COM R2C : Rang A")).toBe(true);
    expect(isEditorialArtifact("Rang B")).toBe(true);
  });

  it("detects dates", () => {
    expect(isEditorialArtifact("15/03/2024")).toBe(true);
    expect(isEditorialArtifact("01-01-2023")).toBe(true);
  });

  it("does not flag medical content", () => {
    expect(isEditorialArtifact("Pneumonie aiguë communautaire")).toBe(false);
    expect(isEditorialArtifact("Traitement par amoxicilline")).toBe(false);
  });
});

// ---------- normalizeConceptLabel ----------

describe("normalizeConceptLabel", () => {
  it("cleans Rang prefix from label", () => {
    expect(normalizeConceptLabel("COM R2C : Rang A - Pneumonie")).toBe("Pneumonie");
  });

  it("cleans trailing Rang suffix", () => {
    expect(normalizeConceptLabel("Diagnostic — Rang A")).toBe("Diagnostic");
  });

  it("cleans leading punctuation artifacts", () => {
    expect(normalizeConceptLabel(") - Signes généraux inconstants")).toBe("Signes généraux inconstants");
  });

  it("rejects purely numeric labels", () => {
    expect(normalizeConceptLabel("123")).toBeNull();
    expect(normalizeConceptLabel("1.2.3")).toBeNull();
  });

  it("rejects too-short labels", () => {
    expect(normalizeConceptLabel("ab")).toBeNull();
    expect(normalizeConceptLabel("")).toBeNull();
  });

  it("rejects classification-only labels", () => {
    expect(normalizeConceptLabel("Rang A")).toBeNull();
    expect(normalizeConceptLabel("Item 151")).toBeNull();
    expect(normalizeConceptLabel("UE7 machin")).toBeNull();
  });

  it("preserves proper concept labels", () => {
    expect(normalizeConceptLabel("Pneumonie aiguë communautaire (PAC)")).toBe(
      "Pneumonie aiguë communautaire (PAC)"
    );
  });

  it("normalizes ALL-CAPS labels to Title Case", () => {
    const result = normalizeConceptLabel("PNEUMONIE AIGUË COMMUNAUTAIRE");
    expect(result).toBe("Pneumonie Aiguë Communautaire");
  });

  it("preserves medical acronyms in Title Case conversion", () => {
    const result = normalizeConceptLabel("INFECTION PAR VIH");
    expect(result).toContain("VIH");
  });
});

// ---------- isValidConceptLabel ----------

describe("isValidConceptLabel", () => {
  it("accepts proper medical concepts", () => {
    expect(isValidConceptLabel("Pneumonie aiguë communautaire")).toBe(true);
    expect(isValidConceptLabel("Score de Fine")).toBe(true);
  });

  it("rejects structural fragments", () => {
    expect(isValidConceptLabel("Signes généraux inconstants")).toBe(false);
    expect(isValidConceptLabel("Voir Tableau 3")).toBe(false);
    expect(isValidConceptLabel("Introduction")).toBe(false);
    expect(isValidConceptLabel("Conclusion")).toBe(false);
  });

  it("rejects empty or short labels", () => {
    expect(isValidConceptLabel("")).toBe(false);
    expect(isValidConceptLabel("ab")).toBe(false);
  });
});

// ---------- rejectConceptArtifact ----------

describe("rejectConceptArtifact", () => {
  it("rejects editorial artifact concepts", () => {
    const result = rejectConceptArtifact({
      label: "COM R2C : Rang A",
      definition: "Classification du concept",
    });
    expect(result.rejected).toBe(true);
  });

  it("rejects concepts with too-short definitions", () => {
    const result = rejectConceptArtifact({
      label: "Pneumonie",
      definition: "Maladie",
    });
    expect(result.rejected).toBe(true);
  });

  it("rejects concepts where definition = label", () => {
    const result = rejectConceptArtifact({
      label: "Pneumonie",
      definition: "Pneumonie",
    });
    expect(result.rejected).toBe(true);
  });

  it("accepts valid concepts", () => {
    const result = rejectConceptArtifact({
      label: "Pneumonie aiguë communautaire",
      definition: "Infection du parenchyme pulmonaire acquise en milieu extrahospitalier",
    });
    expect(result.rejected).toBe(false);
  });
});

// ---------- mergeDuplicateOrNoisyConcepts ----------

describe("mergeDuplicateOrNoisyConcepts", () => {
  it("deduplicates concepts with same normalized label", () => {
    const concepts = [
      { label: "Pneumonie", stable_key: "a", criticality: 2 },
      { label: "  Pneumonie  ", stable_key: "b", criticality: 1 },
    ];
    const result = mergeDuplicateOrNoisyConcepts(concepts);
    expect(result).toHaveLength(1);
    expect(result[0].criticality).toBe(1); // keeps more critical
  });

  it("filters out concepts with invalid labels", () => {
    const concepts = [
      { label: "Pneumonie", stable_key: "a", criticality: 1 },
      { label: ")", stable_key: "b", criticality: 2 },
    ];
    const result = mergeDuplicateOrNoisyConcepts(concepts);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Pneumonie");
  });
});

// ---------- compressDefinition ----------

describe("compressDefinition", () => {
  it("removes leading filler phrases", () => {
    expect(compressDefinition("Il s'agit d'une infection pulmonaire")).toBe(
      "Une infection pulmonaire"
    );
  });

  it("removes trailing references", () => {
    const result = compressDefinition("Infection pulmonaire (cf. chapitre 3)");
    expect(result).not.toContain("cf.");
    expect(result).toContain("Infection pulmonaire");
  });

  it("removes Rang labels from definitions", () => {
    const result = compressDefinition("Infection (Rang A) du parenchyme pulmonaire");
    expect(result).not.toContain("Rang A");
    expect(result).toContain("Infection");
  });

  it("truncates long definitions at sentence boundaries", () => {
    const longDef = "Première phrase. Deuxième phrase. Troisième phrase qui est assez longue pour dépasser la limite. Quatrième phrase.";
    const result = compressDefinition(longDef, 80);
    expect(result.length).toBeLessThanOrEqual(80);
    // Should end at a sentence boundary
    expect(result).toMatch(/\.$/);
  });

  it("capitalizes first letter", () => {
    expect(compressDefinition("une infection")).toBe("Une infection");
  });

  it("preserves short clean definitions", () => {
    const def = "Infection du parenchyme pulmonaire.";
    expect(compressDefinition(def)).toBe("Infection du parenchyme pulmonaire.");
  });
});
