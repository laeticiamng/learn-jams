// ============================================================
// Topic Cleaner — Detects and cleans the main topic of a course,
// removes editorial pollution, validates topic quality
// ============================================================

export interface CleanedTopic {
  raw_topic: string;
  clean_topic: string;
  confidence: number;
  source: TopicSource;
  rejected_candidates: RejectedTopicCandidate[];
}

export type TopicSource =
  | "heading_level_1"
  | "heading_any"
  | "first_sentence"
  | "content_analysis"
  | "fallback";

export interface RejectedTopicCandidate {
  candidate: string;
  reason: string;
}

// ---------- Forbidden Topic Patterns ----------

const FORBIDDEN_TOPIC_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /^(?:COM\s+)?R2C\b/i, reason: "Classification label (R2C)" },
  { pattern: /^\s*Rang\s+[A-Z]/i, reason: "Rang classification" },
  { pattern: /^en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\b/i, reason: "Color metadata" },
  { pattern: /^(?:UE|DFGSM|DFASM|ECN|EDN|iECN)\s*\d/i, reason: "Course unit code" },
  { pattern: /^(?:Item|N°)\s*\d+\s*$/i, reason: "Item number only" },
  { pattern: /^(?:Cours|Module|Matière|Chapitre|Partie)\s*\d*\s*$/i, reason: "Generic label" },
  { pattern: /^(?:Introduction|Conclusion|Résumé|Bibliographie|Références?)\s*$/i, reason: "Structural label" },
  { pattern: /^(?:Université|Faculté|Institut|École)\s/i, reason: "Institution name" },
  { pattern: /^(?:Enseignant|Professeur|Dr|Pr)\s/i, reason: "Author name" },
  { pattern: /^(?:Année|Semestre|Trimestre)\s/i, reason: "Academic period" },
  { pattern: /^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}$/, reason: "Date" },
  { pattern: /^Version\s+\d/i, reason: "Version number" },
  { pattern: /^Page\s+\d/i, reason: "Page number" },
  { pattern: /^(?:www\.|http)/i, reason: "URL" },
  { pattern: /^[^a-zA-ZÀ-ÿ]*$/, reason: "No alphabetic characters" },
  { pattern: /^Sujet\s+principal\s*:/i, reason: "Meta-label" },
  // P0: Enhanced composite header rejection
  { pattern: /\bR2C\b/i, reason: "Contains R2C classification" },
  { pattern: /\bRang\s+[A-Z]\b/i, reason: "Contains Rang classification" },
  { pattern: /\bCODEX\b/i, reason: "Contains CODEX branding" },
  { pattern: /\bS[\s-]*ECN\b/i, reason: "Contains S-ECN branding" },
  { pattern: /\biKB\b/, reason: "Contains iKB branding" },
  { pattern: /\bMED[\s-]*LINE\b/i, reason: "Contains MED-LINE branding" },
  { pattern: /\bRévision\b/i, reason: "Contains revision marker" },
  { pattern: /\bITEM\s+\d/i, reason: "Contains ITEM number" },
  { pattern: /(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)/i, reason: "Contains color metadata" },
  { pattern: /\bPREP['']?ECN\b/i, reason: "Contains PrepECN branding" },
  { pattern: /\bELLIPSES\b/i, reason: "Contains ELLIPSES branding" },
  { pattern: /\bVERNAZOBRES/i, reason: "Contains Vernazobres branding" },
];

// Noise to strip from topic
const TOPIC_NOISE_STRIPS: RegExp[] = [
  // P0: Aggressive R2C block removal — handles "R2C : Rang A en noir - Rang B en ..."
  /R2C\s*:?\s*(?:Rang\s+[A-Z]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)?\s*[-–—]?\s*)+/gi,
  /\bCOM\s+R2C\s*:\s*/gi,
  /\s*[-–—]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\b.*/gi,
  /\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\b.*/gi,
  /\s*\(?\s*Rang\s+[A-Z]\s*(?:en\s+\w+)?\s*\)?\s*/gi,
  /\s*R2C[^,)]*\s*/gi,
  // P0 FIX: Strip ITEM + number inline (not just at start) — extracts "TITLE" from "ITEM 363 : TITLE"
  /\bITEM\s+\d+\s*[-–—:.\s]\s*/gi,
  /^(?:UE|N°)\s*\d+\s*[-–—:.\s]\s*/i,
  /^Sujet\s+principal\s*:\s*/i,
  /^(?:Cours|Module|Matière|Chapitre|Partie|Section|Titre)\s*\d*\s*[-–—:.\s]\s*/i,
  /\s*\(\s*(?:source|réf|ref)\s*[:.]?\s*[^)]{0,30}\)\s*/gi,
  // P0 FIX: Strip inline branding/platform noise (CODEX, S-ECN, Révision, date, etc.)
  /\bCODEX\b[.:;,]?\s*/gi,
  /\bS[\s-]*ECN(?:\.COM)?\b[.:;,]?\s*/gi,
  /\bRévision\s+\d[\d\/]*\b\s*/gi,
  /\bMED[\s-]*LINE\b\s*/gi,
  /\biKB\b\s*/gi,
  /\bPREP['']?ECN\b\s*/gi,
  /\bELLIPSES\b\s*/gi,
  /\bVERNAZOBRES[\s-]*GREGO?\b\s*/gi,
  /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b\s*/g,
  /\bECN\.COM\b\s*/gi,
];

