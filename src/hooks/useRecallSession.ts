// ============================================================
// Hook: useRecallSession — Manages recall test session (answer, grade, debrief)
// ============================================================

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { RecallItem, RecallAnswer, ConfidenceLevel } from "@/domain/cognitio/recall.types";
import type { M6_GradeOutput } from "@/domain/cognitio/recall.contracts";
import type { DebriefReport } from "@/domain/cognitio/recall.types";
import type { AnalyzedConcept, AnalyzedConfusionPair } from "@/domain/cognitio/contracts";
import { gradeRecallLocally, persistRecallAttempt } from "@/services/cognitio/recall-grading.service";
import { generateDebriefLocally, persistDebrief } from "@/services/cognitio/debrief.service";
import { updateMemoryAfterTest } from "@/services/cognitio/memory-update.service";
import type { M8_UpdateMemoryInput, ConceptTestResult } from "@/domain/cognitio/longitudinal.contracts";
import type { LearningObjective } from "@/domain/cognitio/types";

export type RecallSessionPhase = "answering" | "grading" | "debrief" | "completed";

export interface RecallSessionState {
  phase: RecallSessionPhase;
  items: RecallItem[];
  currentIndex: number;
  answers: RecallAnswer[];
  gradeOutput: M6_GradeOutput | null;
  debrief: DebriefReport | null;
  isSubmitting: boolean;
  error: string | null;
}

export function useRecallSession() {
  const { user } = useAuth();

  const [phase, setPhase] = useState<RecallSessionPhase>("answering");
  const [items, setItems] = useState<RecallItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<RecallAnswer[]>([]);
  const [gradeOutput, setGradeOutput] = useState<M6_GradeOutput | null>(null);
  const [debrief, setDebrief] = useState<DebriefReport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Context needed for grading/debrief
  const [concepts, setConcepts] = useState<AnalyzedConcept[]>([]);
  const [confusionPairs, setConfusionPairs] = useState<AnalyzedConfusionPair[]>([]);
  const [criticalKeys, setCriticalKeys] = useState<string[]>([]);
  const [traps, setTraps] = useState<string[]>([]);
  const [testId, setTestId] = useState<string>("");
  const [transformationId, setTransformationId] = useState<string>("");
  const [formatUsed, setFormatUsed] = useState<string>("fiche_dynamique");
  const [objective, setObjective] = useState<LearningObjective>("discovery");

  const startSession = useCallback((
    testItems: RecallItem[],
    testIdVal: string,
    transformationIdVal: string,
    conceptsVal: AnalyzedConcept[],
    confusionPairsVal: AnalyzedConfusionPair[],
    criticalKeysVal: string[],
    trapsVal: string[],
    formatUsedVal?: string,
    objectiveVal?: LearningObjective,
  ) => {
    setItems(testItems);
    setTestId(testIdVal);
    setTransformationId(transformationIdVal);
    setConcepts(conceptsVal);
    setConfusionPairs(confusionPairsVal);
    setCriticalKeys(criticalKeysVal);
    setTraps(trapsVal);
    if (formatUsedVal) setFormatUsed(formatUsedVal);
    if (objectiveVal) setObjective(objectiveVal);
    setCurrentIndex(0);
    setAnswers([]);
    setGradeOutput(null);
    setDebrief(null);
    setPhase("answering");
    setError(null);
  }, []);

  const gradeAndDebrief = useCallback(async (finalAnswers: RecallAnswer[]) => {
    setPhase("grading");
    setIsSubmitting(true);

    try {
      const grade = gradeRecallLocally({
        recall_test_id: testId,
        answers: finalAnswers,
        concepts,
        critical_concept_keys: criticalKeys,
        confusion_pairs: confusionPairs,
      });
      setGradeOutput(grade);

      // Persist attempt
      if (user) {
        try {
          await persistRecallAttempt(grade, testId, user.id, finalAnswers);
        } catch {
          // Non-blocking
        }
      }

      // Generate debrief
      setPhase("debrief");
      const debriefResult = generateDebriefLocally({
        recall_attempt_id: grade.attempt_id,
        transformation_id: transformationId,
        grade_output: grade,
        concepts,
        confusion_pairs: confusionPairs,
        traps,
        answers: finalAnswers,
      });
      setDebrief(debriefResult);

      // Persist debrief
      if (user) {
        try {
          await persistDebrief(debriefResult, user.id);
        } catch {
          // Non-blocking
        }
      }

      // M8: Update longitudinal memory
      if (user) {
        try {
          const conceptResults: ConceptTestResult[] = grade.fragility_map.map((f) => ({
            concept_key: f.concept_key,
            is_correct: f.correct_count > 0 && f.correct_count >= f.total_count / 2,
            confidence: f.avg_confidence,
            calibration_gap: f.calibration_gap,
          }));

          const memoryInput: M8_UpdateMemoryInput = {
            user_id: user.id,
            recall_attempt_id: grade.attempt_id,
            transformation_id: transformationId,
            concepts_tested: conceptResults,
            raw_score: grade.raw_score,
            calibration_gap: grade.calibration_gap,
            confusion_map: grade.confusion_map,
            format_used: formatUsed,
            objective,
          };

          await updateMemoryAfterTest(memoryInput);
        } catch {
          // Memory update is non-blocking
        }
      }

      setPhase("completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la correction");
    } finally {
      setIsSubmitting(false);
    }
  }, [concepts, criticalKeys, confusionPairs, traps, testId, transformationId, user, formatUsed, objective]);

  const submitAnswer = useCallback((
    userAnswer: string,
    confidence: ConfidenceLevel,
  ) => {
    const item = items[currentIndex];
    if (!item) return;

    const isCorrect = evaluateAnswer(item, userAnswer);

    const answer: RecallAnswer = {
      item_id: item.id,
      answer: userAnswer,
      is_correct: isCorrect,
      confidence,
      concepts_tested: item.concepts_tested,
      time_taken_ms: 0,
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentIndex + 1 < items.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      // All answered — grade
      gradeAndDebrief(newAnswers);
    }
  }, [items, currentIndex, answers, gradeAndDebrief]);

  const currentItem = items[currentIndex] ?? null;
  const progress = items.length > 0 ? Math.round(((currentIndex) / items.length) * 100) : 0;

  const reset = useCallback(() => {
    setPhase("answering");
    setItems([]);
    setCurrentIndex(0);
    setAnswers([]);
    setGradeOutput(null);
    setDebrief(null);
    setIsSubmitting(false);
    setError(null);
  }, []);

  return {
    phase,
    items,
    currentItem,
    currentIndex,
    totalItems: items.length,
    progress,
    answers,
    gradeOutput,
    debrief,
    isSubmitting,
    error,
    startSession,
    submitAnswer,
    reset,
  };
}

function evaluateAnswer(item: RecallItem, userAnswer: string): boolean {
  if (item.type === "qcu") {
    return userAnswer === item.expected_answer;
  }
  if (item.type === "ordering" && Array.isArray(item.expected_answer)) {
    try {
      const parsed = JSON.parse(userAnswer);
      return JSON.stringify(parsed) === JSON.stringify(item.expected_answer);
    } catch {
      return false;
    }
  }
  // For open-ended types, do a basic similarity check
  const expected = typeof item.expected_answer === "string" ? item.expected_answer.toLowerCase() : "";
  const answer = userAnswer.toLowerCase().trim();
  if (answer.length === 0) return false;
  // Simple containment heuristic for local grading
  return answer.includes(expected.slice(0, 20)) || expected.includes(answer.slice(0, 20));
}
