// ============================================================
// Editorial Noise Filter — Deep cleaning of editorial artifacts
// from academic/medical/legal documents before concept extraction
// ============================================================

export interface EditorialFilterResult {
  cleaned_text: string;
  raw_text_length: number;
  cleaned_text_length: number;
  removed_lines_count: number;
  removed_patterns: FilteredPattern[];
}

export interface FilteredPattern {
  type: EditorialNoiseType;
  original: string;
  line_number: number;
}

export type EditorialNoiseType =
  | "header_repetitive"
  | "footer_residue"
  | "page_number"
  | "branding"
  | "date_metadata"
  | "rang_classification"
  | "editorial_tag"
  | "punctuation_fragment"
  | "typographic_artifact"
  | "empty_structural"
  | "url_email"
  | "copyright"
  | "course_metadata"
  | "color_formatting"
  | "front_matter";

// ---------- Front Matter Detection ----------

export interface FrontMatterResult {
  /** Index of first line that is NOT front matter (0-based) */
  body_start_line: number;
  /** Lines identified as front matter */
  front_matter_lines: FilteredPattern[];
  /** The text with front matter stripped */
  body_text: string;
  /** Whether significant front matter was detected */
  has_front_matter: boolean;
}

/**
 * Front matter patterns — lines at the top of a document that are
 * branding, classification, revision metadata, or editorial headers.
 * These must be stripped before concept extraction.
 */
const FRONT_MATTER_PATTERNS: RegExp[] = [
  // Branding / platform
  /\bCODEX\b/i,
  /\bS[\s-]*ECN(?:\.COM)?\b/i,
  /\bECN\.COM\b/i,
  /\bMED[\s-]*LINE\b/i,
  /\biKB\b/,
  /\bPREP['']?ECN\b/i,
  /\bELLIPSES\b/i,
  /\bVERNAZOBRES/i,
  // Classification / Rang
  /\bR2C\b/i,
  /\bRang\s+[A-Z]\b/i,
  /\bCOM\s+R2C\b/i,
  /\ben\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\b/i,
  // ITEM / course metadata
  /\bITEM\s+\d+/i,
  /\bUE\s*\d+/i,
  /\bDFGSM\b/i,
  /\bDFASM\b/i,
  /\biECN\b/,
  /\bEDN\b/,
  // Revision / dates
  /\bRévision\s+\d/i,
  /\bMAJ\s*[:—–\-]/i,
  /\bVersion\s+\d/i,
  /\bDernière\s+(?:mise\s+à\s+jour|révision)/i,
  /^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}$/,
  // Institutional headers
  /^(?:Université|Faculté|Institut|École|Département|Campus)\s/i,
  /^(?:Collège\s+(?:national|des)|Référentiel)\s/i,
  /^(?:Cours|Module|Matière|Chapitre)\s*[:—–\-]/i,
  /^(?:Enseignant|Professeur|Dr|Pr)\s*[:—–.]/i,
  /^(?:Année\s+(?:universitaire|scolaire|académique))\s*[:—–\-]/i,
  /^(?:Semestre|Trimestre)\s*\d/i,
  // Separator lines
  /^[-–—=_]{3,}\s*$/,
  // Copyright / source
  /^©\s/,
  /^Tous\s+droits\s+réservés/i,
  // Color formatting standalone
  /^en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*$/i,
  // Page numbers
  /^Page\s+\d+/i,
  /^\d+\s*\/\s*\d+\s*$/,
  // Composite branding headers
  /CODEX\b.*\bS[\s-]*ECN/i,
  /S[\s-]*ECN\.COM\b.*\bR2C/i,
  /iKB\b.*\bR2C\b/i,
];

/**
 * Detect front matter at the top of a document.
 * Scans from line 0 forward. Stops when it hits a run of 2+ consecutive
 * non-front-matter, non-blank lines (= real pedagogical content).
 *
 * Returns the body text with front matter removed plus metadata.
 */
export function detectFrontMatter(text: string): FrontMatterResult {
  const lines = text.split("\n");
  const frontMatterLines: FilteredPattern[] = [];
  let bodyStartLine = 0;
  let consecutiveClean = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Blank lines don't reset the counter but aren't front matter
    if (trimmed.length === 0) {
      continue;
    }

    // Very short non-alpha lines are noise
    if (trimmed.length <= 2 && /^[^a-zA-ZÀ-ÿ0-9]/.test(trimmed)) {
      frontMatterLines.push({ type: "front_matter", original: trimmed, line_number: i + 1 });
      consecutiveClean = 0;
      continue;
    }

    const isFrontMatter = FRONT_MATTER_PATTERNS.some(p => p.test(trimmed));

    if (isFrontMatter) {
      frontMatterLines.push({ type: "front_matter", original: trimmed, line_number: i + 1 });
      consecutiveClean = 0;
    } else {
      consecutiveClean++;
      // Once we see 2 consecutive clean, content-bearing lines, we're in the body
      if (consecutiveClean >= 2) {
        // Body starts at the first clean line of this run
        bodyStartLine = i - 1;
        break;
      }
    }

    // Safety: don't scan more than 60 lines for front matter
    if (i >= 59) {
      bodyStartLine = i + 1;
      break;
    }
  }

  // If we never found 2 consecutive clean lines, body starts after last front matter line
  if (consecutiveClean < 2 && frontMatterLines.length > 0) {
    const lastFM = frontMatterLines[frontMatterLines.length - 1].line_number;
    bodyStartLine = lastFM; // line_number is 1-based, so this is the correct 0-based index
  }

  const bodyLines = lines.slice(bodyStartLine);
  const bodyText = bodyLines.join("\n").replace(/^\n+/, "").trim();

  return {
    body_start_line: bodyStartLine,
    front_matter_lines: frontMatterLines,
    body_text: bodyText,
    has_front_matter: frontMatterLines.length >= 2,
  };
}

