// ============================================================
// COGNITIO M5 Generation Contracts — Input/Output
// ============================================================

import type { LearningObjective } from "./types";
import type { M2_Output } from "./contracts";
import type { M3_Output } from "./memory.contracts";
import type { M4_Output } from "./format.contracts";
import type { LearnerAudienceProfile } from "./learner-profile.types";
import type {
  ContentBlock,
  DynamicSheetMetadata,
  FinalTestItem,
  SourceDisclaimer,
  InternalSummary,
} from "./generation.types";

// ---------- M5 Input ----------

export interface M5_SourceDocument {
  document_id: string;
  word_count: number;
  source_type: string;
  confidence_level: number;
  source_issues: string[];
}

export interface M5_Input {
  m2_output: M2_Output;
  m3_output: M3_Output;
  m4_output: M4_Output;
  source_document: M5_SourceDocument;
  user_objective: LearningObjective;
  learner_profile?: LearnerAudienceProfile;
}

// ---------- M5 Output ----------

export interface M5_Output {
  transformation_id: string;
  format: "fiche_dynamique";
  metadata: DynamicSheetMetadata;
  internal_summary: InternalSummary;
  content_blocks: ContentBlock[];
  final_test: FinalTestItem[];
  source_disclaimer: SourceDisclaimer;
}
