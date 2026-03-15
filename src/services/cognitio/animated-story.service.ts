// ============================================================
// COGNITIO Animated Story Service — M5-B Generator
// Generates "histoire_animee" (Interactive Storyboard V1)
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { M5B_Input, M5B_Output } from "@/domain/cognitio/story.contracts";
import type {
  StoryScene,
  StorySceneType,
  EmotionTag,
  SceneChoiceWidget,
  SceneChoiceOption,
  ConfusionEvent,
  NarrativeAnchor,
  SceneFeedbackReveal,
  AudienceAdaptationReport,
  StoryDisclaimer,
  StoryMetadata,
  NarrativeNecessityCheck,
  NarrativeUniverseStyle,
  GuidanceLevel,
  SentenceStyle,
  AbstractionLevel,
} from "@/domain/cognitio/story.types";
import type { AnalyzedConcept, AnalyzedConfusionPair } from "@/domain/cognitio/contracts";
import type { M3_Segment } from "@/domain/cognitio/memory.types";
import { validateM5BInput, validateM5BOutput } from "@/domain/cognitio/story.validators";
import {
  computeAdaptation,
  DEFAULT_LEARNER_PROFILE,
  getContractPhrasing,
  getHookPhrasing,
  getDefinitionIntro,
} from "@/domain/cognitio/learner-profile.types";
import type { AudienceAdaptation } from "@/domain/cognitio/learner-profile.types";

// ---------- Edge Function Call ----------

export async function runAnimatedStoryGeneration(input: M5B_Input): Promise<M5B_Output> {
  try {
    const { data, error } = await supabase.functions.invoke("cognitio-generate-animated-story", {
      body: input,
    });
    if (error) throw error;
    return data as M5B_Output;
  } catch {
    return generateAnimatedStoryLocally(input);
  }
}

// ---------- Narrative Necessity Check ----------

function checkNarrativeNecessity(input: M5B_Input): NarrativeNecessityCheck {
  const { m2_output, m3_output } = input;
  const concepts = m2_output.key_concepts;
  const confusionPairs = m2_output.confusion_pairs;

  // Narrative adds mnemonic value when:
  // 1. There are confusion pairs (narrative can dramatize errors)
  // 2. Reasoning type is causal or conditionnel (story helps chain)
  // 3. Enough concepts to sustain a story arc (>= 3)
  // 4. Content is not purely procedural lists

  const hasConfusions = confusionPairs.length > 0;
  const hasCausalReasoning = ["causal", "conditionnel"].includes(m2_output.reasoning_type);
  const enoughConcepts = concepts.length >= 3;
  const isPurelyProcedural = m2_output.reasoning_type === "procedural" && concepts.length <= 4;

  const reasons: string[] = [];
  if (hasConfusions) reasons.push("confusion_pairs_present");
  if (hasCausalReasoning) reasons.push("causal_reasoning");
  if (enoughConcepts) reasons.push("sufficient_concepts");

  const score = (hasConfusions ? 1 : 0) + (hasCausalReasoning ? 1 : 0) + (enoughConcepts ? 1 : 0);
  const isNecessary = score >= 2 && !isPurelyProcedural;

  return {
    is_necessary: isNecessary,
    reason: isNecessary
      ? `Narrative justified: ${reasons.join(", ")}`
      : `Narrative not justified (score=${score}/3). Revert to fiche_dynamique recommended.`,
    revert_candidate: !isNecessary,
  };
}

// ---------- Local Generator ----------

