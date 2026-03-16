// ============================================================
// KnowledgeWorldMap — 3D overview of the entire escape game
// world showing all rooms, their connections, and progress.
// Acts as a navigation hub and spatial memory aid.
// ============================================================

import { useMemo, useState } from "react";
import { OrbitControls, Text, Line } from "@react-three/drei";
import type {
  DependencyGraph,
  UniverseConfig,
  RenderMode,
} from "@/domain/cognitio/immersiveEngine.types";
import Adaptive3DScene from "./Adaptive3DScene";

interface KnowledgeWorldMapProps {
  graph: DependencyGraph;
  universe: UniverseConfig;
  currentRoomIndex: number;
  completedRooms: string[];
  renderMode: RenderMode;
  onRoomSelect: (clusterId: string) => void;
}

export default function KnowledgeWorldMap({
  graph,
  universe,
  currentRoomIndex,
  completedRooms,
  renderMode,
  onRoomSelect,
}: KnowledgeWorldMapProps) {
  const clusterIds = useMemo(() =>
    [...new Set(graph.nodes.map(n => n.room_cluster_id).filter((id): id is string => id !== null))].sort(),
    [graph.nodes]
  );

  const fallback2D = (
    <div className="p-4 space-y-2">
      <h3 className="text-sm font-semibold">Carte du monde</h3>
      <div className="grid grid-cols-3 gap-2">
        {clusterIds.map((id, i) => {
          const isCompleted = completedRooms.includes(id);
          const isCurrent = i === currentRoomIndex;
          return (
            <button
              key={id}
              onClick={() => onRoomSelect(id)}
              className={`p-2 rounded-lg border text-xs text-center transition-all ${
                isCompleted ? "border-green-500/30 bg-green-500/5" :
                isCurrent ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20" :
                "border-border/20 hover:border-border/40"
              }`}
            >
              <span className="block font-medium">Salle {i + 1}</span>
              <span className="block text-[10px] text-muted-foreground mt-0.5">
                {graph.nodes.filter(n => n.room_cluster_id === id).length} concepts
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (renderMode === "fallback_2d") {
    return fallback2D;
  }

  return (
    <Adaptive3DScene
      fallback2D={fallback2D}
      className="w-full h-64 rounded-xl overflow-hidden border border-border/10"
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.6} />

      {/* Room nodes */}
      {clusterIds.map((clusterId, index) => {
        const isCompleted = completedRooms.includes(clusterId);
        const isCurrent = index === currentRoomIndex;
        const conceptCount = graph.nodes.filter(n => n.room_cluster_id === clusterId).length;

        // Serpentine layout
        const row = Math.floor(index / 3);
        const col = row % 2 === 0 ? index % 3 : 2 - (index % 3);
        const x = (col - 1) * 3;
        const z = -row * 3;
        const y = 0;

        const color = isCompleted ? "#22c55e" : isCurrent ? universe.color_palette.primary : "#64748b";

        return (
          <group key={clusterId} position={[x, y, z]}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onRoomSelect(clusterId);
              }}
            >
              <boxGeometry args={[1.5, 0.3 + conceptCount * 0.1, 1.5]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isCurrent ? 0.4 : 0.1}
                metalness={0.3}
                roughness={0.5}
              />
            </mesh>
            <Text
              position={[0, 0.8, 0]}
              fontSize={0.18}
              color="#ffffff"
              anchorX="center"
            >
              {`Salle ${index + 1}`}
            </Text>
          </group>
        );
      })}

      {/* Connections between rooms */}
      {clusterIds.map((_, index) => {
        if (index === 0) return null;
        const row1 = Math.floor((index - 1) / 3);
        const col1 = row1 % 2 === 0 ? (index - 1) % 3 : 2 - ((index - 1) % 3);
        const row2 = Math.floor(index / 3);
        const col2 = row2 % 2 === 0 ? index % 3 : 2 - (index % 3);

        const isConnected = completedRooms.includes(clusterIds[index - 1]);

        return (
          <Line
            key={`conn-${index}`}
            points={[
              [(col1 - 1) * 3, 0.2, -row1 * 3],
              [(col2 - 1) * 3, 0.2, -row2 * 3],
            ]}
            color={isConnected ? "#22c55e" : "#475569"}
            lineWidth={isConnected ? 2 : 1}
            dashed={!isConnected}
            dashSize={0.2}
            gapSize={0.1}
          />
        );
      })}

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        maxPolarAngle={Math.PI / 2.5}
        minDistance={5}
        maxDistance={15}
        target={[0, 0, -Math.floor(clusterIds.length / 6) * 3]}
      />
    </Adaptive3DScene>
  );
}