// ---------- Pattern Registry ----------

const NOISE_PATTERNS: { type: EditorialNoiseType; pattern: RegExp }[] = [
  // Headers / Branding
  { type: "branding", pattern: /^(?:Université|Faculté|Institut|École|Département|Campus)\s.{0,80}$/i },
  { type: "branding", pattern: /^(?:Collège\s+(?:national|des)|Référentiel)\s/i },
  { type: "course_metadata", pattern: /^(?:Cours|Module|Matière|Chapitre)\s*[:—–\-]\s*.{0,80}$/i },
  { type: "course_metadata", pattern: /^(?:Enseignant|Professeur|Dr|Pr)\s*[:—–.]\s*.{0,80}$/i },
  { type: "course_metadata", pattern: /^(?:Année\s+(?:universitaire|scolaire|académique))\s*[:—–\-]\s*\d/i },
  { type: "course_metadata", pattern: /^(?:Semestre|Trimestre)\s*\d/i },
  { type: "course_metadata", pattern: /^(?:UE|DFGSM|DFASM|ECN|EDN|iECN)\s*\d/i },
  { type: "course_metadata", pattern: /^(?:Item|Objectif|N°)\s*\d+\s*(?:[-–—:]|$)/i },

  // Rang / Classification (French medical)
  { type: "rang_classification", pattern: /^(?:COM\s+)?R2C\s*:\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|Rang\s+[A-Z])\b/i },
  { type: "rang_classification", pattern: /^\s*Rang\s+[A-Z]\s*$/i },
  { type: "rang_classification", pattern: /^COM\s+R2C\b/i },
  { type: "rang_classification", pattern: /^en\s+(?:NOIR|BLEU|ROUGE)\s*[-–—]\s*en\s+(?:NOIR|BLEU|ROUGE)/i },
  { type: "rang_classification", pattern: /^Sujet\s+principal\s*:\s*COM\s/i },

  // Dates and versions
  { type: "date_metadata", pattern: /^(?:Dernière\s+)?(?:mise\s+à\s+jour|MAJ|révision)\s*[:—–\-]\s*\d/i },
  { type: "date_metadata", pattern: /^Version\s+\d+/i },
  { type: "date_metadata", pattern: /^(?:Révisé|Modifié|Créé)\s+(?:le|en)\s+/i },
  { type: "date_metadata", pattern: /^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}$/  },

  // Page numbers and footer/header residues
  { type: "page_number", pattern: /^Page\s+\d+/i },
  { type: "page_number", pattern: /^\d+\s*\/\s*\d+\s*$/ },
  { type: "page_number", pattern: /^\d+\s*[-–—]\s*\d+\s*$/ },
  { type: "footer_residue", pattern: /^(?:www\.|http|mailto)/i },
  { type: "copyright", pattern: /^©\s/ },
  { type: "copyright", pattern: /^Tous\s+droits\s+réservés/i },
  { type: "copyright", pattern: /^(?:Source|Adapté de|D'après)\s*:/i },

  // Color formatting
  { type: "color_formatting", pattern: /^en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*$/i },

  // Empty structural / punctuation fragments
  { type: "empty_structural", pattern: /^[-–—]+\s*$/ },
  { type: "punctuation_fragment", pattern: /^\s*[)(\]}\[{]\s*[-–—]\s*/ },
  { type: "punctuation_fragment", pattern: /^\s*[•\-–]\s*$/ },

  // Repeated editorial tags
  { type: "editorial_tag", pattern: /^(?:Introduction|Conclusion|Résumé|Bibliographie|Références?|Sommaire|Table\s+des\s+matières)\s*$/i },
  { type: "editorial_tag", pattern: /^(?:NB|PS|Note)\s*:\s*$/i },
  { type: "editorial_tag", pattern: /^(?:Suite|Fin|Début)\s*$/i },
  { type: "editorial_tag", pattern: /^(?:Voir|Cf\.?)\s+(?:tableau|figure|annexe|page|chapitre)\s/i },

  // P0: Platform branding / editorial residues
  { type: "branding", pattern: /^(?:CODEX|S[\s-]*ECN|ECN\.COM|MED-LINE|ELLIPSES)\b/i },
  { type: "branding", pattern: /\bCODEX\b.*\bS[\s-]*ECN\b/i },
  { type: "branding", pattern: /\bS[\s-]*ECN\.COM\b/i },
  { type: "branding", pattern: /\bPREP['']?ECN\b/i },
  { type: "branding", pattern: /\bVERNAZOBRES/i },
  { type: "branding", pattern: /\biKB\b.*\bR2C\b/i },
  { type: "branding", pattern: /^(?:KB|iKB)\s*[\/|]\s*/i },
  { type: "branding", pattern: /\bCODEX\b[.;]\s*\bS[\s-]*ECN\b/i },

  // P0: Enhanced R2C revision document patterns
  { type: "rang_classification", pattern: /^.*(?:Rang\s+[A-Z]\s*[-–—]\s*){2,}/i }, // Multiple Rang annotations on one line
  { type: "rang_classification", pattern: /^\s*ITEM\s+\d+\s*[-–—:]\s*(?:Rang|R2C)/i }, // ITEM + Rang composite
  { type: "rang_classification", pattern: /^\s*(?:Rang\s+[A-Z]\s*,?\s*)+$/i }, // Lists of Rang labels
  { type: "branding", pattern: /^(?:CODEX|S[\s-]*ECN|iKB)\b[^a-zA-ZÀ-ÿ]*$/i }, // Branding-only lines with trailing punctuation
  { type: "date_metadata", pattern: /^\s*(?:Dernière\s+)?révision\s/i }, // "Révision" standalone
  { type: "header_repetitive", pattern: /^\s*[-–—=_]{3,}\s*$/ }, // Separator lines
];

// Inline noise patterns to strip from within lines
const INLINE_NOISE_REPLACEMENTS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\s*\(?\s*Rang\s+[A-Z]\s*\)?\s*/gi, replacement: " " },
  { pattern: /\s*[-–—]\s*R2C\s*:\s*Rang\s+[A-Z]\s*/gi, replacement: " " },
  { pattern: /\s*\(\s*p\.\s*\d+\s*\)\s*$/i, replacement: "" },
  { pattern: /\s*\(?\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*\)?\s*/gi, replacement: " " },
  { pattern: /\s*\[\s*\d+(?:\s*,\s*\d+)*\s*\]\s*/g, replacement: " " }, // Reference numbers [1,2,3]
  { pattern: /\s*\(\s*(?:source|réf|ref)\s*[:.]?\s*[^)]{0,30}\)\s*/gi, replacement: " " },
  // P0: Strip inline platform branding
  { pattern: /\bCODEX\b[.;]?\s*/gi, replacement: " " },
  { pattern: /\bS[\s-]*ECN(?:\.COM)?\b\s*/gi, replacement: " " },
  { pattern: /\bR2C\s+Révision\s+\d[\d\/]*\b\s*/gi, replacement: " " },
  { pattern: /\bITEM\s+\d+\s*/gi, replacement: " " },
  { pattern: /\bMED-LINE\b\s*/gi, replacement: " " },
  { pattern: /\biKB\b\s*/gi, replacement: " " },
];

