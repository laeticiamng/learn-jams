// ============================================================
// COGNITIO Dynamic Sheet Service — M5-A Generator
// Generates "fiche_dynamique" from M2 + M3 + M4 outputs
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { M5_Input, M5_Output } from "@/domain/cognitio/generation.contracts";
import type {
  ContentBlock,
  FinalTestItem,
  SourceDisclaimer,
  DynamicSheetMetadata,
  InternalSummary,
  ContentBlockType,
  BloomNumeric,
  QualityFlag,
} from "@/domain/cognitio/generation.types";
import type { AnalyzedConcept, AnalyzedConfusionPair } from "@/domain/cognitio/contracts";
import type { M3_Segment } from "@/domain/cognitio/memory.types";
import { computeCoverage, findMissingCritical } from "@/lib/cognitio-coverage";
import { validateM5Input, validateM5Output } from "@/domain/cognitio/generation.validators";
import {
  computeAdaptation,
  DEFAULT_LEARNER_PROFILE,
  getContractPhrasing,
  getHookPhrasing,
  getSegmentTransition,
  getRecallPromptStyle,
  getDefinitionIntro,
} from "@/domain/cognitio/learner-profile.types";
import type { AudienceAdaptation } from "@/domain/cognitio/learner-profile.types";

// ---------- Edge Function Call ----------

export async function runDynamicSheetGeneration(input: M5_Input): Promise<M5_Output> {
  try {
    const { data, error } = await supabase.functions.invoke("cognitio-generate-dynamic-sheet", {
      body: input,
    });
    if (error) throw error;
    return data as M5_Output;
  } catch {
    return generateDynamicSheetLocally(input);
  }
}

// ---------- Local Generator ----------

