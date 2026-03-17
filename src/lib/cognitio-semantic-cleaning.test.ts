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
  computeEditorialArtifactScore,
  computeHeaderNoiseScore,
  computeConceptSemanticValidityScore,
  scoreConceptCandidate,
  sanitizeMissionDisplayText,
  hasEditorialNoise,
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
    const result = compressDefinition(def);
    // stripDocumentNoise trims trailing punctuation, so period may be removed
    expect(result).toContain("Infection du parenchyme pulmonaire");
  });
});

// ---------- P0: Editorial Artifact Scoring ----------

describe("computeEditorialArtifactScore", () => {
  it("scores pure editorial header as high noise", () => {
    expect(computeEditorialArtifactScore("CODEX.:, S-ECN.COM R2C : Rang A")).toBeGreaterThanOrEqual(0.5);
  });

  it("scores CODEX alone as high noise", () => {
    expect(computeEditorialArtifactScore("CODEX")).toBeGreaterThanOrEqual(0.5);
  });

  it("scores S-ECN as noise", () => {
    expect(computeEditorialArtifactScore("S-ECN")).toBeGreaterThanOrEqual(0.5);
  });

  it("scores R2C Rang A as noise", () => {
    expect(computeEditorialArtifactScore("R2C Rang A")).toBeGreaterThanOrEqual(0.5);
  });

  it("scores clean medical concept as low noise", () => {
    expect(computeEditorialArtifactScore("Pneumonie aiguë communautaire")).toBeLessThan(0.3);
  });

  it("scores Révision 2024 as noise", () => {
    expect(computeEditorialArtifactScore("Révision 2024")).toBeGreaterThanOrEqual(0.5);
  });

  it("scores ITEM 151 as noise", () => {
    expect(computeEditorialArtifactScore("ITEM 151")).toBeGreaterThanOrEqual(0.5);
  });
});

describe("computeHeaderNoiseScore", () => {
  it("detects composite CODEX + S-ECN header", () => {
    expect(computeHeaderNoiseScore("CODEX.:, S-ECN.COM R2C : Rang A")).toBeGreaterThanOrEqual(0.5);
  });

  it("detects R2C : Rang pattern", () => {
    expect(computeHeaderNoiseScore("R2C : Rang A en NOIR")).toBeGreaterThanOrEqual(0.5);
  });

  it("does not flag clean medical text", () => {
    expect(computeHeaderNoiseScore("Pneumonie aiguë communautaire")).toBeLessThan(0.5);
  });

  it("detects iKB + R2C combo", () => {
    expect(computeHeaderNoiseScore("iKB R2C Rang A")).toBeGreaterThanOrEqual(0.5);
  });
});

describe("computeConceptSemanticValidityScore", () => {
  it("gives low validity to CODEX header", () => {
    expect(computeConceptSemanticValidityScore(
      "CODEX.:, S-ECN.COM R2C : Rang A",
      "CODEX.:, S-ECN.COM R2C : Rang A"
    )).toBeLessThan(0.3);
  });

  it("gives high validity to a real medical concept", () => {
    expect(computeConceptSemanticValidityScore(
      "Pneumonie aiguë communautaire",
      "Infection du parenchyme pulmonaire acquise en milieu extrahospitalier"
    )).toBeGreaterThan(0.5);
  });
});

