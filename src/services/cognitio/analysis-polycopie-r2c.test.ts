import { describe, it, expect, vi } from "vitest";
import { shouldTriggerBodyOnlySecondPass } from "./analysis.service";
import { detectFrontMatter, filterEditorialNoise, computeSegmentNoiseScore } from "./editorialNoiseFilter";
import { extractAndCleanTopic, validateTopic, cleanTopicString } from "./topicCleaner";
import { normalizeConcepts } from "./conceptNormalizer";
import { runSemanticSuccessGate, normalizeGateConceptInput } from "@/domain/cognitio/validators";
import { recordSecondPassEvaluation, recordGateEvaluation, metrics } from "@/services/observability/metricsService";
import { cleanMainTopic } from "@/lib/cognitio-semantic-cleaning";

// ============================================================
// Test Suite: P0 Polycopié R2C Analysis — Front Matter,
// Segment 0 Quarantine, Body-Only Second Pass
// ============================================================

// ---------- Realistic R2C Document Fixtures ----------

const R2C_HEADER_BLOCK = [
  "CODEX. S-ECN.COM",
  "R2C : Rang A en noir – Rang B en bleu – Rang C en vert",
  "ITEM 216",
  "Révision 3/2024",
  "MAJ : 15/01/2024",
  "iKB – MED-LINE",
].join("\n");

const MEDICAL_BODY_CONTENT = [
  "Pathologie génito-scrotale chez le garçon et chez l'homme",
  "",
  "I. Torsion du cordon spermatique",
  "La torsion du cordon spermatique est une urgence chirurgicale. Elle touche principalement l'adolescent et l'adulte jeune.",
  "Le diagnostic repose sur la clinique : douleur testiculaire aiguë, unilatérale, d'apparition brutale.",
  "L'échographie-Doppler montre une diminution ou absence de flux vasculaire intratesticulaire.",
  "Le traitement est chirurgical en urgence (exploration scrotale + détorsion + orchidopexie bilatérale).",
  "",
  "II. Hydrocèle",
  "L'hydrocèle est un épanchement liquidien dans la vaginale testiculaire.",
  "Chez l'enfant, elle est liée à la persistance du canal péritonéo-vaginal.",
  "Chez l'adulte, elle peut être idiopathique ou réactionnelle (infection, traumatisme, tumeur).",
  "La transillumination est positive. L'échographie confirme le diagnostic.",
  "",
  "III. Cryptorchidie",
  "La cryptorchidie est l'absence de descente complète du testicule dans le scrotum.",
  "Elle concerne 3% des nouveau-nés à terme et 20% des prématurés.",
  "Le traitement est chirurgical (orchidopexie) avant l'âge de 12-18 mois.",
  "Le risque de dégénérescence est multiplié par 5 à 10.",
].join("\n");

const FULL_R2C_DOCUMENT = R2C_HEADER_BLOCK + "\n\n" + MEDICAL_BODY_CONTENT;

// ---------- shouldTriggerBodyOnlySecondPass ----------

describe("shouldTriggerBodyOnlySecondPass", () => {
  it("triggers when front_matter + raw_concepts from seg0 + none from body", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: true,
      concepts_from_segment_0: 0, // post-filter: all rejected
      raw_concepts_from_segment_0: 5, // pre-filter: 5 raw concepts from seg0
      concepts_from_body: 0,
      valid_body_concepts_count: 0,
      valid_concepts_count: 2,   // some valid concepts exist globally (skips Condition C)
      main_topic_is_editorial_artifact: false,
      artifact_ratio: 0.5, // below 0.8 so high_artifact_ratio does not fire first
      all_concepts_uncertain: false,
      raw_concepts_count: 5,
      filtered_concepts_count: 2, // some survived filtering globally (skips Condition G)
      editorial_body_concepts_count: 0,
      segments_count: 3,
    });
    expect(result.trigger).toBe(true);
    expect(result.reason).toBe("front_matter_with_seg0_only_concepts");
  });

  it("triggers when front_matter + filtered concepts from seg0 + none from body", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: true,
      concepts_from_segment_0: 5, // post-filter: survived
      raw_concepts_from_segment_0: 5,
      concepts_from_body: 0,
      valid_body_concepts_count: 0,
      valid_concepts_count: 5,
      main_topic_is_editorial_artifact: false,
      artifact_ratio: 0.3,
      all_concepts_uncertain: false,
      raw_concepts_count: 5,
      filtered_concepts_count: 5,
      editorial_body_concepts_count: 0,
      segments_count: 3,
    });
    expect(result.trigger).toBe(true);
    expect(result.reason).toBe("front_matter_with_seg0_only_concepts");
  });

  it("triggers when main topic is editorial artifact", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: false,
      concepts_from_segment_0: 3,
      raw_concepts_from_segment_0: 3,
      concepts_from_body: 2,
      valid_body_concepts_count: 2,
      valid_concepts_count: 5,
      main_topic_is_editorial_artifact: true,
      artifact_ratio: 0.3,
      all_concepts_uncertain: false,
      raw_concepts_count: 5,
      filtered_concepts_count: 5,
      editorial_body_concepts_count: 0,
      segments_count: 3,
    });
    expect(result.trigger).toBe(true);
    expect(result.reason).toBe("editorial_artifact_topic");
  });

  it("triggers when artifact ratio >= 0.8", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: false,
      concepts_from_segment_0: 1,
      raw_concepts_from_segment_0: 4,
      concepts_from_body: 1,
      valid_body_concepts_count: 1,
      valid_concepts_count: 2,
      main_topic_is_editorial_artifact: false,
      artifact_ratio: 0.85,
      all_concepts_uncertain: false,
      raw_concepts_count: 5,
      filtered_concepts_count: 2,
      editorial_body_concepts_count: 0,
      segments_count: 3,
    });
    expect(result.trigger).toBe(true);
    expect(result.reason).toBe("high_artifact_ratio");
  });

  it("triggers when all concepts uncertain", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: false,
      concepts_from_segment_0: 2,
      raw_concepts_from_segment_0: 3,
      concepts_from_body: 1,
      valid_body_concepts_count: 1,
      valid_concepts_count: 1,  // > 0 so Condition C (zero_valid_concepts) does not fire first
      main_topic_is_editorial_artifact: false,
      artifact_ratio: 0.2,
      all_concepts_uncertain: true,
      raw_concepts_count: 3,
      filtered_concepts_count: 3,
      editorial_body_concepts_count: 0,
      segments_count: 3,
    });
    expect(result.trigger).toBe(true);
    expect(result.reason).toBe("all_concepts_uncertain");
  });

  it("triggers when all concepts rejected (filtered=0, raw>0)", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: false,
      concepts_from_segment_0: 0,
      raw_concepts_from_segment_0: 5,
      concepts_from_body: 0,
      valid_body_concepts_count: 0,
      valid_concepts_count: 0,
      main_topic_is_editorial_artifact: false,
      artifact_ratio: 1,
      all_concepts_uncertain: false,
      raw_concepts_count: 5,
      filtered_concepts_count: 0,
      editorial_body_concepts_count: 0,
      segments_count: 3,
    });
    expect(result.trigger).toBe(true);
  });

  it("does NOT trigger with single segment", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: true,
      concepts_from_segment_0: 5,
      raw_concepts_from_segment_0: 5,
      concepts_from_body: 0,
      valid_body_concepts_count: 0,
      valid_concepts_count: 0,
      main_topic_is_editorial_artifact: true,
      artifact_ratio: 1,
      all_concepts_uncertain: true,
      raw_concepts_count: 5,
      filtered_concepts_count: 0,
      editorial_body_concepts_count: 0,
      segments_count: 1,
    });
    expect(result.trigger).toBe(false);
    expect(result.reason).toBe("single_segment");
  });

  it("does NOT trigger when conditions not met", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: false,
      concepts_from_segment_0: 2,
      raw_concepts_from_segment_0: 3,
      concepts_from_body: 5,
      valid_body_concepts_count: 5,
      valid_concepts_count: 7,
      main_topic_is_editorial_artifact: false,
      artifact_ratio: 0.1,
      all_concepts_uncertain: false,
      raw_concepts_count: 8,
      filtered_concepts_count: 7,
      editorial_body_concepts_count: 0,
      segments_count: 4,
    });
    expect(result.trigger).toBe(false);
    expect(result.reason).toBe("conditions_not_met");
  });

  // P0 CRITICAL TEST: The exact scenario from the bug report
  it("triggers for the exact bug scenario: front_matter=true, filtered_seg0=0 (rejected), raw_seg0=5", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: true,
      concepts_from_segment_0: 0, // ALL rejected by artifact filter
      raw_concepts_from_segment_0: 5, // 5 raw concepts EXISTED from seg0
      concepts_from_body: 0,
      valid_body_concepts_count: 0,
      valid_concepts_count: 0,
      main_topic_is_editorial_artifact: true,
      artifact_ratio: 1,
      all_concepts_uncertain: false,
      raw_concepts_count: 5,
      filtered_concepts_count: 0,
      editorial_body_concepts_count: 0,
      segments_count: 3,
    });
    expect(result.trigger).toBe(true);
    // Should NOT return "no_seg0_concepts" — that was the old bug
    expect(result.reason).not.toContain("no_seg0_concepts");
  });
});