export function generateAnimatedStoryLocally(input: M5B_Input): M5B_Output {
  const inputValidation = validateM5BInput(input);
  if (!inputValidation.valid) {
    throw new Error(`Invalid M5B input: ${inputValidation.errors.map(e => e.message).join(", ")}`);
  }

  const { m2_output, m3_output, m4_output, source_document, user_objective } = input;
  const transformationId = crypto.randomUUID();

  // Compute audience adaptation
  const profile = input.learner_profile ?? DEFAULT_LEARNER_PROFILE;
  const adaptation = computeAdaptation(profile);

  // Check narrative necessity
  const narrativeNecessity = checkNarrativeNecessity(input);

  const concepts = m2_output.key_concepts;
  const criticalConcepts = concepts.filter(c => c.criticality === 1);
  const confusionPairs = m2_output.confusion_pairs;
  const segments = m3_output.segments;

  // Build scenes
  const scenes: StoryScene[] = [];
  let position = 0;

  // 1. CONTRACT_HOOK scene
  scenes.push(buildContractHookScene(m2_output.main_topic, criticalConcepts, concepts, m3_output, adaptation, position++));

  // 2. ANCHORING scene
  scenes.push(buildAnchoringScene(segments, concepts, criticalConcepts, adaptation, position++));

  // 3. NARRATIVE_CORE scenes (one per segment, with active pauses interspersed)
  let narrativeCount = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segConcepts = concepts.filter(c => seg.concept_keys.includes(c.stable_key));
    const segConfusions = confusionPairs.filter(
      p => seg.concept_keys.includes(p.concept_a_key) || seg.concept_keys.includes(p.concept_b_key)
    );

    // Build narrative core scene
    scenes.push(buildNarrativeCoreScene(seg, segConcepts, segConfusions, m3_output, i, adaptation, position++));
    narrativeCount++;

    // Insert active pause every 2-3 narrative scenes (not after the last segment)
    if (narrativeCount >= 2 && i < segments.length - 1) {
      const pauseConcepts = segConcepts.slice(0, 2);
      scenes.push(buildActivePauseScene(pauseConcepts, segConfusions, adaptation, position++));
      narrativeCount = 0;
    }
  }

  // Ensure at least one active pause exists
  if (!scenes.some(s => s.type === "active_pause") && concepts.length > 0) {
    scenes.push(buildActivePauseScene(concepts.slice(0, 2), confusionPairs, adaptation, position++));
  }

  // 4. CLARITY_PEAK scene
  scenes.push(buildClarityPeakScene(concepts, criticalConcepts, m2_output.main_topic, adaptation, position++));

  // 5. CONSOLIDATION scene
  scenes.push(buildConsolidationScene(criticalConcepts, confusionPairs, m3_output, adaptation, position++));

  // 6. DISCLAIMER scene (if uncertain concepts or low confidence)
  const uncertainConcepts = concepts.filter(c => c.uncertain).map(c => c.stable_key);
  const ambiguities = m2_output.confidence.ambiguous_zones?.map(z => z.zone_label) ?? [];

  if (uncertainConcepts.length > 0 || ambiguities.length > 0 || source_document.confidence_level < 0.7) {
    scenes.push(buildDisclaimerScene(source_document.confidence_level, uncertainConcepts, ambiguities, position++));
  }

  // Cap at MAX_SCENES (12)
  const finalScenes = scenes.slice(0, 12);

  // Build audience adaptation report
  const audienceAdaptation = buildAudienceAdaptationReport(adaptation, profile);

  // Build disclaimer
  const disclaimer: StoryDisclaimer = {
    confidence_level: source_document.confidence_level,
    uncertain_concepts: uncertainConcepts,
    contradictions: [],
    ambiguities,
  };

  // Build metadata
  const metadata: StoryMetadata = {
    document_id: source_document.document_id,
    course_profile_id: m3_output.course_profile_id,
    memory_architecture_id: m3_output.architecture_id,
    format_decision_id: m4_output.decision_id,
    estimated_duration_sec: m4_output.estimated_duration_sec,
    quality_flags: computeQualityFlags(finalScenes, criticalConcepts, uncertainConcepts),
    audience_profile_used: profile.education_stage,
    document_difficulty_level: m2_output.document_difficulty_level ?? null,
    audience_mismatch_risk: m2_output.audience_mismatch_risk ?? null,
  };

  return {
    transformation_id: transformationId,
    format: "histoire_animee",
    render_mode: "interactive_storyboard_v1",
    scenes: finalScenes,
    narrative_necessity: narrativeNecessity,
    audience_adaptation: audienceAdaptation,
    disclaimer,
    metadata,
  };
}

