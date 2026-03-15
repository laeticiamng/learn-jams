// ============================================================
// Document Understanding Layer — Pre-comprehension sémantique
// Runs BEFORE concept extraction to build a global understanding
// of the document: true topic, section map, noise zones, learning core.
// ============================================================

import type {
  DocumentUnderstanding,
  DocumentSection,
  NoiseZone,
  DocumentDomain,
  MissionUniverseHint,
  SegmentOutput,
} from "@/domain/cognitio/contracts";
import type { ReasoningType } from "@/domain/cognitio/types";
import {
  cleanMainTopic,
  extractCleanMainTopic,
  computeEditorialArtifactScore,
  computeHeaderNoiseScore,
} from "@/lib/cognitio-semantic-cleaning";
import {
  detectFrontMatter,
  computeSegmentNoiseScore,
} from "./editorialNoiseFilter";
import { detectSectionHeaders, buildDocumentHierarchy } from "./sectionHeaderDetector";

// ---------- Main Entry Point ----------

/**
 * Run the Document Understanding Layer on M1 output.
 * This produces a global semantic understanding BEFORE any concept extraction.
 *
 * The layer acts like an expert teacher who first reads and comprehends the
 * whole document before attempting to extract individual concepts.
 */
export function runDocumentUnderstanding(
  cleanText: string,
  segments: SegmentOutput[],
  sourceType: string,
): DocumentUnderstanding {
  // === Step 1: Detect noise zones ===
  const noiseZones = detectNoiseZones(cleanText, segments);

  // === Step 2: Extract true topic (cleaned, never editorial) ===
  const trueTopic = extractTrueTopic(cleanText, segments);

  // === Step 3: Build real section map ===
  const sectionMap = buildSectionMap(cleanText, segments);

  // === Step 4: Identify learning core ===
  const learningCore = identifyLearningCore(cleanText, segments, sectionMap);

  // === Step 5: Detect critical axes ===
  const criticalAxes = extractCriticalAxes(sectionMap, learningCore);

  // === Step 6: Detect traps and confusions ===
  const trapsOrConfusions = detectTrapsAndConfusions(cleanText);

  // === Step 7: Classify domain ===
  const domainClassification = classifyDomain(cleanText, trueTopic);

  // === Step 8: Detect dominant reasoning ===
  const dominantReasoning = detectDominantReasoning(cleanText);

  // === Step 9: Compute comprehension confidence ===
  const confidence = computeComprehensionConfidence(
    trueTopic, sectionMap, learningCore, noiseZones, cleanText.length,
  );

  const normalizedTitle = trueTopic.length >= 5
    ? trueTopic.charAt(0).toUpperCase() + trueTopic.slice(1)
    : trueTopic;

  console.info(
    `[COGNITIO][UNDERSTANDING] Document Understanding Layer:\n` +
    `  true_topic="${trueTopic}"\n` +
    `  normalized_title="${normalizedTitle}"\n` +
    `  sections=${sectionMap.length} (${sectionMap.filter(s => !s.is_noise).length} pedagogical)\n` +
    `  learning_core=${learningCore.length} axes\n` +
    `  critical_axes=${criticalAxes.length}\n` +
    `  noise_zones=${noiseZones.length}\n` +
    `  domain=${domainClassification}\n` +
    `  reasoning=${dominantReasoning}\n` +
    `  confidence=${confidence.toFixed(2)}`
  );

  return {
    true_topic: trueTopic,
    normalized_title: normalizedTitle,
    section_map: sectionMap,
    learning_core: learningCore,
    noise_zones: noiseZones,
    critical_axes: criticalAxes,
    traps_or_confusions: trapsOrConfusions,
    domain_classification: domainClassification,
    dominant_reasoning: dominantReasoning,
    confidence_explanation: buildConfidenceExplanation(trueTopic, sectionMap, learningCore, noiseZones, confidence),
    comprehension_confidence: confidence,
  };
}

// ---------- Mission Universe Hint ----------

/**
 * Derive a mission universe hint from document understanding.
 * Maps domain + reasoning to a suggested mission universe.
 */
