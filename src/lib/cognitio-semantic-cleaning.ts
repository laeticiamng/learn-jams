// ============================================================
// COGNITIO Semantic Cleaning — Source noise removal, concept
// normalization, and artifact filtering
// ============================================================

// ---------- Document Noise Blacklist ----------

/**
 * Centralized blacklist of document artifact keywords/patterns.
 * Any concept, label, definition, option, or prompt containing these
 * should be rejected or cleaned before reaching the mission player.
 */
export const DOCUMENT_NOISE_BLACKLIST: RegExp[] = [
  // Branding / Platform names
  /\bCODEX\b/i,
  /\bS[\s-]*ECN\b/i,
  /\bECN\.COM\b/i,
  /\bS-ECN\.COM\b/i,
  /\bMED-LINE\b/i,
  /\bELLIPSES\b/i,
  /\bVERNAZOBRES[\s-]*GREGO\b/i,
  /\bKB\s*\/\s*iKB\b/i,
  /\biKB\b/,
  /\bPREP['']?ECN\b/i,

  // Classification / Rang metadata
  /\bR2C\b/,
  /\bRang\s+[A-Z]\b/i,
  /\bRang\s+[ABC]\s+en\s+/i,
  /\ben\s+(?:NOIR|BLEU|ROUGE|BRUN|MARRON)\b/i,
  /\bCOM\s+R2C\b/i,

  // Revision / version markers
  /\bRévision\s+\d/i,
  /\bmise\s+à\s+jour\b/i,
  /\bMAJ\s*[:—–\-]\s*\d/i,
  /\bVersion\s+\d/i,

  // Item / document structure labels
  /\bITEM\s+\d+/i,
  /\bN°\s*\d+\b/,
  /\bObjectif\s+\d+/i,

  // Institutional / course metadata
  /\bUE\s*\d+/i,
  /\bDFGSM\b/i,
  /\bDFASM\b/i,
  /\biECN\b/,
  /\bEDN\b/,

  // PDF / typographic residues
  /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/, // dates like 4/1/2024
  /\bPage\s+\d+/i,
  /\b\d+\s*\/\s*\d+\s*$/,

  // Generic branding fragments
  /\bCollège\s+(?:national|des)\b/i,
  /\bRéférentiel\b/i,
  /\bwww\.\S+/i,
  /\bhttps?:\/\/\S+/i,
];

/**
 * Check if a string contains document noise from the blacklist.
 * Returns the first matching pattern description or null if clean.
 */
export function detectDocumentNoise(text: string): { noisy: boolean; matches: string[] } {
  const matches: string[] = [];
  for (const pattern of DOCUMENT_NOISE_BLACKLIST) {
    if (pattern.test(text)) {
      matches.push(pattern.source);
    }
  }
  return { noisy: matches.length > 0, matches };
}

/**
 * Compute a noise score for a text string (0 = clean, 1 = pure noise).
 * Used for mission item QA.
 */