// ---------- Main Filter ----------

/**
 * Apply deep editorial noise filtering to raw text.
 * Returns cleaned text plus a detailed report of what was removed.
 */
export function filterEditorialNoise(text: string): EditorialFilterResult {
  const lines = text.split("\n");
  const cleaned: string[] = [];
  const removed: FilteredPattern[] = [];
  const rawLength = text.length;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Preserve blank lines for structure
    if (trimmed.length === 0) {
      cleaned.push("");
      continue;
    }

    // Very short non-alpha lines are noise
    if (trimmed.length <= 2 && /^[^a-zA-ZÀ-ÿ0-9]/.test(trimmed)) {
      removed.push({ type: "typographic_artifact", original: trimmed, line_number: i + 1 });
      continue;
    }

    // Check against all noise patterns
    let isNoise = false;
    for (const { type, pattern } of NOISE_PATTERNS) {
      if (pattern.test(trimmed)) {
        removed.push({ type, original: trimmed, line_number: i + 1 });
        isNoise = true;
        break;
      }
    }
    if (isNoise) continue;

    // Clean inline noise
    let cleanedLine = trimmed;
    for (const { pattern, replacement } of INLINE_NOISE_REPLACEMENTS) {
      cleanedLine = cleanedLine.replace(pattern, replacement);
    }
    cleanedLine = cleanedLine.replace(/\s{2,}/g, " ").trim();

    // Skip if cleaning left nothing meaningful
    if (cleanedLine.length < 3) {
      removed.push({ type: "typographic_artifact", original: trimmed, line_number: i + 1 });
      continue;
    }

    cleaned.push(cleanedLine);
  }

  const cleanedText = cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return {
    cleaned_text: cleanedText,
    raw_text_length: rawLength,
    cleaned_text_length: cleanedText.length,
    removed_lines_count: removed.length,
    removed_patterns: removed,
  };
}

/**
 * Quick check: is this line purely editorial noise?
 */
export function isEditorialNoise(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length <= 2 && /^[^a-zA-ZÀ-ÿ0-9]/.test(trimmed)) return true;
  return NOISE_PATTERNS.some(({ pattern }) => pattern.test(trimmed));
}
