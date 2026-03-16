// ============================================================
// PedagogicalObjectSystem — Knowledge carrier objects for
// the 3D escape game. Each object serves a pedagogical
// function: concept visualization, relation materialization,
// puzzle interaction, or memory anchoring.
// ============================================================

import type {
  PedagogicalObject,
  PedagogicalObjectType,
  ObjectInteraction,
  EducationalRole,
  FeedbackMode,
  DependencyNode,
  DependencyGraph,
  UniverseTheme,
} from "@/domain/cognitio/immersiveEngine.types";

// --------------- type → role mapping ---------------

const NODE_ROLE_TO_OBJECT_TYPE: Record<string, PedagogicalObjectType> = {
  core: "concept_node",
  prerequisite: "knowledge_key",
  application: "diagnostic_console",
  synthesis: "protocol_assembler",
  confusion: "evidence_board",
  gate: "gate_lock",
  bridge: "relation_bridge",
};

// --------------- interactions per type ---------------

const INTERACTIONS_BY_TYPE: Record<PedagogicalObjectType, ObjectInteraction[]> = {
  concept_node: ["inspect", "rotate", "show_explanation"],
  clue_object: ["inspect", "zoom", "reveal_hint"],
  relation_bridge: ["inspect", "connect", "compare"],
  knowledge_key: ["inspect", "combine", "trigger_puzzle"],
  protocol_assembler: ["inspect", "place", "combine", "trigger_puzzle"],
  diagnostic_console: ["inspect", "classify", "trigger_puzzle"],
  gate_lock: ["inspect", "trigger_puzzle"],
  memory_totem: ["inspect", "rotate", "show_explanation"],
  evidence_board: ["inspect", "compare", "classify", "place"],
  timeline_fragment: ["inspect", "place", "connect"],
};

// --------------- educational role per type ---------------

const EDUCATIONAL_ROLE_BY_TYPE: Record<PedagogicalObjectType, EducationalRole> = {
  concept_node: "concept_carrier",
  clue_object: "clue_provider",
  relation_bridge: "relation_visualizer",
  knowledge_key: "assembly_piece",
  protocol_assembler: "synthesis_component",
  diagnostic_console: "diagnostic_tool",
  gate_lock: "gate_keeper",
  memory_totem: "memory_anchor",
  evidence_board: "evidence_holder",
  timeline_fragment: "timeline_piece",
};

// --------------- feedback mode per type ---------------

const FEEDBACK_MODE_BY_TYPE: Record<PedagogicalObjectType, FeedbackMode> = {
  concept_node: "immediate",
  clue_object: "progressive",
  relation_bridge: "on_combine",
  knowledge_key: "on_combine",
  protocol_assembler: "on_completion",
  diagnostic_console: "delayed",
  gate_lock: "on_completion",
  memory_totem: "immediate",
  evidence_board: "progressive",
  timeline_fragment: "on_combine",
};

// --------------- visual presets ---------------

const VISUAL_PRESETS: Record<string, Record<string, string>> = {
  concept_node: {
    hospital_ward: "glass_orb_blue",
    epidemic_investigation: "glass_orb_green",
    emergency_room: "glass_orb_red",
    surgical_theater: "glass_orb_white",
    pharmacy_lab: "glass_orb_cyan",
    courtroom: "wood_book_gold",
    legal_archives: "wood_book_brown",
    investigation_office: "glass_orb_amber",
    cyber_lab: "hologram_cube_cyan",
    server_room: "hologram_cube_blue",
    network_operations: "hologram_cube_green",
    archaeological_site: "stone_sphere_sand",
    time_museum: "glass_orb_gold",
    archive_world: "wood_book_dark",
    cell_world: "organic_sphere_green",
    molecular_facility: "glass_orb_purple",
    body_systems: "organic_sphere_red",
    physics_lab: "metal_sphere_silver",
    observatory: "glass_orb_indigo",
    chemistry_lab: "glass_flask_green",
    math_workshop: "metal_polyhedron_blue",
    economics_trading: "glass_orb_gold",
    philosophy_chamber: "stone_sphere_marble",
    literary_salon: "wood_book_crimson",
    general_academy: "glass_orb_blue",
  },
  gate_lock: {
    _default_medical: "metal_lock_silver",
    _default_legal: "wood_lock_gold",
    _default_tech: "digital_lock_cyan",
    _default_science: "metal_lock_blue",
    _default: "metal_lock_dark",
  },
};

// --------------- helpers ---------------

