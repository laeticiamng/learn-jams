import { describe, it, expect } from "vitest";
import { shouldTriggerBodyOnlySecondPass } from "./analysis.service";
import { detectFrontMatter, filterEditorialNoise, computeSegmentNoiseScore } from "./editorialNoiseFilter";
import { extractAndCleanTopic, validateTopic, cleanTopicString } from "./topicCleaner";
import { normalizeConcepts } from "./conceptNormalizer";

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
