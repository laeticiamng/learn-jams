// ============================================================
// COGNITIO M8 Longitudinal Memory Contracts
// ============================================================

import type {
  ConceptMemoryNode,
  LearnerStateProfile,
  ConfusionEdge,
  FormatEffectivenessRecord,
  ReviewQueueItem,
  ProgressSnapshot,
  MemoryEvent,
} from "./longitudinal.types";
import type { ConfusionMapEntry } from "./recall.types";
import type { LearningObjective } from "./types";

// ---------- Update Memory ----------

export interface M8_UpdateMemoryInput {
  user_id: string;
  recall_attempt_id: string;
  transformation_id: string;
  concepts_tested: ConceptTestResult[];
  raw_score: number;
  calibration_gap: number;
  confusion_map: ConfusionMapEntry[];
  format_used: string;
  objective: LearningObjective;
}

export interface ConceptTestResult {
  concept_key: string;
  is_correct: boolean;
  confidence: number;
  calibration_gap: number;
}

export interface M8_UpdateMemoryOutput {
  updated_nodes: ConceptMemoryNode[];
  updated_confusion_edges: ConfusionEdge[];
  updated_format_effectiveness: FormatEffectivenessRecord | null;
  events: MemoryEvent[];
}

// ---------- Build Review Queue ----------

export interface M8_BuildReviewQueueInput {
  user_id: string;
}

export interface M8_BuildReviewQueueOutput {
  queue: ReviewQueueItem[];
  summary: {
    total: number;
    fragile: number;
    aging: number;
    high_confusion: number;
  };
}

// ---------- Refresh Learner Profile ----------

export interface M8_RefreshProfileInput {
  user_id: string;
}

export interface M8_RefreshProfileOutput {
  profile: LearnerStateProfile;
  snapshot: ProgressSnapshot;
  format_summary: FormatEffectivenessRecord[];
}
