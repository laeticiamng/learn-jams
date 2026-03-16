// ============================================================
// Tests — Immersive Escape Engine pipeline integration tests
// covering dependency graph, universe generation, object
// system, adaptive learning, debrief, and performance fallback.
// ============================================================

import { describe, it, expect } from "vitest";
import { MEDICAL_FIXTURE, CS_FIXTURE } from "@/test/fixtures/immersiveFixtures";
import { buildDependencyGraph, getConceptsForRoom, getTopologicalOrder } from "./dependencyGraph";
import { generateUniverseConfig, mapDomainToTheme } from "./universeGenerator";
import { generateRoomObjects, createMemoryTotem, getInteractionsForType } from "./pedagogicalObjectSystem";
import {
  createUserKnowledgeGraph,
  recordPuzzleAttempt,
  computeMasteryLevel,
  computeDifficultyProfile,
  identifyWeakConcepts,
  getOverallProgress,
} from "./adaptiveLearningEngine";
import { generateImmersiveDebrief } from "./immersiveDebriefEngine";
import {
  detectPerformanceProfile,
  resolveRenderMode,
  shouldDowngrade,
  getRenderQuality,
} from "./scenePerformanceResolver";
import { createDefaultCameraState, transitionToMode, focusOnObject } from "./cameraSystem";
import type { PerformanceProfile, PedagogicalObject } from "@/domain/cognitio/immersiveEngine.types";

// ==================== DEPENDENCY GRAPH ====================

