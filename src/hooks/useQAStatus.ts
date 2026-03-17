// ============================================================
// Hook: useQAStatus — Run M7 QA and track status
// ============================================================

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { M7_Input, M7_Output } from "@/domain/cognitio/qa.contracts";
import type { QAReport, PublishDecision } from "@/domain/cognitio/qa.types";
import { runLocalTransformationQA, persistQAReport } from "@/services/cognitio/transformation-qa.service";

export function useQAStatus() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qaReport, setQaReport] = useState<QAReport | null>(null);
  const [publishDecision, setPublishDecision] = useState<PublishDecision | null>(null);

  const runQA = useCallback(async (input: M7_Input) => {
    setIsRunning(true);
    setError(null);

    try {
      const result: M7_Output = runLocalTransformationQA(input);
      setQaReport(result.qa_report);
      setPublishDecision(result.publish_decision);

      // Persist
      if (user) {
        try {
          await persistQAReport(result, user.id);
        } catch {
          // Non-blocking
        }
      }

      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur QA";
      setError(message);
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [user]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setError(null);
    setQaReport(null);
    setPublishDecision(null);
  }, []);

  return { isRunning, error, qaReport, publishDecision, runQA, reset };
}
