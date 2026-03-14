// ============================================================
// Hook: useRetentionMetrics — Track retention across time
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface RetentionData {
  missionId: string;
  missionTitle: string;
  j0Score: number | null;
  j1Score: number | null;
  j7Score: number | null;
  completedAt: string;
}

export function useRetentionMetrics() {
  const { user } = useAuth();
  const [data, setData] = useState<RetentionData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: runs, error } = await supabase
        .from("mission_runs")
        .select(`
          id,
          mission_id,
          completed_at,
          score_composite_json,
          generated_missions (mission_json),
          recall_tests (test_type, raw_score)
        `)
        .eq("user_id", user.id)
        .eq("completion_status", "completed")
        .order("completed_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const retention: RetentionData[] = (runs ?? []).map((run: Record<string, unknown>) => {
        const tests = (run.recall_tests ?? []) as { test_type: string; raw_score: number }[];
        const mission = run.generated_missions as { mission_json: { title?: string } } | null;

        return {
          missionId: run.mission_id as string,
          missionTitle: mission?.mission_json?.title ?? "Mission",
          j0Score: (run.score_composite_json as { accuracy?: number })?.accuracy ?? null,
          j1Score: tests.find((t) => t.test_type === "j1")?.raw_score ?? null,
          j7Score: tests.find((t) => t.test_type === "j7")?.raw_score ?? null,
          completedAt: run.completed_at as string,
        };
      });

      setData(retention);
    } catch (err) {
      console.error("Failed to fetch retention metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const avgRetention = {
    j0: average(data.map((d) => d.j0Score).filter(notNull)),
    j1: average(data.map((d) => d.j1Score).filter(notNull)),
    j7: average(data.map((d) => d.j7Score).filter(notNull)),
  };

  return { data, avgRetention, loading, refresh: fetch };
}

function notNull<T>(v: T | null): v is T {
  return v !== null;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
