// ============================================================
// Lyrics Metadata Types — Enhanced with section E
// ============================================================

export interface LyricsMetadataSections {
  notions: string[];       // A) Notions covered per section
  punchlines: string[];    // B) Flash revision
  anchors: string[];       // C) Exam anchors
  coverage: string[];      // D) Coverage check-list
  audienceFit?: string[];  // E) Audience fit (optional, behind feature flag)
}

export interface SanitizerReport {
  cleaned: string;
  replacedCount: number;
  replacedWords: string[];
  replacements: SanitizerReplacement[];
}

export interface SanitizerReplacement {
  original: string;
  replacement: string;
  reason: string;
}