export function computeNoiseScore(text: string): number {
  if (!text || text.trim().length === 0) return 1;

  const words = text.trim().split(/\s+/);
  if (words.length === 0) return 1;

  let noiseWordCount = 0;
  for (const word of words) {
    for (const pattern of DOCUMENT_NOISE_BLACKLIST) {
      if (pattern.test(word)) {
        noiseWordCount++;
        break;
      }
    }
  }

  // Also check for punctuation-heavy fragments
  const alphaChars = (text.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  const punctRatio = 1 - alphaChars / Math.max(1, text.length);
  const wordNoiseRatio = noiseWordCount / words.length;

  // Combined score: word noise + punctuation heaviness
  return Math.min(1, wordNoiseRatio * 0.7 + (punctRatio > 0.6 ? 0.3 : 0));
}

/**
 * Strip document noise from a text string, keeping only pedagogical content.
 * Includes safety guard ratio to prevent over-cleaning.
 */
export function stripDocumentNoise(text: string): string {
  const original = text;
  let cleaned = text;

  // Remove blacklisted fragments
  for (const pattern of DOCUMENT_NOISE_BLACKLIST) {
    cleaned = cleaned.replace(new RegExp(pattern.source, pattern.flags + (pattern.flags.includes('g') ? '' : 'g')), ' ');
  }

  // Collapse whitespace
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  // Remove leading/trailing punctuation artifacts
  cleaned = cleaned.replace(/^[\s;:.,\-–—•]+/, '').replace(/[\s;:.,\-–—•]+$/, '').trim();

  // Safety guard: if cleaning removed >70% of content, keep original
  const ratio = cleaned.length / Math.max(1, original.length);
  if (ratio < 0.3) {
    console.warn("[SAFETY] stripDocumentNoise too aggressive, fallback", {
      originalLength: original.length,
      cleanedLength: cleaned.length,
      ratio,
    });
    return original;
  }

  return cleaned;
}

// ---------- Source Noise Patterns ----------

/** Patterns that indicate editorial/administrative artifacts in medical/academic documents */
const EDITORIAL_ARTIFACT_PATTERNS: RegExp[] = [
  // Rang labels (French medical classification) — standalone lines only
  /^(?:COM\s+)?R2C\s*:\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|Rang\s+[A-Z])\b/i,
  /^\s*Rang\s+[A-Z]\s*$/i,
  /^COM\s+R2C\b/i,
  /^en\s+(?:NOIR|BLEU|ROUGE)\s*[-–—]\s*en\s+(?:NOIR|BLEU|ROUGE)/i,

  // Revision/version metadata
  /^(?:Dernière\s+)?(?:mise\s+à\s+jour|MAJ|révision)\s*[:—–-]\s*\d/i,
  /^Version\s+\d+/i,
  /^(?:Révisé|Modifié|Créé)\s+(?:le|en)\s+/i,
  /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/,

  // Course metadata headers
  /^(?:UE|DFGSM|DFASM|ECN|EDN|iECN)\s*\d/i,
  /^(?:Item|Objectif|N°)\s*\d+\s*(?:[-–—:]|$)/i,
  /^Collège\s+(?:national|des)\s/i,
  /^Référentiel\s/i,
  /^Sujet\s+principal\s*:\s*COM\s/i,

  // Page/section indicators
  /^Page\s+\d+/i,
  /^\d+\s*\/\s*\d+\s*$/,
  /^©\s/,
  /^Tous\s+droits\s+réservés/i,

  // Empty structural fragments
  /^[-–—]+\s*$/,
  /^\s*[)(\]}\[{]\s*[-–—]\s*/,
  /^\s*[•\-–]\s*$/,

  // Color formatting metadata
  /^en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\s*$/i,

  // Repeated branding / university headers (generic)
  /^(?:Université|Faculté|Institut|École|Département)\s.{0,60}$/i,
  /^(?:Cours|Module|Matière)\s*[:—–-]\s*.{0,60}$/i,
  /^(?:Enseignant|Professeur|Dr|Pr)\s*[:—–.]\s*.{0,80}$/i,
  /^(?:Année\s+(?:universitaire|scolaire|académique))\s*[:—–-]\s*\d/i,
  /^(?:Semestre|Trimestre)\s*\d/i,

  // Footer / header residues
  /^(?:www\.|http|mailto)/i,
  /^\d+\s*[-–—]\s*\d+\s*$/,
  /^(?:Source|Adapté de|D'après)\s*:/i,

  // Platform branding / editorial artifacts (P0 fix)
  /^(?:CODEX|S[\s-]*ECN|ECN\.COM|MED-LINE|ELLIPSES)\b/i,
  /\bCODEX\b.*\bS[\s-]*ECN\b/i,
  /\bS[\s-]*ECN\.COM\b/i,
  /\bPREP['']?ECN\b/i,
  /\bVERNAZOBRES/i,
  /\biKB\b.*\bR2C\b/i,
  /^(?:KB|iKB)\s*[\/|]\s*/i,
];

/** Patterns for noise that should be stripped from concept labels */
const CONCEPT_LABEL_NOISE_PATTERNS: RegExp[] = [
  // Leading punctuation artifacts (but NOT opening parens that may be part of label)
  /^[\s)\-–—•:;,.\]}\[{]+/,
  // Trailing punctuation artifacts (but NOT closing parens that may be part of acronyms like "(PAC)")
  /[\s\-–—•:;,.\]}\[{]+$/,

  // Rang/classification prefixes
  /^(?:COM\s+)?R2C\s*:\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|Rang\s+[A-Z])\s*[-–—:]\s*/i,
  /\s*[-–—]\s*(?:Rang\s+[A-Z]|en\s+(?:NOIR|BLEU|ROUGE))\s*$/i,
  /^Rang\s+[A-Z]\s*[-–—:]\s*/i,

  // Item number prefixes
  /^Item\s+\d+\s*[-–—:]\s*/i,
  /^N°\s*\d+\s*[-–—:]\s*/i,

  // Signes/symptômes fragments that are not standalone concepts
  /^[)]\s*[-–—]\s*/,

  // Color metadata
  /\s*[-–—]\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\s*$/i,
  /^en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\s*[-–—]\s*/i,

  // Truncation artifacts — trailing open parens without close
  /\s*\(\s*$/,
  // Leading close parens
  /^\s*\)\s*/,
];

// ---------- Source Noise Cleaning ----------

/**
 * Clean editorial artifacts from source text before concept extraction.
 * This runs AFTER basic PDF/text cleaning (M1 cleanRawText) and BEFORE
 * concept extraction (M2).
 */
export function cleanSourceNoise(text: string): string {
  const lines = text.split("\n");
  const cleaned: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines (preserve double-newline structure)
    if (trimmed.length === 0) {
      cleaned.push("");
      continue;
    }

    // Skip lines that are PURELY editorial artifacts.
    // If a line starts with branding but has substantial content after,
    // don't skip it — clean it inline instead.
    if (isEditorialArtifact(trimmed)) {
      // Check if the line has enough non-noise content to be worth salvaging
      const afterInlineCleaning = cleanInlineNoise(trimmed);
      if (afterInlineCleaning.length < 15 || afterInlineCleaning === trimmed || isEditorialArtifact(afterInlineCleaning)) {
        // Pure noise, inline cleaning didn't help, or residual is still editorial — skip
        continue;
      }
      // Has salvageable content — fall through to inline cleaning
    }

    // Clean inline noise from the line
    const cleanedLine = cleanInlineNoise(trimmed);

    // Skip if cleaning left nothing meaningful
    if (cleanedLine.trim().length < 3) {
      continue;
    }

    cleaned.push(cleanedLine);
  }

  // Collapse excessive blank lines
  const result = cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  // Safety guard: if cleaning removed >90% of content, keep original.
  // This is a line-level filter (not regex), so it's expected to remove
  // large portions of heavily noisy documents. Use a low threshold.
  const ratio = result.length / Math.max(1, text.length);
  if (ratio < 0.1) {
    console.warn("[SAFETY] cleanSourceNoise too aggressive, fallback", {
      originalLength: text.length,
      cleanedLength: result.length,
      ratio,
    });
    return text;
  }

  return result;
}