// ============================================================
// Scene Builders
// ============================================================

function buildContractHookScene(
  mainTopic: string,
  critical: AnalyzedConcept[],
  allConcepts: AnalyzedConcept[],
  m3: M5B_Input["m3_output"],
  adaptation: AudienceAdaptation,
  position: number,
): StoryScene {
  const phrasing = getContractPhrasing(adaptation);
  const hook = getHookPhrasing(
    adaptation,
    mainTopic,
    critical.length > 0 ? critical[0].label : undefined,
  );

  const contract = m3.pedagogical_contract;
  const narration = [
    hook,
    "",
    phrasing.objective(contract.total_concepts, critical.length),
    phrasing.structure(contract.segment_count, Math.ceil(contract.estimated_duration_sec / 60)),
  ].join("\n");

  return {
    scene_id: crypto.randomUUID(),
    position,
    type: "contract_hook",
    title: "Accroche & Contrat",
    visual_direction: getNarrativeVisualDirection("contract_hook", adaptation),
    narration,
    dialogue: null,
    concepts_covered: critical.slice(0, 1).map(c => c.stable_key),
    visual_anchor: null,
    confusion_event: null,
    choice_widget: null,
    feedback_reveal: null,
    emotion_tag: "identification",
  };
}

function buildAnchoringScene(
  segments: M3_Segment[],
  concepts: AnalyzedConcept[],
  critical: AnalyzedConcept[],
  adaptation: AudienceAdaptation,
  position: number,
): StoryScene {
  const mapLines = segments.map((seg, i) => {
    const labels = seg.concept_keys
      .map(k => concepts.find(c => c.stable_key === k)?.label ?? k)
      .slice(0, 4);
    return `Étape ${i + 1} : ${labels.join(", ")}`;
  });

  const narration = adaptation.tone === "warm_guided"
    ? `Voici le chemin qu'on va parcourir ensemble !\n\n${mapLines.join("\n")}`
    : `Plan de l'exploration :\n\n${mapLines.join("\n")}`;

  const anchor: NarrativeAnchor | null = critical.length > 0 ? {
    image_desc: `Carte mentale montrant ${segments.length} étapes avec "${critical[0].label}" en position centrale`,
    verbal_formula: `"${critical[0].label}" est le pilier de tout ce parcours.`,
  } : null;

  return {
    scene_id: crypto.randomUUID(),
    position,
    type: "anchoring",
    title: "Ancrage visuel",
    visual_direction: getNarrativeVisualDirection("anchoring", adaptation),
    narration,
    dialogue: null,
    concepts_covered: [],
    visual_anchor: anchor,
    confusion_event: null,
    choice_widget: null,
    feedback_reveal: null,
    emotion_tag: "clarity",
  };
}