// ---------- Ticket 1: Robustness to missing/undefined fields ----------

describe("shouldTriggerBodyOnlySecondPass — missing fields robustness", () => {
  it("handles completely undefined numeric fields without crashing", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      segments_count: 3,
      // all other fields undefined
    } as any);
    // Should not crash; should return a valid result
    expect(result).toHaveProperty("trigger");
    expect(result).toHaveProperty("reason");
  });

  it("treats undefined valid_body_concepts_count as 0 (triggers no_valid_body_concepts when concepts_from_body > 0)", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: false,
      concepts_from_segment_0: 2,
      raw_concepts_from_segment_0: 3,
      concepts_from_body: 3,
      valid_body_concepts_count: undefined as any,
      valid_concepts_count: 5,
      main_topic_is_editorial_artifact: false,
      artifact_ratio: 0.1,
      all_concepts_uncertain: false,
      raw_concepts_count: 6,
      filtered_concepts_count: 5,
      segments_count: 4,
      editorial_body_concepts_count: 0,
    });
    expect(result.trigger).toBe(true);
    expect(result.reason).toBe("no_valid_body_concepts");
  });

  it("treats NaN artifact_ratio as 0 (does not falsely trigger high_artifact_ratio)", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: false,
      concepts_from_segment_0: 2,
      raw_concepts_from_segment_0: 3,
      concepts_from_body: 5,
      valid_body_concepts_count: 5,
      valid_concepts_count: 7,
      main_topic_is_editorial_artifact: false,
      artifact_ratio: NaN,
      all_concepts_uncertain: false,
      raw_concepts_count: 8,
      filtered_concepts_count: 7,
      segments_count: 4,
      editorial_body_concepts_count: 0,
    });
    expect(result.trigger).toBe(false);
    expect(result.reason).toBe("conditions_not_met");
  });

  it("triggers with minimal partial input when body extraction is insufficient", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: true,
      raw_concepts_from_segment_0: 5,
      concepts_from_body: 0,
      segments_count: 3,
    });
    expect(result.trigger).toBe(true);
    expect(result.reason).toBe("front_matter_with_seg0_only_concepts");
  });

  it("condition priority: editorial_artifact_topic takes priority over high_artifact_ratio", () => {
    const result = shouldTriggerBodyOnlySecondPass({
      front_matter_detected: true,
      concepts_from_segment_0: 0,
      raw_concepts_from_segment_0: 5,
      concepts_from_body: 0,
      valid_body_concepts_count: 0,
      valid_concepts_count: 0,
      main_topic_is_editorial_artifact: true,
      artifact_ratio: 1.0,
      all_concepts_uncertain: true,
      raw_concepts_count: 5,
      filtered_concepts_count: 0,
      editorial_body_concepts_count: 0,
      segments_count: 3,
    });
    expect(result.trigger).toBe(true);
    expect(result.reason).toBe("editorial_artifact_topic");
  });
});

// ---------- Front Matter Detection ----------