export function generateDynamicSheetLocally(input: M5_Input): M5_Output {
  // Validate input
  const inputValidation = validateM5Input(input);
  if (!inputValidation.valid) {
    throw new Error(`Invalid M5 input: ${inputValidation.errors.map(e => e.message).join(", ")}`);
  }

  const { m2_output, m3_output, m4_output, source_document, user_objective } = input;
  const transformationId = crypto.randomUUID();

  // Compute audience adaptation
  const profile = input.learner_profile ?? DEFAULT_LEARNER_PROFILE;
  const adaptation = computeAdaptation(profile);

  const concepts = m2_output.key_concepts;
  const criticalConcepts = concepts.filter(c => c.criticality === 1);
  const majorConcepts = concepts.filter(c => c.criticality === 2);
  const confusionPairs = m2_output.confusion_pairs;
  const segments = m3_output.segments;

  // Build all content blocks following the 8 mandatory temps
  const blocks: ContentBlock[] = [];
  let position = 0;

  // 1. CONTRACT
  blocks.push(buildContractBlock(m3_output, m4_output, concepts, position++, adaptation));

  // 2. HOOK
  blocks.push(buildHookBlock(m2_output.main_topic, criticalConcepts, user_objective, position++, adaptation));

  // 3. ANCHOR MAP
  blocks.push(buildAnchorMapBlock(segments, concepts, position++));

  // 4. PEDAGOGICAL BLOCKS (one per segment)
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segConcepts = concepts.filter(c => seg.concept_keys.includes(c.stable_key));
    const segConfusions = confusionPairs.filter(
      p => seg.concept_keys.includes(p.concept_a_key) || seg.concept_keys.includes(p.concept_b_key)
    );

    blocks.push(buildPedagogicalBlock(seg, segConcepts, segConfusions, m3_output, i, position++, adaptation));

    // 5. REACTIVATION after every pedagogical block (if concepts warrant it)
    if (segConcepts.length > 0 && i < segments.length - 1) {
      blocks.push(buildReactivationBlock(segConcepts, i, position++, adaptation));
    }
  }

  // Ensure at least one reactivation exists
  const hasReactivation = blocks.some(b => b.type === "reactivation");
  if (!hasReactivation && concepts.length > 0) {
    blocks.push(buildReactivationBlock(concepts.slice(0, 3), 0, position++, adaptation));
  }

  // 6. CLARITY PEAK
  blocks.push(buildClarityPeakBlock(concepts, criticalConcepts, m2_output.main_topic, position++));

  // 7. CONSOLIDATION
  blocks.push(buildConsolidationBlock(criticalConcepts, confusionPairs, m3_output, position++));

  // 8. FINAL TEST (block marker)
  const finalTestItems = buildFinalTest(concepts, confusionPairs, adaptation);
  blocks.push({
    block_id: crypto.randomUUID(),
    type: "final_test",
    title: "Test final",
    content: `${finalTestItems.length} questions couvrant ${new Set(finalTestItems.map(q => q.bloom_level)).size} niveaux cognitifs.`,
    concepts_covered: [...new Set(finalTestItems.flatMap(q => q.concepts_tested))],
    visual_anchor: null,
    contrast_box: null,
    mnemonic: null,
    recall_event: null,
    position: position++,
  });

  // DISCLAIMER block if uncertain concepts
  const uncertainConcepts = concepts.filter(c => c.uncertain).map(c => c.stable_key);
  const ambiguities = m2_output.confidence.ambiguous_zones?.map(z => z.zone_label) ?? [];

  const sourceDisclaimer: SourceDisclaimer = {
    confidence_level: source_document.confidence_level,
    uncertain_concepts: uncertainConcepts,
    contradictions: [],
    ambiguities,
  };

  if (uncertainConcepts.length > 0 || ambiguities.length > 0) {
    blocks.push({
      block_id: crypto.randomUUID(),
      type: "disclaimer",
      title: "Avertissement source",
      content: buildDisclaimerText(sourceDisclaimer),
      concepts_covered: uncertainConcepts,
      visual_anchor: null,
      contrast_box: null,
      mnemonic: null,
      recall_event: null,
      position: position++,
    });
  }

  // Compute coverage
  const coverage = computeCoverage(concepts, blocks);
  const missingCritical = findMissingCritical(concepts, blocks);

  // Quality flags
  const qualityFlags: QualityFlag[] = [];
  if (missingCritical.length === 0) qualityFlags.push("full_critical_coverage");
  else qualityFlags.push("missing_critical_coverage");
  if (uncertainConcepts.length > 0) qualityFlags.push("uncertain_concepts_present");

  const recallCount = blocks.filter(b => b.recall_event !== null).length;
  const totalWords = blocks.reduce((s, b) => s + b.content.split(/\s+/).length, 0);
  if (recallCount < Math.max(1, Math.floor(totalWords / 500))) {
    qualityFlags.push("low_recall_density");
  }

  const bloomSet = new Set(finalTestItems.map(q => q.bloom_level));
  if (bloomSet.size < 3) qualityFlags.push("insufficient_bloom_diversity");

  // Build metadata
  const metadata: DynamicSheetMetadata = {
    document_id: source_document.document_id,
    course_profile_id: m3_output.course_profile_id,
    memory_architecture_id: m3_output.architecture_id,
    format_decision_id: m4_output.decision_id,
    estimated_duration_sec: m4_output.estimated_duration_sec,
    quality_flags: qualityFlags,
    coverage,
  };

  // Build internal summary
  const internalSummary: InternalSummary = {
    learning_objective: m2_output.learning_objectives[0] ?? m2_output.main_topic,
    dominant_knowledge_type: {
      dominant: m2_output.reasoning_type,
      distribution: {
        declaratif: m2_output.reasoning_type === "declaratif" ? 1 : 0,
        procedural: m2_output.reasoning_type === "procedural" ? 1 : 0,
        conditionnel: m2_output.reasoning_type === "conditionnel" ? 1 : 0,
        causal: m2_output.reasoning_type === "causal" ? 1 : 0,
        metacognitif: m2_output.reasoning_type === "metacognitif" ? 1 : 0,
      },
    },
    critical_concepts: criticalConcepts.map(c => c.stable_key),
    confusions: confusionPairs.map(p => `${p.concept_a_key} ↔ ${p.concept_b_key}`),
    cognitive_structure: `${segments.length} segments, ${concepts.length} concepts, densité ${m2_output.density}`,
    cognitive_budget: {
      segments: segments.length,
      max_new_elements: 5,
      total_duration_sec: m4_output.estimated_duration_sec,
    },
    pedagogical_format: "fiche_dynamique",
    reactivation_plan: m3_output.repetition_plan
      .filter(r => r.is_critical)
      .map(r => `${r.concept_key}: ${r.moments.join(", ")}`),
    active_recall_plan: blocks
      .filter(b => b.recall_event !== null)
      .map(b => b.recall_event!.prompt),
    mnemonics: m3_output.mnemonics.map(m => m.mnemonic),
  };

  return {
    transformation_id: transformationId,
    format: "fiche_dynamique",
    metadata,
    internal_summary: internalSummary,
    content_blocks: blocks,
    final_test: finalTestItems,
    source_disclaimer: sourceDisclaimer,
  };
}