/**
 * Check if a line is a pure editorial artifact that should be removed.
 */
export function isEditorialArtifact(line: string): boolean {
  const trimmed = line.trim();

  // Very short lines that are likely noise
  if (trimmed.length <= 2 && /^[^a-zA-ZÀ-ÿ0-9]/.test(trimmed)) {
    return true;
  }

  return EDITORIAL_ARTIFACT_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Clean inline editorial noise from a text line.
 * Handles branding, classification, color coding, revision metadata, etc.
 */
function cleanInlineNoise(line: string): string {
  let cleaned = line;

  // Remove inline Rang labels
  cleaned = cleaned.replace(/\s*\(?\s*Rang\s+[A-Z]\s*\)?\s*/gi, " ");
  cleaned = cleaned.replace(/\s*[-–—]\s*R2C\s*:\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON|Rang\s+[A-Z])(?:\s*[-–—]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON|Rang\s+[A-Z]))*/gi, " ");

  // Remove inline color coding
  cleaned = cleaned.replace(/\s*\(?\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\s*\)?\s*/gi, " ");

  // Remove inline platform branding (CODEX, S-ECN, etc.)
  cleaned = cleaned.replace(/\bCODEX\b[.:;,\s-]*/gi, "");
  cleaned = cleaned.replace(/\bS[\s-]*ECN(?:\.\s*COM|\.\s*-|\.COM)?\b[.:;,\s-]*/gi, "");
  cleaned = cleaned.replace(/\bMED[\s-]*LINE\b[.:;,\s-]*/gi, "");
  cleaned = cleaned.replace(/\biKB\b[.:;,\s-]*/gi, "");
  cleaned = cleaned.replace(/\bPREP['']?ECN\b[.:;,\s-]*/gi, "");
  cleaned = cleaned.replace(/\bELLIPSES\b[.:;,\s-]*/gi, "");
  cleaned = cleaned.replace(/\bVERNAZOBRES[\s-]*GREGO?\b[.:;,\s-]*/gi, "");
  cleaned = cleaned.replace(/\bECN\.COM\b[.:;,\s-]*/gi, "");

  // Remove inline R2C / classification
  cleaned = cleaned.replace(/\bR2C\b\s*/gi, "");
  cleaned = cleaned.replace(/\bCOM\s+R2C\b\s*/gi, "");

  // Remove inline ITEM numbers
  cleaned = cleaned.replace(/\bITEM\s+\d+\s*/gi, "");

  // Remove inline revision/date metadata
  cleaned = cleaned.replace(/\bRévision\s+\d[\d/]*\b\s*/gi, "");
  cleaned = cleaned.replace(/\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\b\s*/g, "");

  // Remove trailing page refs
  cleaned = cleaned.replace(/\s*\(\s*p\.\s*\d+\s*\)\s*$/i, "");

  // Remove reference numbers [1,2,3]
  cleaned = cleaned.replace(/\s*\[\s*\d+(?:\s*,\s*\d+)*\s*\]\s*/g, " ");

  // Collapse multiple spaces and clean leading/trailing punctuation artifacts
  // Note: preserve trailing periods (sentence endings) — only strip noise punctuation
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  cleaned = cleaned.replace(/^[\s;:,\-–—]+/, "").replace(/[\s;:,\-–—]+$/, "").trim();

  return cleaned;
}

// ---------- Mission Display Text Sanitization ----------

/**
 * INLINE_EDITORIAL_PATTERNS: Patterns stripped from text before mission display.
 * These are applied as a terminal guard — even if upstream cleaning missed them.
 */
const DISPLAY_NOISE_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // Platform branding
  { pattern: /\bCODEX\b[.:;,]?\s*/gi, replacement: "" },
  { pattern: /\bS[\s-]*ECN(?:\.\s*COM|\.\s*-|\.COM)?\b[.:;,\s-]*/gi, replacement: "" },
  { pattern: /\bMED[\s-]*LINE\b\s*/gi, replacement: "" },
  { pattern: /\biKB\b\s*/gi, replacement: "" },
  { pattern: /\bPREP['']?ECN\b\s*/gi, replacement: "" },
  { pattern: /\bELLIPSES\b\s*/gi, replacement: "" },
  { pattern: /\bVERNAZOBRES[\s-]*GREGO?\b\s*/gi, replacement: "" },
  { pattern: /\bECN\.COM\b\s*/gi, replacement: "" },
  // Classification / Rang
  { pattern: /\bR2C\s*:?\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON|Rang\s+[A-Z])(?:\s*[-–—]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON|Rang\s+[A-Z]))*/gi, replacement: "" },
  { pattern: /\bCOM\s+R2C\b[.:;,]?\s*/gi, replacement: "" },
  { pattern: /\bR2C\b[.:;,]?\s*/gi, replacement: "" },
  { pattern: /\s*\(?\s*Rang\s+[A-Z]\s*\)?\s*/gi, replacement: " " },
  { pattern: /\s*\(?\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\s*\)?\s*/gi, replacement: " " },
  // Standalone color labels NOT in medical context
  { pattern: /^(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\s*[-–—:]\s*/i, replacement: "" },
  // Revision / date metadata
  { pattern: /\bRévision\s+\d[\d/]*\b\s*/gi, replacement: "" },
  { pattern: /\bmise\s+à\s+jour\s*[:—–\-]\s*\d[\d/.]*/gi, replacement: "" },
  { pattern: /\bMAJ\s*[:—–\-]\s*\d[\d/.]*/gi, replacement: "" },
  // ITEM numbers
  { pattern: /\bITEM\s+\d+\s*[-–—:]?\s*/gi, replacement: "" },
  // Inline dates (standalone, not part of medical data)
  { pattern: /\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\b\s*/g, replacement: "" },
  // Page references
  { pattern: /\bPage\s+\d+\b\s*/gi, replacement: "" },
  { pattern: /\s*\(\s*p\.\s*\d+\s*\)\s*/gi, replacement: "" },
  // Reference numbers
  { pattern: /\s*\[\s*\d+(?:\s*,\s*\d+)*\s*\]\s*/g, replacement: " " },
  // URLs
  { pattern: /\bhttps?:\/\/\S+/gi, replacement: "" },
  { pattern: /\bwww\.\S+/gi, replacement: "" },
];

