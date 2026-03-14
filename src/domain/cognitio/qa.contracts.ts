// ============================================================
// COGNITIO M7 QA Contracts — Input/Output
// ============================================================

import type { M2_Output } from "./contracts";
import type { M3_Output } from "./memory.contracts";
import type { M4_Output } from "./format.contracts";
import type { M5_Output } from "./generation.contracts";
import type { M5B_Output } from "./story.contracts";
import type { M6_GenerateOutput } from "./recall.contracts";
import type {
  QAReport,
  QACheckResult,
  QAViolation,
  QAStatus,
  PublishDecision,
  PublishDecisionStatus,
} from "./qa.types";

// ---------- M7 Input ----------

export interface M7_Input {
  transformation_id: string;
  format: "fiche_dynamique" | "histoire_animee";

  // Generated content (one of these)
  m5_output?: M5_Output;
  m5b_output?: M5B_Output;

  // Pipeline context
  m2_output: M2_Output;
  m3_output: M3_Output;
  m4_output: M4_Output;

  // Recall tests generated
  recall_tests?: M6_GenerateOutput[];

  // Source metadata
  source_confidence: number;
  word_count: number;
}

// ---------- M7 Output ----------

export interface M7_Output {
  qa_report: QAReport;
  publish_decision: PublishDecision;
}