// ============================================================
// Block Builders
// ============================================================

function buildContractBlock(
  m3: M5_Input["m3_output"],
  m4: M5_Input["m4_output"],
  concepts: AnalyzedConcept[],
  position: number,
  adaptation: AudienceAdaptation = { tone: "neutral_clear" } as AudienceAdaptation
): ContentBlock {
  const critical = concepts.filter(c => c.criticality === 1);
  const contract = m3.pedagogical_contract;
  const phrasing = getContractPhrasing(adaptation);

  const content = [
    phrasing.objective(contract.total_concepts, critical.length),
    phrasing.structure(contract.segment_count, Math.ceil(contract.estimated_duration_sec / 60)),
    phrasing.recall(),
  ].join("\n");

  return {
    block_id: crypto.randomUUID(),
    type: "contract",
    title: "Contrat pédagogique",
    content,
    concepts_covered: [],
    visual_anchor: null,
    contrast_box: null,
    mnemonic: null,
    recall_event: null,
    position,
  };
}

function buildHookBlock(
  mainTopic: string,
  criticalConcepts: AnalyzedConcept[],
  objective: string,
  position: number,
  adaptation: AudienceAdaptation = { tone: "neutral_clear" } as AudienceAdaptation
): ContentBlock {
  const objectiveLabel: Record<string, string> = {
    discovery: "découvrir",
    revision: "réviser",
    exam: "préparer un examen sur",
    consolidation: "consolider",
  };

  const hook = getHookPhrasing(
    adaptation,
    mainTopic,
    criticalConcepts.length > 0 ? criticalConcepts[0].label : undefined,
    objectiveLabel[objective]
  );

  return {
    block_id: crypto.randomUUID(),
    type: "hook",
    title: "Accroche",
    content: hook,
    concepts_covered: criticalConcepts.slice(0, 1).map(c => c.stable_key),
    visual_anchor: null,
    contrast_box: null,
    mnemonic: null,
    recall_event: null,
    position,
  };
}

function buildAnchorMapBlock(
  segments: M3_Segment[],
  concepts: AnalyzedConcept[],
  position: number
): ContentBlock {
  const mapLines = segments.map((seg, i) => {
    const labels = seg.concept_keys
      .map(k => concepts.find(c => c.stable_key === k)?.label ?? k)
      .slice(0, 5);
    return `Bloc ${i + 1} : ${labels.join(", ")}`;
  });

  const content = [
    `Ce cours se décompose en ${segments.length} bloc(s) :`,
    "",
    ...mapLines,
  ].join("\n");

  return {
    block_id: crypto.randomUUID(),
    type: "anchor_map",
    title: "Carte mentale du cours",
    content,
    concepts_covered: [],
    visual_anchor: null,
    contrast_box: null,
    mnemonic: null,
    recall_event: null,
    position,
  };
}