export function deriveMissionUniverseHint(understanding: DocumentUnderstanding): MissionUniverseHint {
  const { domain_classification, dominant_reasoning } = understanding;

  const UNIVERSE_MAP: Record<DocumentDomain, { universe: string; approach: string }> = {
    medical_clinical: {
      universe: "Prise en charge clinique — décision et priorisation",
      approach: "Simulation de cas clinique avec arbre décisionnel",
    },
    medical_basic_science: {
      universe: "Exploration des mécanismes — chaînes explicatives",
      approach: "Investigation scientifique avec hypothèses à valider",
    },
    public_health: {
      universe: "Enquête épidémiologique — audit et contrôle du risque",
      approach: "Analyse de situation de santé publique",
    },
    law: {
      universe: "Dossier juridique — arbitrage et argumentation",
      approach: "Construction d'une argumentation juridique structurée",
    },
    computer_science: {
      universe: "Diagnostic système — architecture et débogage",
      approach: "Résolution de problème technique avec analyse de cause racine",
    },
    history: {
      universe: "Enquête chronologique — causalité et sources",
      approach: "Analyse de sources historiques et construction chronologique",
    },
    fundamental_science: {
      universe: "Exploration des mécanismes — chaînes explicatives",
      approach: "Démarche expérimentale avec modélisation",
    },
    engineering: {
      universe: "Conception et optimisation — contraintes et arbitrages",
      approach: "Résolution de problème d'ingénierie avec compromis",
    },
    humanities: {
      universe: "Analyse critique — interprétation et argumentation",
      approach: "Construction d'une analyse argumentée avec sources",
    },
    general: {
      universe: "Exploration guidée — découverte et structuration",
      approach: "Parcours de découverte avec validation progressive",
    },
  };

  // Refine based on reasoning type
  const base = UNIVERSE_MAP[domain_classification] || UNIVERSE_MAP.general;
  let approach = base.approach;

  if (dominant_reasoning === "procedural") {
    approach = `${approach} — focus sur les étapes séquentielles`;
  } else if (dominant_reasoning === "conditionnel") {
    approach = `${approach} — focus sur les conditions et bifurcations`;
  } else if (dominant_reasoning === "causal") {
    approach = `${approach} — focus sur les chaînes causales`;
  }

  return {
    domain: domain_classification,
    suggested_universe: base.universe,
    reasoning_approach: approach,
  };
}

// ---------- Internal: Noise Zone Detection ----------

function detectNoiseZones(text: string, segments: SegmentOutput[]): NoiseZone[] {
  const zones: NoiseZone[] = [];

  // Front matter detection
  const fm = detectFrontMatter(text);
  if (fm.has_front_matter) {
    zones.push({
      type: "front_matter",
      location: "top",
      description: `${fm.front_matter_lines_detected} lignes de front matter détectées (${fm.front_matter_chars_removed} caractères)`,
    });
  }

  // Segment 0 noise
  if (segments.length > 1) {
    const seg0Score = computeSegmentNoiseScore(segments[0].content);
    if (seg0Score > 0.3) {
      zones.push({
        type: "branding",
        location: "top",
        description: `Segment 0 contient du bruit éditorial (score=${(seg0Score * 100).toFixed(0)}%)`,
      });
    }
  }

  // Scan for inline noise patterns
  const lines = text.split("\n");
  let headerRepeatCount = 0;
  const seenHeaders = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect repeated headers
    if (trimmed.length < 80 && /^[A-ZÀÂÉÈÊËÏÎÔÙÛÜŸÇ\s\-:]+$/.test(trimmed)) {
      if (seenHeaders.has(trimmed)) {
        headerRepeatCount++;
      } else {
        seenHeaders.add(trimmed);
      }
    }

    // Detect R2C/classification inline
    if (/^(?:R2C|Rang\s+[A-Z]|COM\s+R2C|CODEX|S[\s-]*ECN|ITEM\s+\d|Révision\s+\d)/i.test(trimmed)) {
      zones.push({
        type: "classification_label",
        location: "inline",
        description: `Label de classification: "${trimmed.slice(0, 60)}"`,
      });
    }

    // Detect date metadata
    if (/^(?:MAJ|Mise à jour|Dernière révision|Version)\s*:?\s*\d{2,4}/i.test(trimmed)) {
      zones.push({
        type: "date_metadata",
        location: "inline",
        description: `Métadonnée de date: "${trimmed.slice(0, 60)}"`,
      });
    }
  }

  if (headerRepeatCount > 2) {
    zones.push({
      type: "header_repeat",
      location: "inline",
      description: `${headerRepeatCount} en-têtes répétés détectés`,
    });
  }

  // Limit noise zones to avoid excessive detail
  return zones.slice(0, 15);
}

// ---------- Internal: True Topic Extraction ----------

