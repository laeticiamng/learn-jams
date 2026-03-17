// ============================================================
// EscapeRoom3DScene — Immersive 3D backdrop for the escape game.
// Renders an atmospheric 3D room scene behind the 2D game UI.
// Uses Adaptive3DScene for WebGL detection and graceful fallback.
// ============================================================

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import type { Group, Mesh, Points as PointsType } from "three";
import * as THREE from "three";
import Adaptive3DScene from "@/components/cognitio/immersive/Adaptive3DScene";

interface EscapeRoom3DSceneProps {
  roomIndex: number;
  roomType: string;
  roomTitle: string;
  totalRooms: number;
  completedRooms: number;
}

const ROOM_COLORS: Record<string, { primary: string; accent: string; ambient: string; fog: string }> = {
  briefing: { primary: "#3b82f6", accent: "#60a5fa", ambient: "#1a1a3e", fog: "#0a0a1e" },
  exploration: { primary: "#8b5cf6", accent: "#a78bfa", ambient: "#1e1a2e", fog: "#0e0a1e" },
  analysis: { primary: "#06b6d4", accent: "#22d3ee", ambient: "#1a2e2e", fog: "#0a1e1e" },
  diagnostic: { primary: "#10b981", accent: "#34d399", ambient: "#1a2e1e", fog: "#0a1e0e" },
  decision: { primary: "#f59e0b", accent: "#fbbf24", ambient: "#2e2a1a", fog: "#1e1a0a" },
  synthesis: { primary: "#ec4899", accent: "#f472b6", ambient: "#2e1a2a", fog: "#1e0a1a" },
  final: { primary: "#ef4444", accent: "#f87171", ambient: "#2e1a1a", fog: "#1e0a0a" },
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
      {/* Multi-layer lighting for depth */}
      <ambientLight intensity={0.2} color={colors.ambient} />
      <directionalLight position={[5, 10, 5]} intensity={0.3} color="#ffffff" />
      <pointLight position={[0, 4, 0]} intensity={0.8} color={colors.primary} distance={20} decay={2} />
      <pointLight position={[-3, 2, -3]} intensity={0.3} color={colors.accent} distance={12} decay={2} />
      <pointLight position={[3, 2, -3]} intensity={0.3} color={colors.accent} distance={12} decay={2} />

      {/* Fog for atmospheric depth */}
      <fog attach="fog" args={[colors.fog, 6, 28]} />

      {/* Star field background */}
      <StarField />

      {/* Room scene */}
      <RoomGeometry
        roomIndex={roomIndex}
        color={colors.primary}
        accentColor={colors.accent}
        ambientColor={colors.ambient}
        totalRooms={totalRooms}
        completedRooms={completedRooms}
      />
    </Adaptive3DScene>
  );
}

// ---------- Star Field Background ----------