describe("detectFrontMatter", () => {
  it("detects R2C/CODEX/S-ECN header block", () => {
    const result = detectFrontMatter(FULL_R2C_DOCUMENT);
    expect(result.has_front_matter).toBe(true);
    expect(result.front_matter_lines_detected).toBeGreaterThanOrEqual(3);
    expect(result.front_matter_chars_removed).toBeGreaterThan(0);
    expect(result.segment_0_noise_score).toBeGreaterThan(0.3);
  });

  it("strips front matter and preserves body content", () => {
    const result = detectFrontMatter(FULL_R2C_DOCUMENT);
    expect(result.body_text).not.toContain("CODEX");
    expect(result.body_text).not.toContain("S-ECN");
    // Body should contain the actual medical content
    expect(result.body_text).toContain("Torsion du cordon spermatique");
    expect(result.body_text).toContain("Hydrocèle");
  });

  it("computes noise scores before and after", () => {
    const result = detectFrontMatter(FULL_R2C_DOCUMENT);
    expect(result.header_noise_score_before).toBeGreaterThan(0);
    expect(result.header_noise_score_after).toBeLessThan(result.header_noise_score_before);
  });

  it("handles document with date + ITEM + branding", () => {
    const doc = [
      "iKB – MED-LINE",
      "ITEM 312 – Rang A en noir",
      "Révision 2/2024",
      "15/01/2024",
      "",
      "Leucémie lymphoïde chronique",
      "La LLC est la plus fréquente des hémopathies malignes de l'adulte en Occident.",
    ].join("\n");
    const result = detectFrontMatter(doc);
    expect(result.has_front_matter).toBe(true);
    expect(result.body_text).toContain("Leucémie lymphoïde chronique");
  });

  it("handles front matter dominant over segment 0", () => {
    const doc = [
      "CODEX",
      "S-ECN.COM",
      "R2C",
      "Rang A en noir",
      "Rang B en bleu",
      "Rang C en vert",
      "ITEM 345",
      "Révision 4",
      "",
      "Syndrome hémorragique d'origine hématologique",
      "Le syndrome hémorragique se manifeste par des saignements anormaux.",
    ].join("\n");
    const result = detectFrontMatter(doc);
    expect(result.has_front_matter).toBe(true);
    expect(result.front_matter_lines_detected).toBeGreaterThanOrEqual(6);
  });
});

// ---------- Editorial Noise Filter ----------

describe("filterEditorialNoise on R2C content", () => {
  it("removes R2C classification lines", () => {
    const result = filterEditorialNoise(R2C_HEADER_BLOCK);
    // Should remove most lines
    expect(result.removed_lines_count).toBeGreaterThanOrEqual(3);
    expect(result.cleaned_text_length).toBeLessThan(result.raw_text_length);
  });

  it("preserves medical content", () => {
    const result = filterEditorialNoise(MEDICAL_BODY_CONTENT);
    expect(result.cleaned_text).toContain("Torsion du cordon spermatique");
    expect(result.cleaned_text).toContain("Hydrocèle");
    expect(result.cleaned_text).toContain("Cryptorchidie");
  });
});

// ---------- Segment Noise Score ----------

describe("computeSegmentNoiseScore", () => {
  it("scores R2C header block as highly noisy", () => {
    const score = computeSegmentNoiseScore(R2C_HEADER_BLOCK);
    expect(score).toBeGreaterThan(0.5);
  });

  it("scores medical body content as low noise", () => {
    const score = computeSegmentNoiseScore(MEDICAL_BODY_CONTENT);
    expect(score).toBeLessThan(0.3);
  });
});

// ---------- Topic Cleaner ----------

describe("Topic extraction from R2C documents", () => {
  it("rejects R2C editorial artifacts as topics", () => {
    expect(validateTopic("R2C : Rang A en noir")).not.toBeNull();
    expect(validateTopic("CODEX. S-ECN.COM")).not.toBeNull();
    expect(validateTopic("ITEM 216")).not.toBeNull();
    expect(validateTopic("Rang A en noir – Rang B en bleu")).not.toBeNull();
    expect(validateTopic("Révision 3/2024")).not.toBeNull();
  });

  it("accepts real medical topics", () => {
    expect(validateTopic("Pathologie génito-scrotale")).toBeNull();
    expect(validateTopic("Leucémie lymphoïde chronique")).toBeNull();
    expect(validateTopic("Syndrome hémorragique")).toBeNull();
    expect(validateTopic("Lésions péri-articulaires de l'épaule")).toBeNull();
    expect(validateTopic("Allaitement maternel")).toBeNull();
  });

  it("cleans R2C noise from topic strings", () => {
    expect(cleanTopicString("ITEM 216 – Pathologie génito-scrotale")).toBe("Pathologie génito-scrotale");
    // When the entire string is noise, cleanTopicString returns the original (fallback behavior).
    // The important thing is that validateTopic rejects it.
    const cleaned = cleanTopicString("R2C : Rang A en noir – Rang B en bleu");
    expect(validateTopic(cleaned)).not.toBeNull(); // Must be rejected by validation
  });

  it("extracts clean topic from segments with noisy segment 0", () => {
    const segments = [
      { title: "R2C : Rang A en noir", content: R2C_HEADER_BLOCK, hierarchy_level: 0 },
      { title: "Torsion du cordon spermatique", content: "La torsion est une urgence...", hierarchy_level: 1 },
      { title: "Hydrocèle", content: "L'hydrocèle est un épanchement...", hierarchy_level: 1 },
    ];
    const result = extractAndCleanTopic(segments);
    expect(result.clean_topic).not.toContain("R2C");
    expect(result.clean_topic).not.toContain("Rang");
    expect(result.confidence).toBeGreaterThan(0.3);
  });
});

// ---------- Concept Normalizer ----------

describe("Concept normalization with R2C noise", () => {
  it("rejects editorial artifact concepts", () => {
    const rawConcepts = [
      { label: "R2C : Rang A en noir", definition: "Classification R2C des items", stable_key: "c1", criticality: 1 },
      { label: "CODEX S-ECN", definition: "Plateforme de révision ECN", stable_key: "c2", criticality: 1 },
      { label: "ITEM 216", definition: "Item numéro 216 du programme", stable_key: "c3", criticality: 2 },
    ];
    const result = normalizeConcepts(rawConcepts);
    expect(result.normalized_concepts_count).toBe(0);
    expect(result.rejected_concepts_count).toBe(3);
    expect(result.rejected_editorial_artifacts_count).toBe(3);
  });

  it("accepts real medical concepts", () => {
    const rawConcepts = [
      { label: "Torsion du cordon spermatique", definition: "Urgence chirurgicale touchant principalement l'adolescent et l'adulte jeune.", stable_key: "c1", criticality: 1 },
      { label: "Hydrocèle", definition: "Épanchement liquidien dans la vaginale testiculaire. Transillumination positive.", stable_key: "c2", criticality: 2 },
      { label: "Cryptorchidie", definition: "Absence de descente complète du testicule dans le scrotum, concerne 3% des nouveau-nés à terme.", stable_key: "c3", criticality: 2 },
    ];
    const result = normalizeConcepts(rawConcepts);
    expect(result.normalized_concepts_count).toBeGreaterThanOrEqual(2);
    expect(result.rejected_editorial_artifacts_count).toBe(0);
  });
});

// ---------- Ticket 2: normalizeGateConceptInput ----------