function extractTrueTopic(text: string, segments: SegmentOutput[]): string {
  // Level 1: Use the existing clean topic extractor
  const rawTopic = extractCleanMainTopic(segments);
  const cleanedTopic = cleanMainTopic(rawTopic);

  // Verify it's not editorial
  if (cleanedTopic && cleanedTopic.length >= 5) {
    const editorialScore = computeEditorialArtifactScore(cleanedTopic);
    const headerScore = computeHeaderNoiseScore(cleanedTopic);
    if (editorialScore < 0.3 && headerScore < 0.3) {
      return cleanedTopic;
    }
  }

  // Level 2: Scan segments for the first real pedagogical heading
  for (const seg of segments) {
    if (!seg.title) continue;
    const clean = cleanMainTopic(seg.title);
    if (!clean || clean.length < 5) continue;
    const editScore = computeEditorialArtifactScore(clean);
    const headScore = computeHeaderNoiseScore(clean);
    if (editScore < 0.3 && headScore < 0.3) {
      return clean;
    }
  }

  // Level 3: Extract from body text — find first substantive sentence
  const fm = detectFrontMatter(text);
  const bodyText = fm.has_front_matter ? fm.body_text : text;
  const bodyLines = bodyText.split("\n").map(l => l.trim()).filter(l => l.length > 20);

  for (const line of bodyLines.slice(0, 20)) {
    // Skip editorial lines
    if (/^(?:R2C|Rang|CODEX|S[\s-]*ECN|ITEM|MAJ|Révision|COM\s+R2C)/i.test(line)) continue;
    if (/^[A-ZÀÂÉÈÊ\s\-:]{3,}$/.test(line) && line.length < 40) continue;

    // Extract noun phrase from first substantive line
    const words = line.split(/\s+/).slice(0, 12);
    const candidate = words.join(" ").replace(/[.!?:;,]+$/, "").trim();
    if (candidate.length >= 5 && candidate.length <= 100) {
      const editScore = computeEditorialArtifactScore(candidate);
      if (editScore < 0.3) {
        return candidate;
      }
    }
  }

  // Fallback
  return cleanedTopic || rawTopic || "Sujet non identifié";
}

// ---------- Internal: Section Map ----------

function buildSectionMap(text: string, segments: SegmentOutput[]): DocumentSection[] {
  const sections: DocumentSection[] = [];

  // Use section header detection on cleaned text
  const lines = text.split("\n");
  const headers = detectSectionHeaders(lines);
  const hierarchy = buildDocumentHierarchy(lines, headers);

  // Build sections from hierarchy
  if (hierarchy.chapters.length > 0) {
    for (const chapter of hierarchy.chapters) {
      const isNoise = computeEditorialArtifactScore(chapter.title) >= 0.4 ||
        computeHeaderNoiseScore(chapter.title) >= 0.4;

      // Extract content from line indices
      const chapterContent = chapter.content_lines.length > 0
        ? chapter.content_lines.slice(0, 5).map(i => lines[i] || "").join(" ")
        : "";

      sections.push({
        title: chapter.title,
        level: chapter.level,
        content_summary: summarizeContent(chapterContent, 100),
        is_noise: isNoise,
      });

      // Add subsections
      for (const sub of chapter.sub_sections || []) {
        const subIsNoise = computeEditorialArtifactScore(sub.title) >= 0.4;
        const subContent = sub.content_lines.length > 0
          ? sub.content_lines.slice(0, 3).map(i => lines[i] || "").join(" ")
          : "";
        sections.push({
          title: sub.title,
          level: sub.level,
          content_summary: summarizeContent(subContent, 80),
          is_noise: subIsNoise,
        });
      }
    }
  } else {
    // Fallback: use segments
    for (const seg of segments) {
      const title = seg.title || "Section sans titre";
      const isNoise = !seg.title || computeEditorialArtifactScore(title) >= 0.4;
      sections.push({
        title,
        level: seg.hierarchy_level,
        content_summary: summarizeContent(seg.content, 100),
        is_noise: isNoise,
      });
    }
  }

  return sections;
}

function summarizeContent(content: string, maxLen: number): string {
  const clean = content.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 3) + "...";
}

// ---------- Internal: Learning Core ----------

