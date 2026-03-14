import { describe, it, expect } from "vitest";
import { computeCoverage, findMissingCritical } from "./cognitio-coverage";
import type { ContentBlock } from "@/domain/cognitio/generation.types";
import type { AnalyzedConcept } from "@/domain/cognitio/contracts";

function makeConcept(key: string, criticality: 1 | 2 | 3 = 1): AnalyzedConcept {
  return {
    stable_key: key,
    label: key,
    definition: `Def ${key}`,
    type: "core",
    criticality,
    criticality_score: 0.9,
    bloom_target: "apply",
    relations: [],
    prerequisites: [],
    source_confidence: 0.9,
    source_trace: [],
    uncertain: false,
  };
}

function makeBlock(conceptsCovered: string[]): ContentBlock {
  return {
    block_id: "b1",
    type: "pedagogical",
    title: "Block",
    content: "Content",
    concepts_covered: conceptsCovered,
    visual_anchor: null,
    contrast_box: null,
    mnemonic: null,
    recall_event: null,
    position: 0,
  };
}

describe("computeCoverage", () => {
  it("reports full coverage when all concepts covered", () => {
    const concepts = [makeConcept("c1", 1), makeConcept("c2", 2)];
    const blocks = [makeBlock(["c1", "c2"])];
    const result = computeCoverage(concepts, blocks);
    expect(result.critical_total).toBe(1);
    expect(result.critical_covered).toBe(1);
    expect(result.major_total).toBe(1);
    expect(result.major_covered).toBe(1);
  });

  it("reports partial coverage", () => {
    const concepts = [makeConcept("c1", 1), makeConcept("c2", 1)];
    const blocks = [makeBlock(["c1"])];
    const result = computeCoverage(concepts, blocks);
    expect(result.critical_covered).toBe(1);
    expect(result.critical_total).toBe(2);
  });

  it("handles empty blocks", () => {
    const concepts = [makeConcept("c1", 1)];
    const result = computeCoverage(concepts, []);
    expect(result.critical_covered).toBe(0);
  });
});

describe("findMissingCritical", () => {
  it("returns empty when all critical covered", () => {
    const concepts = [makeConcept("c1", 1)];
    const blocks = [makeBlock(["c1"])];
    expect(findMissingCritical(concepts, blocks)).toHaveLength(0);
  });

  it("returns missing critical keys", () => {
    const concepts = [makeConcept("c1", 1), makeConcept("c2", 1)];
    const blocks = [makeBlock(["c1"])];
    expect(findMissingCritical(concepts, blocks)).toEqual(["c2"]);
  });

  it("ignores non-critical concepts", () => {
    const concepts = [makeConcept("c1", 1), makeConcept("c2", 2)];
    const blocks = [makeBlock(["c1"])];
    expect(findMissingCritical(concepts, blocks)).toHaveLength(0);
  });
});