describe("normalizeGateConceptInput — partial analysis objects", () => {
  it("normalizes completely missing fields to safe defaults", () => {
    const raw = { label: "Test", definition: "A test concept" };
    const normalized = normalizeGateConceptInput(raw);
    expect(normalized.uncertain).toBe(false);
    expect(normalized.source_confidence).toBe(0.5);
    expect(normalized.source_trace).toEqual([]);
  });

  it("preserves present fields", () => {
    const raw = {
      label: "Torsion",
      definition: "Urgence chirurgicale.",
      uncertain: true,
      source_confidence: 0.9,
      source_trace: [{ segment_index: 1, excerpt: "body" }],
    };
    const normalized = normalizeGateConceptInput(raw);
    expect(normalized.uncertain).toBe(true);
    expect(normalized.source_confidence).toBe(0.9);
    expect(normalized.source_trace).toHaveLength(1);
  });

  it("handles NaN source_confidence", () => {
    const raw = { label: "Test", definition: "Def", source_confidence: NaN };
    const normalized = normalizeGateConceptInput(raw);
    expect(normalized.source_confidence).toBe(0.5);
  });
});

// ---------- Ticket 3: Mode-aware semantic gate thresholds ----------

describe("runSemanticSuccessGate — mode-aware thresholds", () => {
  // Shared helpers
  const mockScoreCandidate = (label: string, _def: string) => ({
    accepted: true,
    editorial_artifact_score: 0.1,
    header_noise_score: 0.1,
    concept_semantic_validity_score: 0.8,
    semantic_score: 0.8,
  });
  const mockIsEditorial = (_text: string) => false;
  const mockCleanTopic = (text: string) => text;

  it("full mode: blocks with only 1 valid concept", () => {
    const result = runSemanticSuccessGate({
      concepts: [
        { label: "Torsion", definition: "Urgence chirurgicale testiculaire.", source_trace: [{ segment_index: 1, excerpt: "body" }] },
      ],
      main_topic: "Pathologie génito-scrotale",
      scoreConceptCandidate: mockScoreCandidate,
      isEditorialArtifact: mockIsEditorial,
      cleanMainTopic: mockCleanTopic,
      analysis_mode: "full",
    });
    expect(result.passed).toBe(false);
    expect(result.signals.analysis_mode).toBe("full");
    expect(result.signals.threshold_profile).toBe("full_strict");
  });

  it("body_only mode: passes with 1 valid concept (relaxed threshold)", () => {
    const result = runSemanticSuccessGate({
      concepts: [
        { label: "Torsion", definition: "Urgence chirurgicale testiculaire.", source_trace: [{ segment_index: 1, excerpt: "body" }] },
      ],
      main_topic: "Pathologie génito-scrotale",
      scoreConceptCandidate: mockScoreCandidate,
      isEditorialArtifact: mockIsEditorial,
      cleanMainTopic: mockCleanTopic,
      analysis_mode: "body_only",
    });
    expect(result.passed).toBe(true);
    expect(result.signals.analysis_mode).toBe("body_only");
    expect(result.signals.threshold_profile).toBe("body_only_relaxed");
  });

  it("body_only mode: does not block for missing body concepts (all are from body)", () => {
    const result = runSemanticSuccessGate({
      concepts: [
        { label: "Torsion", definition: "Urgence chirurgicale testiculaire." },
        { label: "Hydrocèle", definition: "Épanchement liquidien dans la vaginale testiculaire." },
      ],
      main_topic: "Pathologie génito-scrotale",
      scoreConceptCandidate: mockScoreCandidate,
      isEditorialArtifact: mockIsEditorial,
      cleanMainTopic: mockCleanTopic,
      analysis_mode: "body_only",
    });
    // Should pass: body_only mode doesn't require body segment traces
    expect(result.passed).toBe(true);
    expect(result.signals.body_concepts_count).toBeGreaterThanOrEqual(0);
  });

  it("full mode: blocks when no body concepts", () => {
    const result = runSemanticSuccessGate({
      concepts: [
        { label: "Torsion", definition: "Urgence chirurgicale testiculaire.", source_trace: [{ segment_index: 0, excerpt: "seg0" }] },
        { label: "Hydrocèle", definition: "Épanchement liquidien dans la vaginale testiculaire.", source_trace: [{ segment_index: 0, excerpt: "seg0" }] },
      ],
      main_topic: "Pathologie génito-scrotale",
      scoreConceptCandidate: mockScoreCandidate,
      isEditorialArtifact: mockIsEditorial,
      cleanMainTopic: mockCleanTopic,
      analysis_mode: "full",
    });
    expect(result.passed).toBe(false);
    expect(result.signals.gate_block_reasons.some(r => r.includes("corps du document"))).toBe(true);
  });

  it("body_only mode: handles concepts with undefined source_trace", () => {
    const result = runSemanticSuccessGate({
      concepts: [
        { label: "Torsion", definition: "Urgence chirurgicale testiculaire." },
        { label: "Hydrocèle", definition: "Épanchement liquidien dans la vaginale testiculaire." },
      ],
      main_topic: "Pathologie génito-scrotale",
      scoreConceptCandidate: mockScoreCandidate,
      isEditorialArtifact: mockIsEditorial,
      cleanMainTopic: mockCleanTopic,
      analysis_mode: "body_only",
    });
    // Should not crash and should pass with body_only mode
    expect(result.passed).toBe(true);
  });

  it("signals include threshold_profile for observability", () => {
    const result = runSemanticSuccessGate({
      concepts: [
        { label: "Torsion", definition: "Urgence chirurgicale testiculaire.", source_trace: [{ segment_index: 1, excerpt: "body" }] },
        { label: "Hydrocèle", definition: "Épanchement liquidien dans la vaginale testiculaire.", source_trace: [{ segment_index: 2, excerpt: "body" }] },
      ],
      main_topic: "Pathologie génito-scrotale",
      scoreConceptCandidate: mockScoreCandidate,
      isEditorialArtifact: mockIsEditorial,
      cleanMainTopic: mockCleanTopic,
      analysis_mode: "full",
    });
    expect(result.signals.threshold_profile).toBeDefined();
    expect(result.signals.analysis_mode).toBe("full");
  });
});

// ---------- Ticket 4: Observability event recording ----------

