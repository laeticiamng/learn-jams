// ============================================================
// COGNITIO M5-B Story Types — Interactive Storyboard V1
// ============================================================

// ---------- Scene Types ----------

export type StorySceneType =
  | "contract_hook"
  | "anchoring"
  | "narrative_core"
  | "active_pause"
  | "clarity_peak"
  | "consolidation"
  | "disclaimer";

export const MANDATORY_SCENE_TYPES: StorySceneType[] = [
  "contract_hook",
  "anchoring",
  "narrative_core",
  "active_pause",
  "clarity_peak",
  "consolidation",
];

// ---------- Emotion Tag ----------

export type EmotionTag = "tension" | "surprise" | "identification" | "clarity";

// ---------- Render Mode ----------

export type StoryRenderMode = "interactive_storyboard_v1";

// ---------- Narrative Universe ----------

export type NarrativeUniverseStyle =
  | "school"
  | "daily_life"
  | "academic"
  | "professional"
  | "clinical";

// ---------- Guidance Level ----------

export type GuidanceLevel = "high" | "medium" | "light";

// ---------- Sentence Style ----------

export type SentenceStyle = "short" | "balanced" | "dense";

// ---------- Abstraction Level ----------

export type AbstractionLevel = "concrete" | "mixed" | "abstract";

// ---------- Scene Choice Option ----------

export interface SceneChoiceOption {
  id: string;
  label: string;
  is_best: boolean;
}

// ---------- Choice Widget ----------

export interface SceneChoiceWidget {
  prompt: string;
  options: SceneChoiceOption[];
}

// ---------- Feedback Reveal ----------

export interface SceneFeedbackReveal {
  corrective_explanation: string;
  concept_reinforced: string[];
}

// ---------- Confusion Event ----------

export interface ConfusionEvent {
  concept_a: string;
  concept_b: string;
  error_made: string;
  correction: string;
  distinction_key: string;
}

// ---------- Narrative Visual Anchor ----------

export interface NarrativeAnchor {
  image_desc: string;
  verbal_formula: string;
}

// ---------- Story Scene ----------

export interface StoryScene {
  scene_id: string;
  position: number;
  type: StorySceneType;
  title: string;
  visual_direction: string;
  narration: string;
  dialogue: string[] | null;
  concepts_covered: string[];
  visual_anchor: NarrativeAnchor | null;
  confusion_event: ConfusionEvent | null;
  choice_widget: SceneChoiceWidget | null;
  feedback_reveal: SceneFeedbackReveal | null;
  emotion_tag: EmotionTag | null;
}

// ---------- Audience Adaptation Report ----------

export interface AudienceAdaptationReport {
  vocabulary_level: "simple" | "intermediate" | "academic" | "technical";
  sentence_style: SentenceStyle;
  abstraction_level: AbstractionLevel;
  guidance_level: GuidanceLevel;
  narrative_universe_style: NarrativeUniverseStyle;
  adaptation_notes: string[];
}

// ---------- Story Source Disclaimer ----------

export interface StoryDisclaimer {
  confidence_level: number;
  uncertain_concepts: string[];
  contradictions: string[];
  ambiguities: string[];
}

// ---------- Story Metadata ----------

export interface StoryMetadata {
  document_id: string;
  course_profile_id: string;
  memory_architecture_id: string;
  format_decision_id: string;
  estimated_duration_sec: number;
  quality_flags: string[];
  audience_profile_used: string;
  document_difficulty_level: string | null;
  audience_mismatch_risk: number | null;
}

// ---------- Narrative Necessity Check ----------

export interface NarrativeNecessityCheck {
  is_necessary: boolean;
  reason: string;
  revert_candidate: boolean;
}
