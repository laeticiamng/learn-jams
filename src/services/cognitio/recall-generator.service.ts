// ============================================================
// COGNITIO Recall Generator Service — M6 Test Generation
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { M6_GenerateInput, M6_GenerateOutput, M6_RecallSuite } from "@/domain/cognitio/recall.contracts";
import type { RecallItem, RecallTestType, BloomNumeric } from "@/domain/cognitio/recall.types";
import type { AnalyzedConcept, AnalyzedConfusionPair } from "@/domain/cognitio/contracts";
import { validateRecallTest } from "@/domain/cognitio/recall.validators";
import {
  computeAdaptation,
  DEFAULT_LEARNER_PROFILE,
  getRecallPromptStyle,
} from "@/domain/cognitio/learner-profile.types";
import type { AudienceAdaptation } from "@/domain/cognitio/learner-profile.types";

// ---------- Edge Function ----------

export async function runRecallGeneration(input: M6_GenerateInput): Promise<M6_GenerateOutput> {
  try {
    const { data, error } = await supabase.functions.invoke("cognitio-generate-recall-v2", {
      body: input,
    });
    if (error) throw error;
    return data as M6_GenerateOutput;
  } catch {
    return generateRecallTestLocally(input);
  }
}

// ---------- Generate Full Suite ----------

export function generateRecallSuiteLocally(
  baseInput: Omit<M6_GenerateInput, "test_type">,
): M6_RecallSuite {
  const inlineItems = baseInput.existing_inline_items ?? [];

  const finalTest = generateRecallTestLocally({
    ...baseInput,
    test_type: "final",
  });

  const j1Test = generateRecallTestLocally({
    ...baseInput,
    test_type: "j1",
  });

  const j7Test = generateRecallTestLocally({
    ...baseInput,
    test_type: "j7",
  });

  return { inline_items: inlineItems, final_test: finalTest, j1_test: j1Test, j7_test: j7Test };
}

// ---------- Local Generator ----------

export function generateRecallTestLocally(input: M6_GenerateInput): M6_GenerateOutput {
  const { concepts, confusion_pairs, critical_concept_keys, test_type } = input;
  const profile = input.learner_profile ?? DEFAULT_LEARNER_PROFILE;
  const adaptation = computeAdaptation(profile);

  const items = buildTestItems(concepts, confusion_pairs, critical_concept_keys, test_type, adaptation);

  const testId = crypto.randomUUID();

  return {
    test_id: testId,
    test_type,
    items,
    estimated_duration_sec: items.length * 20,
  };
}

// ---------- Item Builders ----------

function buildTestItems(
  concepts: AnalyzedConcept[],
  confusionPairs: AnalyzedConfusionPair[],
  criticalKeys: string[],
  testType: RecallTestType,
  adaptation: AudienceAdaptation,
): RecallItem[] {
  const items: RecallItem[] = [];
  const [minCount, maxCount] = getTargetCount(testType, concepts.length);
  const targetCount = Math.min(maxCount, Math.max(minCount, concepts.length));

  // Sort: critical first, then by criticality
  const sorted = [...concepts].sort((a, b) => {
    const aIsCritical = criticalKeys.includes(a.stable_key) ? 0 : 1;
    const bIsCritical = criticalKeys.includes(b.stable_key) ? 0 : 1;
    return aIsCritical - bIsCritical || a.criticality - b.criticality;
  });

  // For J+1: focus on critical + fragile
  const selected = testType === "j1"
    ? sorted.filter(c => c.criticality <= 2).slice(0, targetCount)
    : sorted.slice(0, targetCount);

  // Ensure we pad to min
  const toUse = selected.length >= minCount ? selected : sorted.slice(0, minCount);

  const prompts = getRecallPromptStyle(adaptation);

  // Build items with Bloom diversity
  const bloomTargets = getBloomDistribution(testType, toUse.length);

  for (let i = 0; i < toUse.length; i++) {
    const concept = toUse[i];
    const bloom = bloomTargets[i % bloomTargets.length];
    const hasConfusion = confusionPairs.some(
      p => p.concept_a_key === concept.stable_key || p.concept_b_key === concept.stable_key
    );

    const item = buildSingleItem(concept, concepts, bloom, hasConfusion, confusionPairs, prompts, adaptation, i);
    items.push(item);
  }

  // J+7: ensure at least one distinction or transfer
  if (testType === "j7" && !items.some(i => i.is_discrimination || i.is_transfer)) {
    if (confusionPairs.length > 0) {
      const pair = confusionPairs[0];
      items.push(buildDistinctionItem(pair, prompts));
    } else if (concepts.length >= 2) {
      items.push(buildTransferItem(concepts[0], prompts));
    }
  }

  // Final test: ensure at least one distinction if confusion pairs exist
  if (testType === "final" && confusionPairs.length > 0 && !items.some(i => i.is_discrimination)) {
    const pair = confusionPairs[0];
    items.push(buildDistinctionItem(pair, prompts));
  }

  return items.slice(0, maxCount);
}

