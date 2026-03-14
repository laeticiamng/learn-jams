// ============================================================
// COGNITIO Formatters — Display formatting for M1/M2 data
// ============================================================

import type { Criticality, BloomLevel } from "@/domain/cognitio/types";
import type {
  DetailedSourceType,
  DetectedStructureType,
  ReasoningType,
  AnalysisConfidence,
} from "@/domain/cognitio/contracts";

// ---------- Source Type ----------

const SOURCE_TYPE_LABELS: Record<DetailedSourceType, string> = {
  institutional: "Document institutionnel",
  polycopie: "Polycopié / support de cours",
  slides: "Diapositives / présentation",
  personal_notes: "Notes personnelles",
  unknown: "Type non identifié",
};

export function formatSourceType(type: DetailedSourceType): string {
  return SOURCE_TYPE_LABELS[type] ?? "Type inconnu";
}

// ---------- Structure Type ----------

const STRUCTURE_LABELS: Record<DetectedStructureType, string> = {
  prose: "Texte continu",
  bullets: "Liste à puces",
  table: "Tableaux",
  mixed: "Structure mixte",
  minimal: "Peu structuré",
};

export function formatStructureType(type: DetectedStructureType): string {
  return STRUCTURE_LABELS[type] ?? "Non détecté";
}

// ---------- Reasoning Type ----------

const REASONING_LABELS: Record<ReasoningType, string> = {
  declaratif: "Déclaratif (savoir quoi)",
  procedural: "Procédural (savoir comment)",
  conditionnel: "Conditionnel (savoir quand)",
  causal: "Causal (savoir pourquoi)",
  metacognitif: "Métacognitif (savoir sur le savoir)",
};

export function formatReasoningType(type: ReasoningType): string {
  return REASONING_LABELS[type] ?? type;
}

// ---------- Criticality ----------

const CRITICALITY_LABELS: Record<Criticality, string> = {
  1: "Critique",
  2: "Majeur",
  3: "Secondaire",
  4: "Accessoire",
};

const CRITICALITY_COLORS: Record<Criticality, string> = {
  1: "text-red-600",
  2: "text-orange-500",
  3: "text-yellow-500",
  4: "text-gray-400",
};

const CRITICALITY_BG: Record<Criticality, string> = {
  1: "bg-red-100 border-red-300",
  2: "bg-orange-100 border-orange-300",
  3: "bg-yellow-50 border-yellow-200",
  4: "bg-gray-50 border-gray-200",
};

export function formatCriticality(level: Criticality): string {
  return CRITICALITY_LABELS[level] ?? `Niveau ${level}`;
}

export function getCriticalityColor(level: Criticality): string {
  return CRITICALITY_COLORS[level] ?? "text-gray-400";
}

export function getCriticalityBg(level: Criticality): string {
  return CRITICALITY_BG[level] ?? "bg-gray-50";
}

// ---------- Bloom Level ----------

const BLOOM_LABELS: Record<BloomLevel, string> = {
  remember: "Mémoriser",
  understand: "Comprendre",
  apply: "Appliquer",
  analyze: "Analyser",
  evaluate: "Évaluer",
  create: "Créer",
};

const BLOOM_SHORT: Record<BloomLevel, string> = {
  remember: "MEM",
  understand: "COMP",
  apply: "APP",
  analyze: "ANA",
  evaluate: "EVA",
  create: "CRE",
};

export function formatBloomLevel(level: BloomLevel): string {
  return BLOOM_LABELS[level] ?? level;
}

export function formatBloomShort(level: BloomLevel): string {
  return BLOOM_SHORT[level] ?? level.toUpperCase().slice(0, 3);
}

// ---------- Confidence ----------

export function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function getConfidenceColor(value: number): string {
  if (value >= 0.8) return "text-green-600";
  if (value >= 0.6) return "text-blue-500";
  if (value >= 0.4) return "text-yellow-500";
  return "text-red-500";
}

export function getConfidenceBg(value: number): string {
  if (value >= 0.8) return "bg-green-100";
  if (value >= 0.6) return "bg-blue-50";
  if (value >= 0.4) return "bg-yellow-50";
  return "bg-red-50";
}

// ---------- Analysis Confidence ----------

export function formatAnalysisConfidence(confidence: AnalysisConfidence): {
  label: string;
  color: string;
  description: string;
}[] {
  return [
    {
      label: "Concepts",
      color: getConfidenceColor(confidence.concepts),
      description: formatConfidence(confidence.concepts),
    },
    {
      label: "Logique",
      color: getConfidenceColor(confidence.logic),
      description: formatConfidence(confidence.logic),
    },
    {
      label: "Pièges",
      color: getConfidenceColor(confidence.traps),
      description: formatConfidence(confidence.traps),
    },
    {
      label: "Structure",
      color: getConfidenceColor(confidence.structure),
      description: formatConfidence(confidence.structure),
    },
  ];
}

// ---------- Word Count ----------

export function formatWordCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k mots`;
  return `${count} mots`;
}

// ---------- Language ----------

const LANGUAGE_LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
};

export function formatLanguage(code: string): string {
  return LANGUAGE_LABELS[code] ?? code.toUpperCase();
}