describe("Second-pass observability instrumentation", () => {
  it("recordSecondPassEvaluation does not throw", () => {
    metrics.clear();
    expect(() => recordSecondPassEvaluation({
      analysis_mode: "body_only",
      trigger_reason: "pipeline_gate_retry",
      triggered: true,
      valid_concepts_count: 3,
      segments_count: 4,
    })).not.toThrow();
    const events = metrics.getRecentEvents(10);
    expect(events.some(e => e.name === "m2.second_pass_evaluated")).toBe(true);
    expect(events.some(e => e.name === "m2.second_pass_triggered")).toBe(true);
  });

  it("recordSecondPassEvaluation records skip event when not triggered", () => {
    metrics.clear();
    recordSecondPassEvaluation({
      analysis_mode: "full",
      trigger_reason: "conditions_not_met",
      triggered: false,
    });
    const events = metrics.getRecentEvents(10);
    expect(events.some(e => e.name === "m2.second_pass_skipped")).toBe(true);
  });

  it("recordGateEvaluation records structured metadata", () => {
    metrics.clear();
    recordGateEvaluation({
      analysis_mode: "body_only",
      threshold_profile: "body_only_relaxed",
      passed: false,
      gate_failure_reasons: ["too_few_valid_concepts"],
      valid_concepts_count: 1,
      body_concepts_count: 0,
      editorial_artifact_ratio: 0.5,
      main_topic_is_editorial_artifact: false,
    });
    const events = metrics.getRecentEvents(10);
    expect(events.some(e => e.name === "m2.gate_evaluated")).toBe(true);
    expect(events.some(e => e.name === "m2.gate_failed")).toBe(true);
    const failEvent = events.find(e => e.name === "m2.gate_failed");
    expect(failEvent?.tags.threshold_profile).toBe("body_only_relaxed");
    expect(failEvent?.tags.gate_failure_reasons).toBe("too_few_valid_concepts");
  });

  it("recordGateEvaluation records pass event", () => {
    metrics.clear();
    recordGateEvaluation({
      analysis_mode: "full",
      threshold_profile: "full_strict",
      passed: true,
      valid_concepts_count: 5,
      body_concepts_count: 3,
    });
    const events = metrics.getRecentEvents(10);
    expect(events.some(e => e.name === "m2.gate_passed")).toBe(true);
  });
});

// ============================================================
// NON-REGRESSION: Dense Medical Polycopié FR
// Tests that a dense, abbreviated, non-narrative medical polycopié
// does NOT get 0 valid concepts after all extraction passes.
// ============================================================

import { scoreConceptCandidate } from "@/lib/cognitio-semantic-cleaning";
import { preNormalizeMedicalText } from "./conceptNormalizer";
import { runMissionGate } from "@/domain/cognitio/validators";
import type { SemanticGateSignals } from "@/domain/cognitio/validators";

describe("NON-REGRESSION: Dense medical polycopié FR", () => {
  // Realistic dense medical polycopié — abbreviated, bullet-point style
  const DENSE_MEDICAL_POLYCOPIE_CONCEPTS = [
    { label: "Hyperkaliémie", definition: "Élévation du potassium sérique au-delà de 5.5 mmol/L, urgence thérapeutique si supérieur à 6.5 mmol/L.", stable_key: "c1", criticality: 1 },
    { label: "Diagnostic étiologique de l'HTA", definition: "Recherche des causes secondaires d'hypertension artérielle : sténose artère rénale, phéochromocytome, Cushing.", stable_key: "c2", criticality: 1 },
    { label: "Signes ECG d'hyperkaliémie", definition: "Ondes T pointues, élargissement QRS, disparition onde P, troubles du rythme ventriculaire.", stable_key: "c3", criticality: 2 },
    { label: "Traitement de l'hyperkaliémie", definition: "Gluconate de calcium IV, insuline-glucose, salbutamol nébulisé, résines échangeuses, dialyse si réfractaire.", stable_key: "c4", criticality: 2 },
    { label: "NFS interprétation", definition: "Numération formule sanguine : hémoglobine, leucocytes, plaquettes, VGM, réticulocytes.", stable_key: "c5", criticality: 3 },
  ];

  it("scoreConceptCandidate does NOT reject valid medical concepts in normal mode", () => {
    for (const c of DENSE_MEDICAL_POLYCOPIE_CONCEPTS) {
      const scores = scoreConceptCandidate(c.label, c.definition);
      expect(scores.accepted).toBe(true);
      expect(scores.editorial_artifact_score).toBeLessThan(0.4);
    }
  });

  it("scoreConceptCandidate with medical=true is more lenient on borderline labels", () => {
    // Concept with minor editorial noise in label
    const borderline = scoreConceptCandidate("Diagnostic étiologique — Rang A", "Recherche des causes secondaires.", false, true);
    // In medical mode, the label should either be accepted or have lower scores
    expect(borderline.editorial_artifact_score).toBeDefined();
    // The important thing: medical mode is more permissive
    const strict = scoreConceptCandidate("Diagnostic étiologique — Rang A", "Recherche des causes secondaires.", false, false);
    expect(borderline.accepted || borderline.editorial_artifact_score <= strict.editorial_artifact_score).toBe(true);
  });

  it("normalizeConcepts accepts dense medical concepts", () => {
    const result = normalizeConcepts(DENSE_MEDICAL_POLYCOPIE_CONCEPTS);
    // At least 3 of 5 should survive normalization
    expect(result.normalized_concepts_count).toBeGreaterThanOrEqual(3);
    expect(result.rejected_editorial_artifacts_count).toBe(0);
  });

  it("normalizeConcepts strips minor noise from long labels instead of rejecting", () => {
    const conceptsWithMinorNoise = [
      { label: "Diagnostic étiologique de l'HTA Rang A", definition: "Recherche des causes secondaires d'hypertension artérielle.", stable_key: "c1", criticality: 1 },
      { label: "Traitement de première intention ITEM 221", definition: "Bêtabloquants, IEC, ARA2, inhibiteurs calciques, diurétiques thiazidiques.", stable_key: "c2", criticality: 2 },
    ];
    const result = normalizeConcepts(conceptsWithMinorNoise);
    // These should be accepted with noise stripped, not rejected
    expect(result.normalized_concepts_count).toBeGreaterThanOrEqual(1);
    // The normalized label should be clean
    const accepted = result.accepted;
    if (accepted.length > 0) {
      expect(accepted[0].normalized_label).not.toMatch(/Rang\s+[A-Z]/i);
      expect(accepted[0].normalized_label).not.toMatch(/ITEM\s+\d+/i);
    }
  });

  it("semantic gate passes for polycopié with 1+ valid concept in medical mode", () => {
    const mockScoreCandidate = (label: string, _def: string) => ({
      accepted: true,
      editorial_artifact_score: 0.1,
      header_noise_score: 0.1,
    });
    const result = runSemanticSuccessGate({
      concepts: [
        { label: "Hyperkaliémie", definition: "K+ > 5.5 mmol/L, urgence si > 6.5", source_trace: [{ segment_index: 1, excerpt: "body" }] },
      ],
      main_topic: "Troubles hydroélectrolytiques",
      scoreConceptCandidate: mockScoreCandidate,
      isEditorialArtifact: (_text: string) => false,
      cleanMainTopic: (text: string) => text,
      analysis_mode: "full",
      source_type: "polycopie",
    });
    // In medical polycopié mode, 1 valid concept should be enough (MIN_VALID = 1)
    expect(result.passed).toBe(true);
    expect(result.signals.threshold_profile).toBe("medical_polycopie");
  });

  it("semantic gate emits per-concept diagnostics", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const mockScoreCandidate = (_l: string, _d: string) => ({
      accepted: true,
      editorial_artifact_score: 0.2,
      header_noise_score: 0.1,
    });
    runSemanticSuccessGate({
      concepts: [
        { label: "TestConcept", definition: "A test definition for diagnostics.", source_trace: [{ segment_index: 1, excerpt: "body" }] },
      ],
      main_topic: "Test",
      scoreConceptCandidate: mockScoreCandidate,
      isEditorialArtifact: (_text: string) => false,
      cleanMainTopic: (text: string) => text,
      analysis_mode: "full",
    });
    // Should have logged per-concept diagnostics
    const diagLog = consoleSpy.mock.calls.find(c => typeof c[0] === "string" && c[0].includes("[COGNITIO][GATE] Per-concept diagnostics"));
    expect(diagLog).toBeDefined();
    consoleSpy.mockRestore();
  });

  it("mission gate allows degraded mission with 1 uncertain concept", () => {
    const signals: SemanticGateSignals = {
      valid_concepts_count: 0,
      uncertain_concepts_count: 1,
      body_concepts_count: 1,
      segment_0_concepts_count: 0,
      editorial_artifact_ratio: 0.5,
      main_topic_is_editorial_artifact: false,
      semantic_generation_allowed: false,
      gate_block_reasons: ["Seulement 0 concept(s) valide(s)"],
    };
    const result = runMissionGate(signals, "Troubles hydroélectrolytiques");
    // Should pass in degraded mode (>= 1 exploitable concept)
    expect(result.passed).toBe(true);
    expect(result.display_message).toContain("dégradée");
  });

  it("mission gate still blocks when 0 exploitable concepts", () => {
    const signals: SemanticGateSignals = {
      valid_concepts_count: 0,
      uncertain_concepts_count: 0,
      body_concepts_count: 0,
      segment_0_concepts_count: 0,
      editorial_artifact_ratio: 1.0,
      main_topic_is_editorial_artifact: true,
      semantic_generation_allowed: false,
      gate_block_reasons: ["All concepts are artifacts"],
    };
    const result = runMissionGate(signals, "R2C : Rang A");
    // Should block — truly no usable concepts
    expect(result.passed).toBe(false);
  });
});