function identifyLearningCore(
  text: string,
  segments: SegmentOutput[],
  sectionMap: DocumentSection[],
): string[] {
  const core: string[] = [];
  const seen = new Set<string>();

  // Extract from pedagogical section titles
  const pedagogicalSections = sectionMap.filter(s => !s.is_noise && s.title.length >= 5);
  for (const section of pedagogicalSections.slice(0, 8)) {
    const cleaned = cleanMainTopic(section.title);
    if (cleaned && cleaned.length >= 5 && !seen.has(cleaned.toLowerCase())) {
      seen.add(cleaned.toLowerCase());
      core.push(cleaned);
    }
  }

  // If not enough from titles, scan for semantic markers in text
  if (core.length < 3) {
    const SEMANTIC_MARKERS = [
      /(?:définition|physiopathologie|mécanismes?|diagnostic|traitement|complications?|prévention|épidémiologie|étiologie|pronostic|examens?\s+complémentaires?|signes?\s+cliniques?|prise\s+en\s+charge)/gi,
      /(?:introduction|conclusion|résumé|objectifs?|classification|facteurs?\s+de\s+risque|indications?|contre[\s-]?indications?|surveillance)/gi,
    ];

    for (const marker of SEMANTIC_MARKERS) {
      const matches = text.match(marker);
      if (matches) {
        for (const match of matches) {
          const normalized = match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
          if (!seen.has(normalized.toLowerCase())) {
            seen.add(normalized.toLowerCase());
            core.push(normalized);
            if (core.length >= 8) break;
          }
        }
      }
      if (core.length >= 8) break;
    }
  }

  return core.slice(0, 8);
}

// ---------- Internal: Critical Axes ----------

function extractCriticalAxes(
  sectionMap: DocumentSection[],
  learningCore: string[],
): string[] {
  // Critical axes = the most important learning core items
  // Priority: Définition > Diagnostic > Traitement > Mécanismes > Prévention
  const PRIORITY_KEYWORDS = [
    "définition", "diagnostic", "traitement", "prise en charge",
    "physiopathologie", "mécanisme", "étiologie", "classification",
    "facteur de risque", "complication", "prévention", "pronostic",
  ];

  const prioritized: string[] = [];
  const remaining: string[] = [];

  for (const axis of learningCore) {
    const lower = axis.toLowerCase();
    if (PRIORITY_KEYWORDS.some(kw => lower.includes(kw))) {
      prioritized.push(axis);
    } else {
      remaining.push(axis);
    }
  }

  return [...prioritized, ...remaining].slice(0, 6);
}

// ---------- Internal: Traps and Confusions ----------

function detectTrapsAndConfusions(text: string): string[] {
  const traps: string[] = [];

  // Detect explicit trap markers in text
  const TRAP_PATTERNS = [
    /(?:attention|piège|ne pas confondre|à ne pas confondre|erreur fréquente|faux ami|confusion possible|diagnostic différentiel)[\s:]+([^\n.]{10,80})/gi,
    /(?:contrairement à|à la différence de|≠|vs\.?)[\s]+([^\n.]{10,60})/gi,
  ];

  for (const pattern of TRAP_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && traps.length < 5) {
        traps.push(match[1].trim());
      }
    }
  }

  return traps;
}

// ---------- Internal: Domain Classification ----------

