// ============================================================
// COGNITIO Semantic Cleaning — Source noise removal, concept
// normalization, and artifact filtering
// ============================================================

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
  /^en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*$/i,

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
  /\s*[-–—]\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*$/i,
  /^en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*[-–—]\s*/i,

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

    // Skip editorial artifact lines
    if (isEditorialArtifact(trimmed)) {
      continue;
    }

    // Clean inline noise from the line
    let cleanedLine = cleanInlineNoise(trimmed);

    // Skip if cleaning left nothing meaningful
    if (cleanedLine.trim().length < 3) {
      continue;
    }

    cleaned.push(cleanedLine);
  }

  // Collapse excessive blank lines
  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
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
 */
function cleanInlineNoise(line: string): string {
  let cleaned = line;

  // Remove inline Rang labels
  cleaned = cleaned.replace(/\s*\(?\s*Rang\s+[A-Z]\s*\)?\s*/gi, " ");
  cleaned = cleaned.replace(/\s*[-–—]\s*R2C\s*:\s*Rang\s+[A-Z]\s*/gi, " ");

  // Remove trailing page refs
  cleaned = cleaned.replace(/\s*\(\s*p\.\s*\d+\s*\)\s*$/i, "");

  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  return cleaned;
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
    /^(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS)\b/i,
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

  return !rejectPatterns.some(p => p.test(normalized));
}

/**
 * Reject a concept if it's clearly an editorial artifact promoted to concept status.
 */
export function rejectConceptArtifact(concept: {
  label: string;
  definition: string;
  source_trace?: { excerpt: string }[];
}): { rejected: boolean; reason?: string } {
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

  return { rejected: false };
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
  topic = topic.replace(/R2C\s*:?\s*(?:Rang\s+[A-Z]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS)?\s*[-–—]?\s*)+/gi, "").trim();

  // Remove COM R2C metadata
  topic = topic.replace(/\bCOM\s+R2C\s*:\s*/gi, "");
  topic = topic.replace(/\s*[-–—]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS)\b.*/gi, "");
  topic = topic.replace(/\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\b.*/gi, "");

  // Remove Rang labels (including "Rang A en noir" patterns)
  topic = topic.replace(/\s*\(?\s*Rang\s+[A-Z]\s*(?:en\s+\w+)?\s*\)?\s*/gi, "");
  topic = topic.replace(/\s*R2C[^,)]*\s*/gi, "");

  // Remove Item/UE/N° prefixes
  topic = topic.replace(/^(?:Item|UE|N°)\s*\d+\s*[-–—:.\s]\s*/i, "");

  // Remove "Sujet principal :" prefix
  topic = topic.replace(/^Sujet\s+principal\s*:\s*/i, "");

  // Remove branding/institution prefixes
  topic = topic.replace(/^(?:Cours|Module|Matière|Chapitre|Partie|Section|Titre)\s*\d*\s*[-–—:.\s]\s*/i, "");

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