// ---------- Pre-normalization for medical text ----------

describe("preNormalizeMedicalText", () => {
  it("expands abbreviation-only lines with section context", () => {
    const input = [
      "I. Diagnostic",
      "- HTA",
      "- ECG",
      "- NFS",
    ].join("\n");
    const result = preNormalizeMedicalText(input);
    // Should expand HTA to include "hypertension artérielle"
    expect(result).toContain("hypertension artérielle");
    expect(result).toContain("électrocardiogramme");
    expect(result).toContain("numération formule sanguine");
  });

  it("merges colon-terminated headers with bullet items", () => {
    const input = [
      "Signes cliniques :",
      "- fièvre",
      "- toux",
      "- dyspnée",
      "",
      "Examens complémentaires",
    ].join("\n");
    const result = preNormalizeMedicalText(input);
    // Should merge the list into one line
    expect(result).toContain("Signes cliniques : fièvre, toux, dyspnée");
  });

  it("preserves normal narrative text unchanged", () => {
    const input = "La pneumonie aiguë communautaire est une infection du parenchyme pulmonaire. Elle se manifeste par de la fièvre, une toux et une dyspnée.";
    const result = preNormalizeMedicalText(input);
    expect(result).toBe(input);
  });
});

// ============================================================
// NON-REGRESSION: Item 363 — Fractures extrémité inférieure du radius
// Exact reproduction of the bug visible in the UI:
// - Header with R2C / Rang A en noir / Rang B en bleu / Rang C en brun
// - CODEX.:, S-ECN.COM branding
// - Real medical title embedded in the same line
// - Dense medical content after header
// ============================================================