function classifyDomain(text: string, topic: string): DocumentDomain {
  const combined = (text.slice(0, 3000) + " " + topic).toLowerCase();

  const DOMAIN_SIGNALS: { domain: DocumentDomain; keywords: string[]; weight: number }[] = [
    {
      domain: "medical_clinical",
      keywords: [
        "patient", "diagnostic", "traitement", "clinique", "symptôme",
        "sémiologie", "examen clinique", "thérapeutique", "pathologie",
        "chirurgi", "cardiolog", "pneumolog", "neurolog", "hématolog",
        "médecin", "prescription", "posologie", "urgence",
      ],
      weight: 1,
    },
    {
      domain: "medical_basic_science",
      keywords: [
        "physiopathologie", "mécanisme", "cellulaire", "moléculaire",
        "biochimi", "histologi", "anatomie", "physiologie", "métabolisme",
        "enzyme", "protéine", "gène", "immunologi",
      ],
      weight: 1,
    },
    {
      domain: "public_health",
      keywords: [
        "santé publique", "épidémiolog", "prévention", "dépistage",
        "vaccination", "incidence", "prévalence", "mortalité",
        "hygiène", "ETP", "éducation thérapeutique",
      ],
      weight: 1.2,
    },
    {
      domain: "law",
      keywords: [
        "juridique", "droit", "loi", "article", "code pénal",
        "code civil", "jurisprudence", "tribunal", "avocat",
        "contentieux", "réglementation",
      ],
      weight: 1.2,
    },
    {
      domain: "computer_science",
      keywords: [
        "algorithme", "programme", "code", "logiciel", "système",
        "base de données", "réseau", "architecture", "API",
        "développement", "informatique", "serveur",
      ],
      weight: 1.2,
    },
    {
      domain: "history",
      keywords: [
        "histoire", "siècle", "époque", "dynastie", "guerre",
        "révolution", "empire", "chronolog", "archéolog",
      ],
      weight: 1.2,
    },
    {
      domain: "fundamental_science",
      keywords: [
        "physique", "chimie", "mathématique", "biologie",
        "expérience", "théorème", "équation", "réaction",
        "atome", "force", "énergie",
      ],
      weight: 1.1,
    },
  ];

  let bestDomain: DocumentDomain = "general";
  let bestScore = 0;

  for (const { domain, keywords, weight } of DOMAIN_SIGNALS) {
    let score = 0;
    for (const kw of keywords) {
      const regex = new RegExp(kw, "gi");
      const matches = combined.match(regex);
      if (matches) {
        score += matches.length * weight;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  // Minimum threshold to avoid false classification
  if (bestScore < 3) {
    return "general";
  }

  return bestDomain;
}

// ---------- Internal: Reasoning Type Detection ----------

function detectDominantReasoning(text: string): ReasoningType {
  const sample = text.slice(0, 5000).toLowerCase();

  const scores: Record<ReasoningType, number> = {
    declaratif: 0,
    procedural: 0,
    conditionnel: 0,
    causal: 0,
    metacognitif: 0,
  };

  // Procedural
  const proceduralMatches = sample.match(/étape|step|\d+[.)]\s|d'abord|ensuite|puis|enfin|protocole|procédure|séquence/g);
  scores.procedural = (proceduralMatches?.length ?? 0) * 1.5;

  // Conditional
  const conditionalMatches = sample.match(/si\s|if\s|lorsque|when|en cas de|sauf si|à condition|selon|dépend/g);
  scores.conditionnel = (conditionalMatches?.length ?? 0) * 1.5;

  // Causal
  const causalMatches = sample.match(/parce que|car\s|because|donc|therefore|entraîne|provoque|cause|conséquence|mécanisme/g);
  scores.causal = (causalMatches?.length ?? 0) * 1.5;

  // Metacognitive
  const metaMatches = sample.match(/attention|piège|ne pas confondre|erreur fréquente|à retenir|important/g);
  scores.metacognitif = (metaMatches?.length ?? 0) * 2;

  // Declarative is default
  scores.declaratif = 2; // baseline

  let bestType: ReasoningType = "declaratif";
  let bestScore = scores.declaratif;
  for (const [type, score] of Object.entries(scores) as [ReasoningType, number][]) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  return bestType;
}

// ---------- Internal: Confidence Computation ----------

function computeComprehensionConfidence(
  trueTopic: string,
  sectionMap: DocumentSection[],
  learningCore: string[],
  noiseZones: NoiseZone[],
  textLength: number,
): number {
  let confidence = 0.5;

  // Topic quality
  if (trueTopic !== "Sujet non identifié" && trueTopic.length >= 5) {
    confidence += 0.15;
  }

  // Section structure quality
  const pedagogicalSections = sectionMap.filter(s => !s.is_noise);
  if (pedagogicalSections.length >= 3) {
    confidence += 0.15;
  } else if (pedagogicalSections.length >= 1) {
    confidence += 0.05;
  }

  // Learning core richness
  if (learningCore.length >= 5) {
    confidence += 0.1;
  } else if (learningCore.length >= 3) {
    confidence += 0.05;
  }

  // Noise penalty
  if (noiseZones.length > 5) {
    confidence -= 0.1;
  } else if (noiseZones.length > 2) {
    confidence -= 0.05;
  }

  // Text length bonus
  if (textLength > 5000) {
    confidence += 0.05;
  }
  if (textLength > 10000) {
    confidence += 0.05;
  }

  return Math.max(0.1, Math.min(1, confidence));
}

function buildConfidenceExplanation(
  trueTopic: string,
  sectionMap: DocumentSection[],
  learningCore: string[],
  noiseZones: NoiseZone[],
  confidence: number,
): string {
  const parts: string[] = [];

  if (trueTopic === "Sujet non identifié") {
    parts.push("Sujet principal non identifié avec certitude");
  } else {
    parts.push(`Sujet identifié : "${trueTopic}"`);
  }

  const pedagogicalCount = sectionMap.filter(s => !s.is_noise).length;
  parts.push(`${pedagogicalCount} section(s) pédagogique(s) détectée(s)`);

  if (learningCore.length > 0) {
    parts.push(`${learningCore.length} axe(s) d'apprentissage identifié(s)`);
  }

  if (noiseZones.length > 0) {
    parts.push(`${noiseZones.length} zone(s) de bruit détectée(s)`);
  }

  parts.push(`Confiance globale : ${(confidence * 100).toFixed(0)}%`);

  return parts.join(". ") + ".";
}
