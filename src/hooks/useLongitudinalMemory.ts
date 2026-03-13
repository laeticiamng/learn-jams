// ============================================================
// Hook: useLongitudinalMemory — Learner profile & knowledge graph
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getOrCreateLearnerProfile,
  getKnowledgeGraph,
  getFragileConcepts,
  getDueReviews,
} from "@/services/cognitio/longitudinal-trace.service";
import type { LearnerProfile, LearnerKnowledgeNode } from "@/domain/cognitio/types";

export function useLongitudinalMemory() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [knowledgeGraph, setKnowledgeGraph] = useState<LearnerKnowledgeNode[]>([]);
  const [fragileConcepts, setFragileConcepts] = useState<LearnerKnowledgeNode[]>([]);
  const [dueReviews, setDueReviews] = useState<LearnerKnowledgeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [p, kg, fc, dr] = await Promise.all([
        getOrCreateLearnerProfile(user.id),
        getKnowledgeGraph(user.id),
        getFragileConcepts(user.id),
        getDueReviews(user.id),
      ]);
      setProfile(p);
      setKnowledgeGraph(kg as unknown as LearnerKnowledgeNode[]);
      setFragileConcepts(fc as unknown as LearnerKnowledgeNode[]);
      setDueReviews(dr as unknown as LearnerKnowledgeNode[]);
    } catch (err) {
      console.error("Failed to load learner memory:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = {
    totalConcepts: knowledgeGraph.length,
    mastered: knowledgeGraph.filter((n) => n.mastery_status === "mastered").length,
    learning: knowledgeGraph.filter((n) => n.mastery_status === "learning").length,
    fragile: fragileConcepts.length,
    dueForReview: dueReviews.length,
  };

  return {
    profile,
    knowledgeGraph,
    fragileConcepts,
    dueReviews,
    stats,
    loading,
    refresh,
  };
}
