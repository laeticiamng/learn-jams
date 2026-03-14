// ============================================================
// COGNITIO Coverage Helpers — M5
// ============================================================

import type { ContentBlock, CoverageReport } from "@/domain/cognitio/generation.types";
import type { AnalyzedConcept } from "@/domain/cognitio/contracts";

/**
 * Compute how many critical and major concepts are covered by content blocks.
 */
export function computeCoverage(
  concepts: AnalyzedConcept[],
  blocks: ContentBlock[]
): CoverageReport {
  const coveredKeys = new Set(blocks.flatMap(b => b.concepts_covered));

  const critical = concepts.filter(c => c.criticality === 1);
  const major = concepts.filter(c => c.criticality === 2);

  return {
    critical_total: critical.length,
    critical_covered: critical.filter(c => coveredKeys.has(c.stable_key)).length,
    major_total: major.length,
    major_covered: major.filter(c => coveredKeys.has(c.stable_key)).length,
  };
}

/**
 * Check which critical concepts are missing from generated content.
 */
export function findMissingCritical(
  concepts: AnalyzedConcept[],
  blocks: ContentBlock[]
): string[] {
  const coveredKeys = new Set(blocks.flatMap(b => b.concepts_covered));
  return concepts
    .filter(c => c.criticality === 1 && !coveredKeys.has(c.stable_key))
    .map(c => c.stable_key);
}
