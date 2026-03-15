// ============================================================
// COGNITIO Recall Service — Generate and manage recall tests
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { GenerateRecallInput, GenerateRecallOutput } from "@/domain/cognitio/contracts";
import type { RecallQuestion, TestType, BloomLevel } from "@/domain/cognitio/types";
import { computeCalibrationGap } from "@/domain/cognitio/validators";

export async function runRecallGenerator(
  input: GenerateRecallInput
): Promise<GenerateRecallOutput> {
  const { data, error } = await supabase.functions.invoke("cognitio-generate-recall", {
    body: input,
  });

  if (error) throw new Error(`Recall generation failed: ${error.message}`);
  return data as GenerateRecallOutput;
}

// Client-side recall generator
export function generateRecallLocally(
  input: GenerateRecallInput
): GenerateRecallOutput {
  const { concepts, confusion_pairs, test_type, word_count } = input;

  const questionCount = getQuestionCount(test_type, concepts.length);
  const questions: RecallQuestion[] = [];

  // Prioritize critical concepts
  const sorted = [...concepts].sort((a, b) => a.criticality - b.criticality);
  const selected = sorted.slice(0, questionCount);

  for (const concept of selected) {
    const bloomLevels: BloomLevel[] = ["remember", "understand", "apply"];
    const bloom = bloomLevels[Math.min(concept.criticality - 1, bloomLevels.length - 1)];

    // Check if this concept has confusion pairs
    const hasConfusion = confusion_pairs.some(
      p => p.concept_a_key === concept.stable_key || p.concept_b_key === concept.stable_key
    );

    questions.push({
      id: crypto.randomUUID(),
      concept_key: concept.stable_key,
      question: buildRecallQuestion(concept, bloom),
      options: buildRecallOptions(concept, concepts),
      correct_answer: concept.label,
      bloom_level: bloom,
      is_discrimination: hasConfusion,
    });
  }

  return {
    questions,
    estimated_duration_sec: questions.length * 20,
  };
}

function getQuestionCount(testType: TestType, conceptCount: number): number {
  switch (testType) {
    case "inline": return Math.max(1, Math.floor(conceptCount / 3));
    case "final": return Math.min(10, Math.max(5, conceptCount));
    case "j1": return Math.min(7, Math.max(3, Math.ceil(conceptCount * 0.6)));
    case "j7": return Math.min(10, Math.max(5, conceptCount));
  }
}

function buildRecallQuestion(
  concept: GenerateRecallInput["concepts"][0],
  bloom: BloomLevel
): string {
  switch (bloom) {
    case "remember":
      return `Quel est le concept défini par : "${concept.definition}" ?`;
    case "understand":
      return `Expliquez en quoi "${concept.label}" est important dans ce contexte.`;
    case "apply":
      return `Dans quel cas utiliseriez-vous "${concept.label}" ?`;
    default:
      return `Identifiez : ${concept.definition}`;
  }
}

function buildRecallOptions(
  concept: GenerateRecallInput["concepts"][0],
  allConcepts: GenerateRecallInput["concepts"]
): string[] {
  const correct = concept.label;
  const distractors = allConcepts
    .filter(c => c.stable_key !== concept.stable_key)
    .map(c => c.label)
    .slice(0, 3);

  const options = [correct, ...distractors];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

export async function saveRecallTest(
  userId: string,
  transformationId: string,
  testType: TestType,
  questions: RecallQuestion[],
) {
  const { data, error } = await supabase
    .from("recall_tests")
    .insert([{
      user_id: userId,
      transformation_id: transformationId,
      test_type: testType,
      questions_json: questions as unknown as Json,
    }])
    .select("id")
    .single();

  if (error) throw new Error(`Recall test save failed: ${error.message}`);
  return data;
}

export async function getRecallTests(transformationId: string) {
  const { data, error } = await supabase
    .from("recall_tests")
    .select("*")
    .eq("transformation_id", transformationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Recall tests fetch failed: ${error.message}`);
  return data ?? [];
}

export async function getPendingRetests(userId: string) {
  const now = new Date();
  const j1Cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const j7Cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get completed mission runs
  const { data: runs, error: runsError } = await supabase
    .from("mission_runs")
    .select("id, mission_id, started_at, completed_at")
    .eq("user_id", userId)
    .eq("completion_status", "completed")
    .order("completed_at", { ascending: false });

  if (runsError || !runs) return [];

  // Get existing recall tests for this user
  const { data: existingTests } = await supabase
    .from("recall_tests")
    .select("test_type, transformation_id")
    .eq("user_id", userId);

  const existingByTransformation = new Map<string, Set<string>>();
  for (const test of existingTests ?? []) {
    const set = existingByTransformation.get(test.transformation_id) ?? new Set();
    set.add(test.test_type);
    existingByTransformation.set(test.transformation_id, set);
  }

  const pending: { mission_run_id: string; mission_id: string; test_type: TestType; due_since: string }[] = [];

  for (const run of runs) {
    const completedAt = run.completed_at ? new Date(run.completed_at) : null;
    if (!completedAt) continue;

    // Use mission_id as a proxy for transformation context
    const existingTypes = existingByTransformation.get(run.mission_id) ?? new Set();

    if (completedAt.toISOString() <= j1Cutoff && !existingTypes.has("j1")) {
      pending.push({
        mission_run_id: run.id,
        mission_id: run.mission_id,
        test_type: "j1",
        due_since: new Date(completedAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    if (completedAt.toISOString() <= j7Cutoff && !existingTypes.has("j7")) {
      pending.push({
        mission_run_id: run.id,
        mission_id: run.mission_id,
        test_type: "j7",
        due_since: new Date(completedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  return pending;
}
