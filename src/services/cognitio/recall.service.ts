// ============================================================
// COGNITIO Recall Service — Generate and manage recall tests
// ============================================================

import { supabase } from "@/integrations/supabase/client";
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
  missionRunId: string,
  testType: TestType,
  questions: RecallQuestion[],
  results: { question_id: string; answer_given: string | string[]; is_correct: boolean; confidence: number; time_taken_ms: number }[]
) {
  const rawScore = results.filter(r => r.is_correct).length / results.length;
  const confidenceScore = results.reduce((s, r) => s + r.confidence, 0) / results.length;
  const calibrationGap = computeCalibrationGap(
    results.map(r => ({ confidence: r.confidence, is_correct: r.is_correct }))
  );

  const { data, error } = await supabase
    .from("recall_tests")
    .insert({
      mission_run_id: missionRunId,
      test_type: testType,
      questions_json: questions,
      raw_score: rawScore,
      confidence_score: confidenceScore,
      calibration_gap: calibrationGap,
      results_json: results,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Recall test save failed: ${error.message}`);
  return data;
}

export async function getRecallTests(missionRunId: string) {
  const { data, error } = await supabase
    .from("recall_tests")
    .select("*")
    .eq("mission_run_id", missionRunId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Recall tests fetch failed: ${error.message}`);
  return data ?? [];
}

export async function getPendingRetests(userId: string) {
  // Find missions where J+1 or J+7 retests are due
  const now = new Date();
  const j1Cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const j7Cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("mission_runs")
    .select(`
      id,
      mission_id,
      started_at,
      completed_at,
      recall_tests (test_type)
    `)
    .eq("user_id", userId)
    .eq("completion_status", "completed")
    .order("completed_at", { ascending: false });

  if (error) return [];

  const pending: { mission_run_id: string; mission_id: string; test_type: TestType; due_since: string }[] = [];

  for (const run of data ?? []) {
    const completedAt = run.completed_at ? new Date(run.completed_at) : null;
    if (!completedAt) continue;

    const existingTypes = new Set((run.recall_tests ?? []).map((t: { test_type: string }) => t.test_type));

    // Check J+1
    if (completedAt.toISOString() <= j1Cutoff && !existingTypes.has("j1")) {
      pending.push({
        mission_run_id: run.id,
        mission_id: run.mission_id,
        test_type: "j1",
        due_since: new Date(completedAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Check J+7
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
