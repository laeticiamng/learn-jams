// ============================================================
// DependencyGraph — Converts concept graph into unlock/gate
// dependency structure for escape game progression.
// ============================================================

import type {
  AnalyzedConcept,
  AnalyzedConfusionPair,
} from "@/domain/cognitio/contracts";

import type {
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
  DependencyNodeRole,
  ConfusionZone,
  DependencyEdgeRelation,
} from "@/domain/cognitio/immersiveEngine.types";

// ---------- Edge relation mapping ----------

const RELATION_MAP: Record<string, DependencyEdgeRelation> = {
  prerequisite: "requires",
  related: "supports",
  part_of: "part_of",
  contrasts_with: "contrasts_with",
};

// ---------- Helpers ----------

let edgeCounter = 0;
function makeEdgeId(): string {
  return `edge_${++edgeCounter}`;
}

function resetEdgeCounter(): void {
  edgeCounter = 0;
}

// ---------- Role assignment ----------

function assignRole(concept: AnalyzedConcept, allConcepts: AnalyzedConcept[]): DependencyNodeRole {
  // Gate candidates are handled separately via is_gate flag;
  // here we determine the base pedagogical role.

  const isPrerequisiteForOthers = allConcepts.some((c) =>
    c.prerequisites.includes(concept.stable_key) ||
    c.relations.some(
      (r) => r.target_key === concept.stable_key && r.relation_type === "prerequisite",
    ),
  );

  if (
    concept.bloom_target === "evaluate" ||
    concept.bloom_target === "create"
  ) {
    return "synthesis";
  }

  if (concept.bloom_target === "apply" || concept.bloom_target === "analyze") {
    return "application";
  }

  if (isPrerequisiteForOthers && concept.criticality_score <= 0.5) {
    return "prerequisite";
  }

  if (
    concept.relations.some((r) => r.relation_type === "contrasts_with")
  ) {
    return "confusion";
  }

  // Bridge: connects two otherwise separate sub-graphs (related to many, prerequisite for some)
  if (
    concept.relations.filter((r) => r.relation_type === "related").length >= 2 &&
    isPrerequisiteForOthers
  ) {
    return "bridge";
  }

  return "core";
}

// ---------- Public API ----------

/**
 * Converts an array of analysed concepts and confusion pairs into a
 * full DependencyGraph consumable by the escape-game engine.
 */