function buildPedagogicalBlock(
  segment: M3_Segment,
  segConcepts: AnalyzedConcept[],
  segConfusions: AnalyzedConfusionPair[],
  m3: M5_Input["m3_output"],
  segIndex: number,
  position: number,
  adaptation: AudienceAdaptation = { tone: "neutral_clear", vocabulary_level: "intermediate" } as AudienceAdaptation
): ContentBlock {
  // Build explanation from concept definitions
  const explanationLines: string[] = [];

  const transition = getSegmentTransition(adaptation, segIndex);
  if (transition) {
    explanationLines.push(transition);
  }

  const defIntro = getDefinitionIntro(adaptation);
  for (const c of segConcepts.slice(0, adaptation.max_new_elements_per_block)) {
    explanationLines.push(`**${c.label}** : ${defIntro} ${c.definition}`);
  }

  // Find visual anchor for first critical concept in segment
  const firstCritical = segConcepts.find(c => c.criticality === 1);
  const anchor = firstCritical
    ? m3.visual_anchors.find(a => a.concept_key === firstCritical.stable_key)
    : m3.visual_anchors.find(a => segConcepts.some(c => c.stable_key === a.concept_key));

  // Find mnemonic
  const mnemonic = m3.mnemonics.find(mn =>
    mn.concept_keys.some(k => segConcepts.some(c => c.stable_key === k))
  );

  // Find contrast
  const contrast = segConfusions.length > 0 ? segConfusions[0] : null;

  return {
    block_id: crypto.randomUUID(),
    type: "pedagogical",
    title: `Bloc ${segIndex + 1} — ${segConcepts[0]?.label ?? "Concepts"}`,
    content: explanationLines.join("\n\n"),
    concepts_covered: segConcepts.map(c => c.stable_key),
    visual_anchor: anchor ? {
      image_desc: anchor.content,
      verbal_formula: `Retenez : "${segConcepts[0]?.label}" est fondamental.`,
    } : (firstCritical ? {
      image_desc: `Visualisez "${firstCritical.label}" comme un pilier de ce bloc.`,
      verbal_formula: `"${firstCritical.label}" = ${firstCritical.definition.slice(0, 60)}.`,
    } : null),
    contrast_box: contrast ? {
      concept_a: contrast.concept_a_key,
      concept_b: contrast.concept_b_key,
      distinction_key: contrast.distinction_key,
    } : null,
    mnemonic: mnemonic ? {
      type: mnemonic.type === "acronym" ? "acronyme" : mnemonic.type === "story" ? "phrase" : mnemonic.type === "association" ? "pattern" : "image",
      content: mnemonic.mnemonic,
    } : null,
    recall_event: null,
    position,
  };
}

function buildReactivationBlock(
  segConcepts: AnalyzedConcept[],
  segIndex: number,
  position: number,
  adaptation: AudienceAdaptation = { test_question_style: "standard" } as AudienceAdaptation
): ContentBlock {
  const target = segConcepts[0];
  const prompts = getRecallPromptStyle(adaptation);

  if (!target) {
    const fallbackPrompt = adaptation.test_question_style === "guided"
      ? "Redis en une phrase ce que tu viens d'apprendre."
      : "Reformulez en une phrase ce que vous venez d'apprendre.";
    return {
      block_id: crypto.randomUUID(),
      type: "reactivation",
      title: "Rappel actif",
      content: fallbackPrompt,
      concepts_covered: [],
      visual_anchor: null,
      contrast_box: null,
      mnemonic: null,
      recall_event: {
        type: "reformulation",
        prompt: fallbackPrompt,
        expected_concepts: [],
        bloom_level: 2,
      },
      position,
    };
  }

  // Alternate recall types using adapted prompts
  const recallTypes: Array<{ type: "question" | "completion" | "distinction" | "reformulation" | "prediction"; promptFn: (c: AnalyzedConcept) => string; bloom: BloomNumeric }> = [
    { type: "question", promptFn: c => prompts.question(c.label), bloom: 1 },
    { type: "completion", promptFn: c => prompts.completion(c.label), bloom: 2 },
    { type: "reformulation", promptFn: c => prompts.reformulation(c.label), bloom: 2 },
    { type: "prediction", promptFn: c => prompts.prediction(c.label), bloom: 4 },
  ];

  const chosen = recallTypes[segIndex % recallTypes.length];

  return {
    block_id: crypto.randomUUID(),
    type: "reactivation",
    title: "Rappel actif",
    content: chosen.promptFn(target),
    concepts_covered: [target.stable_key],
    visual_anchor: null,
    contrast_box: null,
    mnemonic: null,
    recall_event: {
      type: chosen.type,
      prompt: chosen.promptFn(target),
      expected_concepts: [target.stable_key],
      bloom_level: chosen.bloom,
    },
    position,
  };
}

