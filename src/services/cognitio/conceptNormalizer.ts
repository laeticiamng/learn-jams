// ============================================================
// Concept Normalizer — Transforms raw concept fragments into
// clean, pedagogically useful, stable concept labels
// ============================================================

import { detectDocumentNoise, stripDocumentNoise, computeNoiseScore } from "@/lib/cognitio-semantic-cleaning";

export interface NormalizedConcept {
  original_label: string;
  normalized_label: string;
  definition: string;
  compressed_definition: string;
  concept_type: ConceptType;
  quality_score: number; // 0-1
  rejection: ConceptRejection | null;
}

export type ConceptType =
  | "principal"     // Core concept of the course
  | "secondary"     // Supporting concept
  | "detail"        // Specific detail or data point
  | "trap"          // Common confusion / trap
  | "example"       // Illustrative example
  | "definition"    // Pure definition
  | "process"       // Step or process
  | "comparison";   // Comparison or distinction

export interface ConceptRejection {
  reason: ConceptRejectionReason;
  detail: string;
}

export type ConceptRejectionReason =
  | "too_short"
  | "pure_number"
  | "editorial_artifact"
  | "classification_label"
  | "truncated_fragment"
  | "punctuation_only"
  | "duplicate"
  | "definition_missing"
  | "definition_too_short"
  | "definition_is_label"
  | "non_concept_pattern"
  | "color_metadata"
  | "document_noise";

export interface NormalizationResult {
  accepted: NormalizedConcept[];
  rejected: NormalizedConcept[];
  raw_concepts_count: number;
  normalized_concepts_count: number;
  rejected_concepts_count: number;
  reject_reasons: { reason: ConceptRejectionReason; count: number }[];
  concept_quality_score: number; // average quality
  /** Count of rejected concepts that were editorial artifacts */
  rejected_editorial_artifacts_count: number;
}

// ---------- Rejection Patterns ----------

const REJECT_PATTERNS: { reason: ConceptRejectionReason; pattern: RegExp }[] = [
  { reason: "classification_label", pattern: /^(?:Rang|R2C|COM|Item|UE\d|DFGSM|ECN|EDN)\s/i },
  { reason: "pure_number", pattern: /^[\d\s\-–—:.;,()]+$/ },
  { reason: "punctuation_only", pattern: /^[^a-zA-ZÀ-ÿ]+$/ },
  { reason: "truncated_fragment", pattern: /^[)\]}>]/ },
  { reason: "truncated_fragment", pattern: /\(\s*$/ },
  { reason: "color_metadata", pattern: /^(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS)\b/i },
  { reason: "color_metadata", pattern: /^COM\s+R2C\b/i },
  { reason: "non_concept_pattern", pattern: /^(?:Voir|Cf\.?|Tableau|Figure|Annexe)\s/i },
  { reason: "non_concept_pattern", pattern: /^(?:NB|PS|Note)\s*:/i },
  { reason: "non_concept_pattern", pattern: /^(?:Suite|Fin|Début)\s*$/i },
  { reason: "non_concept_pattern", pattern: /^Sujet\s+principal\s*:/i },
  { reason: "non_concept_pattern", pattern: /^\+{2,}\s*:/ },
  { reason: "editorial_artifact", pattern: /^(?:Introduction|Conclusion|Résumé|Bibliographie|Références?)\s*$/i },
  // P0: Platform branding / document noise
  { reason: "document_noise", pattern: /\bCODEX\b/i },
  { reason: "document_noise", pattern: /\bS[\s-]*ECN\b/i },
  { reason: "document_noise", pattern: /\bECN\.COM\b/i },
  { reason: "document_noise", pattern: /\bR2C\s+Révision\b/i },
  { reason: "document_noise", pattern: /\bMED-LINE\b/i },
  { reason: "document_noise", pattern: /\bVERNAZOBRES/i },
  { reason: "document_noise", pattern: /\biKB\b/ },
  { reason: "document_noise", pattern: /\bPREP['']?ECN\b/i },
  { reason: "document_noise", pattern: /^(?:www\.|https?:\/\/)/i },
  { reason: "document_noise", pattern: /\bRévision\s+\d[\d\/]*/i },
  { reason: "document_noise", pattern: /\bPage\s+\d+/i },
  { reason: "document_noise", pattern: /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/ },
  // P0: Enhanced editorial artifact rejection — catch R2C/Rang ANYWHERE in label
  { reason: "classification_label", pattern: /\bR2C\b/i },
  { reason: "classification_label", pattern: /\bRang\s+[A-Z]\b/i },
  { reason: "color_metadata", pattern: /(?:NOIR|BLEU|ROUGE|VERT|GRIS)/i },
  { reason: "document_noise", pattern: /\bITEM\s+\d+/i },
  { reason: "document_noise", pattern: /\bELLIPSES\b/i },
  { reason: "document_noise", pattern: /\bRévision\b/i },
];

