// ============================================================
// Lyrics Prompt Types — Modular prompt architecture
// ============================================================

import type { AudienceAdaptation, LearnerLyricsProfile, VocabularyLevel, DensityLevel } from "./learnerProfile.types";

export interface LyricsPromptModules {
  systemCore: string;
  audienceAdaptation: string;
  memoryOptimization: string;
  examPrecision: string;
  outputContract: string;
}

export interface LyricsGenerationInput {
  text: string;
  style: string;
  title?: string;
  language: string;
  learnerLyricsProfile?: LearnerLyricsProfile;
  subject?: string;
  objective?: string;
}

export interface LyricsGenerationOutput {
  title: string;
  lyrics: string;
  canonicalLyrics: string;
  lyricsMetadata: string | null;
  audienceProfileUsed: LearnerLyricsProfile;
  vocabularyLevel: VocabularyLevel;
  densityLevel: DensityLevel;
  adaptationNotes: string[];
  coverageReport: string | null;
}