describe("scoreConceptCandidate", () => {
  it("rejects CODEX.:, S-ECN.COM R2C : Rang A", () => {
    const result = scoreConceptCandidate(
      "CODEX.:, S-ECN.COM R2C : Rang A",
      "CODEX.:, S-ECN.COM R2C : Rang A"
    );
    expect(result.accepted).toBe(false);
    expect(result.reject_reason).toBeTruthy();
    expect(result.editorial_artifact_score).toBeGreaterThanOrEqual(0.5);
  });

  it("rejects S-ECN as a concept", () => {
    const result = scoreConceptCandidate("S-ECN", "Source ECN");
    expect(result.accepted).toBe(false);
  });

  it("rejects R2C Rang B", () => {
    const result = scoreConceptCandidate("R2C Rang B", "Classification R2C");
    expect(result.accepted).toBe(false);
  });

  it("rejects ITEM 151", () => {
    const result = scoreConceptCandidate("ITEM 151", "Numéro d'item");
    expect(result.accepted).toBe(false);
  });

  it("rejects Révision 2024", () => {
    const result = scoreConceptCandidate("Révision 2024", "Date de révision");
    expect(result.accepted).toBe(false);
  });

  it("accepts valid medical concept with good definition", () => {
    const result = scoreConceptCandidate(
      "Pneumonie aiguë communautaire",
      "Infection du parenchyme pulmonaire acquise en milieu extrahospitalier"
    );
    expect(result.accepted).toBe(true);
    expect(result.editorial_artifact_score).toBeLessThan(0.3);
    expect(result.header_noise_score).toBeLessThan(0.3);
    expect(result.concept_semantic_validity_score).toBeGreaterThan(0.5);
  });

  it("accepts Score de Fine as a valid concept", () => {
    const result = scoreConceptCandidate(
      "Score de Fine",
      "Score pronostique utilisé pour stratifier la sévérité des pneumonies communautaires"
    );
    expect(result.accepted).toBe(true);
  });
});

// ---------- P0: isValidConceptLabel with noise detection ----------

describe("isValidConceptLabel — P0 noise rejection", () => {
  it("rejects CODEX.:, S-ECN.COM R2C : Rang A as concept label", () => {
    expect(isValidConceptLabel("CODEX.:, S-ECN.COM R2C : Rang A")).toBe(false);
  });

  it("rejects CODEX alone", () => {
    expect(isValidConceptLabel("CODEX")).toBe(false);
  });

  it("rejects composite S-ECN.COM R2C header", () => {
    expect(isValidConceptLabel("S-ECN.COM R2C : Rang A")).toBe(false);
  });

  it("rejects R2C Rang A", () => {
    expect(isValidConceptLabel("R2C Rang A")).toBe(false);
  });

  it("rejects Révision 2024/01", () => {
    expect(isValidConceptLabel("Révision 2024/01")).toBe(false);
  });

  it("rejects ITEM 151", () => {
    expect(isValidConceptLabel("ITEM 151")).toBe(false);
  });
});

// ---------- P0: rejectConceptArtifact with scoring ----------

describe("rejectConceptArtifact — P0 scoring", () => {
  it("rejects CODEX header composite as concept", () => {
    const result = rejectConceptArtifact({
      label: "CODEX.:, S-ECN.COM R2C : Rang A",
      definition: "CODEX.:, S-ECN.COM R2C : Rang A",
    });
    expect(result.rejected).toBe(true);
  });

  it("returns scores when rejecting by scoring", () => {
    const result = rejectConceptArtifact({
      label: "CODEX.:, S-ECN.COM R2C : Rang A",
      definition: "Concept extrait du document : CODEX.:, S-ECN.COM R2C : Rang A",
    });
    expect(result.rejected).toBe(true);
  });
});

// ---------- sanitizeMissionDisplayText ----------