// Label noise to strip
const LABEL_NOISE: RegExp[] = [
  /^[\s)\-–—•:;,.\]}\[{]+/,
  /[\s\-–—•:;,.\]}\[{]+$/,
  /^(?:COM\s+)?R2C\s*:\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|Rang\s+[A-Z])\s*[-–—:]\s*/i,
  /\s*[-–—]\s*(?:Rang\s+[A-Z]|en\s+(?:NOIR|BLEU|ROUGE))\s*$/i,
  /^Item\s+\d+\s*[-–—:]\s*/i,
  /\s*[-–—]\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*$/i,
  /^en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS)\s*[-–—]\s*/i,
];

// Medical acronyms to preserve
const PRESERVE_ACRONYMS = new Set([
  "PAC", "VIH", "SIDA", "ECG", "IRM", "TDM", "NFS", "CRP", "VS",
  "HTA", "AVC", "IDM", "OAP", "EP", "TVP", "BPCO", "AINS", "IPP",
  "ATB", "AVK", "AOD", "INR", "TP", "TCA", "HbA1c", "LDL", "HDL",
  "PSA", "TSH", "PCR", "ECBU", "BU", "ASP", "ETT", "ETO",
  "CPAP", "VNI", "IOT", "GDS", "SpO2", "PaO2", "PaCO2",
  "IMC", "DFG", "IRC", "IRA", "SCA", "STEMI", "NSTEMI",
  "DNA", "RNA", "ADN", "ARN", "ATP", "ADP", "pH", "IP", "TCP", "UDP",
  "HTTP", "HTTPS", "API", "REST", "SQL", "CSS", "HTML", "JS", "TS",
]);

// ---------- Main Normalization ----------

/**
 * Normalize an array of raw concepts into clean, pedagogically useful concepts.
 */
export function normalizeConcepts(
  rawConcepts: { label: string; definition: string; stable_key: string; criticality: number }[]
): NormalizationResult {
  const accepted: NormalizedConcept[] = [];
  const rejected: NormalizedConcept[] = [];
  const rejectReasonCounts = new Map<ConceptRejectionReason, number>();
  const seenKeys = new Set<string>();

  for (const raw of rawConcepts) {
    const normalized = normalizeSingleConcept(raw);

    // Check for duplicates
    const dedupeKey = normalized.normalized_label.toLowerCase().replace(/\s+/g, "_");
    if (seenKeys.has(dedupeKey)) {
      normalized.rejection = { reason: "duplicate", detail: `Duplicate of "${normalized.normalized_label}"` };
    }

    if (normalized.rejection) {
      rejected.push(normalized);
      const reason = normalized.rejection.reason;
      rejectReasonCounts.set(reason, (rejectReasonCounts.get(reason) ?? 0) + 1);
    } else {
      seenKeys.add(dedupeKey);
      accepted.push(normalized);
    }
  }

  const avgQuality = accepted.length > 0
    ? accepted.reduce((sum, c) => sum + c.quality_score, 0) / accepted.length
    : 0;

  // Count editorial artifact rejections
  const editorialArtifactReasons: ConceptRejectionReason[] = [
    "editorial_artifact", "classification_label", "color_metadata", "document_noise",
  ];
  const rejectedEditorialArtifactsCount = rejected.filter(
    r => r.rejection && editorialArtifactReasons.includes(r.rejection.reason)
  ).length;

  return {
    accepted,
    rejected,
    raw_concepts_count: rawConcepts.length,
    normalized_concepts_count: accepted.length,
    rejected_concepts_count: rejected.length,
    reject_reasons: Array.from(rejectReasonCounts.entries()).map(([reason, count]) => ({ reason, count })),
    concept_quality_score: avgQuality,
    rejected_editorial_artifacts_count: rejectedEditorialArtifactsCount,
  };
}

/**
 * Normalize a single concept.
 */
