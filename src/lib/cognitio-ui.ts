// ============================================================
// COGNITIO UI Utilities
// ============================================================

import type { QualityBand, FallbackMode, MasteryStatus, BrickType, PipelineStepName } from "@/domain/cognitio/types";

export function getQualityBandLabel(band: QualityBand): string {
  switch (band) {
    case "excellent": return "Excellent";
    case "good": return "Bon";
    case "medium": return "Moyen";
    case "poor": return "Faible";
    case "unusable": return "Inutilisable";
  }
}

export function getQualityBandColor(band: QualityBand): string {
  switch (band) {
    case "excellent": return "text-green-500";
    case "good": return "text-blue-500";
    case "medium": return "text-yellow-500";
    case "poor": return "text-orange-500";
    case "unusable": return "text-red-500";
  }
}

export function getQualityBandBg(band: QualityBand): string {
  switch (band) {
    case "excellent": return "bg-green-500/10 border-green-500/20";
    case "good": return "bg-blue-500/10 border-blue-500/20";
    case "medium": return "bg-yellow-500/10 border-yellow-500/20";
    case "poor": return "bg-orange-500/10 border-orange-500/20";
    case "unusable": return "bg-red-500/10 border-red-500/20";
  }
}

export function getMasteryStatusLabel(status: MasteryStatus): string {
  switch (status) {
    case "mastered": return "Maîtrisé";
    case "strong": return "Solide";
    case "stable": return "Stable";
    case "learning": return "En cours";
    case "emerging": return "Émergent";
    case "fragile": return "Fragile";
    case "aging": return "Vieillissant";
    case "unknown": return "Inconnu";
  }
}

export function getMasteryStatusColor(status: MasteryStatus): string {
  switch (status) {
    case "mastered": return "text-green-500";
    case "strong": return "text-emerald-500";
    case "stable": return "text-teal-500";
    case "learning": return "text-blue-500";
    case "emerging": return "text-sky-500";
    case "fragile": return "text-orange-500";
    case "aging": return "text-yellow-500";
    case "unknown": return "text-muted-foreground";
  }
}

export function getBrickLabel(brick: BrickType): string {
  switch (brick) {
    case "TRI": return "Triage";
    case "SEQUENCE": return "Séquence";
    case "ELIMINATION": return "Élimination";
    case "OBSERVATION": return "Observation";
    case "DECISION": return "Décision";
  }
}

export function getBrickIcon(brick: BrickType): string {
  switch (brick) {
    case "TRI": return "filter";
    case "SEQUENCE": return "list-ordered";
    case "ELIMINATION": return "x-circle";
    case "OBSERVATION": return "eye";
    case "DECISION": return "git-branch";
  }
}

export function getFallbackModeLabel(mode: FallbackMode): string {
  switch (mode) {
    case "full": return "Mission complète";
    case "full_with_alerts": return "Mission complète (avec alertes)";
    case "reduced": return "Mission réduite";
    case "minimal": return "Mission minimale";
    case "synthesis_only": return "Synthèse uniquement";
  }
}

export function getPipelineStepLabel(step: PipelineStepName): string {
  switch (step) {
    case "upload": return "Upload";
    case "ingestion": return "Ingestion";
    case "analysis": return "Analyse";
    case "memory_architecture": return "Architecture mémoire";
    case "format_selection": return "Choix du format";
    case "generation": return "Génération";
    case "qa": return "Contrôle qualité";
  }
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`;
}

export function formatScore(score: number, max = 100): string {
  return `${Math.round(score)}/${max}`;
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}