describe("sanitizeMissionDisplayText", () => {
  it("strips CODEX.:, S-ECN.- - Révision 5/1/2024 pattern", () => {
    const input = "CODEX.:, S-ECN.- - Révision 5/1/2024 Pneumonie aiguë communautaire";
    const result = sanitizeMissionDisplayText(input);
    expect(result).not.toContain("CODEX");
    expect(result).not.toContain("S-ECN");
    expect(result).not.toContain("Révision");
    expect(result).not.toContain("5/1/2024");
    expect(result).toContain("Pneumonie aiguë communautaire");
  });

  it("strips CODEX.:, S-ECN.COM R2C : - pattern", () => {
    const input = "CODEX.:, S-ECN.COM R2C : - Diagnostic étiologique";
    const result = sanitizeMissionDisplayText(input);
    expect(result).not.toContain("CODEX");
    expect(result).not.toContain("S-ECN");
    expect(result).not.toContain("R2C");
    expect(result).toContain("Diagnostic étiologique");
  });

  it("strips inline Rang A labels", () => {
    const input = "La pneumonie (Rang A) est une infection";
    const result = sanitizeMissionDisplayText(input);
    expect(result).not.toContain("Rang A");
    expect(result).toContain("pneumonie");
    expect(result).toContain("infection");
  });

  it("strips inline color coding", () => {
    const input = "Symptômes (en NOIR) principaux du diagnostic";
    const result = sanitizeMissionDisplayText(input);
    expect(result).not.toContain("en NOIR");
    expect(result).toContain("Symptômes");
    expect(result).toContain("principaux");
  });

  it("strips ITEM numbers", () => {
    const input = "ITEM 151 Pneumonie aiguë communautaire";
    const result = sanitizeMissionDisplayText(input);
    expect(result).not.toContain("ITEM 151");
    expect(result).toContain("Pneumonie aiguë communautaire");
  });

  it("preserves clean medical text unchanged", () => {
    const input = "La pneumonie aiguë communautaire (PAC) est une infection du parenchyme pulmonaire";
    const result = sanitizeMissionDisplayText(input);
    expect(result).toBe(input);
  });

  it("handles empty/null input gracefully", () => {
    expect(sanitizeMissionDisplayText("")).toBe("");
    expect(sanitizeMissionDisplayText("   ")).toBe("   ");
  });

  it("applies safety guard for over-aggressive cleaning", () => {
    // If the entire text is noise patterns, safety guard should kick in
    const pureNoise = "CODEX";
    const result = sanitizeMissionDisplayText(pureNoise);
    // For very short pure-noise strings, the safety guard should return original
    // since cleaning would remove >70%
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it("strips multiple branding artifacts from a single line", () => {
    const input = "CODEX S-ECN.COM R2C Révision 5/1/2024 — Traitement de la PAC par amoxicilline";
    const result = sanitizeMissionDisplayText(input);
    expect(result).not.toContain("CODEX");
    expect(result).not.toContain("S-ECN");
    expect(result).not.toContain("R2C");
    expect(result).not.toContain("Révision");
    expect(result).toContain("Traitement de la PAC par amoxicilline");
  });
});

// ---------- hasEditorialNoise ----------

describe("hasEditorialNoise", () => {
  it("detects CODEX in text", () => {
    expect(hasEditorialNoise("CODEX.:, S-ECN.- - Révision 5/1/2024")).toBe(true);
  });

  it("detects S-ECN.COM in text", () => {
    expect(hasEditorialNoise("S-ECN.COM R2C : Rang A")).toBe(true);
  });

  it("detects R2C classification", () => {
    expect(hasEditorialNoise("R2C : Rang A en NOIR")).toBe(true);
  });

  it("returns false for clean medical text", () => {
    expect(hasEditorialNoise("Pneumonie aiguë communautaire")).toBe(false);
  });

  it("returns false for null/empty", () => {
    expect(hasEditorialNoise("")).toBe(false);
  });
});

// ---------- cleanSourceNoise — inline noise reinforcement ----------

describe("cleanSourceNoise — inline branding removal", () => {
  it("removes inline CODEX branding from lines", () => {
    const input = "CODEX.:, Pneumonie aiguë communautaire";
    const result = cleanSourceNoise(input);
    expect(result).not.toContain("CODEX");
    expect(result).toContain("Pneumonie aiguë communautaire");
  });

  it("removes inline S-ECN.COM from lines", () => {
    const input = "S-ECN.COM R2C Diagnostic étiologique de la PAC";
    const result = cleanSourceNoise(input);
    expect(result).not.toContain("S-ECN");
    expect(result).not.toContain("R2C");
    expect(result).toContain("Diagnostic étiologique de la PAC");
  });

  it("removes inline Révision dates", () => {
    const input = "Révision 5/1/2024 Traitement antibiotique";
    const result = cleanSourceNoise(input);
    expect(result).not.toContain("Révision");
    expect(result).not.toContain("5/1/2024");
    expect(result).toContain("Traitement antibiotique");
  });

  it("removes inline color labels", () => {
    const input = "Symptômes (en NOIR) de la pneumonie";
    const result = cleanSourceNoise(input);
    expect(result).not.toContain("en NOIR");
    expect(result).toContain("Symptômes");
  });
});