function buildClarityPeakBlock(
  concepts: AnalyzedConcept[],
  critical: AnalyzedConcept[],
  mainTopic: string,
  position: number
): ContentBlock {
  const lines: string[] = [
    `Vue d'ensemble : ${mainTopic}`,
    "",
  ];

  if (critical.length > 0) {
    lines.push(`Les ${critical.length} notion(s) fondamentale(s) :`);
    for (const c of critical) {
      lines.push(`• ${c.label} — ${c.definition.slice(0, 80)}`);
    }
  }

  lines.push("");
  lines.push(`Au total, ${concepts.length} concept(s) forment un ensemble cohérent autour de "${mainTopic}".`);

  return {
    block_id: crypto.randomUUID(),
    type: "clarity_peak",
    title: "Pic de clarté",
    content: lines.join("\n"),
    concepts_covered: critical.map(c => c.stable_key),
    visual_anchor: null,
    contrast_box: null,
    mnemonic: null,
    recall_event: null,
    position,
  };
}

function buildConsolidationBlock(
  critical: AnalyzedConcept[],
  confusions: AnalyzedConfusionPair[],
  m3: M5_Input["m3_output"],
  position: number
): ContentBlock {
  const lines: string[] = ["**Ce qu'il faut retenir :**", ""];

  for (const c of critical) {
    lines.push(`• ${c.label} : ${c.definition.slice(0, 100)}`);
  }

  if (confusions.length > 0) {
    lines.push("", "**Pièges à éviter :**", "");
    for (const p of confusions.slice(0, 3)) {
      lines.push(`• ${p.concept_a_key} ≠ ${p.concept_b_key} — ${p.distinction_key}`);
    }
  }

  const finalMnemonic = m3.mnemonics.length > 0 ? m3.mnemonics[0] : null;

  return {
    block_id: crypto.randomUUID(),
    type: "consolidation",
    title: "Consolidation finale",
    content: lines.join("\n"),
    concepts_covered: critical.map(c => c.stable_key),
    visual_anchor: null,
    contrast_box: null,
    mnemonic: finalMnemonic ? {
      type: finalMnemonic.type === "acronym" ? "acronyme" : "phrase",
      content: finalMnemonic.mnemonic,
    } : null,
    recall_event: null,
    position,
  };
}

function buildDisclaimerText(disclaimer: SourceDisclaimer): string {
  const lines: string[] = [];

  if (disclaimer.uncertain_concepts.length > 0) {
    lines.push(`⚠ ${disclaimer.uncertain_concepts.length} concept(s) incertain(s) : ${disclaimer.uncertain_concepts.join(", ")}`);
    lines.push("Ces notions n'ont pas pu être pleinement tracées dans le document source. Elles ne sont pas présentées comme des vérités établies.");
  }

  if (disclaimer.ambiguities.length > 0) {
    lines.push(`Zones ambiguës détectées : ${disclaimer.ambiguities.join(", ")}`);
  }

  lines.push(`Niveau de confiance global : ${Math.round(disclaimer.confidence_level * 100)}%`);

  return lines.join("\n\n");
}

