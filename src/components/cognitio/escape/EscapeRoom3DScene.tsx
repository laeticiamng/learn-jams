// ============================================================
// EscapeRoom3DScene — Immersive 3D backdrop for the escape game.
// Renders an atmospheric 3D room scene behind the 2D game UI.
// Uses Adaptive3DScene for WebGL detection and graceful fallback.
// ============================================================

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Text } from "@react-three/drei";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import Adaptive3DScene from "@/components/cognitio/immersive/Adaptive3DScene";

interface EscapeRoom3DSceneProps {
  roomIndex: number;
  roomType: string;
  roomTitle: string;
  totalRooms: number;
  completedRooms: number;
}

const ROOM_COLORS: Record<string, { primary: string; ambient: string; fog: string }> = {
  briefing: { primary: "#3b82f6", ambient: "#1a1a3e", fog: "#0a0a1e" },
  exploration: { primary: "#8b5cf6", ambient: "#1e1a2e", fog: "#0e0a1e" },
  analysis: { primary: "#06b6d4", ambient: "#1a2e2e", fog: "#0a1e1e" },
  diagnostic: { primary: "#10b981", ambient: "#1a2e1e", fog: "#0a1e0e" },
  decision: { primary: "#f59e0b", ambient: "#2e2a1a", fog: "#1e1a0a" },
  synthesis: { primary: "#ec4899", ambient: "#2e1a2a", fog: "#1e0a1a" },
  final: { primary: "#ef4444", ambient: "#2e1a1a", fog: "#1e0a0a" },
};

export default function EscapeRoom3DScene({
  roomIndex,
  roomType,
  roomTitle,
  totalRooms,
  completedRooms,
}: EscapeRoom3DSceneProps) {
  const colors = ROOM_COLORS[roomType] ?? ROOM_COLORS.exploration;

  return (
    <Adaptive3DScene
      fallback2D={
        <div className="w-full h-full bg-gradient-to-b from-background to-background/80" />
      }
      className="w-full h-full"
    >
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} color={colors.ambient} />
      <directionalLight position={[5, 10, 5]} intensity={0.4} color="#ffffff" />
      <pointLight position={[0, 4, 0]} intensity={0.6} color={colors.primary} distance={20} />

      {/* Fog */}
      <fog attach="fog" args={[colors.fog, 8, 30]} />

      {/* Room scene */}
      <RoomGeometry
        roomIndex={roomIndex}
        color={colors.primary}
        ambientColor={colors.ambient}
        totalRooms={totalRooms}
        completedRooms={completedRooms}
      />
    </Adaptive3DScene>
  );
}

// ---------- Room Geometry ----------

function RoomGeometry({
  roomIndex,
  color,
  ambientColor,
  totalRooms,
  completedRooms,
}: {
  roomIndex: number;
  color: string;
  ambientColor: string;
  totalRooms: number;
  completedRooms: number;
}) {
  const groupRef = useRef<Group>(null);
  const portalRef = useRef<Mesh>(null);

  // Rotate slowly
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
    if (portalRef.current) {
      portalRef.current.rotation.z += delta * 0.3;
    }
  });

  // Generate floating concept nodes
  const nodes = useMemo(() => {
    const result: Array<{ x: number; y: number; z: number; size: number }> = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 3 + Math.sin(i * 1.5) * 1.5;
      result.push({
        x: Math.cos(angle) * radius,
        y: 1 + Math.sin(i * 0.7) * 2,
        z: Math.sin(angle) * radius - 5,
        size: 0.15 + Math.random() * 0.2,
      });
    }
    return result;
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, -5]}>
      {/* Floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={ambientColor} opacity={0.8} transparent />
      </mesh>

      {/* Portal ring — represents current room */}
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
        <mesh ref={portalRef} position={[0, 1, 0]}>
          <torusGeometry args={[2, 0.08, 16, 64]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            metalness={0.6}
            roughness={0.2}
          />
        </mesh>
      </Float>

      {/* Inner glow */}
      <mesh position={[0, 1, 0]}>
        <circleGeometry args={[1.8, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.05} />
      </mesh>

      {/* Floating concept nodes */}
      {nodes.map((node, i) => (
        <Float key={i} speed={0.5 + i * 0.2} floatIntensity={0.2}>
          <mesh position={[node.x, node.y, node.z]}>
            {i % 3 === 0 ? (
              <octahedronGeometry args={[node.size, 0]} />
            ) : i % 3 === 1 ? (
              <dodecahedronGeometry args={[node.size, 0]} />
            ) : (
              <sphereGeometry args={[node.size, 8, 8]} />
            )}
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.3}
              transparent
              opacity={0.6}
              metalness={0.4}
              roughness={0.3}
            />
          </mesh>
        </Float>
      ))}

      {/* Progress indicators — small orbs along bottom */}
      {Array.from({ length: totalRooms }).map((_, i) => (
        <mesh key={`progress-${i}`} position={[-3 + i * (6 / Math.max(totalRooms - 1, 1)), -1.5, 2]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial
            color={i < completedRooms ? "#22c55e" : i === roomIndex ? color : "#333333"}
            transparent
            opacity={i < completedRooms ? 1 : 0.5}
          />
        </mesh>
      ))}
    </group>
  );
}
