// ============================================================
// ImmersiveEscapeEngine — Top-level orchestrator that converts
// the pedagogical pipeline output into a fully immersive
// adaptive 3D escape game session. Coordinates dependency
// graph, universe, rooms, puzzles, objects, and camera.
// ============================================================

import type { AnalyzedConcept, AnalyzedConfusionPair, DocumentDomain } from "@/domain/cognitio/contracts";
import type {
  ImmersiveGameConfig,
  DependencyGraph,
  UniverseConfig,
  PerformanceProfile,
  DifficultyProfile,
  PedagogicalObject,
  CameraWaypoint,
  UserKnowledgeGraph,
} from "@/domain/cognitio/immersiveEngine.types";
import type { EscapeGameSession } from "@/domain/cognitio/escapeEngine.types";

import { buildDependencyGraph, getConceptsForRoom } from "./dependencyGraph";
import { generateUniverseConfig } from "./universeGenerator";
import type { UniverseGeneratorInput } from "./universeGenerator";
import { generateRoomObjects, createMemoryTotem } from "./pedagogicalObjectSystem";
import { createDefaultCameraState, createRoomEntryWaypoint, createRoomOverviewWaypoint, createGuidedTourWaypoints } from "./cameraSystem";
import { detectPerformanceProfile } from "./scenePerformanceResolver";
import { createUserKnowledgeGraph, computeDifficultyProfile } from "./adaptiveLearningEngine";
import { getUniverseProfile } from "./immersiveUniverseProfiles";
import type { PremiumUniverseProfile } from "./immersiveUniverseProfiles";

// ---------- Types ----------

export interface ImmersiveEngineInput {
  user_id: string;
  mission_id: string;
  concepts: AnalyzedConcept[];
  confusion_pairs: AnalyzedConfusionPair[];
  domain: DocumentDomain;
  main_topic: string;
  reasoning_type: string;
  mission_universe_hint?: { domain: string; suggested_universe: string; reasoning_approach: string };
  section_titles?: string[];
  existing_session?: EscapeGameSession;
}

export interface ImmersiveEngineOutput {
  game_config: ImmersiveGameConfig;
  knowledge_graph: UserKnowledgeGraph;
  /** Immersive atmosphere profile for narrative enrichment */
  universe_profile: PremiumUniverseProfile;
  session_metadata: {
    total_rooms: number;
    total_objects: number;
    total_waypoints: number;
    render_mode: string;
    universe_theme: string;
  };
}

// ---------- Main Orchestrator ----------

export function buildImmersiveEscapeGame(
  input: ImmersiveEngineInput,
): ImmersiveEngineOutput {
  // Step 1: Build dependency graph from concepts
  const dependency_graph = buildDependencyGraph(
    input.concepts,
    input.confusion_pairs,
  );

  // Step 1b: Resolve immersive universe profile for this domain
  const universe_profile = getUniverseProfile(input.domain);

  // Step 2: Generate universe configuration
  const room_count = Math.max(3, Math.min(8, dependency_graph.cluster_count + 2));
  const universeInput: UniverseGeneratorInput = {
    domain: input.domain,
    main_topic: input.main_topic,
    reasoning_type: input.reasoning_type,
    mission_universe_hint: input.mission_universe_hint,
    room_count,
    section_titles: input.section_titles,
  };
  const universe_config = generateUniverseConfig(universeInput);

  // Step 3: Detect performance
  const performance_profile = detectPerformanceProfile();

  // Step 4: Initialize user knowledge graph
  const knowledge_graph = createUserKnowledgeGraph(
    input.user_id,
    input.mission_id,
    input.concepts.map(c => c.stable_key),
  );

  // Step 5: Compute initial difficulty
  const difficulty_profile = computeDifficultyProfile(knowledge_graph);

  // Step 6: Generate pedagogical objects per room cluster
  const pedagogical_objects = generateAllObjects(
    dependency_graph,
    universe_config,
    performance_profile,
  );

  // Step 7: Generate camera waypoints
  const camera_waypoints = generateAllWaypoints(
    dependency_graph,
    pedagogical_objects,
  );

  // Step 8: Assemble config
  const game_config: ImmersiveGameConfig = {
    dependency_graph,
    universe_config,
    performance_profile,
    difficulty_profile,
    pedagogical_objects,
    camera_waypoints,
  };

  return {
    game_config,
    knowledge_graph,
    universe_profile,
    session_metadata: {
      total_rooms: dependency_graph.cluster_count,
      total_objects: pedagogical_objects.length,
      total_waypoints: camera_waypoints.length,
      render_mode: performance_profile.render_mode,
      universe_theme: universe_config.theme,
    },
  };
}

// ---------- Object Generation ----------

function generateAllObjects(
  graph: DependencyGraph,
  universe: UniverseConfig,
  performance: PerformanceProfile,
): PedagogicalObject[] {
  const allObjects: PedagogicalObject[] = [];
  const maxPerRoom = Math.min(
    performance.max_objects,
    universe.room_templates[0]?.max_objects ?? 8,
  );

  // Get unique cluster IDs
  const clusterIds = [...new Set(
    graph.nodes
      .map(n => n.room_cluster_id)
      .filter((id): id is string => id !== null)
  )].sort();

  for (const clusterId of clusterIds) {
    const nodes = getConceptsForRoom(graph, clusterId);
    const limitedNodes = nodes.slice(0, maxPerRoom);
    const roomObjects = generateRoomObjects(
      clusterId,
      limitedNodes,
      graph,
      universe.theme,
    );
    allObjects.push(...roomObjects);
  }

  // Add memory totems for synthesis targets
  for (const targetId of graph.synthesis_targets) {
    const node = graph.nodes.find(n => n.id === targetId);
    if (node) {
      allObjects.push(createMemoryTotem(node, "memory_chamber"));
    }
  }

  return allObjects;
}

// ---------- Camera Waypoint Generation ----------

function generateAllWaypoints(
  graph: DependencyGraph,
  objects: PedagogicalObject[],
): CameraWaypoint[] {
  const waypoints: CameraWaypoint[] = [];

  // Get unique clusters
  const clusterIds = [...new Set(
    graph.nodes
      .map(n => n.room_cluster_id)
      .filter((id): id is string => id !== null)
  )].sort();

  // Room entry + overview waypoints
  for (let i = 0; i < clusterIds.length; i++) {
    const roomCenter = { x: 0, y: 0, z: i * -20 };
    waypoints.push(createRoomEntryWaypoint(i, roomCenter));
    waypoints.push(createRoomOverviewWaypoint(i, roomCenter));
  }

  // Object tour waypoints per room
  for (const clusterId of clusterIds) {
    const roomObjects = objects.filter(o => o.room_id === clusterId);
    const tourWaypoints = createGuidedTourWaypoints(roomObjects);
    waypoints.push(...tourWaypoints);
  }

  return waypoints;
}

// ---------- Session Update ----------

export function updateImmersiveSession(
  config: ImmersiveGameConfig,
  knowledgeGraph: UserKnowledgeGraph,
): ImmersiveGameConfig {
  // Recompute difficulty based on updated knowledge
  const difficulty_profile = computeDifficultyProfile(knowledgeGraph);

  return {
    ...config,
    difficulty_profile,
  };
}