// ============================================================
// Final Test Builder
// ============================================================

function buildFinalTest(
  concepts: AnalyzedConcept[],
  confusions: AnalyzedConfusionPair[],
  adaptation: AudienceAdaptation = { test_bloom_floor: 1, test_bloom_ceiling: 6, test_question_style: "standard" } as AudienceAdaptation
): FinalTestItem[] {
  const items: FinalTestItem[] = [];
  const critical = concepts.filter(c => c.criticality === 1);
  const others = concepts.filter(c => c.criticality > 1);

  // Bloom 1 — Remember: QCU for critical concepts
  for (const c of critical.slice(0, 2)) {
    items.push({
      id: crypto.randomUUID(),
      type: "qcu",
      prompt: `Quelle est la définition correcte de "${c.label}" ?`,
      choices: [
        c.definition.slice(0, 80),
        `${c.label} est un concept secondaire sans importance.`,
        `${c.label} n'est pas abordé dans ce cours.`,
      ],
      expected_answer: c.definition.slice(0, 80),
      concepts_tested: [c.stable_key],
      bloom_level: 1,
    });
  }

  // Bloom 2 — Understand: completion
  if (concepts.length > 0) {
    const c = concepts[0];
    items.push({
      id: crypto.randomUUID(),
      type: "completion",
      prompt: `Expliquez en une phrase le rôle de "${c.label}" dans le contexte de ce cours.`,
      choices: null,
      expected_answer: c.definition,
      concepts_tested: [c.stable_key],
      bloom_level: 2,
    });
  }

  // Bloom 3 — Apply: short answer
  if (concepts.length > 1) {
    const c = concepts[1];
    items.push({
      id: crypto.randomUUID(),
      type: "short_answer",
      prompt: `Donnez un exemple concret d'application de "${c.label}".`,
      choices: null,
      expected_answer: `Exemple lié à ${c.label}`,
      concepts_tested: [c.stable_key],
      bloom_level: 3,
    });
  }

  // Bloom 4 — Analyze: distinction
  if (confusions.length > 0) {
    const p = confusions[0];
    items.push({
      id: crypto.randomUUID(),
      type: "distinction",
      prompt: `Quelle est la différence fondamentale entre "${p.concept_a_key}" et "${p.concept_b_key}" ?`,
      choices: null,
      expected_answer: p.distinction_key,
      concepts_tested: [p.concept_a_key, p.concept_b_key],
      bloom_level: 4,
    });
  }

  // Bloom 5 — Evaluate: ordering (only if profile ceiling allows)
  if (critical.length >= 2 && adaptation.test_bloom_ceiling >= 5) {
    items.push({
      id: crypto.randomUUID(),
      type: "ordering",
      prompt: adaptation.test_question_style === "guided"
        ? "Range ces notions de la plus importante à la moins importante :"
        : "Classez ces concepts par ordre d'importance dans le cours :",
      choices: critical.slice(0, 4).map(c => c.label),
      expected_answer: critical.slice(0, 4).map(c => c.label),
      concepts_tested: critical.slice(0, 4).map(c => c.stable_key),
      bloom_level: 5,
    });
  }

  // Bloom 6 — Create (if enough concepts and profile ceiling allows)
  if (concepts.length >= 3 && adaptation.test_bloom_ceiling >= 6) {
    items.push({
      id: crypto.randomUUID(),
      type: "short_answer",
      prompt: adaptation.test_question_style === "guided"
        ? "Fais un petit résumé qui relie les notions principales entre elles."
        : adaptation.test_question_style === "challenging"
          ? "Proposez une synthèse critique reliant les concepts clés et leurs implications."
          : "Proposez une synthèse personnelle reliant les concepts clés de ce cours.",
      choices: null,
      expected_answer: "Synthèse cohérente reliant les concepts",
      concepts_tested: critical.map(c => c.stable_key),
      bloom_level: 6,
    });
  }

  // Pad to minimum 3 if needed
  while (items.length < 3 && concepts.length > 0) {
    const c = concepts[items.length % concepts.length];
    items.push({
      id: crypto.randomUUID(),
      type: "qcu",
      prompt: `"${c.label}" est un concept central de ce cours. Vrai ou faux ?`,
      choices: ["Vrai", "Faux"],
      expected_answer: "Vrai",
      concepts_tested: [c.stable_key],
      bloom_level: (1 + items.length) as BloomNumeric,
    });
  }

  return items.slice(0, 10);
}