// ---------- Main Functions ----------

/**
 * Extract and clean the main topic from document segments.
 * Uses a multi-strategy approach with validation.
 */
export function extractAndCleanTopic(
  segments: { title: string | null; content: string; hierarchy_level: number }[]
): CleanedTopic {
  const rejectedCandidates: RejectedTopicCandidate[] = [];

  // P0: Determine if segment 0 is noisy — if so, skip it for topic extraction
  const segment0IsNoisy = segments.length > 1 && isSegmentNoisy(segments[0]);

  // Strategy 1: First level-1 heading (skip segment 0 if noisy)
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (i === 0 && segment0IsNoisy) {
      if (seg.title) rejectedCandidates.push({ candidate: seg.title, reason: "Segment 0 quarantined (noisy header)" });
      continue;
    }
    if (!seg.title || seg.hierarchy_level > 1) continue;
    const cleaned = cleanTopicString(seg.title);
    const rejection = validateTopic(cleaned);
    if (rejection) {
      rejectedCandidates.push({ candidate: seg.title, reason: rejection });
      continue;
    }
    if (cleaned.length >= 5) {
      return { raw_topic: seg.title, clean_topic: cleaned, confidence: 0.95, source: "heading_level_1", rejected_candidates: rejectedCandidates };
    }
  }

  // Strategy 2: Any heading (skip segment 0 if noisy)
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (i === 0 && segment0IsNoisy) continue;
    if (!seg.title) continue;
    const cleaned = cleanTopicString(seg.title);
    const rejection = validateTopic(cleaned);
    if (rejection) {
      rejectedCandidates.push({ candidate: seg.title, reason: rejection });
      continue;
    }
    if (cleaned.length >= 5) {
      return { raw_topic: seg.title, clean_topic: cleaned, confidence: 0.8, source: "heading_any", rejected_candidates: rejectedCandidates };
    }
  }

  // Strategy 2.5: Extract "ITEM N : TOPIC" pattern from content (common in French medical docs)
  for (const seg of segments) {
    const itemTopic = extractItemTopicFromContent(seg.content);
    if (itemTopic) {
      const cleaned = cleanTopicString(itemTopic);
      const rejection = validateTopic(cleaned);
      if (!rejection && cleaned.length >= 5) {
        return { raw_topic: itemTopic, clean_topic: cleaned, confidence: 0.9, source: "content_analysis" as TopicSource, rejected_candidates: rejectedCandidates };
      }
    }
  }

  // Strategy 3: First substantial sentence after cleaning noise (skip segment 0 if noisy)
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (i === 0 && segment0IsNoisy) continue;
    if (seg.content.length < 30) continue;
    // Clean content lines before extracting topic sentence
    const cleanedContent = cleanTopicString(seg.content);
    const firstSentence = cleanedContent.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length >= 10 && firstSentence.length <= 120) {
      const cleaned = cleanTopicString(firstSentence);
      const rejection = validateTopic(cleaned);
      if (!rejection && cleaned.length >= 5) {
        return { raw_topic: firstSentence, clean_topic: cleaned, confidence: 0.6, source: "first_sentence", rejected_candidates: rejectedCandidates };
      }
    }
  }

  // Strategy 4: Content analysis — find most frequent meaningful noun phrase
  // Use body segments only (skip segment 0 if noisy)
  const bodySegments = segment0IsNoisy ? segments.slice(1) : segments;
  const allContent = bodySegments.map((s) => s.content).join(" ");
  const topicFromContent = extractTopicFromContent(allContent);
  if (topicFromContent) {
    return { raw_topic: topicFromContent, clean_topic: topicFromContent, confidence: 0.45, source: "content_analysis", rejected_candidates: rejectedCandidates };
  }

  // Fallback
  return {
    raw_topic: "Sujet non identifié",
    clean_topic: "Sujet non identifié",
    confidence: 0.1,
    source: "fallback",
    rejected_candidates: rejectedCandidates,
  };
}