export function buildDependencyGraph(
  concepts: AnalyzedConcept[],
  confusionPairs: AnalyzedConfusionPair[],
): DependencyGraph {
  resetEdgeCounter();

  // --- Build nodes ---
  const conceptMap = new Map<string, AnalyzedConcept>();
  for (const c of concepts) {
    conceptMap.set(c.stable_key, c);
  }

  let nodes: DependencyNode[] = concepts.map((c) => ({
    id: c.stable_key,
    concept_key: c.stable_key,
    label: c.label,
    definition: c.definition,
    role: assignRole(c, concepts),
    criticality: c.criticality_score,
    bloom_target: c.bloom_target,
    room_cluster_id: null,
    depth: 0,
    is_gate: false,
    is_synthesis_target: false,
    prerequisite_count: c.prerequisites.length,
    dependent_count: 0, // computed below
  }));

  const nodeIndex = new Map<string, DependencyNode>();
  for (const n of nodes) {
    nodeIndex.set(n.id, n);
  }

  // --- Build edges ---
  const edges: DependencyEdge[] = [];
  const edgeSet = new Set<string>(); // deduplicate "source->target->relation"

  for (const concept of concepts) {
    // Edges from explicit relations
    for (const rel of concept.relations) {
      if (!nodeIndex.has(rel.target_key)) continue;
      const relation = RELATION_MAP[rel.relation_type] ?? "supports";
      const key = `${concept.stable_key}->${rel.target_key}->${relation}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({
        id: makeEdgeId(),
        source: concept.stable_key,
        target: rel.target_key,
        relation,
        weight: concept.criticality_score,
      });
    }

    // Edges from prerequisites (prerequisite --requires--> this concept)
    for (const prereqKey of concept.prerequisites) {
      if (!nodeIndex.has(prereqKey)) continue;
      const key = `${prereqKey}->${concept.stable_key}->requires`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({
        id: makeEdgeId(),
        source: prereqKey,
        target: concept.stable_key,
        relation: "requires",
        weight: 1,
      });
    }
  }

  // --- Compute dependent counts ---
  for (const edge of edges) {
    if (edge.relation === "requires") {
      const source = nodeIndex.get(edge.source);
      if (source) source.dependent_count++;
    }
  }

  // --- Compute topological depth via BFS ---
  const incomingRequires = new Map<string, Set<string>>();
  const outgoingRequires = new Map<string, Set<string>>();
  for (const n of nodes) {
    incomingRequires.set(n.id, new Set());
    outgoingRequires.set(n.id, new Set());
  }
  for (const edge of edges) {
    if (edge.relation === "requires") {
      incomingRequires.get(edge.target)?.add(edge.source);
      outgoingRequires.get(edge.source)?.add(edge.target);
    }
  }

  // Root nodes: no incoming "requires" edges
  const rootNodes = nodes
    .filter((n) => (incomingRequires.get(n.id)?.size ?? 0) === 0)
    .map((n) => n.id);

  // BFS from roots to assign depth
  const visited = new Set<string>();
  let frontier = [...rootNodes];
  let currentDepth = 0;

  while (frontier.length > 0) {
    const nextFrontier: string[] = [];
    for (const nodeId of frontier) {
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      const node = nodeIndex.get(nodeId);
      if (node) node.depth = currentDepth;

      for (const child of outgoingRequires.get(nodeId) ?? []) {
        // Only advance to child when ALL its prerequisites have been visited
        const allPrereqsVisited = [...(incomingRequires.get(child) ?? [])].every((p) =>
          visited.has(p),
        );
        if (allPrereqsVisited && !visited.has(child)) {
          nextFrontier.push(child);
        }
      }
    }
    // If no progress was made but there are unvisited nodes, push them
    if (nextFrontier.length === 0 && visited.size < nodes.length) {
      for (const n of nodes) {
        if (!visited.has(n.id)) {
          nextFrontier.push(n.id);
          break;
        }
      }
    }
    frontier = nextFrontier;
    currentDepth++;
  }

  const maxDepth = Math.max(0, ...nodes.map((n) => n.depth));

  // Leaf nodes: no outgoing "requires" edges
  const leafNodes = nodes
    .filter((n) => (outgoingRequires.get(n.id)?.size ?? 0) === 0)
    .map((n) => n.id);

  // --- Identify gates & synthesis targets ---
  const gates = identifyGates(nodes, edges);
  for (const gateId of gates) {
    const node = nodeIndex.get(gateId);
    if (node) {
      node.is_gate = true;
      node.role = "gate";
    }
  }

  const synthesisTargets = identifySynthesisTargets(nodes);
  for (const stId of synthesisTargets) {
    const node = nodeIndex.get(stId);
    if (node) {
      node.is_synthesis_target = true;
      if (node.role !== "gate") node.role = "synthesis";
    }
  }

  // --- Room clusters ---
  nodes = assignRoomClusters(nodes, edges);
  const clusterIds = new Set(nodes.map((n) => n.room_cluster_id).filter(Boolean));

  // --- Confusion zones ---
  const confusionZones: ConfusionZone[] = confusionPairs.map((cp, i) => {
    // Place confusion zone in the cluster of concept_a (or null)
    const nodeA = nodeIndex.get(cp.concept_a_key);
    return {
      id: `cz_${i}`,
      concept_a: cp.concept_a_key,
      concept_b: cp.concept_b_key,
      distinction_key: cp.distinction_key,
      frequency: cp.frequency,
      room_cluster_id: nodeA?.room_cluster_id ?? null,
    };
  });

  return {
    nodes,
    edges,
    gates,
    synthesis_targets: synthesisTargets,
    confusion_zones: confusionZones,
    root_nodes: rootNodes,
    leaf_nodes: leafNodes,
    max_depth: maxDepth,
    cluster_count: clusterIds.size,
  };
}

/**
 * Groups nodes into room clusters by topological depth layers.
 * Each cluster holds at most ~4-5 concepts. Prerequisites are always
 * placed in an earlier (lower-numbered) cluster.
 */
export function assignRoomClusters(
  nodes: DependencyNode[],
  _edges: DependencyEdge[],
): DependencyNode[] {
  const MAX_PER_CLUSTER = 5;

  // Group by depth
  const depthBuckets = new Map<number, DependencyNode[]>();
  for (const n of nodes) {
    const bucket = depthBuckets.get(n.depth) ?? [];
    bucket.push(n);
    depthBuckets.set(n.depth, bucket);
  }

  const sortedDepths = [...depthBuckets.keys()].sort((a, b) => a - b);
  let clusterIndex = 0;
  let currentClusterSize = 0;

  for (const depth of sortedDepths) {
    const bucket = depthBuckets.get(depth)!;

    // If adding the whole bucket exceeds the limit, start a new cluster
    if (currentClusterSize > 0 && currentClusterSize + bucket.length > MAX_PER_CLUSTER) {
      clusterIndex++;
      currentClusterSize = 0;
    }

    for (const node of bucket) {
      node.room_cluster_id = `room_${clusterIndex}`;
      currentClusterSize++;

      // If the current cluster is full, start a new one
      if (currentClusterSize >= MAX_PER_CLUSTER) {
        clusterIndex++;
        currentClusterSize = 0;
      }
    }
  }

  return nodes;
}

/**
 * Identifies gate concepts: high criticality (>0.7), at least 2
 * dependents, and not a leaf node.
 */
export function identifyGates(
  nodes: DependencyNode[],
  edges: DependencyEdge[],
): string[] {
  // Compute outgoing "requires" count per node (i.e. dependents)
  const outgoingRequires = new Map<string, number>();
  for (const edge of edges) {
    if (edge.relation === "requires") {
      outgoingRequires.set(edge.source, (outgoingRequires.get(edge.source) ?? 0) + 1);
    }
  }

  // Leaf detection: no outgoing requires edges
  const hasOutgoing = new Set<string>();
  for (const edge of edges) {
    if (edge.relation === "requires") {
      hasOutgoing.add(edge.source);
    }
  }

  return nodes
    .filter(
      (n) =>
        n.criticality > 0.7 &&
        (outgoingRequires.get(n.id) ?? 0) >= 2 &&
        hasOutgoing.has(n.id),
    )
    .map((n) => n.id);
}

/**
 * Identifies synthesis targets: bloom_target is evaluate/create,
 * or criticality > 0.8 with >= 2 prerequisites.
 */
export function identifySynthesisTargets(nodes: DependencyNode[]): string[] {
  return nodes
    .filter(
      (n) =>
        n.bloom_target === "evaluate" ||
        n.bloom_target === "create" ||
        (n.criticality > 0.8 && n.prerequisite_count >= 2),
    )
    .map((n) => n.id);
}

/**
 * Returns a topological ordering of node IDs using Kahn's algorithm.
 * Only considers "requires" edges for ordering.
 */
export function getTopologicalOrder(
  nodes: DependencyNode[],
  edges: DependencyEdge[],
): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  }

  for (const edge of edges) {
    if (edge.relation === "requires") {
      adjacency.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [nodeId, deg] of inDegree) {
    if (deg === 0) queue.push(nodeId);
  }

  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return order;
}

/**
 * Returns all dependency nodes belonging to a specific room cluster.
 */
export function getConceptsForRoom(
  graph: DependencyGraph,
  roomClusterId: string,
): DependencyNode[] {
  return graph.nodes.filter((n) => n.room_cluster_id === roomClusterId);
}