/**
 * Terminal sanitization guard for mission display text.
 * Applied as a last line of defense before any text reaches the UI:
 * - intro narrative
 * - puzzle prompt
 * - response options
 * - feedback / explanation
 *
 * This does NOT replace source-level cleaning — it catches residual leaks.
 * Includes a safety guard ratio to prevent over-cleaning.
 */
export function sanitizeMissionDisplayText(text: string): string {
  if (!text || text.trim().length === 0) return text;

  const original = text;
  let cleaned = text;

  for (const { pattern, replacement } of DISPLAY_NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Collapse whitespace
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  // Clean leading/trailing punctuation artifacts left by removals
  cleaned = cleaned.replace(/^[\s;:.,\-–—•]+/, "").replace(/[\s;:.,\-–—•]+$/, "").trim();

  // Safety guard: if cleaning removed >70% of content, keep original
  const ratio = cleaned.length / Math.max(1, original.length);
  if (ratio < 0.3) {
    console.warn("[SAFETY] sanitizeMissionDisplayText too aggressive, fallback", {
      originalLength: original.length,
      cleanedLength: cleaned.length,
      ratio,
    });
    return original;
  }

  return cleaned;
}

/**
 * Check if a text string contains editorial noise patterns.
 * Useful for trace logging without modifying the text.
 */
export function hasEditorialNoise(text: string): boolean {
  if (!text) return false;
  return DISPLAY_NOISE_PATTERNS.some(({ pattern }) => {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

// ---------- Concept Label Normalization ----------

/**
 * Normalize a concept label to be clean, readable, and pedagogically useful.
 * Returns null if the label is an artifact that should be rejected.
 */
export function normalizeConceptLabel(rawLabel: string): string | null {
  let label = rawLabel.trim();

  // Apply noise pattern cleaning
  for (const pattern of CONCEPT_LABEL_NOISE_PATTERNS) {
    label = label.replace(pattern, "").trim();
  }

  // Reject if too short after cleaning
  if (label.length < 3) {
    return null;
  }

  // Reject if it's purely a classification label
  if (/^(?:Rang|R2C|COM|Item|UE\d|DFGSM|ECN|EDN)\s/i.test(label)) {
    return null;
  }

  // Reject if it's purely numeric or punctuation
  if (/^[\d\s\-–—:.;,()]+$/.test(label)) {
    return null;
  }

  // Reject if it starts with a closing parenthesis/bracket (fragment)
  if (/^[)\]}>]/.test(label)) {
    return null;
  }

  // Reject if it ends with an unclosed parenthesis (truncation artifact)
  if (/\(\s*$/.test(label) && !label.includes(")")) {
    return null;
  }

  // Clean trailing "++" or ":" fragments from medical shorthand
  label = label.replace(/\s*\+{2,}\s*:?\s*$/, "").trim();
  label = label.replace(/\s*:\s*$/, "").trim();

  // Normalize capitalization: Title Case for proper concept names
  // But preserve ALL-CAPS medical acronyms (PAC, VIH, etc.)
  if (label === label.toUpperCase() && label.length > 5 && label.includes(" ")) {
    // Convert to Title Case, but preserve known acronyms
    label = toTitleCase(label);
  }

  // Normalize dashes and whitespace
  label = label.replace(/\s*[-–—]\s*/g, " — ").trim();
  label = label.replace(/\s{2,}/g, " ");

  // Remove trailing dash/colon
  label = label.replace(/\s*[-–—:]\s*$/, "").trim();

  return label.length >= 3 ? label : null;
}

/**
 * Check if a concept label represents a valid pedagogical concept
 * (as opposed to an editorial artifact, metadata label, or noise fragment).
 */
export function isValidConceptLabel(label: string): boolean {
  const normalized = normalizeConceptLabel(label);
  if (!normalized) return false;

  // Must contain at least one letter
  if (!/[a-zA-ZÀ-ÿ]/.test(normalized)) return false;

  // Must be at least 3 chars
  if (normalized.length < 3) return false;

  // Reject common non-concept patterns
  const rejectPatterns = [
    /^(?:Signes?\s+(?:généraux|cliniques?|fonctionnels?)\s*(?:inconstants?)?)\s*$/i,
    /^(?:Voir|Cf\.?|Tableau|Figure|Annexe)\s/i,
    /^(?:Introduction|Conclusion|Résumé|Bibliographie|Références?)\s*$/i,
    /^(?:NB|PS|Note)\s*:/i,
    /^(?:Suite|Fin|Début)\s*$/i,
    // Color/formatting metadata
    /^(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\b/i,
    /^COM\s+R2C\b/i,
    // Truncated labels ending with open paren or starting mid-word
    /\(\s*$/,
    // Labels that are just "++ :" type fragments
    /^\+{2,}\s*:/,
    // Labels with interpretability fragments
    /^interprétable\s+si\b/i,
    /^réalisables?\s+sur\b/i,
    // Subject line artifacts
    /^Sujet\s+principal\s*:/i,
  ];

  if (rejectPatterns.some(p => p.test(normalized))) return false;

  // P0: Reject labels that are composite editorial headers / document noise
  // This catches cases like "CODEX.:, S-ECN.COM R2C : Rang A"
  const headerScore = computeHeaderNoiseScore(normalized);
  if (headerScore >= 0.5) return false;

  const editorialScore = computeEditorialArtifactScore(normalized);
  if (editorialScore >= 0.6) return false;

  // Reject if majority of tokens are in DOCUMENT_NOISE_BLACKLIST
  const noiseDetection = detectDocumentNoise(normalized);
  if (noiseDetection.noisy && noiseDetection.matches.length >= 2) return false;

  return true;
}

/**
 * Reject a concept if it's clearly an editorial artifact promoted to concept status.
 */
export function rejectConceptArtifact(concept: {
  label: string;
  definition: string;
  source_trace?: { excerpt: string }[];
}): { rejected: boolean; reason?: string; scores?: ConceptCandidateScores } {
  // Check label
  const normalizedLabel = normalizeConceptLabel(concept.label);
  if (!normalizedLabel) {
    return { rejected: true, reason: `Label is an artifact: "${concept.label}"` };
  }

  if (!isValidConceptLabel(concept.label)) {
    return { rejected: true, reason: `Label is not a valid concept: "${concept.label}"` };
  }

  // Check if definition is too short or is just a repeat of the label
  if (concept.definition.trim().length < 10) {
    return { rejected: true, reason: "Definition too short" };
  }

  // Check if definition is just the label restated
  if (concept.definition.trim().toLowerCase() === concept.label.trim().toLowerCase()) {
    return { rejected: true, reason: "Definition is just the label" };
  }

  // P0: Score-based rejection for noisy concepts that pass basic structural checks
  const scores = scoreConceptCandidate(concept.label, concept.definition);
  if (!scores.accepted) {
    return { rejected: true, reason: scores.reject_reason ?? "Failed scoring", scores };
  }

  return { rejected: false, scores };
}

/**
 * Merge or deduplicate concepts that are essentially the same with different noise.
 * Returns the cleaned array with duplicates removed.
 */
export function mergeDuplicateOrNoisyConcepts<T extends { label: string; stable_key: string; criticality: number }>(
  concepts: T[]
): T[] {
  const seen = new Map<string, T>();
  const result: T[] = [];

  for (const concept of concepts) {
    const normalized = normalizeConceptLabel(concept.label);
    if (!normalized) continue;

    const key = normalized.toLowerCase().replace(/\s+/g, "_");

    if (seen.has(key)) {
      // Keep the one with higher criticality (lower number = more critical)
      const existing = seen.get(key)!;
      if (concept.criticality < existing.criticality) {
        // Replace with the more critical version
        const idx = result.indexOf(existing);
        if (idx >= 0) result[idx] = concept;
        seen.set(key, concept);
      }
    } else {
      seen.set(key, concept);
      result.push(concept);
    }
  }

  return result;
}

// ---------- Pedagogical Compression ----------

/**
 * Compress a raw definition to a pedagogically useful, concise form.
 * Removes verbosity, keeps essential meaning.
 */
export function compressDefinition(rawDefinition: string, maxLength: number = 200): string {
  let def = rawDefinition.trim();

  // Remove leading noise phrases
  def = def.replace(/^(?:Il s'agit d'|C'est |On appelle |On définit |Par définition,?\s*)/i, "");
  def = def.replace(/^(?:Le |La |Les |Un |Une |Des )/i, (match) => match.toLowerCase());

  // Remove trailing source references
  def = def.replace(/\s*\([Cc]f\.?\s*[^)]+\)\s*$/g, "");
  def = def.replace(/\s*\[[\d,\s]+\]\s*$/g, "");

  // Remove inline editorial markers
  def = def.replace(/\s*\(Rang\s+[A-Z]\)\s*/gi, " ");
  def = def.replace(/\s*\(R2C[^)]*\)\s*/gi, " ");

  // P0: Strip document noise blacklist items from definitions
  def = stripDocumentNoise(def);

  // Collapse whitespace
  def = def.replace(/\s{2,}/g, " ").trim();

  // Truncate intelligently at sentence boundary if too long
  if (def.length > maxLength) {
    const sentences = def.match(/[^.!?]+[.!?]+/g) || [def];
    let compressed = "";
    for (const sentence of sentences) {
      if ((compressed + sentence).length <= maxLength) {
        compressed += sentence;
      } else {
        break;
      }
    }
    def = compressed.trim() || def.slice(0, maxLength).replace(/\s\S*$/, "…");
  }

  // Capitalize first letter
  if (def.length > 0) {
    def = def.charAt(0).toUpperCase() + def.slice(1);
  }

  return def;
}

// ---------- Main Topic Cleaning ----------

/**
 * Clean the detected main_topic from editorial noise.
 * The main_topic should be a clean, human-readable subject label.
 */
export function cleanMainTopic(rawTopic: string): string {
  let topic = rawTopic.trim();

  // Remove full "R2C : Rang A en noir - Rang B en ..." classification blocks (aggressive)
  topic = topic.replace(/R2C\s*:?\s*(?:Rang\s+[A-Z]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)?\s*[-–—]?\s*)+/gi, "").trim();

  // Remove COM R2C metadata
  topic = topic.replace(/\bCOM\s+R2C\s*:\s*/gi, "");
  topic = topic.replace(/\s*[-–—]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\b.*/gi, "");
  topic = topic.replace(/\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\b.*/gi, "");

  // Remove Rang labels (including "Rang A en noir" patterns)
  topic = topic.replace(/\s*\(?\s*Rang\s+[A-Z]\s*(?:en\s+\w+)?\s*\)?\s*/gi, "");
  topic = topic.replace(/\s*R2C[^,)]*\s*/gi, "");

  // Remove Item/UE/N° — inline, not just prefix (handles "CODEX ITEM 363 : TITLE")
  topic = topic.replace(/\bITEM\s+\d+\s*[-–—:.\s]\s*/gi, "");
  topic = topic.replace(/^(?:UE|N°)\s*\d+\s*[-–—:.\s]\s*/i, "");

  // Remove "Sujet principal :" prefix
  topic = topic.replace(/^Sujet\s+principal\s*:\s*/i, "");

  // Remove branding/institution prefixes
  topic = topic.replace(/^(?:Cours|Module|Matière|Chapitre|Partie|Section|Titre)\s*\d*\s*[-–—:.\s]\s*/i, "");

  // P0 FIX: Strip inline branding/platform noise (CODEX, S-ECN, Révision, date)
  topic = topic.replace(/\bCODEX\b[.:;,]*\s*/gi, "");
  topic = topic.replace(/\bS[\s-]*ECN(?:\.COM)?\b[.:;,]*\s*/gi, "");
  topic = topic.replace(/\bRévision\s+\d[\d\/]*\b\s*/gi, "");
  topic = topic.replace(/\bMED[\s-]*LINE\b\s*/gi, "");
  topic = topic.replace(/\biKB\b\s*/gi, "");
  topic = topic.replace(/\bPREP['']?ECN\b\s*/gi, "");
  topic = topic.replace(/\bELLIPSES\b\s*/gi, "");
  topic = topic.replace(/\bVERNAZOBRES[\s-]*GREGO?\b\s*/gi, "");
  topic = topic.replace(/\bECN\.COM\b\s*/gi, "");
  topic = topic.replace(/\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b\s*/g, "");

  // Collapse whitespace
  topic = topic.replace(/\s{2,}/g, " ").trim();

  // Remove trailing punctuation
  topic = topic.replace(/\s*[-–—:;,]\s*$/, "").trim();

  // P0: If cleaning left a very short or empty string, the topic was pure noise
  if (topic.length < 3) {
    return "";
  }

  return topic;
}

/**
 * Extract a clean main topic from segments by analyzing the document hierarchy.
 * Uses the first meaningful heading, skipping editorial headers.
 */
export function extractCleanMainTopic(segments: { title: string | null; content: string; hierarchy_level: number }[]): string {
  const rejectedTopics: string[] = [];

  // Try finding the first level-1 heading that isn't noise
  for (const seg of segments) {
    if (!seg.title || seg.hierarchy_level > 1) continue;
    const cleaned = cleanMainTopic(seg.title);
    if (cleaned.length >= 5 && !isEditorialArtifact(cleaned)) {
      return cleaned;
    }
    if (seg.title.trim().length > 0) {
      rejectedTopics.push(seg.title.trim());
    }
  }

  // Fallback: first heading of any level
  for (const seg of segments) {
    if (!seg.title) continue;
    const cleaned = cleanMainTopic(seg.title);
    if (cleaned.length >= 5 && !isEditorialArtifact(cleaned)) {
      return cleaned;
    }
  }

  // Fallback: first substantial content sentence
  for (const seg of segments) {
    if (seg.content.length < 30) continue;
    // Try splitting on sentence boundaries (not newlines) to get a real sentence
    const sentences = seg.content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length >= 10);
    for (const sentence of sentences.slice(0, 3)) {
      const words = sentence.split(/\s+/).slice(0, 10).join(" ");
      const cleaned = cleanMainTopic(words);
      if (cleaned.length >= 5) {
        return cleaned;
      }
    }
  }

  // Fallback: extract most frequent meaningful noun phrases from all content
  const allContent = segments.map(s => s.content).join(" ");
  if (allContent.length >= 30) {
    // Find the first substantive phrase (skip articles/prepositions)
    const phrases = allContent.split(/[.!?,;:\n]+/).map(s => s.trim()).filter(s => s.length >= 15 && /[a-zA-ZÀ-ÿ]/.test(s));
    if (phrases.length > 0) {
      const words = phrases[0].split(/\s+/).slice(0, 8).join(" ");
      const cleaned = cleanMainTopic(words);
      if (cleaned.length >= 5) {
        return cleaned;
      }
    }
  }

  // P0: Log when all topic candidates were rejected
  if (rejectedTopics.length > 0) {
    console.warn(
      `[COGNITIO][P0] All topic candidates rejected: ${JSON.stringify(rejectedTopics)}. ` +
      `Using "Sujet non identifié".`
    );
  }

  return "Sujet non identifié";
}

/**
 * Reconstruct the hierarchical chapter structure from segments.
 * Returns a 3-level hierarchy: [{ title, level, childConcepts }]
 */
export function reconstructChapterHierarchy(
  segments: { title: string | null; content: string; hierarchy_level: number }[]
): { title: string; level: number; content: string; subSections: string[] }[] {
  const chapters: { title: string; level: number; content: string; subSections: string[] }[] = [];
  let currentChapter: typeof chapters[0] | null = null;

  for (const seg of segments) {
    if (seg.title && seg.hierarchy_level <= 1) {
      // New top-level chapter
      const cleanTitle = cleanMainTopic(seg.title);
      if (cleanTitle.length < 3 || isEditorialArtifact(cleanTitle)) {
        // P0 FIX: Title is noise, but CONTENT may be valuable.
        // Don't drop it — append to current chapter or create an untitled one.
        if (seg.content.length > 30) {
          if (currentChapter) {
            currentChapter.content += "\n\n" + seg.content;
          } else {
            currentChapter = { title: "Contenu principal", level: 1, content: seg.content, subSections: [] };
            chapters.push(currentChapter);
          }
        }
        continue;
      }

      currentChapter = { title: cleanTitle, level: 1, content: seg.content, subSections: [] };
      chapters.push(currentChapter);
    } else if (seg.title && seg.hierarchy_level >= 2 && currentChapter) {
      // Sub-section
      const cleanTitle = cleanMainTopic(seg.title);
      if (cleanTitle.length >= 3) {
        currentChapter.subSections.push(cleanTitle);
      }
      // P0 FIX: Always preserve content regardless of title validity
      currentChapter.content += "\n\n" + seg.content;
    } else if (currentChapter) {
      currentChapter.content += "\n\n" + seg.content;
    } else if (seg.content.length > 30) {
      // Content before any heading — create implicit chapter
      currentChapter = { title: seg.title && cleanMainTopic(seg.title).length >= 3 ? cleanMainTopic(seg.title) : "Introduction", level: 1, content: seg.content, subSections: [] };
      chapters.push(currentChapter);
    }
  }

  return chapters;
}

// ---------- Editorial Artifact Scoring ----------

/**
 * Tokens that indicate editorial/document noise rather than pedagogical content.
 * Used for scoring concept candidates.
 */
const EDITORIAL_TOKENS: RegExp[] = [
  /\bCODEX\b/i,
  /\bS[\s-]*ECN\b/i,
  /\bECN\.COM\b/i,
  /\bS-ECN\.COM\b/i,
  /\bR2C\b/i,
  /\bRang\b/i,
  /\bRévision\b/i,
  /\bITEM\b/i,
  /\bMED-LINE\b/i,
  /\biKB\b/,
  /\bPREP['']?ECN\b/i,
  /\bVERNAZOBRES/i,
  /\bELLIPSES\b/i,
  /\bDFGSM\b/i,
  /\bDFASM\b/i,
  /\biECN\b/,
  /\bEDN\b/,
  /\bCOM\s+R2C\b/i,
  /\ben\s+(?:NOIR|BLEU|ROUGE|BRUN|MARRON)\b/i,
  /\bPage\s+\d+/i,
  /\bMAJ\b/i,
  /\bVersion\s+\d/i,
  /\bUE\s*\d+/i,
  /\bN°\s*\d+/,
];

/**
 * Header-like composite patterns — these are multi-token editorial headers
 * that should never become concept labels.
 */
const HEADER_COMPOSITE_PATTERNS: RegExp[] = [
  /CODEX\b.*\bS[\s-]*ECN/i,
  /S[\s-]*ECN\.COM\b.*\bR2C/i,
  /R2C\s*:\s*Rang/i,
  /Rang\s+[A-Z]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE)/i,
  /ITEM\s+\d+\s*[-–—:]/i,
  /COM\s+R2C\s*:/i,
  /^(?:CODEX|S[\s-]*ECN)[.:;,\s]+/i,
  /\bRévision\s+\d[\d\/]*/i,
  /\biKB\b.*\bR2C\b/i,
  // P0: Additional composite patterns
  /\bR2C\b.*\bRang\b/i,
  /\bRang\s+[A-Z]\b.*\bRang\s+[A-Z]\b/i, // Multiple Rang labels
  /\bRang\s+[A-Z]\s+en\s+(?:noir|bleu|rouge|vert|gris)\b/i,
  /(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\s*[-–—]\s*(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)/i,
  /\bR2C\b.*(?:NOIR|BLEU|ROUGE)/i,
];

export interface ConceptCandidateScores {
  editorial_artifact_score: number;  // 0-1: proportion of editorial tokens
  header_noise_score: number;        // 0-1: matches composite header patterns
  concept_semantic_validity_score: number; // 0-1: likelihood of being a real concept
  accepted: boolean;
  reject_reason: string | null;
}

/**
 * Compute an editorial artifact score for a text string.
 * 0 = completely clean, 1 = pure editorial noise.
 */
export function computeEditorialArtifactScore(text: string): number {
  if (!text || text.trim().length === 0) return 1;

  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  if (words.length === 0) return 1;

  // First: check if the full text matches any editorial token pattern
  // (handles multi-word patterns like "ITEM 151", "Rang A", "R2C Rang A")
  let fullMatchCount = 0;
  for (const pattern of EDITORIAL_TOKENS) {
    if (pattern.test(trimmed)) fullMatchCount++;
  }

  // Per-word editorial detection
  let editorialWordCount = 0;
  for (const word of words) {
    for (const pattern of EDITORIAL_TOKENS) {
      if (pattern.test(word)) {
        editorialWordCount++;
        break;
      }
    }
  }

  // Also count punctuation-heavy tokens as editorial
  const punctTokens = words.filter(w => /^[^a-zA-ZÀ-ÿ]*$/.test(w)).length;

  // Combine: full-text pattern matches weigh heavily
  const wordRatio = (editorialWordCount + punctTokens * 0.5) / words.length;
  const fullMatchBoost = Math.min(0.5, fullMatchCount * 0.2);

  return Math.min(1, wordRatio + fullMatchBoost);
}

/**
 * Compute a header noise score for a text string.
 * 0 = not a header, 1 = clearly a composite document header.
 */
export function computeHeaderNoiseScore(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  let matchCount = 0;
  for (const pattern of HEADER_COMPOSITE_PATTERNS) {
    if (pattern.test(text)) matchCount++;
  }

  // If it matches any composite header pattern, it's very likely noise
  if (matchCount > 0) return Math.min(1, 0.5 + matchCount * 0.25);

  // Check token-level editorial content
  const editorialScore = computeEditorialArtifactScore(text);
  if (editorialScore > 0.5) return editorialScore * 0.8;

  return 0;
}

/**
 * Compute semantic validity score for a concept candidate.
 * 0 = not a valid concept, 1 = clearly a real pedagogical concept.
 */
export function computeConceptSemanticValidityScore(label: string, definition: string): number {
  if (!label || label.trim().length < 3) return 0;

  let score = 0.5;

  // Penalize editorial content in label
  const labelEditorial = computeEditorialArtifactScore(label);
  score -= labelEditorial * 0.5;

  // Penalize header patterns in label
  const labelHeader = computeHeaderNoiseScore(label);
  score -= labelHeader * 0.4;

  // Penalize if label contains DOCUMENT_NOISE_BLACKLIST matches
  const labelNoise = detectDocumentNoise(label);
  if (labelNoise.noisy) {
    score -= 0.3 * Math.min(1, labelNoise.matches.length / 2);
  }

  // Reward: label looks like a real concept (starts with capital letter, reasonable length)
  if (/^[A-ZÀ-Ÿ]/.test(label) && label.length >= 5 && label.length <= 80) score += 0.15;

  // Reward: definition is substantive and not just noise
  if (definition && definition.trim().length >= 30) {
    const defEditorial = computeEditorialArtifactScore(definition);
    if (defEditorial < 0.3) score += 0.2;
    else score -= defEditorial * 0.2;
  }

  // Reward: label does not contain excessive punctuation
  const alphaChars = (label.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  const alphaRatio = alphaChars / Math.max(1, label.length);
  if (alphaRatio > 0.7) score += 0.1;
  if (alphaRatio < 0.4) score -= 0.2;

  return Math.max(0, Math.min(1, score));
}

/**
 * Full scoring for a concept candidate. Returns all scores plus accept/reject decision.
 * When `lenient` is true (emergency/heuristic mode), thresholds are relaxed to prevent
 * total concept destruction on noisy documents.
 * When `medical` is true, uses intermediate thresholds for medical polycopiés
 * that contain legitimate medical content mixed with editorial annotations.
 */
export function scoreConceptCandidate(label: string, definition: string, lenient: boolean = false, medical: boolean = false): ConceptCandidateScores {
  const editorial_artifact_score = computeEditorialArtifactScore(label);
  const header_noise_score = computeHeaderNoiseScore(label);
  const concept_semantic_validity_score = computeConceptSemanticValidityScore(label, definition);

  let reject_reason: string | null = null;

  // Threshold selection: lenient > medical > normal
  // Medical mode is between normal and lenient — allows more noise but still filters junk
  const headerThreshold = lenient ? 0.8 : medical ? 0.6 : 0.4;
  const editorialThreshold = lenient ? 0.85 : medical ? 0.7 : 0.5;
  const validityThreshold = lenient ? 0.05 : medical ? 0.1 : 0.2;

  // Rejection rules
  if (header_noise_score >= headerThreshold) {
    reject_reason = `Header noise too high (${header_noise_score.toFixed(2)}): label resembles a document header`;
  } else if (editorial_artifact_score >= editorialThreshold) {
    reject_reason = `Editorial artifact score too high (${editorial_artifact_score.toFixed(2)}): label is mostly editorial tokens`;
  } else if (concept_semantic_validity_score < validityThreshold) {
    reject_reason = `Semantic validity too low (${concept_semantic_validity_score.toFixed(2)}): not a pedagogical concept`;
  }

  return {
    editorial_artifact_score: Math.round(editorial_artifact_score * 100) / 100,
    header_noise_score: Math.round(header_noise_score * 100) / 100,
    concept_semantic_validity_score: Math.round(concept_semantic_validity_score * 100) / 100,
    accepted: reject_reason === null,
    reject_reason,
  };
}

// ---------- Helpers ----------

function toTitleCase(str: string): string {
  // Known medical acronyms to preserve
  const PRESERVE_ACRONYMS = new Set([
    "PAC", "VIH", "SIDA", "ECG", "IRM", "TDM", "NFS", "CRP", "VS",
    "HTA", "AVC", "IDM", "OAP", "EP", "TVP", "BPCO", "AINS", "IPP",
    "ATB", "AVK", "AOD", "INR", "TP", "TCA", "HbA1c", "LDL", "HDL",
    "PSA", "TSH", "PCR", "ECBU", "BU", "ASP", "ETT", "ETO",
    "CPAP", "VNI", "IOT", "GDS", "SpO2", "PaO2", "PaCO2",
    "IMC", "DFG", "IRC", "IRA", "SCA", "STEMI", "NSTEMI",
  ]);

  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      const upper = word.toUpperCase();
      if (PRESERVE_ACRONYMS.has(upper)) return upper;
      if (word.length <= 2) return word; // articles, prepositions
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