function normalizeSingleConcept(raw: {
  label: string;
  definition: string;
  stable_key: string;
  criticality: number;
}): NormalizedConcept {
  // Clean label
  let label = raw.label.trim();
  for (const pattern of LABEL_NOISE) {
    label = label.replace(pattern, "").trim();
  }

  // Check rejection patterns — with length-aware relaxation for inline noise
  // If a noise token is a small fraction of a longer label, strip it instead of rejecting
  for (const { reason, pattern } of REJECT_PATTERNS) {
    if (pattern.test(label)) {
      // Length-aware check: if the label is long enough (>= 20 chars) and the noise token
      // is a small fraction, strip the noise instead of rejecting the whole concept.
      // This prevents rejecting e.g. "Diagnostic étiologique de l'HTA — Rang A"
      // when the real concept is "Diagnostic étiologique de l'HTA".
      const noiseMatch = label.match(pattern);
      const noiseLength = noiseMatch ? noiseMatch[0].length : 0;
      const labelWithoutNoise = label.replace(pattern, "").trim();
      const isMinorNoise = label.length >= 20 && noiseLength < label.length * 0.4 && labelWithoutNoise.length >= 5;

      if (isMinorNoise) {
        // Strip the noise token and continue validation with cleaned label
        label = labelWithoutNoise;
        // Re-clean trailing punctuation/dashes left over
        label = label.replace(/[\s\-–—:;,]+$/, "").replace(/^[\s\-–—:;,]+/, "").trim();
        continue; // Skip rejection — try next pattern on cleaned label
      }

      return {
        original_label: raw.label,
        normalized_label: label,
        definition: raw.definition,
        compressed_definition: "",
        concept_type: "detail",
        quality_score: 0,
        rejection: { reason, detail: `Label matches rejection pattern: "${raw.label}"` },
      };
    }
  }

  // Too short
  if (label.length < 3) {
    return {
      original_label: raw.label,
      normalized_label: label,
      definition: raw.definition,
      compressed_definition: "",
      concept_type: "detail",
      quality_score: 0,
      rejection: { reason: "too_short", detail: `Label too short after cleaning: "${label}"` },
    };
  }

  // Must contain at least one letter
  if (!/[a-zA-ZÀ-ÿ]/.test(label)) {
    return {
      original_label: raw.label,
      normalized_label: label,
      definition: raw.definition,
      compressed_definition: "",
      concept_type: "detail",
      quality_score: 0,
      rejection: { reason: "pure_number", detail: `No alphabetic characters in: "${label}"` },
    };
  }

  // Normalize capitalization
  if (label === label.toUpperCase() && label.length > 5 && label.includes(" ")) {
    label = toTitleCasePreserving(label);
  }

  // Clean trailing ++, :
  label = label.replace(/\s*\+{2,}\s*:?\s*$/, "").trim();
  label = label.replace(/\s*:\s*$/, "").trim();
  label = label.replace(/\s*[-–—]\s*/g, " — ").trim();
  label = label.replace(/\s*[-–—:]\s*$/, "").trim();
  label = label.replace(/\s{2,}/g, " ");

  // Validate definition — relaxed for short-form medical text
  // Medical polycopiés often use very short definitions (abbreviations, values)
  const defTrimmed = raw.definition.trim();
  const minDefLength = label.length >= 5 && /[A-ZÀ-Ÿ]/.test(label) ? 5 : 10;
  if (defTrimmed.length < minDefLength) {
    return {
      original_label: raw.label,
      normalized_label: label,
      definition: raw.definition,
      compressed_definition: "",
      concept_type: "detail",
      quality_score: 0.1,
      rejection: { reason: "definition_too_short", detail: `Definition too short: ${defTrimmed.length} chars (min: ${minDefLength})` },
    };
  }

  if (defTrimmed.toLowerCase() === label.toLowerCase()) {
    return {
      original_label: raw.label,
      normalized_label: label,
      definition: raw.definition,
      compressed_definition: "",
      concept_type: "detail",
      quality_score: 0.1,
      rejection: { reason: "definition_is_label", detail: "Definition is just the label restated" },
    };
  }

  // P0: Check label AND definition against document noise blacklist
  const labelNoise = detectDocumentNoise(label);
  if (labelNoise.noisy) {
    return {
      original_label: raw.label,
      normalized_label: label,
      definition: raw.definition,
      compressed_definition: "",
      concept_type: "detail",
      quality_score: 0,
      rejection: { reason: "document_noise", detail: `Label contains document noise: ${labelNoise.matches.join(", ")}` },
    };
  }

  const defNoise = detectDocumentNoise(defTrimmed);
  const defNoiseScore = computeNoiseScore(defTrimmed);
  if (defNoiseScore > 0.5) {
    return {
      original_label: raw.label,
      normalized_label: label,
      definition: raw.definition,
      compressed_definition: "",
      concept_type: "detail",
      quality_score: 0,
      rejection: { reason: "document_noise", detail: `Definition is mostly noise (score: ${defNoiseScore.toFixed(2)})` },
    };
  }

  // Strip any remaining noise from the definition before compressing
  const cleanedDef = defNoise.noisy ? stripDocumentNoise(defTrimmed) : defTrimmed;
  if (cleanedDef.length < 10) {
    return {
      original_label: raw.label,
      normalized_label: label,
      definition: raw.definition,
      compressed_definition: "",
      concept_type: "detail",
      quality_score: 0.1,
      rejection: { reason: "definition_too_short", detail: `Definition too short after noise removal: ${cleanedDef.length} chars` },
    };
  }

  // Compress definition
  const compressed = compressDefinition(cleanedDef);

  // Determine concept type
  const conceptType = classifyConceptType(label, cleanedDef, raw.criticality);

  // Compute quality score
  let quality = computeConceptQuality(label, cleanedDef, raw.criticality);
  // P0: Penalize quality if definition had noise that was stripped
  if (defNoise.noisy) {
    quality = Math.max(0, quality - 0.2);
  }

  return {
    original_label: raw.label,
    normalized_label: label,
    definition: raw.definition,
    compressed_definition: compressed,
    concept_type: conceptType,
    quality_score: quality,
    rejection: null,
  };
}