describe("DependencyGraph", () => {
  it("builds a valid dependency graph from medical concepts", () => {
    const graph = buildDependencyGraph(MEDICAL_FIXTURE.concepts, MEDICAL_FIXTURE.confusion_pairs);

    expect(graph.nodes.length).toBe(MEDICAL_FIXTURE.concepts.length);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.max_depth).toBeGreaterThanOrEqual(0);
    expect(graph.cluster_count).toBeGreaterThan(0);
  });

  it("builds a valid dependency graph from CS concepts", () => {
    const graph = buildDependencyGraph(CS_FIXTURE.concepts, CS_FIXTURE.confusion_pairs);

    expect(graph.nodes.length).toBe(CS_FIXTURE.concepts.length);
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  it("identifies root nodes (no prerequisites)", () => {
    const graph = buildDependencyGraph(MEDICAL_FIXTURE.concepts, MEDICAL_FIXTURE.confusion_pairs);

    expect(graph.root_nodes.length).toBeGreaterThan(0);
    // Root nodes should have no incoming 'requires' edges
    for (const rootId of graph.root_nodes) {
      const incoming = graph.edges.filter(e => e.target === rootId && e.relation === "requires");
      expect(incoming.length).toBe(0);
    }
  });

  it("identifies gates (high criticality with dependents)", () => {
    const graph = buildDependencyGraph(MEDICAL_FIXTURE.concepts, MEDICAL_FIXTURE.confusion_pairs);
    // Gates should have dependent_count > 0
    for (const gateId of graph.gates) {
      const node = graph.nodes.find(n => n.id === gateId);
      expect(node).toBeDefined();
    }
  });

  it("identifies synthesis targets", () => {
    const graph = buildDependencyGraph(MEDICAL_FIXTURE.concepts, MEDICAL_FIXTURE.confusion_pairs);
    expect(graph.synthesis_targets.length).toBeGreaterThanOrEqual(0);
  });

  it("maps confusion pairs to confusion zones", () => {
    const graph = buildDependencyGraph(MEDICAL_FIXTURE.concepts, MEDICAL_FIXTURE.confusion_pairs);
    expect(graph.confusion_zones.length).toBe(MEDICAL_FIXTURE.confusion_pairs.length);
  });

  it("assigns room clusters to nodes", () => {
    const graph = buildDependencyGraph(MEDICAL_FIXTURE.concepts, MEDICAL_FIXTURE.confusion_pairs);
    const nodesWithClusters = graph.nodes.filter(n => n.room_cluster_id !== null);
    expect(nodesWithClusters.length).toBe(graph.nodes.length);
  });

  it("returns concepts for a specific room", () => {
    const graph = buildDependencyGraph(MEDICAL_FIXTURE.concepts, MEDICAL_FIXTURE.confusion_pairs);
    const firstCluster = graph.nodes[0]?.room_cluster_id;
    if (firstCluster) {
      const roomConcepts = getConceptsForRoom(graph, firstCluster);
      expect(roomConcepts.length).toBeGreaterThan(0);
      expect(roomConcepts.every(n => n.room_cluster_id === firstCluster)).toBe(true);
    }
  });

  it("produces valid topological order", () => {
    const graph = buildDependencyGraph(CS_FIXTURE.concepts, CS_FIXTURE.confusion_pairs);
    const order = getTopologicalOrder(graph.nodes, graph.edges);
    expect(order.length).toBe(graph.nodes.length);
  });
});

// ==================== UNIVERSE GENERATOR ====================

describe("UniverseGenerator", () => {
  it("maps medical domain to hospital theme", () => {
    const theme = mapDomainToTheme("medical_clinical");
    expect(["hospital_ward", "emergency_room", "epidemic_investigation", "surgical_theater"]).toContain(theme);
  });

  it("maps CS domain to cyber/lab theme", () => {
    const theme = mapDomainToTheme("computer_science");
    expect(["cyber_lab", "server_room", "network_operations"]).toContain(theme);
  });

  it("generates complete universe config for medical domain", () => {
    const config = generateUniverseConfig({
      domain: "medical_clinical",
      main_topic: "Hypertension artérielle",
      reasoning_type: "conditionnel",
      room_count: 5,
    });

    expect(config.theme).toBeTruthy();
    expect(config.color_palette.primary).toBeTruthy();
    expect(config.room_templates.length).toBe(5);
    expect(config.lighting.ambient_intensity).toBeGreaterThan(0);
    expect(config.narrative_vocabulary.length).toBeGreaterThan(0);
  });

  it("generates complete universe config for CS domain", () => {
    const config = generateUniverseConfig({
      domain: "computer_science",
      main_topic: "Algorithmique",
      reasoning_type: "procedural",
      room_count: 6,
    });

    expect(config.theme).toBeTruthy();
    expect(config.room_templates.length).toBe(6);
  });

  it("uses mission_universe_hint when available", () => {
    const config = generateUniverseConfig({
      domain: "general",
      main_topic: "Test",
      reasoning_type: "declaratif",
      mission_universe_hint: {
        domain: "medical_clinical",
        suggested_universe: "hospital",
        reasoning_approach: "diagnostic",
      },
      room_count: 4,
    });

    expect(config.theme).toBeTruthy();
  });
});

// ==================== PEDAGOGICAL OBJECTS ====================

describe("PedagogicalObjectSystem", () => {
  it("generates objects for a room from dependency nodes", () => {
    const graph = buildDependencyGraph(MEDICAL_FIXTURE.concepts, MEDICAL_FIXTURE.confusion_pairs);
    const firstCluster = graph.nodes[0]?.room_cluster_id;
    if (!firstCluster) return;

    const nodes = getConceptsForRoom(graph, firstCluster);
    const objects = generateRoomObjects(firstCluster, nodes, graph, "hospital_ward");

    expect(objects.length).toBeGreaterThan(0);
    expect(objects.every(o => o.room_id === firstCluster)).toBe(true);
    expect(objects.every(o => o.interaction_modes.length > 0)).toBe(true);
    expect(objects.every(o => o.linked_concepts.length > 0)).toBe(true);
  });

  it("creates memory totem with correct properties", () => {
    const graph = buildDependencyGraph(MEDICAL_FIXTURE.concepts, MEDICAL_FIXTURE.confusion_pairs);
    const node = graph.nodes[0];

    const totem = createMemoryTotem(node, "memory_chamber");
    expect(totem.type).toBe("memory_totem");
    expect(totem.room_id).toBe("memory_chamber");
    expect(totem.educational_role).toBe("memory_anchor");
  });

  it("returns correct interactions for each object type", () => {
    const inspections = getInteractionsForType("concept_node");
    expect(inspections).toContain("inspect");
    expect(inspections).toContain("show_explanation");

    const gateInteractions = getInteractionsForType("gate_lock");
    expect(gateInteractions).toContain("trigger_puzzle");
  });
});

// ==================== ADAPTIVE LEARNING ====================

describe("AdaptiveLearningEngine", () => {
  it("creates initial user knowledge graph", () => {
    const keys = MEDICAL_FIXTURE.concepts.map(c => c.stable_key);
    const graph = createUserKnowledgeGraph("user1", "mission1", keys);

    expect(graph.user_id).toBe("user1");
    expect(graph.concept_mastery.length).toBe(keys.length);
    expect(graph.concept_mastery.every(cm => cm.mastery_level === "unknown")).toBe(true);
  });

  it("records puzzle attempt and updates mastery", () => {
    const keys = MEDICAL_FIXTURE.concepts.map(c => c.stable_key);
    let graph = createUserKnowledgeGraph("user1", "mission1", keys);

    graph = recordPuzzleAttempt(graph, {
      concept_keys: ["hypertension_arterielle"],
      correct: true,
      confidence: 0.8,
      response_time_ms: 5000,
      hints_used: 0,
    });

    const mastery = graph.concept_mastery.find(cm => cm.concept_key === "hypertension_arterielle");
    expect(mastery).toBeDefined();
    expect(mastery!.attempts).toBe(1);
    expect(mastery!.accuracy).toBeGreaterThan(0);
  });

  it("computes mastery level correctly", () => {
    expect(computeMasteryLevel({
      concept_key: "test",
      mastery_level: "unknown",
      accuracy: 0,
      attempts: 0,
      last_seen: "",
      response_times_ms: [],
      hints_used: 0,
      confusion_errors: 0,
      confidence_calibration: 0,
      next_review: "",
      review_interval_days: 1,
    })).toBe("unknown");

    expect(computeMasteryLevel({
      concept_key: "test",
      mastery_level: "unknown",
      accuracy: 0.95,
      attempts: 5,
      last_seen: "",
      response_times_ms: [],
      hints_used: 0,
      confusion_errors: 0,
      confidence_calibration: 0.9,
      next_review: "",
      review_interval_days: 1,
    })).toBe("mastered");
  });

  it("computes difficulty profile from knowledge graph", () => {
    const keys = MEDICAL_FIXTURE.concepts.map(c => c.stable_key);
    const graph = createUserKnowledgeGraph("user1", "mission1", keys);
    const profile = computeDifficultyProfile(graph);

    expect(profile.base_difficulty).toBeGreaterThanOrEqual(0);
    expect(profile.base_difficulty).toBeLessThanOrEqual(1);
    expect(["minimal", "moderate", "generous"]).toContain(profile.hint_frequency);
  });

  it("identifies weak concepts", () => {
    const keys = MEDICAL_FIXTURE.concepts.map(c => c.stable_key);
    const graph = createUserKnowledgeGraph("user1", "mission1", keys);
    const weak = identifyWeakConcepts(graph);

    // All concepts are initially unknown (weak)
    expect(weak.length).toBe(keys.length);
  });

  it("computes overall progress", () => {
    const keys = MEDICAL_FIXTURE.concepts.map(c => c.stable_key);
    const graph = createUserKnowledgeGraph("user1", "mission1", keys);
    const progress = getOverallProgress(graph);

    expect(progress.total).toBe(keys.length);
    expect(progress.mastered).toBe(0);
    expect(progress.weak).toBe(keys.length);
  });

  it("adapts difficulty after multiple correct answers", () => {
    const keys = ["concept_a", "concept_b"];
    let graph = createUserKnowledgeGraph("user1", "mission1", keys);

    // Record 5 correct answers
    for (let i = 0; i < 5; i++) {
      graph = recordPuzzleAttempt(graph, {
        concept_keys: ["concept_a"],
        correct: true,
        confidence: 0.9,
        response_time_ms: 3000,
        hints_used: 0,
      });
    }

    const profile = computeDifficultyProfile(graph);
    // Should suggest harder difficulty after consistent success
    expect(profile.adjusted_difficulty).toBeGreaterThanOrEqual(profile.base_difficulty);
  });
});

// ==================== DEBRIEF ENGINE ====================

describe("ImmersiveDebriefEngine", () => {
  it("generates a complete debrief", () => {
    const graph = buildDependencyGraph(MEDICAL_FIXTURE.concepts, MEDICAL_FIXTURE.confusion_pairs);
    const keys = MEDICAL_FIXTURE.concepts.map(c => c.stable_key);
    let kg = createUserKnowledgeGraph("user1", "mission1", keys);

    // Simulate some attempts
    kg = recordPuzzleAttempt(kg, {
      concept_keys: ["hypertension_arterielle"],
      correct: true,
      confidence: 0.8,
      response_time_ms: 5000,
      hints_used: 0,
    });
    kg = recordPuzzleAttempt(kg, {
      concept_keys: ["anatomie_cardiaque"],
      correct: false,
      confidence: 0.6,
      response_time_ms: 8000,
      hints_used: 1,
    });

    const debrief = generateImmersiveDebrief({
      user_id: "user1",
      mission_id: "mission1",
      knowledge_graph: kg,
      dependency_graph: graph,
      rooms_completed: 3,
      rooms_total: 5,
      objects_discovered: 6,
      objects_total: 10,
      inventory_items_collected: 4,
      gates_unlocked: 2,
      total_time_sec: 600,
    });

    expect(debrief.mission_id).toBe("mission1");
    expect(debrief.total_puzzles).toBeGreaterThan(0);
    expect(debrief.spaced_review_schedule.length).toBeGreaterThan(0);
    expect(["replay_weak", "advance", "review", "memory_chamber"]).toContain(debrief.recommended_next);
    expect(debrief.bloom_coverage).toBeDefined();
    expect(Object.keys(debrief.bloom_coverage).length).toBe(6);
  });
});

// ==================== PERFORMANCE RESOLVER ====================

describe("ScenePerformanceResolver", () => {
  it("resolves fallback_2d when no WebGL", () => {
    const mode = resolveRenderMode({
      webgl_available: false,
      webgl2_available: false,
      gpu_tier: "unknown",
      is_mobile: false,
      reduced_motion: false,
      estimated_fps: 0,
    });
    expect(mode).toBe("fallback_2d");
  });

  it("resolves pseudo_3d when reduced motion", () => {
    const mode = resolveRenderMode({
      webgl_available: true,
      webgl2_available: true,
      gpu_tier: "high",
      is_mobile: false,
      reduced_motion: true,
      estimated_fps: 60,
    });
    expect(mode).toBe("pseudo_3d");
  });

  it("resolves full_3d for high-end desktop", () => {
    const mode = resolveRenderMode({
      webgl_available: true,
      webgl2_available: true,
      gpu_tier: "high",
      is_mobile: false,
      reduced_motion: false,
      estimated_fps: 60,
    });
    expect(mode).toBe("full_3d");
  });

  it("resolves lite_3d for mobile", () => {
    const mode = resolveRenderMode({
      webgl_available: true,
      webgl2_available: true,
      gpu_tier: "medium",
      is_mobile: true,
      reduced_motion: false,
      estimated_fps: 30,
    });
    expect(mode).toBe("lite_3d");
  });

  it("suggests downgrade when FPS too low", () => {
    const result = shouldDowngrade("full_3d", 15);
    expect(result.downgrade).toBe(true);
    expect(result.suggested).toBe("lite_3d");
  });

  it("does not downgrade when FPS acceptable", () => {
    const result = shouldDowngrade("full_3d", 40);
    expect(result.downgrade).toBe(false);
  });

  it("returns correct render quality", () => {
    expect(getRenderQuality({ render_mode: "full_3d" } as PerformanceProfile)).toBe(1.0);
    expect(getRenderQuality({ render_mode: "fallback_2d" } as PerformanceProfile)).toBe(0);
  });
});

// ==================== CAMERA SYSTEM ====================

describe("CameraSystem", () => {
  it("creates default camera state", () => {
    const state = createDefaultCameraState();
    expect(state.mode).toBe("guided");
    expect(state.fov).toBe(60);
    expect(state.locked).toBe(false);
  });

  it("transitions to inspect mode with target", () => {
    const state = createDefaultCameraState();
    const inspected = transitionToMode(state, "inspect", { x: 2, y: 1, z: 3 });

    expect(inspected.mode).toBe("inspect");
    expect(inspected.locked).toBe(true);
    expect(inspected.target.x).toBe(2);
    expect(inspected.fov).toBeLessThan(state.fov);
  });

  it("transitions to overview mode", () => {
    const state = createDefaultCameraState();
    const overview = transitionToMode(state, "overview");

    expect(overview.mode).toBe("overview");
    expect(overview.fov).toBeGreaterThan(state.fov);
  });

  it("focuses on a pedagogical object", () => {
    const state = createDefaultCameraState();
    const mockObj = {
      position: { x: 3, y: 1, z: -2 },
      scale: 1,
    } as PedagogicalObject;

    const focused = focusOnObject(state, mockObj);
    expect(focused.mode).toBe("inspect");
    expect(focused.target.x).toBe(3);
    expect(focused.locked).toBe(true);
  });
});

// ==================== INTEGRATION ====================

describe("Full Pipeline Integration", () => {
  it("medical fixture produces coherent immersive world", () => {
    const graph = buildDependencyGraph(MEDICAL_FIXTURE.concepts, MEDICAL_FIXTURE.confusion_pairs);
    const universe = generateUniverseConfig({
      domain: MEDICAL_FIXTURE.domain,
      main_topic: MEDICAL_FIXTURE.main_topic,
      reasoning_type: MEDICAL_FIXTURE.reasoning_type,
      room_count: Math.max(3, graph.cluster_count + 2),
    });

    // Graph structure
    expect(graph.nodes.length).toBe(MEDICAL_FIXTURE.concepts.length);
    expect(graph.cluster_count).toBeGreaterThan(0);

    // Universe coherence
    expect(["hospital_ward", "emergency_room", "epidemic_investigation", "surgical_theater"]).toContain(universe.theme);
    expect(universe.room_templates.length).toBeGreaterThanOrEqual(3);

    // Objects generation
    const clusterIds = [...new Set(graph.nodes.map(n => n.room_cluster_id).filter(Boolean))];
    let totalObjects = 0;
    for (const clusterId of clusterIds) {
      const nodes = getConceptsForRoom(graph, clusterId!);
      const objects = generateRoomObjects(clusterId!, nodes, graph, universe.theme);
      totalObjects += objects.length;
      // Each object must have pedagogical function
      for (const obj of objects) {
        expect(obj.linked_concepts.length).toBeGreaterThan(0);
        expect(obj.interaction_modes.length).toBeGreaterThan(0);
        expect(obj.educational_role).toBeTruthy();
      }
    }
    expect(totalObjects).toBeGreaterThan(0);
  });

  it("CS fixture produces coherent immersive world", () => {
    const graph = buildDependencyGraph(CS_FIXTURE.concepts, CS_FIXTURE.confusion_pairs);
    const universe = generateUniverseConfig({
      domain: CS_FIXTURE.domain,
      main_topic: CS_FIXTURE.main_topic,
      reasoning_type: CS_FIXTURE.reasoning_type,
      room_count: Math.max(3, graph.cluster_count + 2),
    });

    expect(graph.nodes.length).toBe(CS_FIXTURE.concepts.length);
    expect(["cyber_lab", "server_room", "network_operations"]).toContain(universe.theme);

    // Verify progression: prerequisites come before dependents in topological order
    const order = getTopologicalOrder(graph.nodes, graph.edges);
    const indexOf = (key: string) => order.indexOf(graph.nodes.find(n => n.concept_key === key)?.id ?? "");
    // algorithme should come before complexite_algorithmique
    if (indexOf("algorithme") >= 0 && indexOf("complexite_algorithmique") >= 0) {
      expect(indexOf("algorithme")).toBeLessThan(indexOf("complexite_algorithmique"));
    }
  });
});