function buildNarrativeCoreScene(
  segment: M3_Segment,
  segConcepts: AnalyzedConcept[],
  segConfusions: AnalyzedConfusionPair[],
  m3: M5B_Input["m3_output"],
  segIndex: number,
  adaptation: AudienceAdaptation,
  position: number,
): StoryScene {
  const defIntro = getDefinitionIntro(adaptation);
  const conceptsToShow = segConcepts.slice(0, 3); // max 3 per scene

  // Build narrative from concepts
  const lines: string[] = [];
  for (const c of conceptsToShow) {
    lines.push(`**${c.label}** — ${defIntro} ${c.definition}`);
  }

  const narration = lines.join("\n\n");

  // Visual anchor for first critical concept
  const firstCritical = conceptsToShow.find(c => c.criticality === 1);
  const m3Anchor = firstCritical
    ? m3.visual_anchors.find(a => a.concept_key === firstCritical.stable_key)
    : null;

  const anchor: NarrativeAnchor | null = m3Anchor ? {
    image_desc: m3Anchor.content,
    verbal_formula: `Retenez : "${firstCritical!.label}" est essentiel.`,
  } : (firstCritical ? {
    image_desc: `Illustration de "${firstCritical.label}" dans un contexte ${getUniverseLabel(adaptation)}`,
    verbal_formula: `"${firstCritical.label}" = ${firstCritical.definition.slice(0, 60)}.`,
  } : null);

  // Confusion event (if applicable)
  const confEvent: ConfusionEvent | null = segConfusions.length > 0 ? {
    concept_a: segConfusions[0].concept_a_key,
    concept_b: segConfusions[0].concept_b_key,
    error_made: `Confusion fréquente entre "${segConfusions[0].concept_a_key}" et "${segConfusions[0].concept_b_key}"`,
    correction: `La distinction clé est : ${segConfusions[0].distinction_key}`,
    distinction_key: segConfusions[0].distinction_key,
  } : null;

  // Dialogue for immersion
  const dialogue = buildNarrativeDialogue(conceptsToShow, adaptation, segIndex);

  return {
    scene_id: crypto.randomUUID(),
    position,
    type: "narrative_core",
    title: `${conceptsToShow[0]?.label ?? `Bloc ${segIndex + 1}`}`,
    visual_direction: getNarrativeVisualDirection("narrative_core", adaptation),
    narration,
    dialogue,
    concepts_covered: conceptsToShow.map(c => c.stable_key),
    visual_anchor: anchor,
    confusion_event: confEvent,
    choice_widget: null,
    feedback_reveal: confEvent ? {
      corrective_explanation: confEvent.correction,
      concept_reinforced: [confEvent.concept_a, confEvent.concept_b],
    } : null,
    emotion_tag: confEvent ? "tension" : "surprise",
  };
}

function buildActivePauseScene(
  concepts: AnalyzedConcept[],
  confusions: AnalyzedConfusionPair[],
  adaptation: AudienceAdaptation,
  position: number,
): StoryScene {
  const target = concepts[0];
  if (!target) {
    // Fallback: generic pause
    return buildGenericPauseScene(adaptation, position);
  }

  // Build choice widget
  const options = buildChoiceOptions(target, concepts, adaptation);
  const choiceWidget: SceneChoiceWidget = {
    prompt: adaptation.tone === "warm_guided"
      ? `À toi de jouer ! Qu'est-ce que "${target.label}" ?`
      : `Question : quelle est la définition correcte de "${target.label}" ?`,
    options,
  };

  const feedbackReveal: SceneFeedbackReveal = {
    corrective_explanation: `${target.label} : ${target.definition}`,
    concept_reinforced: [target.stable_key],
  };

  return {
    scene_id: crypto.randomUUID(),
    position,
    type: "active_pause",
    title: "Pause interactive",
    visual_direction: getNarrativeVisualDirection("active_pause", adaptation),
    narration: adaptation.tone === "warm_guided"
      ? "C'est le moment de vérifier ce que tu as retenu !"
      : "Vérifions votre compréhension.",
    dialogue: null,
    concepts_covered: [target.stable_key],
    visual_anchor: null,
    confusion_event: null,
    choice_widget: choiceWidget,
    feedback_reveal: feedbackReveal,
    emotion_tag: "surprise",
  };
}

function buildGenericPauseScene(adaptation: AudienceAdaptation, position: number): StoryScene {
  return {
    scene_id: crypto.randomUUID(),
    position,
    type: "active_pause",
    title: "Pause interactive",
    visual_direction: getNarrativeVisualDirection("active_pause", adaptation),
    narration: adaptation.tone === "warm_guided"
      ? "Faisons une petite pause pour récapituler !"
      : "Récapitulons les points abordés.",
    dialogue: null,
    concepts_covered: [],
    visual_anchor: null,
    confusion_event: null,
    choice_widget: {
      prompt: adaptation.tone === "warm_guided"
        ? "As-tu bien compris tout ce qu'on a vu ?"
        : "Avez-vous bien compris les concepts abordés ?",
      options: [
        { id: crypto.randomUUID(), label: "Oui, tout est clair", is_best: true },
        { id: crypto.randomUUID(), label: "J'ai besoin de relire", is_best: false },
      ],
    },
    feedback_reveal: {
      corrective_explanation: "Relisez les scènes précédentes si nécessaire.",
      concept_reinforced: [],
    },
    emotion_tag: "identification",
  };
}

