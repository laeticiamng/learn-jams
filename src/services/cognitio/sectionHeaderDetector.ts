// ============================================================
// Section Header Detector — Detects true chapters, sub-sections,
// and reconstructs document hierarchy from raw text segments
// ============================================================

export interface DetectedHeader {
  text: string;
  clean_text: string;
  level: 1 | 2 | 3;
  line_index: number;
  confidence: number;
  header_type: HeaderType;
}

export type HeaderType =
  | "numbered_chapter"       // "I.", "1.", "Chapitre 1"
  | "numbered_subsection"    // "A.", "1.1", "a)"
  | "roman_numeral"          // "I.", "II.", "III."
  | "lettered"               // "A.", "B.", "a)", "b)"
  | "bold_or_caps"           // ALL CAPS or likely bold
  | "semantic_header"        // "Définition", "Physiopathologie", "Traitement"
  | "transition_marker";     // "En résumé", "Pour conclure"

export interface DocumentHierarchy {
  main_topic: string;
  chapters: ChapterNode[];
  detected_headers_count: number;
  detected_sections_count: number;
  max_depth: number;
}

export interface ChapterNode {
  title: string;
  level: number;
  header_type: HeaderType;
  content_lines: number[];
  sub_sections: ChapterNode[];
}

// ---------- Header Detection Patterns ----------

const HEADER_PATTERNS: { type: HeaderType; pattern: RegExp; level: 1 | 2 | 3; confidence: number }[] = [
  // Roman numeral chapters: "I.", "II.", "III." (level 1)
  { type: "roman_numeral", pattern: /^(?:(?:I{1,3}|IV|V(?:I{0,3})?|IX|X(?:I{0,3})?))\s*[\.\)—–\-:]\s*.+/i, level: 1, confidence: 0.9 },

  // Numbered chapters: "1.", "2.", "Chapitre 1"
  { type: "numbered_chapter", pattern: /^(?:Chapitre|Partie|Section|Titre)\s*\d+\s*[\.\):—–\-]?\s*.*/i, level: 1, confidence: 0.95 },
  { type: "numbered_chapter", pattern: /^\d{1,2}\s*[\.\)]\s+[A-ZÀ-Ÿ]/, level: 1, confidence: 0.8 },

  // Numbered subsections: "1.1", "1.2.3"
  { type: "numbered_subsection", pattern: /^\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\s*[\.\):—–\-]?\s+/, level: 2, confidence: 0.85 },

  // Lettered subsections: "A.", "B)", "a)"
  { type: "lettered", pattern: /^[A-Z]\s*[\.\)]\s+[A-ZÀ-Ÿ]/, level: 2, confidence: 0.7 },
  { type: "lettered", pattern: /^[a-z]\s*[\.\)]\s+[A-ZÀ-Ÿ]/, level: 3, confidence: 0.6 },

  // Semantic medical/academic headers
  { type: "semantic_header", pattern: /^(?:Définition|Épidémiologie|Physiopathologie|Étiologie|Diagnostic|Traitement|Prévention|Complications|Pronostic|Classification|Sémiologie|Examen\s+clinique|Examens?\s+(?:complémentaires?|paracliniques?))\s*$/i, level: 2, confidence: 0.9 },

  // Semantic legal headers
  { type: "semantic_header", pattern: /^(?:Textes?\s+applicables?|Jurisprudence|Doctrine|Conditions?\s+de\s+fond|Conditions?\s+de\s+forme|Effets?\s+(?:du|de\s+la)|Sanctions?|Exceptions?|Procédure|Recours)\s*$/i, level: 2, confidence: 0.9 },

  // Semantic CS/tech headers
  { type: "semantic_header", pattern: /^(?:Architecture|Implémentation|Algorithme|Complexité|Protocole|Interface|Spécification|Configuration|Déploiement|Tests?)\s*$/i, level: 2, confidence: 0.85 },

  // Transition markers
  { type: "transition_marker", pattern: /^(?:En\s+résumé|Pour\s+conclure|En\s+conclusion|Points?\s+(?:clés?|essentiels?|importants?)|À\s+retenir|Synthèse)\s*$/i, level: 2, confidence: 0.8 },
];

// ---------- Main Detection ----------

/**
 * Detect section headers from text lines and reconstruct document hierarchy.
 */