/**
 * Check if a segment is noisy (contains mostly editorial/header content).
 */
function isSegmentNoisy(seg: { title: string | null; content: string }): boolean {
  // Check title
  if (seg.title) {
    const titleRejection = validateTopic(cleanTopicString(seg.title));
    if (titleRejection) return true;
  }

  // Check content lines
  const lines = seg.content.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return true;

  let noiseLines = 0;
  for (const line of lines) {
    // Check if the line matches any forbidden topic pattern
    if (FORBIDDEN_TOPIC_PATTERNS.some(({ pattern }) => pattern.test(line))) {
      noiseLines++;
    }
  }

  return lines.length > 0 && (noiseLines / lines.length) > 0.5;
}

/**
 * Clean a raw topic string from editorial noise.
 */
export function cleanTopicString(raw: string): string {
  let topic = raw.trim();

  for (const pattern of TOPIC_NOISE_STRIPS) {
    topic = topic.replace(pattern, "").trim();
  }

  // Collapse whitespace
  topic = topic.replace(/\s{2,}/g, " ").trim();
  // Remove leading/trailing punctuation artifacts
  topic = topic.replace(/^[\s.:;,\-–—]+/, "").replace(/[\s.:;,\-–—]+$/, "").trim();

  return topic || raw.trim();
}

/**
 * Validate that a topic is not a forbidden pattern.
 * Returns the rejection reason, or null if valid.
 */
export function validateTopic(topic: string): string | null {
  const trimmed = topic.trim();

  if (trimmed.length < 3) return "Too short";

  for (const { pattern, reason } of FORBIDDEN_TOPIC_PATTERNS) {
    if (pattern.test(trimmed)) return reason;
  }

  return null;
}

/**
 * Compute a cleanliness score for a topic (0-1).
 */
export function computeTopicCleanlinessScore(topic: CleanedTopic): number {
  let score = topic.confidence;

  // Penalize very short topics
  if (topic.clean_topic.length < 10) score -= 0.1;
  // Penalize very long topics
  if (topic.clean_topic.length > 80) score -= 0.1;
  // Penalize many rejected candidates
  if (topic.rejected_candidates.length > 3) score -= 0.1;
  // Reward heading-based detection
  if (topic.source === "heading_level_1") score += 0.05;

  return Math.max(0, Math.min(1, score));
}

// ---------- Helpers ----------

function extractTopicFromContent(text: string): string | null {
  // Simple frequency-based approach: find repeated capitalized phrases
  const words = text.split(/\s+/);
  const phrases = new Map<string, number>();

  for (let i = 0; i < words.length - 1; i++) {
    if (/^[A-ZÀ-Ÿ]/.test(words[i]) && words[i].length > 3) {
      const phrase = words[i] + (words[i + 1]?.length > 2 ? " " + words[i + 1] : "");
      const key = phrase.toLowerCase();
      phrases.set(key, (phrases.get(key) ?? 0) + 1);
    }
  }

  // Find most frequent phrase (at least 3 occurrences)
  let bestPhrase = "";
  let bestCount = 2;
  for (const [phrase, count] of phrases) {
    if (count > bestCount && phrase.length >= 5) {
      bestCount = count;
      bestPhrase = phrase;
    }
  }

  if (bestPhrase) {
    // Capitalize first letter
    return bestPhrase.charAt(0).toUpperCase() + bestPhrase.slice(1);
  }

  return null;
}

/**
 * Extract topic from "ITEM N : UPPERCASE TITLE" pattern.
 * Captures consecutive uppercase words (+ short connectors like DE, DU, ET, L, À).
 */
function extractItemTopicFromContent(content: string): string | null {
  const match = content.match(/\bITEM\s+\d+\s*[-–—:]\s*(.+)/i);
  if (!match) return null;
  const rest = match[1];
  const words = rest.split(/\s+/);
  const titleWords: string[] = [];
  for (const w of words) {
    const cleaned = w.replace(/[-–—,()]/g, "");
    if (!cleaned) { titleWords.push(w); continue; }
    if (/^[A-ZÀ-Ÿ'']+$/.test(cleaned) || /^(de|du|et|l|d|à|en|des|les|aux)$/i.test(cleaned)) {
      titleWords.push(w);
    } else break;
  }
  const result = titleWords.join(" ").replace(/[-–—,\s]+$/, "").trim();
  return result.length >= 5 ? result : null;
}
