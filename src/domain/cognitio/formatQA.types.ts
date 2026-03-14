import type { ChosenFormat } from "./types";

// Extended format type that includes all output formats
export type OutputFormat = "escape_game" | "music" | "dynamic_sheet" | "animated_story" | "video";

// QA check severity
export type QACheckSeverity = "blocking" | "warning" | "info";

// Individual QA check result
export interface QACheckResult {
  check_id: string;
  check_name: string;
  passed: boolean;
  severity: QACheckSeverity;
  message: string;
  details?: string;
  auto_fixable?: boolean;
}

// Overall QA report for any format
export interface FormatQAReport {
  format: OutputFormat;
  generation_id: string;
  overall_score: number;       // 0-100
  publish_blocked: boolean;
  checks: QACheckResult[];
  blocking_violations: QACheckResult[];
  warnings: QACheckResult[];
  suggestions: string[];
  reviewed_at: string;
}

// Song-specific QA input
export interface SongQAInput {
  title: string;
  lyrics: string;
  style: string;
  duration_sec: number;
  concept_keys: string[];
  learning_objectives: string[];
  target_audience: string;
  language: string;
}

// Sheet-specific QA input
export interface SheetQAInput {
  title: string;
  sections: SheetSection[];
  concept_keys: string[];
  has_summary: boolean;
  has_key_points: boolean;
  has_exercises: boolean;
  total_word_count: number;
  language: string;
}

export interface SheetSection {
  title: string;
  content: string;
  has_visuals: boolean;
  concept_keys: string[];
}

// Story-specific QA input
export interface StoryQAInput {
  title: string;
  scenes: StoryScene[];
  narrative_arc: string;
  concept_keys: string[];
  learning_objectives: string[];
  estimated_duration_sec: number;
  language: string;
}

export interface StoryScene {
  scene_index: number;
  title: string;
  narration: string;
  visual_description: string;
  concept_keys: string[];
  interaction_type?: string;
}

// Video-specific QA input
export interface VideoQAInput {
  title: string;
  script: string;
  scenes: VideoScene[];
  total_duration_sec: number;
  concept_keys: string[];
  has_subtitles: boolean;
  has_voiceover: boolean;
  language: string;
}

export interface VideoScene {
  scene_index: number;
  duration_sec: number;
  script_text: string;
  visual_type: "animation" | "template" | "ai_generated" | "screen_recording";
  concept_keys: string[];
}