function generateId(prefix: string): string {
  const random = Math.random().toString(36).substring(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${random}`;
}

function getThemeCategory(theme: UniverseTheme): string {
  const medical: UniverseTheme[] = [
    "hospital_ward",
    "epidemic_investigation",
    "emergency_room",
    "surgical_theater",
    "pharmacy_lab",
    "cell_world",
    "molecular_facility",
    "body_systems",
  ];
  const legal: UniverseTheme[] = ["courtroom", "legal_archives", "investigation_office"];
  const tech: UniverseTheme[] = ["cyber_lab", "server_room", "network_operations"];
  const science: UniverseTheme[] = [
    "physics_lab",
    "observatory",
    "chemistry_lab",
    "math_workshop",
  ];

  if (medical.includes(theme)) return "medical";
  if (legal.includes(theme)) return "legal";
  if (tech.includes(theme)) return "tech";
  if (science.includes(theme)) return "science";
  return "general";
}

// --------------- room size dimensions ---------------

const ROOM_RADIUS: Record<"small" | "medium" | "large", number> = {
  small: 3,
  medium: 5,
  large: 8,
};

// ==================== PUBLIC API ====================

/**
 * Convert dependency graph nodes assigned to a room into 3D pedagogical objects.
 */
export function generateRoomObjects(
  roomId: string,
  nodes: DependencyNode[],
  graph: DependencyGraph,
  theme: UniverseTheme,
): PedagogicalObject[] {
  const objects: PedagogicalObject[] = [];
  const total = nodes.length;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const objectType = NODE_ROLE_TO_OBJECT_TYPE[node.role] ?? "concept_node";

    // If this is a gate node, find which room it unlocks
    if (node.is_gate && objectType === "gate_lock") {
      const unlocksRoom = resolveGateTarget(node, graph);
      objects.push(createGateLockObject(node, roomId, unlocksRoom));
      continue;
    }

    const position = generateObjectPosition(i, total, "medium");

    const obj: PedagogicalObject = {
      id: generateId("pobj"),
      type: objectType,
      label: node.label,
      description: node.definition,
      educational_role: getEducationalRole(objectType),
      interaction_modes: getInteractionsForType(objectType),
      linked_concepts: [node.concept_key],
      room_id: roomId,
      position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: scaleForCriticality(node.criticality),
      can_unlock: null,
      requires_items: [],
      feedback_mode: FEEDBACK_MODE_BY_TYPE[objectType] ?? "immediate",
      state: node.depth === 0 ? "available" : "locked",
      visual_preset: getVisualPreset(objectType, theme),
      explanation_text: node.definition,
      hint_text: buildHintText(node),
    };

    objects.push(obj);
  }

  return objects;
}

/**
 * Distribute objects in a circular pattern within a room.
 * Returns a position vector {x, y, z}.
 */
export function generateObjectPosition(
  index: number,
  total: number,
  roomSize: "small" | "medium" | "large",
): { x: number; y: number; z: number } {
  const radius = ROOM_RADIUS[roomSize];

  if (total <= 1) {
    return { x: 0, y: 1.0, z: 0 };
  }

  // Use a circle for small counts, grid for larger counts
  if (total <= 8) {
    const angle = (2 * Math.PI * index) / total;
    const r = radius * 0.7;
    return {
      x: Math.round(r * Math.cos(angle) * 100) / 100,
      y: 0.5 + (index % 3) * 0.5, // stagger height between 0.5 and 1.5
      z: Math.round(r * Math.sin(angle) * 100) / 100,
    };
  }

  // Grid layout for larger counts
  const cols = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const spacing = (radius * 2) / (cols + 1);

  return {
    x: Math.round((-radius + spacing * (col + 1)) * 100) / 100,
    y: 0.5 + (index % 3) * 0.5,
    z: Math.round((-radius + spacing * (row + 1)) * 100) / 100,
  };
}

/**
 * Return the list of allowed interactions for a given object type.
 */
export function getInteractionsForType(type: PedagogicalObjectType): ObjectInteraction[] {
  return INTERACTIONS_BY_TYPE[type] ?? ["inspect"];
}

/**
 * Return the educational role that maps to a given object type.
 */
export function getEducationalRole(type: PedagogicalObjectType): EducationalRole {
  return EDUCATIONAL_ROLE_BY_TYPE[type] ?? "concept_carrier";
}

/**
 * Produce a visual preset string based on object type and universe theme.
 * Format: "<material>_<shape>_<accent>" e.g. "glass_orb_blue".
 */
export function getVisualPreset(type: PedagogicalObjectType, theme: UniverseTheme): string {
  const typePresets = VISUAL_PRESETS[type];
  if (typePresets) {
    if (typePresets[theme]) return typePresets[theme];
    // Fallback by theme category
    const cat = getThemeCategory(theme);
    const catKey = `_default_${cat}`;
    if (typePresets[catKey]) return typePresets[catKey];
    if (typePresets._default) return typePresets._default;
  }

  // Generic fallback using theme category
  const category = getThemeCategory(theme);
  const materialMap: Record<string, string> = {
    medical: "glass",
    legal: "wood",
    tech: "hologram",
    science: "metal",
    general: "glass",
  };
  const accentMap: Record<string, string> = {
    medical: "blue",
    legal: "gold",
    tech: "cyan",
    science: "silver",
    general: "blue",
  };

  const material = materialMap[category] ?? "glass";
  const accent = accentMap[category] ?? "blue";
  const shape = type.replace(/_/g, "");
  return `${material}_${shape}_${accent}`;
}

/**
 * Create a gate lock object that blocks progression until a puzzle is solved.
 */
export function createGateLockObject(
  gateNode: DependencyNode,
  roomId: string,
  unlocksRoomId: string,
): PedagogicalObject {
  return {
    id: generateId("gate"),
    type: "gate_lock",
    label: `Gate: ${gateNode.label}`,
    description: `Demonstrate mastery of "${gateNode.label}" to unlock the next area.`,
    educational_role: "gate_keeper",
    interaction_modes: getInteractionsForType("gate_lock"),
    linked_concepts: [gateNode.concept_key],
    room_id: roomId,
    position: { x: 0, y: 1.2, z: -4 }, // centered at the far wall
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1.5,
    can_unlock: unlocksRoomId,
    requires_items: [],
    feedback_mode: "on_completion",
    state: "locked",
    visual_preset: getVisualPreset("gate_lock", "general_academy"),
    explanation_text: gateNode.definition,
    hint_text: `You need to understand "${gateNode.label}" before proceeding.`,
  };
}

/**
 * Create a memory totem for the debrief / memory chamber.
 * Memory totems serve as spaced-repetition anchors.
 */
export function createMemoryTotem(
  node: DependencyNode,
  roomId: string,
): PedagogicalObject {
  return {
    id: generateId("totem"),
    type: "memory_totem",
    label: `Memory: ${node.label}`,
    description: `A memory anchor for "${node.label}". Interact to reinforce your understanding.`,
    educational_role: "memory_anchor",
    interaction_modes: getInteractionsForType("memory_totem"),
    linked_concepts: [node.concept_key],
    room_id: roomId,
    position: { x: 0, y: 1.0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1.0,
    can_unlock: null,
    requires_items: [],
    feedback_mode: "immediate",
    state: "available",
    visual_preset: "crystal_totem_glow",
    explanation_text: node.definition,
    hint_text: `Recall what you learned about "${node.label}".`,
  };
}

/**
 * Return the inspection text for a pedagogical object.
 */
export function objectInspect(obj: PedagogicalObject): string {
  const lines: string[] = [];
  lines.push(`[${obj.type.replace(/_/g, " ").toUpperCase()}] ${obj.label}`);
  lines.push(obj.description);

  if (obj.explanation_text && obj.explanation_text !== obj.description) {
    lines.push(`\nExplanation: ${obj.explanation_text}`);
  }
  if (obj.hint_text) {
    lines.push(`\nHint: ${obj.hint_text}`);
  }
  if (obj.can_unlock) {
    lines.push(`\nUnlocks: ${obj.can_unlock}`);
  }
  if (obj.requires_items.length > 0) {
    lines.push(`\nRequires: ${obj.requires_items.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Check whether a given interaction is available on an object.
 */
export function objectCanInteract(
  obj: PedagogicalObject,
  interaction: ObjectInteraction,
): boolean {
  if (obj.state === "locked" || obj.state === "used") {
    return false;
  }
  return obj.interaction_modes.includes(interaction);
}

/**
 * Return the linked puzzle ID if the object supports puzzles, or null.
 * Convention: puzzle ID is derived from the first linked concept.
 */
export function objectTriggerPuzzle(obj: PedagogicalObject): string | null {
  if (!obj.interaction_modes.includes("trigger_puzzle")) {
    return null;
  }
  if (obj.state === "locked" || obj.state === "used") {
    return null;
  }
  if (obj.linked_concepts.length === 0) {
    return null;
  }

  return `puzzle_${obj.linked_concepts[0]}`;
}

// ==================== INTERNAL HELPERS ====================

function scaleForCriticality(criticality: number): number {
  // Higher criticality → larger object (0.8 to 1.6)
  return Math.round((0.8 + criticality * 0.8) * 100) / 100;
}

function buildHintText(node: DependencyNode): string {
  if (node.is_gate) {
    return `Master "${node.label}" to unlock the next area.`;
  }
  if (node.is_synthesis_target) {
    return `This is a key synthesis concept. Connect it with related ideas.`;
  }
  if (node.prerequisite_count > 0) {
    return `Build on what you know — this concept has ${node.prerequisite_count} prerequisite(s).`;
  }
  return `Explore "${node.label}" to deepen your understanding.`;
}

function resolveGateTarget(gateNode: DependencyNode, graph: DependencyGraph): string {
  // Find edges where the gate node unlocks something
  const unlockEdge = graph.edges.find(
    (e) => e.source === gateNode.id && e.relation === "unlocks",
  );
  if (unlockEdge) {
    const targetNode = graph.nodes.find((n) => n.id === unlockEdge.target);
    if (targetNode?.room_cluster_id) {
      return targetNode.room_cluster_id;
    }
  }

  // Fallback: find the next room cluster by looking at dependents
  const dependentEdge = graph.edges.find(
    (e) => e.source === gateNode.id && e.relation === "requires",
  );
  if (dependentEdge) {
    const targetNode = graph.nodes.find((n) => n.id === dependentEdge.target);
    if (targetNode?.room_cluster_id && targetNode.room_cluster_id !== gateNode.room_cluster_id) {
      return targetNode.room_cluster_id;
    }
  }

  return "next_room";
}