// ---------- Helpers ----------

function classifyConceptType(label: string, definition: string, criticality: number): ConceptType {
  const lower = (label + " " + definition).toLowerCase();

  if (criticality <= 1) return "principal";
  if (/\bpiège\b|\btrap\b|\battention\b|\bne\s+pas\s+confondre\b/i.test(lower)) return "trap";
  if (/\bexemple\b|\bpar\s+exemple\b|\bnotamment\b/i.test(lower)) return "example";
  if (/\bdéfinition\b|\bon\s+(?:définit|appelle)\b/i.test(lower)) return "definition";
  if (/\bétape\b|\bprocessus\b|\bprotocole\b|\bprocédure\b/i.test(lower)) return "process";
  if (/\bvs\.?\b|\bversus\b|\bdistinction\b|\bdifférence\b/i.test(lower)) return "comparison";
  if (criticality <= 2) return "secondary";
  return "detail";
}

function computeConceptQuality(label: string, definition: string, criticality: number): number {
  let score = 0.5;

  // Label quality
  if (label.length >= 5 && label.length <= 80) score += 0.1;
  if (/^[A-ZÀ-Ÿ]/.test(label)) score += 0.05;
  if (!label.includes("—") || label.split("—").length <= 2) score += 0.05;

  // Definition quality
  if (definition.length >= 30) score += 0.1;
  if (definition.length >= 80) score += 0.05;
  if (/[.!?]$/.test(definition)) score += 0.05;

  // Criticality boost
  if (criticality <= 2) score += 0.1;

  return Math.min(1, score);
}

function compressDefinition(def: string, maxLength: number = 200): string {
  let d = def.trim();
  d = d.replace(/^(?:Il s'agit d'|C'est |On appelle |On définit |Par définition,?\s*)/i, "");
  d = d.replace(/\s*\([Cc]f\.?\s*[^)]+\)\s*$/g, "");
  d = d.replace(/\s*\[[\d,\s]+\]\s*$/g, "");
  d = d.replace(/\s*\(Rang\s+[A-Z]\)\s*/gi, " ");
  d = d.replace(/\s*\(R2C[^)]*\)\s*/gi, " ");
  d = d.replace(/\s{2,}/g, " ").trim();

  if (d.length > maxLength) {
    const sentences = d.match(/[^.!?]+[.!?]+/g) || [d];
    let compressed = "";
    for (const sentence of sentences) {
      if ((compressed + sentence).length <= maxLength) {
        compressed += sentence;
      } else break;
    }
    d = compressed.trim() || d.slice(0, maxLength).replace(/\s\S*$/, "…");
  }

  if (d.length > 0) {
    d = d.charAt(0).toUpperCase() + d.slice(1);
  }
  return d;
}

