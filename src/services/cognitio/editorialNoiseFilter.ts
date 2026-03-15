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
  | "color_formatting";

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
];

// Inline noise patterns to strip from within lines
const INLINE_NOISE_REPLACEMENTS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\s*\(?\s*Rang\s+[A-Z]\s*\)?\s*/gi, replacement: " " },
  { pattern: /\s*[-–—]\s*R2C\s*:\s*Rang\s+[A-Z]\s*/gi, replacement: " " },
  { pattern: /\s*\(\s*p\.\s*\d+\s*\)\s*$/i, replacement: "" },
  { pattern: /\s*\(?\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*\)?\s*/gi, replacement: " " },
  { pattern: /\s*\[\s*\d+(?:\s*,\s*\d+)*\s*\]\s*/g, replacement: " " }, // Reference numbers [1,2,3]
  { pattern: /\s*\(\s*(?:source|réf|ref)\s*[:.]?\s*[^)]{0,30}\)\s*/gi, replacement: " " },
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