export function detectSectionHeaders(lines: string[]): DetectedHeader[] {
  const headers: DetectedHeader[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 2 || line.length > 200) continue;

    // Check pattern-based detection
    for (const { type, pattern, level, confidence } of HEADER_PATTERNS) {
      if (pattern.test(line)) {
        headers.push({
          text: line,
          clean_text: cleanHeaderText(line, type),
          level,
          line_index: i,
          confidence,
          header_type: type,
        });
        break;
      }
    }

    // Heuristic: short ALL CAPS line is likely a header
    if (
      !headers.some((h) => h.line_index === i) &&
      line === line.toUpperCase() &&
      line.length >= 5 &&
      line.length <= 80 &&
      /[A-ZÀ-Ÿ]{3,}/.test(line) &&
      !/^\d/.test(line)
    ) {
      headers.push({
        text: line,
        clean_text: toSentenceCase(line),
        level: 1,
        line_index: i,
        confidence: 0.65,
        header_type: "bold_or_caps",
      });
    }
  }

  return headers;
}

/**
 * Build a full document hierarchy from detected headers and content lines.
 */
export function buildDocumentHierarchy(
  lines: string[],
  headers: DetectedHeader[]
): DocumentHierarchy {
  if (headers.length === 0) {
    return {
      main_topic: extractFallbackTopic(lines),
      chapters: [{
        title: "Contenu",
        level: 1,
        header_type: "semantic_header",
        content_lines: Array.from({ length: lines.length }, (_, i) => i),
        sub_sections: [],
      }],
      detected_headers_count: 0,
      detected_sections_count: 1,
      max_depth: 1,
    };
  }

  // Sort headers by line index
  const sorted = [...headers].sort((a, b) => a.line_index - b.line_index);

  // Build tree
  const chapters: ChapterNode[] = [];
  let currentChapter: ChapterNode | null = null;
  let currentSubSection: ChapterNode | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const header = sorted[i];
    const nextHeaderLine = sorted[i + 1]?.line_index ?? lines.length;
    const contentLines: number[] = [];
    for (let j = header.line_index + 1; j < nextHeaderLine; j++) {
      contentLines.push(j);
    }

    const node: ChapterNode = {
      title: header.clean_text,
      level: header.level,
      header_type: header.header_type,
      content_lines: contentLines,
      sub_sections: [],
    };

    if (header.level === 1) {
      currentChapter = node;
      currentSubSection = null;
      chapters.push(node);
    } else if (header.level === 2 && currentChapter) {
      currentSubSection = node;
      currentChapter.sub_sections.push(node);
    } else if (header.level === 3 && currentSubSection) {
      currentSubSection.sub_sections.push(node);
    } else {
      // No parent found — promote to chapter
      currentChapter = node;
      currentSubSection = null;
      chapters.push(node);
    }
  }

  // Determine main topic from first chapter
  const mainTopic = chapters[0]?.title || extractFallbackTopic(lines);

  const maxDepth = Math.max(
    ...chapters.map((ch) =>
      ch.sub_sections.length > 0
        ? Math.max(...ch.sub_sections.map((s) => (s.sub_sections.length > 0 ? 3 : 2)))
        : 1
    )
  );

  return {
    main_topic: mainTopic,
    chapters,
    detected_headers_count: headers.length,
    detected_sections_count: countSections(chapters),
    max_depth: maxDepth,
  };
}

// ---------- Helpers ----------

function cleanHeaderText(text: string, type: HeaderType): string {
  let cleaned = text;

  // Remove numbering prefixes
  cleaned = cleaned.replace(/^(?:Chapitre|Partie|Section|Titre)\s*\d+\s*[\.\):—–\-]?\s*/i, "");
  cleaned = cleaned.replace(/^(?:I{1,3}|IV|V(?:I{0,3})?|IX|X(?:I{0,3})?)\s*[\.\)—–\-:]\s*/i, "");
  cleaned = cleaned.replace(/^\d{1,2}(?:\.\d{1,2})*\s*[\.\):—–\-]?\s*/, "");
  cleaned = cleaned.replace(/^[A-Za-z]\s*[\.\)]\s*/, "");

  // Remove trailing punctuation
  cleaned = cleaned.replace(/\s*[:—–\-]\s*$/, "").trim();

  return cleaned || text.trim();
}

function toSentenceCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function extractFallbackTopic(lines: string[]): string {
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 10 && trimmed.length <= 100 && /[A-ZÀ-Ÿ]/.test(trimmed)) {
      return trimmed;
    }
  }
  return "Sujet non identifié";
}

function countSections(chapters: ChapterNode[]): number {
  let count = chapters.length;
  for (const ch of chapters) {
    count += ch.sub_sections.length;
    for (const sub of ch.sub_sections) {
      count += sub.sub_sections.length;
    }
  }
  return count;
}
