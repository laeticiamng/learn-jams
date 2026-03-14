// ============================================================
// Hook: useReviewQueue — Load and manage review queue
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { ReviewQueueItem } from "@/domain/cognitio/longitudinal.types";
import { getReviewQueue, markReviewCompleted } from "@/services/cognitio/review-queue.service";

export function useReviewQueue() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const items = await getReviewQueue(user.id);
      setQueue(items);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const complete = useCallback(async (reviewId: string) => {
    try {
      await markReviewCompleted(reviewId);
      setQueue((prev) => prev.filter((item) => item.id !== reviewId));
    } catch {
      // Non-blocking
    }
  }, []);

  const stats = {
    total: queue.length,
    fragile: queue.filter((q) => q.reason === "fragile").length,
    aging: queue.filter((q) => q.reason === "aging").length,
    highConfusion: queue.filter((q) => q.reason === "high_confusion").length,
    dueToday: queue.filter((q) => new Date(q.due_at) <= new Date()).length,
  };

  return { queue, loading, stats, refresh, complete };
}
