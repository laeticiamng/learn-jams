// ============================================================
// KnowledgeWorldMap — 3D overview of the entire escape game
// world showing all rooms, their connections, and progress.
// Acts as a navigation hub and spatial memory aid.
// ============================================================

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line, Float } from "@react-three/drei";
import * as THREE from "three";
import type { Mesh, Points as PointsType } from "three";
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
      className="w-full h-64 rounded-xl overflow-hidden border border-border/10 scene-glow-pulse"
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={0.5} color="#ffffff" />
      <pointLight position={[0, 5, 0]} intensity={0.3} color={universe.color_palette.primary} distance={20} decay={2} />
      <fog attach="fog" args={["#0a0a1e", 12, 30]} />

      {/* Ambient dust */}
      <MapDustParticles />

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

        const color = isCompleted ? "#22c55e" : isCurrent ? universe.color_palette.primary : "#64748b";

        return (
          <RoomNode
            key={clusterId}
            clusterId={clusterId}
            index={index}
            position={[x, 0, z]}
            color={color}
            conceptCount={conceptCount}
            isCurrent={isCurrent}
            isCompleted={isCompleted}
            onSelect={onRoomSelect}
          />
        );
      })}

      {/* Connections between rooms — enhanced with glow */}
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
            lineWidth={isConnected ? 2.5 : 1}
            dashed={!isConnected}
            dashSize={0.2}
            gapSize={0.1}
          />
        );
      })}

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -Math.floor(clusterIds.length / 6) * 3]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0a0a1e" opacity={0.5} transparent />
      </mesh>

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

// ---------- Room Node ----------

function RoomNode({
  clusterId,
  index,
  position,
  color,
  conceptCount,
  isCurrent,
  isCompleted,
  onSelect,
}: {
  clusterId: string;
  index: number;
  position: [number, number, number];
  color: string;
  conceptCount: number;
  isCurrent: boolean;
  isCompleted: boolean;
  onSelect: (id: string) => void;
}) {
  const meshRef = useRef<Mesh>(null);
  const height = 0.3 + conceptCount * 0.1;

  useFrame(({ clock }) => {
    if (!meshRef.current || !isCurrent) return;
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.03;
    meshRef.current.scale.set(1, pulse, 1);
  });

  return (
    <group position={position}>
      <Float speed={isCurrent ? 1 : 0} floatIntensity={isCurrent ? 0.1 : 0}>
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(clusterId);
          }}
        >
          <boxGeometry args={[1.5, height, 1.5]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isCurrent ? 0.5 : isCompleted ? 0.2 : 0.05}
            metalness={0.4}
            roughness={0.3}
          />
        </mesh>
      </Float>

      {/* Glow base under active/completed rooms */}
      {(isCurrent || isCompleted) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
          <circleGeometry args={[1.2, 24]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isCurrent ? 0.08 : 0.04}
            depthWrite={false}
          />
        </mesh>
      )}

      <Text
        position={[0, height / 2 + 0.4, 0]}
        fontSize={0.18}
        color="#ffffff"
        anchorX="center"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {`Salle ${index + 1}`}
      </Text>

      {/* Concept count label */}
      <Text
        position={[0, height / 2 + 0.15, 0]}
        fontSize={0.1}
        color="#888888"
        anchorX="center"
      >
        {`${conceptCount} concepts`}
      </Text>
    </group>
  );
}

// ---------- Map Dust Particles ----------

function MapDustParticles() {
  const pointsRef = useRef<PointsType>(null);
  const count = 60;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.getElapsedTime() * 0.02;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#8b5cf6"
        transparent
        opacity={0.3}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