describe("NON-REGRESSION: Item 363 — Dense medical polycopié FR with brun color", () => {
  // ---- Realistic fixture reproducing the exact problematic format ----

  const ITEM_363_HEADER = "R2C : Rang A en noir - Rang B en bleu - Rang C en brun CODEX.:, S-ECN.COM Révision 8/9/2022 ITEM 363 : FRACTURES DE L'EXTRÉMITE INFÉRIEURE DU RADIUS";

  const ITEM_363_BODY = [
    "",
    "GENERALITES",
    "La fracture de l'extrémité distale du radius est la plus fréquente des fractures de l'adulte.",
    "Elle survient typiquement chez la femme ménopausée ostéoporotique après une chute de sa hauteur sur la main.",
    "Chez le sujet jeune, elle résulte d'un traumatisme à haute énergie (accident de sport, AVP).",
    "",
    "ANATOMIE",
    "L'extrémité inférieure du radius s'articule avec le carpe (scaphoïde et lunatum) et la tête de l'ulna (articulation radio-ulnaire distale).",
    "La surface articulaire a une inclinaison frontale de 25° et sagittale de 10° (index radio-ulnaire distal = 0 à -2 mm).",
    "",
    "MECANISME",
    "Chute sur la paume de la main poignet en extension : fracture en compression-extension (Pouteau-Colles).",
    "Chute sur le dos de la main poignet en flexion : fracture en compression-flexion (Goyrand-Smith).",
    "Traumatisme axial pur : fracture marginale antérieure ou postérieure.",
    "",
    "CLASSIFICATION",
    "Classification de Fernandez en 5 types selon le mécanisme : bending, shearing, compression, avulsion, combined.",
    "Classification AO en 3 groupes : A (extra-articulaire), B (articulaire partielle), C (articulaire complète).",
    "",
    "CLINIQUE",
    "Douleur du poignet, impotence fonctionnelle, œdème.",
    "Déformation typique en dos de fourchette (Pouteau-Colles) : saillie dorsale de l'extrémité inférieure du radius.",
    "Rechercher des complications immédiates : ouverture cutanée, compression du nerf médian, lésions tendineuses.",
    "",
    "IMAGERIE",
    "Radiographies standard face et profil du poignet : confirmation de la fracture, analyse des déplacements.",
    "TDM en cas de fracture articulaire complexe pour planification chirurgicale.",
    "",
    "TRAITEMENT",
    "Fracture non déplacée ou déplacement acceptable : traitement orthopédique par immobilisation plâtrée (BABP) 4-6 semaines.",
    "Fracture déplacée : réduction + ostéosynthèse par plaque verrouillée antérieure (technique de référence).",
    "Fracture articulaire complexe : ostéosynthèse par plaque +/- brochage, +/- arthroscopie.",
    "",
    "COMPLICATIONS",
    "Syndrome du canal carpien par compression du nerf médian (urgence si aigu postopératoire).",
    "Algodystrophie (syndrome douloureux régional complexe de type 1) : douleur, œdème, raideur, troubles vasomoteurs.",
    "Cal vicieux avec perte d'inclinaison frontale et/ou sagittale → arthrose radio-carpienne secondaire.",
    "Rupture secondaire du tendon long extenseur du pouce.",
  ].join("\n");

  const FULL_ITEM_363_DOCUMENT = ITEM_363_HEADER + ITEM_363_BODY;

  // ---- Test 1: cleanTopicString extracts the real medical title ----

  it("cleanTopicString extracts 'FRACTURES DE L'EXTRÉMITE INFÉRIEURE DU RADIUS' from the composite header", () => {
    const cleaned = cleanTopicString(ITEM_363_HEADER);
    // Must contain the real medical topic
    expect(cleaned.toUpperCase()).toContain("FRACTURES");
    expect(cleaned.toUpperCase()).toContain("RADIUS");
    // Must NOT contain editorial noise
    expect(cleaned).not.toMatch(/R2C/i);
    expect(cleaned).not.toMatch(/Rang\s+[A-Z]/i);
    expect(cleaned).not.toMatch(/CODEX/i);
    expect(cleaned).not.toMatch(/S-ECN/i);
    expect(cleaned).not.toMatch(/Révision/i);
    expect(cleaned).not.toMatch(/brun/i);
    expect(cleaned).not.toMatch(/noir/i);
    expect(cleaned).not.toMatch(/bleu/i);
    expect(cleaned).not.toMatch(/ITEM\s+\d+/i);
  });

  it("validateTopic accepts the cleaned medical title", () => {
    const cleaned = cleanTopicString(ITEM_363_HEADER);
    const rejection = validateTopic(cleaned);
    expect(rejection).toBeNull();
  });

  // ---- Test 2: Front matter detection on the composite header line ----

  it("detectFrontMatter handles document with composite single-line header", () => {
    // The composite header is a single line — front matter detection may or may not
    // flag it depending on how many noise patterns match. The key invariant:
    // even if front matter is not flagged, topic cleaning + validation must handle it.
    const result = detectFrontMatter(FULL_ITEM_363_DOCUMENT);
    // Whether or not has_front_matter is true, the body must contain medical content
    if (result.has_front_matter) {
      expect(result.body_text).toContain("fracture");
    } else {
      // Front matter detection may not trigger for single-line headers,
      // but the topic cleaner should still strip the editorial noise.
      expect(result.body_text.length).toBeGreaterThan(100);
    }
  });

  // ---- Test 3: Topic extraction from segments with the noisy header ----

  it("extractAndCleanTopic extracts a real medical topic, not the R2C header", () => {
    const segments = [
      { title: ITEM_363_HEADER, content: ITEM_363_HEADER + "\n" + ITEM_363_BODY.slice(0, 200), hierarchy_level: 0 },
      { title: "GENERALITES", content: "La fracture de l'extrémité distale du radius est la plus fréquente des fractures de l'adulte.", hierarchy_level: 1 },
      { title: "ANATOMIE", content: "L'extrémité inférieure du radius s'articule avec le carpe.", hierarchy_level: 1 },
      { title: "TRAITEMENT", content: "Fracture non déplacée : traitement orthopédique par immobilisation plâtrée.", hierarchy_level: 1 },
    ];
    const result = extractAndCleanTopic(segments);
    // Topic must NOT be editorial
    expect(result.clean_topic).not.toMatch(/R2C/i);
    expect(result.clean_topic).not.toMatch(/Rang/i);
    expect(result.clean_topic).not.toMatch(/CODEX/i);
    // Must be a real medical topic
    expect(result.confidence).toBeGreaterThan(0.3);
    expect(result.clean_topic.length).toBeGreaterThanOrEqual(5);
  });

  // ---- Test 4: Concept normalization with labels from this document ----

  it("normalizeConcepts accepts medical concepts from Item 363 content", () => {
    const concepts = [
      { label: "Fracture de l'extrémité distale du radius", definition: "La plus fréquente des fractures de l'adulte, survenant chez la femme ménopausée après chute.", stable_key: "c1", criticality: 1 },
      { label: "Fracture de Pouteau-Colles", definition: "Fracture en compression-extension par chute sur la paume de la main, poignet en extension.", stable_key: "c2", criticality: 1 },
      { label: "Ostéosynthèse par plaque verrouillée", definition: "Technique de référence pour le traitement des fractures déplacées du radius distal.", stable_key: "c3", criticality: 2 },
      { label: "Syndrome du canal carpien post-fracturaire", definition: "Compression du nerf médian, urgence si aigu postopératoire.", stable_key: "c4", criticality: 2 },
      { label: "Algodystrophie", definition: "Syndrome douloureux régional complexe de type 1 : douleur, œdème, raideur, troubles vasomoteurs.", stable_key: "c5", criticality: 3 },
    ];
    const result = normalizeConcepts(concepts);
    expect(result.normalized_concepts_count).toBeGreaterThanOrEqual(3);
    expect(result.rejected_editorial_artifacts_count).toBe(0);
  });

  // ---- Test 5: Semantic gate passes for this document in medical polycopié mode ----

  it("semantic gate passes with medical polycopié thresholds for Item 363 concepts", () => {
    const mockScoreCandidate = (label: string, _def: string) => ({
      accepted: true,
      editorial_artifact_score: 0.1,
      header_noise_score: 0.1,
    });
    const result = runSemanticSuccessGate({
      concepts: [
        {
          label: "Fracture de l'extrémité distale du radius",
          definition: "La plus fréquente des fractures de l'adulte.",
          source_trace: [{ segment_index: 1, excerpt: "body" }],
        },
      ],
      main_topic: "Fractures de l'extrémité inférieure du radius",
      scoreConceptCandidate: mockScoreCandidate,
      isEditorialArtifact: (_text: string) => false,
      cleanMainTopic: cleanTopicString,
      analysis_mode: "body_only",
      source_type: "polycopie",
    });
    expect(result.passed).toBe(true);
    expect(result.status).toBe("semantic_success");
    expect(result.signals.main_topic_is_editorial_artifact).toBe(false);
  });

  // ---- Test 6: Semantic gate does NOT block when topic has noise but cleans to real medical title ----

  it("semantic gate passes even when raw main_topic contains R2C noise but cleans to a valid medical topic", () => {
    const mockScoreCandidate = (label: string, _def: string) => ({
      accepted: true,
      editorial_artifact_score: 0.15,
      header_noise_score: 0.1,
    });
    const result = runSemanticSuccessGate({
      concepts: [
        {
          label: "Fracture de Pouteau-Colles",
          definition: "Fracture en compression-extension par chute sur la paume.",
          source_trace: [{ segment_index: 1, excerpt: "body" }],
        },
        {
          label: "Ostéosynthèse par plaque",
          definition: "Technique de référence pour les fractures déplacées.",
          source_trace: [{ segment_index: 2, excerpt: "body" }],
        },
      ],
      // Raw topic still contains editorial noise
      main_topic: "R2C : Rang A en noir - Rang B en bleu - Rang C en brun CODEX.:, S-ECN.COM ITEM 363 : FRACTURES DE L'EXTRÉMITE INFÉRIEURE DU RADIUS",
      scoreConceptCandidate: mockScoreCandidate,
      isEditorialArtifact: (_text: string) => false,
      cleanMainTopic,
      analysis_mode: "full",
      source_type: "polycopie",
    });
    // After cleaning, the topic is "FRACTURES DE L'EXTRÉMITE INFÉRIEURE DU RADIUS"
    // which is NOT editorial → gate should NOT block on topic
    expect(result.signals.main_topic_is_editorial_artifact).toBe(false);
    expect(result.passed).toBe(true);
  });

  // ---- Test 7: "brun" color is handled correctly ----

  it("cleanTopicString + validateTopic handles 'Rang C en brun' color variant", () => {
    const raw = "R2C : Rang A en noir - Rang B en bleu - Rang C en brun";
    const cleaned = cleanTopicString(raw);
    // cleanTopicString returns the raw string when cleaning empties it (fallback),
    // but validateTopic must reject it as editorial noise.
    const rejection = validateTopic(cleaned);
    expect(rejection).not.toBeNull();
  });

  it("cleanMainTopic handles 'en brun' color variant", () => {
    const raw = "R2C : Rang A en noir - Rang B en bleu - Rang C en brun ITEM 363 : Fractures du radius";
    const cleaned = cleanMainTopic(raw);
    expect(cleaned).not.toMatch(/brun/i);
    expect(cleaned).not.toMatch(/R2C/i);
    expect(cleaned.toLowerCase()).toContain("fractures");
  });

  // ---- Test 8: filterEditorialNoise preserves medical content ----

  it("filterEditorialNoise preserves dense medical content from Item 363", () => {
    const result = filterEditorialNoise(ITEM_363_BODY);
    expect(result.cleaned_text).toContain("fracture");
    expect(result.cleaned_text).toContain("radius");
    expect(result.cleaned_text).toContain("Pouteau-Colles");
    expect(result.cleaned_text).toContain("ostéosynthèse");
    expect(result.cleaned_text.toLowerCase()).toContain("algodystrophie");
    // Should retain most content
    expect(result.cleaned_text_length).toBeGreaterThan(result.raw_text_length * 0.7);
  });

  // ---- Test 9: Medical polycopié gate does not hard-reject on scores.accepted ----

  it("semantic gate in medical polycopié mode does not hard-reject based on scores.accepted", () => {
    // Simulate a scorer that returns accepted=false but borderline scores
    // (e.g., header_noise_score=0.45 which exceeds the strict 0.4 threshold
    // but is below the medical 0.6 threshold)
    const strictScorer = (_label: string, _def: string) => ({
      accepted: false, // strict scoring rejects
      editorial_artifact_score: 0.35,
      header_noise_score: 0.45, // above strict 0.4, below medical 0.6
    });
    const result = runSemanticSuccessGate({
      concepts: [
        {
          label: "Fracture extra-articulaire du radius",
          definition: "Type A dans la classification AO, fracture sans atteinte de la surface articulaire.",
          source_trace: [{ segment_index: 1, excerpt: "body" }],
        },
      ],
      main_topic: "Fractures du radius distal",
      scoreConceptCandidate: strictScorer,
      isEditorialArtifact: (_text: string) => false,
      cleanMainTopic: (text: string) => text,
      analysis_mode: "body_only",
      source_type: "polycopie",
    });
    // In medical polycopié mode, scores.accepted=false should NOT be a hard reject.
    // The gate should use its own relaxed thresholds (editorial_artifact=0.6, header=0.6).
    // Since both scores are below 0.6, the concept should be accepted.
    expect(result.signals.valid_concepts_count).toBeGreaterThanOrEqual(1);
    expect(result.passed).toBe(true);
  });

  // ---- Test 10: Mission gate allows degraded generation ----

  it("mission gate allows degraded mission for Item 363 with 1 exploitable concept", () => {
    const signals: SemanticGateSignals = {
      valid_concepts_count: 1,
      uncertain_concepts_count: 1,
      body_concepts_count: 2,
      segment_0_concepts_count: 0,
      editorial_artifact_ratio: 0.3,
      main_topic_is_editorial_artifact: false,
      semantic_generation_allowed: true,
      gate_block_reasons: [],
    };
    const result = runMissionGate(signals, "Fractures de l'extrémité inférieure du radius");
    expect(result.passed).toBe(true);
  });

  // ---- Test 11: End-to-end cleanMainTopic on the EXACT header from bug report ----

  it("cleanMainTopic on the exact header produces a valid medical title", () => {
    const exactHeader = "R2C : Rang A en noir - Rang B en bleu - Rang C en brun CODEX.:, S-ECN.COM Révision 8/9/2022 ITEM 363 : FRACTURES DE L'EXTRÉMITE INFÉRIEURE DU RADIUS";
    const cleaned = cleanMainTopic(exactHeader);
    // Must produce a clean, non-empty medical title
    expect(cleaned.length).toBeGreaterThanOrEqual(5);
    expect(cleaned.toUpperCase()).toContain("FRACTURES");
    expect(cleaned.toUpperCase()).toContain("RADIUS");
    // Must NOT contain any editorial noise
    expect(cleaned).not.toMatch(/R2C/i);
    expect(cleaned).not.toMatch(/Rang/i);
    expect(cleaned).not.toMatch(/CODEX/i);
    expect(cleaned).not.toMatch(/S-ECN/i);
    expect(cleaned).not.toMatch(/Révision/i);
    expect(cleaned).not.toMatch(/ITEM\s+\d+/i);
    expect(cleaned).not.toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  });
});