function StarField() {
  const pointsRef = useRef<PointsType>(null);

  const { positions, sizes } = useMemo(() => {
    const count = 200;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = -10 - Math.random() * 40;
      sz[i] = Math.random() * 2 + 0.5;
    }
    return { positions: pos, sizes: sz };
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.008;
      pointsRef.current.rotation.x += delta * 0.003;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={sizes.length} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#ffffff"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ---------- Floating Dust Particles ----------

function DustParticles({ color, count = 40 }: { color: string; count?: number }) {
  const pointsRef = useRef<PointsType>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = Math.random() * 6 - 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return pos;
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const arr = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.3 + i * 0.5) * 0.002;
      arr[i * 3] += Math.cos(t * 0.2 + i * 0.7) * 0.001;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={[0, 0, -5]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={color}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ---------- Room Geometry ----------

function RoomGeometry({
  roomIndex,
  color,
  accentColor,
  ambientColor,
  totalRooms,
  completedRooms,
}: {
  roomIndex: number;
  color: string;
  accentColor: string;
  ambientColor: string;
  totalRooms: number;
  completedRooms: number;
}) {
  const groupRef = useRef<Group>(null);
  const portalOuterRef = useRef<Mesh>(null);
  const portalInnerRef = useRef<Mesh>(null);
  const energyCoreRef = useRef<Mesh>(null);

  // Rotate slowly
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
    if (portalOuterRef.current) {
      portalOuterRef.current.rotation.z += delta * 0.3;
    }
    if (portalInnerRef.current) {
      portalInnerRef.current.rotation.z -= delta * 0.5;
    }
    // Energy core pulsing
    if (energyCoreRef.current) {
      const pulse = 0.8 + Math.sin(state.clock.getElapsedTime() * 2) * 0.2;
      energyCoreRef.current.scale.setScalar(pulse);
    }
  });

  // Generate floating concept nodes
  const nodes = useMemo(() => {
    const result: Array<{ x: number; y: number; z: number; size: number; speed: number }> = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 3 + Math.sin(i * 1.5) * 1.5;
      result.push({
        x: Math.cos(angle) * radius,
        y: 1 + Math.sin(i * 0.7) * 2,
        z: Math.sin(angle) * radius - 5,
        size: 0.12 + Math.random() * 0.18,
        speed: 0.3 + Math.random() * 0.4,
      });
    }
    return result;
  }, []);

  // Orbital decorative rings
  const orbitals = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => ({
      radius: 4.5 + i * 1.2,
      tilt: [Math.PI * 0.1 * (i + 1), 0, Math.PI * 0.15 * i] as [number, number, number],
      opacity: 0.06 - i * 0.015,
    }));
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, -5]}>
      {/* Floor with subtle reflective quality */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial
          color={ambientColor}
          opacity={0.8}
          transparent
          metalness={0.4}
          roughness={0.6}
        />
      </mesh>

      {/* Floor grid lines for sci-fi feel */}
      <FloorGrid color={color} />

      {/* Floating dust particles */}
      <DustParticles color={accentColor} />

      {/* Orbital decoration rings */}
      {orbitals.map((orb, i) => (
        <mesh key={`orbit-${i}`} position={[0, 1, 0]} rotation={orb.tilt}>
          <torusGeometry args={[orb.radius, 0.01, 8, 128]} />
          <meshBasicMaterial color={color} transparent opacity={orb.opacity} />
        </mesh>
      ))}

      {/* Portal — outer ring */}
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
        <mesh ref={portalOuterRef} position={[0, 1, 0]}>
          <torusGeometry args={[2, 0.06, 16, 80]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
            metalness={0.8}
            roughness={0.1}
          />
        </mesh>
      </Float>

      {/* Portal — inner ring (counter-rotating) */}
      <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.2}>
        <mesh ref={portalInnerRef} position={[0, 1, 0]}>
          <torusGeometry args={[1.5, 0.03, 12, 64]} />
          <meshStandardMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={0.4}
            metalness={0.7}
            roughness={0.15}
          />
        </mesh>
      </Float>

      {/* Energy core at portal center */}
      <mesh ref={energyCoreRef} position={[0, 1, 0]}>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={color}
          emissiveIntensity={1.2}
          transparent
          opacity={0.6}
          metalness={0.2}
          roughness={0}
        />
      </mesh>

      {/* Portal inner glow disc */}
      <mesh position={[0, 1, 0]}>
        <circleGeometry args={[1.8, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Portal volumetric light cone */}
      <mesh position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[2.5, 6, 32, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.015}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Floating concept nodes — enhanced */}
      {nodes.map((node, i) => (
        <Float key={i} speed={node.speed} floatIntensity={0.25}>
          <group position={[node.x, node.y, node.z]}>
            <mesh>
              {i % 4 === 0 ? (
                <octahedronGeometry args={[node.size, 0]} />
              ) : i % 4 === 1 ? (
                <dodecahedronGeometry args={[node.size, 0]} />
              ) : i % 4 === 2 ? (
                <tetrahedronGeometry args={[node.size, 0]} />
              ) : (
                <sphereGeometry args={[node.size, 12, 12]} />
              )}
              <meshStandardMaterial
                color={i % 2 === 0 ? color : accentColor}
                emissive={color}
                emissiveIntensity={0.4}
                transparent
                opacity={0.7}
                metalness={0.5}
                roughness={0.2}
              />
            </mesh>
            {/* Small glow halo around each node */}
            <mesh>
              <sphereGeometry args={[node.size * 1.8, 8, 8]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.03}
                depthWrite={false}
              />
            </mesh>
          </group>
        </Float>
      ))}

      {/* Progress indicators — premium orbs with glow */}
      {Array.from({ length: totalRooms }).map((_, i) => {
        const isCompleted = i < completedRooms;
        const isCurrent = i === roomIndex;
        const orbColor = isCompleted ? "#22c55e" : isCurrent ? color : "#333333";
        return (
          <group key={`progress-${i}`} position={[-3 + i * (6 / Math.max(totalRooms - 1, 1)), -1.5, 2]}>
            <mesh>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshStandardMaterial
                color={orbColor}
                emissive={orbColor}
                emissiveIntensity={isCompleted || isCurrent ? 0.6 : 0}
                metalness={0.5}
                roughness={0.2}
                transparent
                opacity={isCompleted ? 1 : isCurrent ? 0.9 : 0.4}
              />
            </mesh>
            {/* Glow ring under active/completed orbs */}
            {(isCompleted || isCurrent) && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
                <ringGeometry args={[0.12, 0.2, 24]} />
                <meshBasicMaterial
                  color={orbColor}
                  transparent
                  opacity={0.15}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ---------- Floor Grid ----------

function FloorGrid({ color }: { color: string }) {
  const lines = useMemo(() => {
    const result: Array<{ x1: number; z1: number; x2: number; z2: number }> = [];
    const size = 12;
    const step = 2;
    for (let i = -size; i <= size; i += step) {
      result.push({ x1: i, z1: -size, x2: i, z2: size });
      result.push({ x1: -size, z1: i, x2: size, z2: i });
    }
    return result;
  }, []);

  return (
    <group position={[0, -1.98, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {lines.map((line, i) => {
        const points = [
          new THREE.Vector3(line.x1, line.z1, 0),
          new THREE.Vector3(line.x2, line.z2, 0),
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <primitive key={i} object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.04 }))} />
        );
      })}
    </group>
  );
}
