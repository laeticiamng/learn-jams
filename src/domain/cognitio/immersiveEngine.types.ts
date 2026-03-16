// ============================================================
// Immersive Engine Types — Contracts for the adaptive 3D
// pedagogical escape-game engine layer.
// Extends existing escape game types with dependency graph,
// pedagogical objects, adaptive learning, universe generation,
// camera system, and performance resolution.
// ============================================================

import type { BloomLevel, ReasoningType } from "./types";
import type { AnalyzedConcept, AnalyzedConfusionPair, DocumentDomain } from "./contracts";

// ==================== DEPENDENCY GRAPH ====================

export type DependencyNodeRole =
  | "core"
  | "prerequisite"
  | "application"
  | "synthesis"
  | "confusion"
  | "gate"
  | "bridge";

export type DependencyEdgeRelation =
  | "requires"
  | "supports"
  | "contrasts_with"
  | "part_of"
  | "sequence_before"
  | "unlocks"
  | "confuses_with";

export interface DependencyNode {
  id: string;
  concept_key: string;
  label: string;
  definition: string;
  role: DependencyNodeRole;
  criticality: number; // 0-1
  bloom_target: BloomLevel;
  room_cluster_id: string | null;
  depth: number; // topological depth from root
  is_gate: boolean;
  is_synthesis_target: boolean;
  prerequisite_count: number;
  dependent_count: number;
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  relation: DependencyEdgeRelation;
  weight: number; // 0-1, strength of relation
}

export interface ConfusionZone {
  id: string;
  concept_a: string;
  concept_b: string;
  distinction_key: string;
  frequency: number;
  room_cluster_id: string | null;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  gates: string[]; // node IDs that act as progression gates
  synthesis_targets: string[]; // node IDs for final synthesis
  confusion_zones: ConfusionZone[];
  root_nodes: string[]; // entry points (no prerequisites)
  leaf_nodes: string[]; // terminal concepts
  max_depth: number;
  cluster_count: number;
}

// ==================== UNIVERSE GENERATION ====================

export type UniverseTheme =
  | "hospital_ward"
  | "epidemic_investigation"
  | "emergency_room"
  | "surgical_theater"
  | "pharmacy_lab"
  | "courtroom"
  | "legal_archives"
  | "investigation_office"
  | "cyber_lab"
  | "server_room"
  | "network_operations"
  | "archaeological_site"
  | "time_museum"
  | "archive_world"
  | "cell_world"
  | "molecular_facility"
  | "body_systems"
  | "physics_lab"
  | "observatory"
  | "chemistry_lab"
  | "math_workshop"
  | "economics_trading"
  | "philosophy_chamber"
  | "literary_salon"
  | "general_academy";

export interface UniverseConfig {
  theme: UniverseTheme;
  domain: DocumentDomain;
  color_palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    danger: string;
  };
  ambient_preset: string;
  room_templates: RoomTemplate[];
  object_aesthetic: ObjectAesthetic;
  lighting: LightingConfig;
  fog: FogConfig;
  narrative_vocabulary: string[];
}

export interface RoomTemplate {
  purpose: string;
  geometry: "rectangular" | "circular" | "hexagonal" | "corridor" | "amphitheater";
  size: "small" | "medium" | "large";
  aesthetic_tags: string[];
  max_objects: number;
  lighting_override?: Partial<LightingConfig>;
}

export interface ObjectAesthetic {
  material: "glass" | "metal" | "wood" | "digital" | "organic" | "stone" | "mixed";
  glow_intensity: number; // 0-1
  interaction_highlight_color: string;
  locked_appearance: "dimmed" | "chained" | "encrypted" | "sealed" | "frozen";
}

export interface LightingConfig {
  ambient_intensity: number;
  directional_intensity: number;
  point_light_count: number;
  color_temperature: "warm" | "neutral" | "cool" | "clinical";
  shadows: boolean;
}

export interface FogConfig {
  enabled: boolean;
  color: string;
  near: number;
  far: number;
}

// ==================== PEDAGOGICAL OBJECTS ====================

export type PedagogicalObjectType =
  | "concept_node"
  | "clue_object"
  | "relation_bridge"
  | "knowledge_key"
  | "protocol_assembler"
  | "diagnostic_console"
  | "gate_lock"
  | "memory_totem"
  | "evidence_board"
  | "timeline_fragment";

export type ObjectInteraction =
  | "inspect"
  | "rotate"
  | "zoom"
  | "compare"
  | "combine"
  | "classify"
  | "place"
  | "connect"
  | "trigger_puzzle"
  | "reveal_hint"
  | "show_explanation";

export type EducationalRole =
  | "concept_carrier"
  | "relation_visualizer"
  | "gate_keeper"
  | "clue_provider"
  | "assembly_piece"
  | "diagnostic_tool"
  | "memory_anchor"
  | "evidence_holder"
  | "timeline_piece"
  | "synthesis_component";

export type FeedbackMode =
  | "immediate"
  | "delayed"
  | "on_completion"
  | "on_combine"
  | "progressive";

export interface PedagogicalObject {
  id: string;
  type: PedagogicalObjectType;
  label: string;
  description: string;
  educational_role: EducationalRole;
  interaction_modes: ObjectInteraction[];
  linked_concepts: string[]; // concept stable_keys
  room_id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  can_unlock: string | null; // ID of what this unlocks
  requires_items: string[]; // inventory item IDs needed
  feedback_mode: FeedbackMode;
  state: "locked" | "available" | "discovered" | "collected" | "used";
  visual_preset: string;
  explanation_text: string;
  hint_text: string;
}

// ==================== ADAPTIVE LEARNING ====================

