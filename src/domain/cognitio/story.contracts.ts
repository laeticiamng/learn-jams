// ============================================================
// COGNITIO M5-B Story Contracts — Input/Output
// ============================================================

import type { LearningObjective } from "./types";
import type { M2_Output } from "./contracts";
import type { M3_Output } from "./memory.contracts";
import type { M4_Output } from "./format.contracts";
import type { LearnerAudienceProfile } from "./learner-profile.types";
import type {
  StoryScene,
  StoryRenderMode,
  AudienceAdaptationReport,
  StoryDisclaimer,
  StoryMetadata,
  NarrativeNecessityCheck,
} from "./story.types";

// ---------- M5B Input ----------

export interface M5B_SourceDocument {
  document_id: string;
  word_count: number;
  source_type: string;
  confidence_level: number;
  source_issues: string[];
}

export interface M5B_Input {
  m2_output: M2_Output;
  m3_output: M3_Output;
  m4_output: M4_Output;
  source_document: M5B_SourceDocument;
  user_objective: LearningObjective;
  learner_profile?: LearnerAudienceProfile;
}

// ---------- M5B Output ----------

export interface M5B_Output {
  transformation_id: string;
  format: "histoire_animee";
  render_mode: StoryRenderMode;
  scenes: StoryScene[];
  narrative_necessity: NarrativeNecessityCheck;
  audience_adaptation: AudienceAdaptationReport;
  disclaimer: StoryDisclaimer;
  metadata: StoryMetadata;
}
