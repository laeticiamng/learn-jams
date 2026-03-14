// ============================================================
// Provider Sanitizer — Canonical vs Audio-Safe lyrics separation
// ============================================================

import type { SanitizerReport, SanitizerReplacement } from "@/domain/lyrics/lyricsMetadata.types";

/**
 * Comprehensive word replacement map for Suno API compatibility.
 * Maps scientific/medical terms that trigger SENSITIVE_WORD_ERROR to safe alternatives.
 */
const WORD_REPLACEMENTS: Record<string, { replacement: string; reason: string }> = {
  // Phosphorus family
  phosphate: { replacement: "P-group", reason: "Suno content filter" },
  phosphates: { replacement: "P-groups", reason: "Suno content filter" },
  phosphorylation: { replacement: "P-transfer", reason: "Suno content filter" },
  phosphorylated: { replacement: "P-transferred", reason: "Suno content filter" },
  dephosphorylation: { replacement: "de-P-transfer", reason: "Suno content filter" },
  phospholipid: { replacement: "P-lipid", reason: "Suno content filter" },
  phospholipids: { replacement: "P-lipids", reason: "Suno content filter" },
  phosphorus: { replacement: "P-element", reason: "Suno content filter" },
  phosphodiester: { replacement: "P-linkage", reason: "Suno content filter" },
  phosphoenolpyruvate: { replacement: "PEP-molecule", reason: "Suno content filter" },
  // Nucleotides & energy
  adenosine: { replacement: "A-nucleoside", reason: "Suno content filter" },
  triphosphate: { replacement: "tri-P-group", reason: "Suno content filter" },
  diphosphate: { replacement: "di-P-group", reason: "Suno content filter" },
  monophosphate: { replacement: "mono-P-group", reason: "Suno content filter" },
  guanosine: { replacement: "G-nucleoside", reason: "Suno content filter" },
  nucleotide: { replacement: "base-unit", reason: "Suno content filter" },
  nucleotides: { replacement: "base-units", reason: "Suno content filter" },
  // Metabolism
  glycolysis: { replacement: "sugar-splitting", reason: "Suno content filter" },
  gluconeogenesis: { replacement: "sugar-building", reason: "Suno content filter" },
  glycogenolysis: { replacement: "glyco-breakdown", reason: "Suno content filter" },
  ketogenesis: { replacement: "keto-formation", reason: "Suno content filter" },
  lipolysis: { replacement: "fat-splitting", reason: "Suno content filter" },
  proteolysis: { replacement: "protein-splitting", reason: "Suno content filter" },
  hydrolysis: { replacement: "water-splitting", reason: "Suno content filter" },
  "oxidative phosphorylation": { replacement: "oxy-P-chain", reason: "Suno content filter" },
  // Enzymes
  "ATP synthase": { replacement: "energy-enzyme", reason: "Suno content filter" },
  kinase: { replacement: "transfer-enzyme", reason: "Suno content filter" },
  kinases: { replacement: "transfer-enzymes", reason: "Suno content filter" },
  phosphatase: { replacement: "P-remover", reason: "Suno content filter" },
  dehydrogenase: { replacement: "H-remover", reason: "Suno content filter" },
  // Organelles
  mitochondria: { replacement: "power-house", reason: "Suno content filter" },
  mitochondrial: { replacement: "power-house", reason: "Suno content filter" },
  "endoplasmic reticulum": { replacement: "ER-network", reason: "Suno content filter" },
  ribosomes: { replacement: "protein-factories", reason: "Suno content filter" },
  // Energy molecules
  photosynthesis: { replacement: "light-energy-process", reason: "Suno content filter" },
  ATP: { replacement: "energy-molecule", reason: "Suno content filter" },
  ADP: { replacement: "spent-energy-molecule", reason: "Suno content filter" },
  NADH: { replacement: "electron-shuttle", reason: "Suno content filter" },
  NADPH: { replacement: "electron-donor", reason: "Suno content filter" },
  FADH2: { replacement: "electron-pair", reason: "Suno content filter" },
  cytochrome: { replacement: "electron-carrier", reason: "Suno content filter" },
};

/**
 * Sanitize lyrics for audio provider compatibility.
 * Returns a full report with each replacement traced.
 */
export function sanitizeForProviderWithReport(canonicalLyrics: string): SanitizerReport {
  let cleaned = canonicalLyrics;
  const replacements: SanitizerReplacement[] = [];
  const replacedWords: string[] = [];

  // Sort by longest key first to handle multi-word matches before single words
  const sortedEntries = Object.entries(WORD_REPLACEMENTS).sort(
    ([a], [b]) => b.length - a.length,
  );

  for (const [word, { replacement, reason }] of sortedEntries) {
    const pattern = `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`;
    const regex = new RegExp(pattern, "gi");
    if (regex.test(cleaned)) {
      replacedWords.push(word);
      replacements.push({ original: word, replacement, reason });
      cleaned = cleaned.replace(new RegExp(pattern, "gi"), replacement);
    }
  }

  // Remove producer-tag patterns
  cleaned = cleaned.replace(/\b(feat\.?\s+\w+)/gi, "");
  cleaned = cleaned.replace(/\b(produced\s+by\s+\w+)/gi, "");
  cleaned = cleaned.replace(/\b(mixed\s+by\s+\w+)/gi, "");
  cleaned = cleaned.replace(/\b(mastered\s+by\s+\w+)/gi, "");

  return {
    cleaned,
    replacedCount: replacedWords.length,
    replacedWords,
    replacements,
  };
}

/**
 * Check if canonical and audio-safe lyrics differ significantly.
 */
export function hasSignificantSanitization(report: SanitizerReport): boolean {
  return report.replacedCount > 0;
}