function buildSingleItem(
  concept: AnalyzedConcept,
  allConcepts: AnalyzedConcept[],
  bloom: BloomNumeric,
  hasConfusion: boolean,
  confusionPairs: AnalyzedConfusionPair[],
  prompts: ReturnType<typeof getRecallPromptStyle>,
  adaptation: AudienceAdaptation,
  index: number,
): RecallItem {
  const itemTypes: Array<{ type: RecallItem["type"]; bloomMatch: BloomNumeric[] }> = [
    { type: "qcu", bloomMatch: [1] },
    { type: "completion", bloomMatch: [2] },
    { type: "short_answer", bloomMatch: [2, 3] },
    { type: "reformulation", bloomMatch: [2, 3] },
    { type: "distinction", bloomMatch: [4] },
    { type: "ordering", bloomMatch: [5] },
    { type: "transfer", bloomMatch: [4, 5, 6] },
  ];

  const matchedType = itemTypes.find(t => t.bloomMatch.includes(bloom)) ?? itemTypes[0];

  switch (matchedType.type) {
    case "qcu":
      return {
        id: crypto.randomUUID(),
        type: "qcu",
        prompt: prompts.question(concept.label),
        choices: buildChoices(concept, allConcepts),
        expected_answer: concept.definition.slice(0, 80),
        concepts_tested: [concept.stable_key],
        bloom_level: 1,
        is_discrimination: hasConfusion,
        is_transfer: false,
        linked_block_id: null,
      };
    case "completion":
      return {
        id: crypto.randomUUID(),
        type: "completion",
        prompt: prompts.completion(concept.label),
        choices: null,
        expected_answer: concept.definition,
        concepts_tested: [concept.stable_key],
        bloom_level: 2,
        is_discrimination: false,
        is_transfer: false,
        linked_block_id: null,
      };
    case "reformulation":
      return {
        id: crypto.randomUUID(),
        type: "reformulation",
        prompt: prompts.reformulation(concept.label),
        choices: null,
        expected_answer: concept.definition,
        concepts_tested: [concept.stable_key],
        bloom_level: 2,
        is_discrimination: false,
        is_transfer: false,
        linked_block_id: null,
      };
    case "short_answer":
      return {
        id: crypto.randomUUID(),
        type: "short_answer",
        prompt: `Donnez un exemple concret d'application de "${concept.label}".`,
        choices: null,
        expected_answer: `Exemple lié à ${concept.label}`,
        concepts_tested: [concept.stable_key],
        bloom_level: 3,
        is_discrimination: false,
        is_transfer: false,
        linked_block_id: null,
      };
    case "distinction": {
      const pair = confusionPairs.find(
        p => p.concept_a_key === concept.stable_key || p.concept_b_key === concept.stable_key
      );
      if (pair) {
        return buildDistinctionItem(pair, prompts);
      }
      // Fallback to short_answer
      return {
        id: crypto.randomUUID(),
        type: "short_answer",
        prompt: prompts.prediction(concept.label),
        choices: null,
        expected_answer: concept.definition,
        concepts_tested: [concept.stable_key],
        bloom_level: 4,
        is_discrimination: false,
        is_transfer: false,
        linked_block_id: null,
      };
    }
    case "ordering":
      return {
        id: crypto.randomUUID(),
        type: "ordering",
        prompt: "Classez ces concepts par ordre d'importance :",
        choices: allConcepts.slice(0, 4).map(c => c.label),
        expected_answer: allConcepts.slice(0, 4).map(c => c.label),
        concepts_tested: allConcepts.slice(0, 4).map(c => c.stable_key),
        bloom_level: 5,
        is_discrimination: false,
        is_transfer: false,
        linked_block_id: null,
      };
    case "transfer":
      return buildTransferItem(concept, prompts);
    default:
      return {
        id: crypto.randomUUID(),
        type: "qcu",
        prompt: prompts.question(concept.label),
        choices: buildChoices(concept, allConcepts),
        expected_answer: concept.definition.slice(0, 80),
        concepts_tested: [concept.stable_key],
        bloom_level: 1,
        is_discrimination: false,
        is_transfer: false,
        linked_block_id: null,
      };
  }
}

