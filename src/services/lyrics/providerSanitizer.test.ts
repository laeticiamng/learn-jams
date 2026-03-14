// ============================================================
// Tests: Provider Sanitizer
// ============================================================

import { describe, it, expect } from "vitest";
import { sanitizeForProviderWithReport, hasSignificantSanitization } from "./providerSanitizer";

describe("sanitizeForProviderWithReport", () => {
  it("replaces known sensitive terms", () => {
    const report = sanitizeForProviderWithReport("The mitochondria is the powerhouse of the cell");
    expect(report.cleaned).toContain("power-house");
    expect(report.replacedCount).toBeGreaterThan(0);
    expect(report.replacedWords).toContain("mitochondria");
    expect(report.replacements.length).toBeGreaterThan(0);
    expect(report.replacements[0].reason).toBe("Suno content filter");
  });

  it("preserves text without sensitive terms", () => {
    const report = sanitizeForProviderWithReport("The cat sat on the mat");
    expect(report.cleaned).toBe("The cat sat on the mat");
    expect(report.replacedCount).toBe(0);
    expect(report.replacedWords).toHaveLength(0);
    expect(report.replacements).toHaveLength(0);
  });

  it("handles multiple replacements", () => {
    const report = sanitizeForProviderWithReport("ATP and NADH in the mitochondria drive glycolysis");
    expect(report.replacedCount).toBeGreaterThanOrEqual(3);
    expect(report.cleaned).not.toContain("ATP");
    expect(report.cleaned).not.toContain("NADH");
    expect(report.cleaned).not.toContain("mitochondria");
  });

  it("handles multi-word replacements (oxidative phosphorylation)", () => {
    const report = sanitizeForProviderWithReport("oxidative phosphorylation produces ATP");
    expect(report.replacedWords).toContain("oxidative phosphorylation");
    expect(report.cleaned).toContain("oxy-P-chain");
  });

  it("tracks each replacement with original, replacement, and reason", () => {
    const report = sanitizeForProviderWithReport("The kinase phosphorylates the substrate");
    for (const r of report.replacements) {
      expect(r.original).toBeTruthy();
      expect(r.replacement).toBeTruthy();
      expect(r.reason).toBeTruthy();
    }
  });

  it("removes producer tags", () => {
    const report = sanitizeForProviderWithReport("Lyrics here feat. Drake produced by Metro");
    expect(report.cleaned).not.toContain("feat.");
    expect(report.cleaned).not.toContain("produced by");
  });

  it("canonical lyrics are never modified — only cleaned output", () => {
    const canonical = "ATP drives phosphorylation in mitochondria";
    const report = sanitizeForProviderWithReport(canonical);
    // The original string is unchanged (we only get back cleaned + report)
    expect(report.replacedCount).toBeGreaterThan(0);
    // Canonical input was not mutated
    expect(canonical).toContain("ATP");
    expect(canonical).toContain("phosphorylation");
    expect(canonical).toContain("mitochondria");
  });
});

describe("hasSignificantSanitization", () => {
  it("returns true when replacements were made", () => {
    const report = sanitizeForProviderWithReport("ATP in mitochondria");
    expect(hasSignificantSanitization(report)).toBe(true);
  });

  it("returns false when no replacements", () => {
    const report = sanitizeForProviderWithReport("Simple text without sensitive terms");
    expect(hasSignificantSanitization(report)).toBe(false);
  });
});