function toTitleCasePreserving(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();
      if (PRESERVE_ACRONYMS.has(upper)) return upper;
      if (word.length <= 2) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// ---------- Medical Polycopié Pre-Normalization ----------

/**
 * Common French medical abbreviations that should be expanded
 * to create richer concept labels and definitions.
 */
const MEDICAL_ABBREVIATION_MAP: Record<string, string> = {
  "HTA": "hypertension artérielle",
  "AVC": "accident vasculaire cérébral",
  "IDM": "infarctus du myocarde",
  "EP": "embolie pulmonaire",
  "TVP": "thrombose veineuse profonde",
  "BPCO": "bronchopneumopathie chronique obstructive",
  "IRC": "insuffisance rénale chronique",
  "IRA": "insuffisance rénale aiguë",
  "OAP": "œdème aigu du poumon",
  "NFS": "numération formule sanguine",
  "CRP": "protéine C réactive",
  "ECG": "électrocardiogramme",
  "IRM": "imagerie par résonance magnétique",
  "TDM": "tomodensitométrie",
  "ECBU": "examen cytobactériologique des urines",
  "GDS": "gaz du sang",
  "DFG": "débit de filtration glomérulaire",
  "PAC": "pneumonie aiguë communautaire",
};

/**
 * Pre-normalize text from dense medical polycopiés before concept extraction.
 * - Expands bullet-point abbreviation lists into concept-friendly sentences
 * - Merges orphan abbreviation lines with surrounding context
 * - Normalizes medical section titles (e.g., "A." → structured heading)
 */
export function preNormalizeMedicalText(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let currentSection = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect section titles (I., II., A., B., 1., 2., etc.)
    const sectionMatch = line.match(/^(?:([IVXLC]+|[A-Z]|\d+)[.)]\s*)(.+)/);
    if (sectionMatch && sectionMatch[2].length >= 3) {
      currentSection = sectionMatch[2].trim();
      result.push(line);
      continue;
    }

    // Detect abbreviation-only lines (e.g., "- HTA", "• ECG", "NFS CRP VS")
    const stripped = line.replace(/^[\s•\-–—*]+/, "").trim();
    if (stripped.length < 30 && /^[A-ZÀ-Ÿ\s,/+()]+$/.test(stripped) && stripped.length >= 2) {
      // Try to expand known abbreviations
      const tokens = stripped.split(/[\s,/]+/).filter(t => t.length >= 2);
      const expanded = tokens.map(t => {
        const upper = t.toUpperCase().replace(/[()]/g, "");
        const expansion = MEDICAL_ABBREVIATION_MAP[upper];
        return expansion ? `${t} (${expansion})` : t;
      });

      // Merge with section context if available
      if (currentSection && expanded.length > 0) {
        result.push(`${expanded.join(", ")} — ${currentSection}`);
      } else {
        result.push(expanded.join(", "));
      }
      continue;
    }

    // Detect colon-terminated list headers and merge with next items
    if (line.endsWith(":") && i + 1 < lines.length) {
      const header = line.replace(/:$/, "").trim();
      const nextLine = lines[i + 1]?.trim() ?? "";
      if (nextLine.startsWith("-") || nextLine.startsWith("•") || nextLine.startsWith("–")) {
        // Collect list items
        const items: string[] = [];
        let j = i + 1;
        while (j < lines.length) {
          const item = lines[j].trim();
          if (item.startsWith("-") || item.startsWith("•") || item.startsWith("–")) {
            items.push(item.replace(/^[\s•\-–—*]+/, "").trim());
            j++;
          } else {
            break;
          }
        }
        if (items.length > 0) {
          result.push(`${header} : ${items.join(", ")}`);
          i = j - 1; // Skip consumed items
          continue;
        }
      }
    }

    result.push(line);
  }

  return result.join("\n");
}

/**
 * Group concepts by type and deduplicate.
 */
export function groupAndDeduplicateConcepts(
  concepts: NormalizedConcept[]
): { groups: Map<ConceptType, NormalizedConcept[]>; deduped_count: number } {
  const groups = new Map<ConceptType, NormalizedConcept[]>();
  const seenLabels = new Set<string>();
  let dedupedCount = 0;

  for (const concept of concepts) {
    const key = concept.normalized_label.toLowerCase().replace(/\s+/g, "_");
    if (seenLabels.has(key)) {
      dedupedCount++;
      continue;
    }
    seenLabels.add(key);

    const group = groups.get(concept.concept_type) ?? [];
    group.push(concept);
    groups.set(concept.concept_type, group);
  }

  return { groups, deduped_count: dedupedCount };
}