function buildClarityPeakScene(
  concepts: AnalyzedConcept[],
  critical: AnalyzedConcept[],
  mainTopic: string,
  adaptation: AudienceAdaptation,
  position: number,
): StoryScene {
  const lines: string[] = [];

  if (adaptation.tone === "warm_guided") {
    lines.push(`Tu y es presque ! Voici la vue d'ensemble de "${mainTopic}" :`);
  } else {
    lines.push(`Vue d'ensemble : ${mainTopic}`);
  }

  lines.push("");
  if (critical.length > 0) {
    lines.push(`Les ${critical.length} notion(s) essentielle(s) :`);
    for (const c of critical) {
      lines.push(`• ${c.label} — ${c.definition.slice(0, 80)}`);
    }
  }

  lines.push("");
  lines.push(`${concepts.length} concept(s) forment un ensemble cohérent.`);

  return {
    scene_id: crypto.randomUUID(),
    position,
    type: "clarity_peak",
    title: "Pic de clarté",
    visual_direction: getNarrativeVisualDirection("clarity_peak", adaptation),
    narration: lines.join("\n"),
    dialogue: null,
    concepts_covered: critical.map(c => c.stable_key),
    visual_anchor: critical.length > 0 ? {
      image_desc: `Schéma récapitulatif de "${mainTopic}" avec ${critical.length} concepts clés mis en évidence`,
      verbal_formula: critical.map(c => c.label).join(" + ") + " = maîtrise complète",
    } : null,
    confusion_event: null,
    choice_widget: null,
    feedback_reveal: null,
    emotion_tag: "clarity",
  };
}

function buildConsolidationScene(
  critical: AnalyzedConcept[],
  confusions: AnalyzedConfusionPair[],
  m3: M5B_Input["m3_output"],
  adaptation: AudienceAdaptation,
  position: number,
): StoryScene {
  const lines: string[] = [];

  if (adaptation.tone === "warm_guided") {
    lines.push("**Bravo ! Voici ce qu'il faut retenir :**");
  } else {
    lines.push("**Ce qu'il faut retenir :**");
  }

  lines.push("");
  for (const c of critical) {
    lines.push(`• ${c.label} : ${c.definition.slice(0, 100)}`);
  }

  if (confusions.length > 0) {
    lines.push("");
    lines.push("**Pièges à éviter :**");
    for (const p of confusions.slice(0, 3)) {
      lines.push(`• ${p.concept_a_key} ≠ ${p.concept_b_key} — ${p.distinction_key}`);
    }
  }

  return {
    scene_id: crypto.randomUUID(),
    position,
    type: "consolidation",
    title: "Consolidation",
    visual_direction: getNarrativeVisualDirection("consolidation", adaptation),
    narration: lines.join("\n"),
    dialogue: null,
    concepts_covered: critical.map(c => c.stable_key),
    visual_anchor: null,
    confusion_event: null,
    choice_widget: null,
    feedback_reveal: null,
    emotion_tag: "clarity",
  };
}

