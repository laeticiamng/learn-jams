// ============================================================
// COGNITIO Recall Grading Service — Score & Grade Answers
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { M6_GradeInput, M6_GradeOutput } from "@/domain/cognitio/recall.contracts";
import type { RecallAnswer } from "@/domain/cognitio/recall.types";
import {
  computeRawScore,
  computeConfidenceScore,
  computeCalibrationGap,
  computeCalibrationMetrics,
  computeCompositeScore,
  computeFragilityMap,
  computeConfusionMap,
} from "./calibration.service";

// ---------- Edge Function ----------

export async function runRecallGrading(input: M6_GradeInput): Promise<M6_GradeOutput> {
  try {
    const { data, error } = await supabase.functions.invoke("cognitio-grade-recall-attempt", {
      body: input,
    });
    if (error) throw error;
    return data as M6_GradeOutput;
  } catch {
    return gradeRecallLocally(input);
  }
}

// ---------- Local Grading ----------

export function gradeRecallLocally(input: M6_GradeInput): M6_GradeOutput {
  const { answers, concepts, critical_concept_keys, confusion_pairs } = input;

  const rawScore = computeRawScore(answers);
  const confidenceScore = computeConfidenceScore(answers);
  const calibrationGap = computeCalibrationGap(answers);
  const calibration = computeCalibrationMetrics(answers);
  const compositeScore = computeCompositeScore(answers, critical_concept_keys);
  const fragilityMap = computeFragilityMap(answers, concepts);
  const confusionMap = computeConfusionMap(answers, confusion_pairs);

  return {
    attempt_id: crypto.randomUUID(),
    raw_score: rawScore,
    confidence_score: confidenceScore,
    calibration_gap: calibrationGap,
    composite_score: compositeScore,
    calibration,
    fragility_map: fragilityMap,
    confusion_map: confusionMap,
  };
}

// ---------- Persistence ----------

export async function persistRecallAttempt(
  gradeOutput: M6_GradeOutput,
  recallTestId: string,
  userId: string,
  answers: RecallAnswer[],
): Promise<string> {
  const { data, error } = await supabase
    .from("recall_attempts")
    .insert({
      id: gradeOutput.attempt_id,
      recall_test_id: recallTestId,
      user_id: userId,
      answers_json: answers,
      raw_score: gradeOutput.raw_score,
      confidence_score: gradeOutput.confidence_score,
      calibration_gap: gradeOutput.calibration_gap,
      composite_score: gradeOutput.composite_score.total,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Recall attempt save failed: ${error.message}`);
  return data.id;
}