function buildDistinctionItem(
  pair: AnalyzedConfusionPair,
  prompts: ReturnType<typeof getRecallPromptStyle>,
): RecallItem {
  return {
    id: crypto.randomUUID(),
    type: "distinction",
    prompt: `Quelle est la différence fondamentale entre "${pair.concept_a_key}" et "${pair.concept_b_key}" ?`,
    choices: null,
    expected_answer: pair.distinction_key,
    concepts_tested: [pair.concept_a_key, pair.concept_b_key],
    bloom_level: 4,
    is_discrimination: true,
    is_transfer: false,
    linked_block_id: null,
  };
}

function buildTransferItem(
  concept: AnalyzedConcept,
  prompts: ReturnType<typeof getRecallPromptStyle>,
): RecallItem {
  return {
    id: crypto.randomUUID(),
    type: "transfer",
    prompt: `Si "${concept.label}" n'existait pas, quel serait l'impact sur le reste du cours ? Proposez un parallèle dans un autre domaine.`,
    choices: null,
    expected_answer: `Analyse de transfert pour ${concept.label}`,
    concepts_tested: [concept.stable_key],
    bloom_level: 5,
    is_discrimination: false,
    is_transfer: true,
    linked_block_id: null,
  };
}

function buildChoices(concept: AnalyzedConcept, allConcepts: AnalyzedConcept[]): string[] {
  const correct = concept.definition.slice(0, 80);
  const distractors = allConcepts
    .filter(c => c.stable_key !== concept.stable_key)
    .slice(0, 2)
    .map(c => c.definition.slice(0, 80));

  distractors.push(`${concept.label} n'est pas abordé dans ce cours.`);

  const options = [correct, ...distractors.slice(0, 3)];
  // Shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

function getTargetCount(testType: RecallTestType, conceptCount: number): [number, number] {
  switch (testType) {
    case "inline": return [1, 20];
    case "final": return [5, 10];
    case "j1": return [3, 6];
    case "j7": return [3, 6];
  }
}

function getBloomDistribution(testType: RecallTestType, count: number): BloomNumeric[] {
  switch (testType) {
    case "inline":
      return [1, 2, 2, 3];
    case "final":
      // Ensure at least 3 different Bloom levels
      return [1, 1, 2, 2, 3, 4, 4, 5, 5, 6];
    case "j1":
      return [1, 2, 2, 3, 4];
    case "j7":
      // More discriminant: higher Bloom
      return [2, 3, 4, 4, 5, 6];
  }
}

// ---------- Persistence ----------

export async function persistRecallTest(
  output: M6_GenerateOutput,
  userId: string,
  transformationId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("recall_tests")
    .insert([{
      id: output.test_id,
      user_id: userId,
      transformation_id: transformationId,
      test_type: output.test_type,
      questions_json: output.items as unknown as Json,
      generated_from_version: 1,
    }])
    .select("id")
    .single();

  if (error) throw new Error(`Recall test save failed: ${error.message}`);
  return data.id;
}
