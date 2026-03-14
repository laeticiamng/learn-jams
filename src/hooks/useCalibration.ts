// ============================================================
// Hook: useCalibration — Onboarding calibration mission
// ============================================================

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { updateLearnerProfile, getOrCreateLearnerProfile } from "@/services/cognitio/longitudinal-trace.service";
import type { LearnerProfileStatus } from "@/domain/cognitio/types";

export interface CalibrationStep {
  question: string;
  options: string[];
  correct: string;
}

// Seed calibration questions — domain-agnostic
const CALIBRATION_QUESTIONS: CalibrationStep[] = [
  {
    question: "Quelle est la capitale de la France ?",
    options: ["Paris", "Lyon", "Marseille", "Bordeaux"],
    correct: "Paris",
  },
  {
    question: "Combien de planètes compte le système solaire ?",
    options: ["7", "8", "9", "10"],
    correct: "8",
  },
  {
    question: "Quel organe produit l'insuline ?",
    options: ["Foie", "Pancréas", "Rein", "Estomac"],
    correct: "Pancréas",
  },
  {
    question: "Quelle est la formule chimique de l'eau ?",
    options: ["H2O", "CO2", "NaCl", "O2"],
    correct: "H2O",
  },
  {
    question: "En quelle année a commencé la Première Guerre mondiale ?",
    options: ["1912", "1914", "1916", "1918"],
    correct: "1914",
  },
];

export function useCalibration() {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ correct: boolean; confidence: number }[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = CALIBRATION_QUESTIONS[currentIndex] ?? null;
  const progress = Math.round((currentIndex / CALIBRATION_QUESTIONS.length) * 100);

  const submitAnswer = useCallback(
    async (answer: string, confidence: number) => {
      if (!currentQuestion) return;

      const correct = answer === currentQuestion.correct;
      const newAnswers = [...answers, { correct, confidence }];
      setAnswers(newAnswers);

      if (currentIndex < CALIBRATION_QUESTIONS.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        // Calibration complete
        setIsSubmitting(true);
        try {
          if (user) {
            await getOrCreateLearnerProfile(user.id);
            const accuracy = newAnswers.filter((a) => a.correct).length / newAnswers.length;
            const level = accuracy >= 0.8 ? "advanced" : accuracy >= 0.5 ? "intermediate" : "beginner";
            await updateLearnerProfile(user.id, {
              profile_status: "calibrated" as LearnerProfileStatus,
              level_declared: level,
              calibration_sessions_count: 1,
            });
          }
        } finally {
          setIsSubmitting(false);
          setIsCompleted(true);
        }
      }
    },
    [currentIndex, currentQuestion, answers, user]
  );

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setAnswers([]);
    setIsCompleted(false);
  }, []);

  return {
    currentQuestion,
    currentIndex,
    totalQuestions: CALIBRATION_QUESTIONS.length,
    progress,
    answers,
    isCompleted,
    isSubmitting,
    submitAnswer,
    reset,
  };
}