function buildDisclaimerScene(
  confidenceLevel: number,
  uncertainConcepts: string[],
  ambiguities: string[],
  position: number,
): StoryScene {
  const lines: string[] = [];

  if (uncertainConcepts.length > 0) {
    lines.push(`⚠ ${uncertainConcepts.length} concept(s) incertain(s) : ${uncertainConcepts.join(", ")}`);
    lines.push("Ces notions n'ont pas pu être pleinement tracées dans le document source.");
  }

  if (ambiguities.length > 0) {
    lines.push(`Zones ambiguës : ${ambiguities.join(", ")}`);
  }

  lines.push(`Niveau de confiance global : ${Math.round(confidenceLevel * 100)}%`);

  return {
    scene_id: crypto.randomUUID(),
    position,
    type: "disclaimer",
    title: "Avertissement source",
    visual_direction: "Panneau d'information sobre avec icône d'avertissement",
    narration: lines.join("\n\n"),
    dialogue: null,
    concepts_covered: uncertainConcepts,
    visual_anchor: null,
    confusion_event: null,
    choice_widget: null,
    feedback_reveal: null,
    emotion_tag: null,
  };
}

// ============================================================
// Helpers
// ============================================================

function buildChoiceOptions(
  target: AnalyzedConcept,
  allConcepts: AnalyzedConcept[],
  adaptation: AudienceAdaptation,
): SceneChoiceOption[] {
  const options: SceneChoiceOption[] = [
    {
      id: crypto.randomUUID(),
      label: target.definition.slice(0, 80),
      is_best: true,
    },
  ];

  // Add distractors
  const distractors = allConcepts
    .filter(c => c.stable_key !== target.stable_key)
    .slice(0, 2);

  for (const d of distractors) {
    options.push({
      id: crypto.randomUUID(),
      label: d.definition.slice(0, 80),
      is_best: false,
    });
  }

  // Ensure minimum 2 options
  if (options.length < 2) {
    options.push({
      id: crypto.randomUUID(),
      label: `${target.label} n'est pas abordé dans ce cours.`,
      is_best: false,
    });
  }

  // Shuffle (Fisher-Yates)
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
}

function buildNarrativeDialogue(
  concepts: AnalyzedConcept[],
  adaptation: AudienceAdaptation,
  segIndex: number,
): string[] | null {
  if (concepts.length === 0) return null;

  const c = concepts[0];

  switch (adaptation.tone) {
    case "warm_guided":
      return [
        `— Tu vois, "${c.label}", c'est un peu comme...`,
        `— Ah, je comprends ! C'est ${c.definition.slice(0, 60)}.`,
      ];
    case "neutral_clear":
      return [
        `— Comment définir "${c.label}" ?`,
        `— ${c.definition.slice(0, 80)}.`,
      ];
    case "formal_precise":
    case "direct_efficient":
      return null; // No dialogue for formal/efficient tones
  }
}

function getNarrativeVisualDirection(
  sceneType: StorySceneType,
  adaptation: AudienceAdaptation,
): string {
  const universe = getUniverseLabel(adaptation);

  const directions: Record<StorySceneType, string> = {
    contract_hook: `Scène d'ouverture ${universe} — ambiance engageante, personnage principal face au défi`,
    anchoring: `Vue panoramique de la carte du parcours — style ${universe}`,
    narrative_core: `Scène de découverte ${universe} — focus sur le concept clé avec métaphore visuelle`,
    active_pause: `Interface interactive — fond lumineux, choix mis en avant`,
    clarity_peak: `Vue d'ensemble éclairée — tous les concepts reliés, style ${universe}`,
    consolidation: `Scène de synthèse — personnage confiant, éléments clés listés`,
    disclaimer: `Panneau d'information sobre avec icône d'avertissement`,
  };

  return directions[sceneType];
}

function getUniverseLabel(adaptation: AudienceAdaptation): string {
  switch (adaptation.analogy_style) {
    case "everyday": return "quotidien et familier";
    case "school": return "scolaire et illustratif";
    case "academic": return "universitaire et structuré";
    case "professional": return "professionnel et efficace";
  }
}

function mapToNarrativeUniverseStyle(adaptation: AudienceAdaptation): NarrativeUniverseStyle {
  switch (adaptation.analogy_style) {
    case "everyday": return "daily_life";
    case "school": return "school";
    case "academic": return "academic";
    case "professional": return "professional";
  }
}