// ============================================================
// Persistence
// ============================================================

export async function persistTransformation(
  output: M5_Output,
  userId: string
): Promise<string> {
  // 1. Insert transformation
  const { data: transform, error: tErr } = await (supabase as any)
    .from("transformations")
    .insert({
      id: output.transformation_id,
      user_id: userId,
      document_id: output.metadata.document_id,
      course_profile_id: output.metadata.course_profile_id,
      memory_architecture_id: output.metadata.memory_architecture_id,
      format_decision_id: output.metadata.format_decision_id,
      format: "fiche_dynamique",
      strategy: "dynamic_sheet_v1",
      published_status: "draft",
      qa_status: "pending",
      estimated_duration_sec: output.metadata.estimated_duration_sec,
    })
    .select("id")
    .single();

  if (tErr) throw new Error(`Failed to persist transformation: ${tErr.message}`);

  // 2. Insert generated content
  const { error: cErr } = await (supabase as any)
    .from("generated_contents")
    .insert({
      transformation_id: output.transformation_id,
      version: 1,
      content_json: output.content_blocks,
      source_disclaimer_json: output.source_disclaimer,
      coverage_json: output.metadata.coverage,
      generation_flags_json: output.metadata.quality_flags,
      internal_summary_json: output.internal_summary,
    });

  if (cErr) throw new Error(`Failed to persist generated content: ${cErr.message}`);

  // 3. Insert final test
  const bloomLevels = new Set(output.final_test.map(q => q.bloom_level));
  const { error: ftErr } = await (supabase as any)
    .from("final_tests")
    .insert({
      transformation_id: output.transformation_id,
      questions_json: output.final_test,
      bloom_levels_count: bloomLevels.size,
      question_count: output.final_test.length,
    });

  if (ftErr) throw new Error(`Failed to persist final test: ${ftErr.message}`);

  return transform.id;
}

// ---------- Getters ----------

export async function getTransformation(transformationId: string): Promise<M5_Output | null> {
  const { data: t } = await (supabase as any)
    .from("transformations")
    .select("*")
    .eq("id", transformationId)
    .single();

  if (!t) return null;

  const { data: gc } = await (supabase as any)
    .from("generated_contents")
    .select("*")
    .eq("transformation_id", transformationId)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const { data: ft } = await (supabase as any)
    .from("final_tests")
    .select("*")
    .eq("transformation_id", transformationId)
    .limit(1)
    .single();

  if (!gc) return null;

  return {
    transformation_id: t.id,
    format: "fiche_dynamique",
    metadata: {
      document_id: t.document_id,
      course_profile_id: t.course_profile_id,
      memory_architecture_id: t.memory_architecture_id,
      format_decision_id: t.format_decision_id,
      estimated_duration_sec: t.estimated_duration_sec,
      quality_flags: gc.generation_flags_json as QualityFlag[],
      coverage: gc.coverage_json as M5_Output["metadata"]["coverage"],
    },
    internal_summary: gc.internal_summary_json as InternalSummary,
    content_blocks: gc.content_json as ContentBlock[],
    final_test: ft ? ft.questions_json as FinalTestItem[] : [],
    source_disclaimer: gc.source_disclaimer_json as SourceDisclaimer,
  };
}

export async function getUserTransformations(userId: string) {
  const { data, error } = await supabase
    .from("transformations")
    .select("id, document_id, format, published_status, estimated_duration_sec, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}