export type MasteryLevel =
  | "unknown"
  | "exposed"
  | "fragile"
  | "developing"
  | "stable"
  | "mastered";

export interface ConceptMastery {
  concept_key: string;
  mastery_level: MasteryLevel;
  accuracy: number; // 0-1
  attempts: number;
  last_seen: string; // ISO date
  response_times_ms: number[];
  hints_used: number;
  confusion_errors: number;
  confidence_calibration: number; // how well confidence matches accuracy
  next_review: string; // ISO date
  review_interval_days: number;
}

export interface UserKnowledgeGraph {
  user_id: string;
  mission_id: string;
  mastered_concepts: string[];
  weak_concepts: string[];
  exposed_concepts: string[];
  error_patterns: ErrorPattern[];
  confusion_pairs_missed: string[]; // confusion pair IDs
  avg_response_time_ms: number;
  hint_dependency_score: number; // 0-1, higher = more dependent
  confidence_score: number; // 0-1
  revisit_priority: ConceptRevisit[];
  concept_mastery: ConceptMastery[];
  session_count: number;
  total_time_sec: number;
  last_updated: string;
}

export interface ErrorPattern {
  pattern_type: "repeated_wrong" | "confusion_swap" | "overconfident" | "timeout" | "hint_dependent";
  concept_keys: string[];
  frequency: number;
  last_occurrence: string;
}

export interface ConceptRevisit {
  concept_key: string;
  priority: number; // 0-1
  reason: "failed" | "fragile" | "aging" | "confusion" | "low_confidence";
  recommended_format: string;
}

// ==================== ADAPTIVE DIFFICULTY ====================

export interface DifficultyProfile {
  base_difficulty: number; // 0-1
  adjusted_difficulty: number; // after adaptation
  hint_frequency: "minimal" | "moderate" | "generous";
  distractor_count: number;
  time_pressure: "none" | "gentle" | "moderate" | "strict";
  cognitive_load: "light" | "moderate" | "heavy";
  object_density: "sparse" | "normal" | "dense";
  assistance_level: "autonomous" | "guided" | "supported";
}

// ==================== CAMERA SYSTEM ====================

export type CameraMode =
  | "guided"
  | "exploration"
  | "inspect"
  | "focus"
  | "transition"
  | "overview";

export interface CameraState {
  mode: CameraMode;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
  zoom: number;
  transition_duration: number;
  locked: boolean;
}

export interface CameraWaypoint {
  id: string;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
  duration: number;
  easing: "linear" | "ease_in" | "ease_out" | "ease_in_out";
  trigger?: string; // event that triggers this waypoint
}

// ==================== PERFORMANCE / FALLBACK ====================

export type RenderMode =
  | "full_3d"
  | "lite_3d"
  | "pseudo_3d"
  | "fallback_2d";

export interface PerformanceProfile {
  render_mode: RenderMode;
  webgl_available: boolean;
  webgl2_available: boolean;
  max_texture_size: number;
  device_pixel_ratio: number;
  estimated_fps: number;
  gpu_tier: "low" | "medium" | "high" | "unknown";
  is_mobile: boolean;
  reduced_motion: boolean;
  memory_mb: number;
  shadows_enabled: boolean;
  post_processing: boolean;
  max_objects: number;
  particle_budget: number;
}

// ==================== ENHANCED DEBRIEF ====================

export interface ImmersiveDebrief {
  mission_id: string;
  user_id: string;
  timestamp: string;
  // Learning metrics
  concepts_learned: ConceptResult[];
  concepts_weak: ConceptResult[];
  confusion_zones_encountered: ConfusionZoneResult[];
  // Performance metrics
  total_puzzles: number;
  puzzles_correct: number;
  puzzles_incorrect: number;
  hints_used: number;
  total_time_sec: number;
  avg_response_time_ms: number;
  // Progression
  rooms_completed: number;
  rooms_total: number;
  objects_discovered: number;
  objects_total: number;
  inventory_items_collected: number;
  gates_unlocked: number;
  // Synthesis readiness
  synthesis_score: number; // 0-1
  bloom_coverage: Record<BloomLevel, number>;
  // Memory recommendations
  memory_chamber_concepts: string[];
  spaced_review_schedule: ReviewScheduleItem[];
  // Next actions
  recommended_next: "replay_weak" | "advance" | "review" | "memory_chamber";
}

export interface ConceptResult {
  concept_key: string;
  label: string;
  mastery_level: MasteryLevel;
  accuracy: number;
  attempts: number;
  hints_used: number;
}

export interface ConfusionZoneResult {
  concept_a: string;
  concept_b: string;
  discrimination_accuracy: number;
  needs_review: boolean;
}

export interface ReviewScheduleItem {
  concept_key: string;
  review_date: string; // ISO date
  review_type: "recognition" | "recall" | "generation" | "contrast" | "transfer";
  interval_days: number;
  source_room: string;
}

// ==================== IMMERSIVE GAME SESSION ====================

export interface ImmersiveGameConfig {
  dependency_graph: DependencyGraph;
  universe_config: UniverseConfig;
  performance_profile: PerformanceProfile;
  difficulty_profile: DifficultyProfile;
  pedagogical_objects: PedagogicalObject[];
  camera_waypoints: CameraWaypoint[];
}

// ==================== TEST FIXTURES ====================

export interface CourseFixture {
  id: string;
  domain: DocumentDomain;
  title: string;
  concepts: AnalyzedConcept[];
  confusion_pairs: AnalyzedConfusionPair[];
  reasoning_type: ReasoningType;
  main_topic: string;
  section_map: { title: string; level: number; content_summary: string }[];
  learning_core: string[];
}
