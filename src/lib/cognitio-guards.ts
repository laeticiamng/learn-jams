// ============================================================
// COGNITIO Type Guards — Runtime type safety for domain objects
// ============================================================

import type {
  SourceType,
  ContentType,
  KnowledgeType,
  BloomLevel,
  Criticality,
  LearningObjective,
  SourceTrace,
  AmbiguousZone,
} from "@/domain/cognitio/types";
import type {
  DetectedStructureType,
  DetailedSourceType,
  ReasoningType,
} from "@/domain/cognitio/contracts";

const VALID_SOURCE_TYPES: SourceType[] = ["pdf_text", "docx", "pasted_text", "unknown"];
const VALID_CONTENT_TYPES: ContentType[] = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const VALID_KNOWLEDGE_TYPES: KnowledgeType[] = ["factual", "conceptual", "procedural", "metacognitive"];
const VALID_BLOOM_LEVELS: BloomLevel[] = ["remember", "understand", "apply", "analyze", "evaluate", "create"];
const VALID_CRITICALITIES: Criticality[] = [1, 2, 3, 4];
const VALID_OBJECTIVES: LearningObjective[] = ["discovery", "revision", "exam", "consolidation"];
const VALID_DETAILED_SOURCE_TYPES: DetailedSourceType[] = [
  "institutional", "polycopie", "slides", "personal_notes", "unknown",
];
const VALID_STRUCTURE_TYPES: DetectedStructureType[] = [
  "prose", "bullets", "table", "mixed", "minimal",
];
const VALID_REASONING_TYPES: ReasoningType[] = [
  "declaratif", "procedural", "conditionnel", "causal", "metacognitif",
];

export function isValidSourceType(v: unknown): v is SourceType {
  return typeof v === "string" && VALID_SOURCE_TYPES.includes(v as SourceType);
}

export function isValidContentType(v: unknown): v is ContentType {
  return typeof v === "string" && VALID_CONTENT_TYPES.includes(v as ContentType);
}

export function isValidKnowledgeType(v: unknown): v is KnowledgeType {
  return typeof v === "string" && VALID_KNOWLEDGE_TYPES.includes(v as KnowledgeType);
}

export function isValidBloomLevel(v: unknown): v is BloomLevel {
  return typeof v === "string" && VALID_BLOOM_LEVELS.includes(v as BloomLevel);
}

export function isValidCriticality(v: unknown): v is Criticality {
  return typeof v === "number" && VALID_CRITICALITIES.includes(v as Criticality);
}

export function isValidObjective(v: unknown): v is LearningObjective {
  return typeof v === "string" && VALID_OBJECTIVES.includes(v as LearningObjective);
}

export function isValidDetailedSourceType(v: unknown): v is DetailedSourceType {
  return typeof v === "string" && VALID_DETAILED_SOURCE_TYPES.includes(v as DetailedSourceType);
}

export function isValidStructureType(v: unknown): v is DetectedStructureType {
  return typeof v === "string" && VALID_STRUCTURE_TYPES.includes(v as DetectedStructureType);
}

export function isValidReasoningType(v: unknown): v is ReasoningType {
  return typeof v === "string" && VALID_REASONING_TYPES.includes(v as ReasoningType);
}

export function isValidSourceTrace(v: unknown): v is SourceTrace {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.segment_index === "number" &&
    typeof obj.excerpt === "string" &&
    obj.excerpt.length > 0
  );
}

export function isValidAmbiguousZone(v: unknown): v is AmbiguousZone {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.zone_label === "string" &&
    typeof obj.reason === "string" &&
    Array.isArray(obj.segment_refs) &&
    ["low", "medium", "high"].includes(obj.severity as string)
  );
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampCriticality(value: unknown): Criticality {
  const n = typeof value === "number" ? value : 3;
  return clampNumber(Math.round(n), 1, 4) as Criticality;
}

export function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : 0.5;
  return clampNumber(n, 0, 1);
}