function mapToGuidanceLevel(adaptation: AudienceAdaptation): GuidanceLevel {
  switch (adaptation.tone) {
    case "warm_guided": return "high";
    case "neutral_clear": return "medium";
    case "formal_precise": return "medium";
    case "direct_efficient": return "light";
  }
}

function mapToSentenceStyle(adaptation: AudienceAdaptation): SentenceStyle {
  switch (adaptation.max_sentence_length) {
    case "short": return "short";
    case "medium": return "balanced";
    case "long": return "dense";
  }
}

function mapToAbstractionLevel(adaptation: AudienceAdaptation): AbstractionLevel {
  switch (adaptation.abstraction_level) {
    case "concrete": return "concrete";
    case "moderate": return "mixed";
    case "abstract": return "abstract";
  }
}

function buildAudienceAdaptationReport(
  adaptation: AudienceAdaptation,
  profile: M5B_Input["learner_profile"] & {},
): AudienceAdaptationReport {
  return {
    vocabulary_level: adaptation.vocabulary_level,
    sentence_style: mapToSentenceStyle(adaptation),
    abstraction_level: mapToAbstractionLevel(adaptation),
    guidance_level: mapToGuidanceLevel(adaptation),
    narrative_universe_style: mapToNarrativeUniverseStyle(adaptation),
    adaptation_notes: [
      `Tone: ${adaptation.tone}`,
      `Max elements/scene: ${adaptation.max_new_elements_per_block}`,
      `Reformulation density: ${adaptation.reformulation_density}`,
    ],
  };
}

function computeQualityFlags(
  scenes: StoryScene[],
  critical: AnalyzedConcept[],
  uncertain: string[],
): string[] {
  const flags: string[] = [];
  const allCovered = new Set(scenes.flatMap(s => s.concepts_covered));
  const missingCritical = critical.filter(c => !allCovered.has(c.stable_key));

  if (missingCritical.length === 0) flags.push("full_critical_coverage");
  else flags.push("missing_critical_coverage");

  if (uncertain.length > 0) flags.push("uncertain_concepts_present");

  const hasPause = scenes.some(s => s.type === "active_pause");
  if (hasPause) flags.push("has_active_pauses");

  const hasConfusionEvent = scenes.some(s => s.confusion_event !== null);
  if (hasConfusionEvent) flags.push("has_confusion_events");

  return flags;
}

// ============================================================
// Persistence
// ============================================================

export async function persistStoryTransformation(
  output: M5B_Output,
  userId: string,
): Promise<string> {
  const { data: transform, error: tErr } = await (supabase as any)
    .from("transformations")
    .insert({
      id: output.transformation_id,
      user_id: userId,
      document_id: output.metadata.document_id,
      course_profile_id: output.metadata.course_profile_id,
      memory_architecture_id: output.metadata.memory_architecture_id,
      format_decision_id: output.metadata.format_decision_id,
      format: "histoire_animee",
      strategy: "interactive_storyboard_v1",
      published_status: "draft",
      qa_status: "pending",
      estimated_duration_sec: output.metadata.estimated_duration_sec,
    })
    .select("id")
    .single();

  if (tErr) throw new Error(`Failed to persist story transformation: ${tErr.message}`);

  const { error: cErr } = await supabase
    .from("generated_contents")
    .insert({
      transformation_id: output.transformation_id,
      version: 1,
      content_json: output.scenes,
      source_disclaimer_json: output.disclaimer,
      coverage_json: {
        critical_total: output.metadata.quality_flags.includes("full_critical_coverage") ? 1 : 0,
        critical_covered: output.metadata.quality_flags.includes("full_critical_coverage") ? 1 : 0,
        major_total: 0,
        major_covered: 0,
      },
      generation_flags_json: output.metadata.quality_flags,
      internal_summary_json: {
        render_mode: output.render_mode,
        scene_count: output.scenes.length,
        narrative_necessity: output.narrative_necessity,
        audience_adaptation: output.audience_adaptation,
      },
    });

  if (cErr) throw new Error(`Failed to persist story content: ${cErr.message}`);

  return transform.id;
}
