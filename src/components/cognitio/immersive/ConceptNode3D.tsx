// ============================================================
// ConceptNode3D — 3D representation of a concept node in the
// dependency graph. Enhanced with Fresnel glow shader, orbital
// particles, animated connections, and reveal burst effects.
// ============================================================

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import type { Mesh, Points as PointsType } from "three";
import type {
  DependencyNode,
  DependencyEdge,
  MasteryLevel,
} from "@/domain/cognitio/immersiveEngine.types";
import { FresnelMesh, OrbitalParticles, RevealBurst } from "./ShaderEffects";

interface ConceptNode3DProps {
  node: DependencyNode;
  edges: DependencyEdge[];
  mastery?: MasteryLevel;
  isSelected: boolean;
  isHighlighted: boolean;
  position: [number, number, number];
  onClick: (nodeId: string) => void;
  onHover: (nodeId: string | null) => void;
  showLabel: boolean;
  renderQuality: "high" | "medium" | "low";
}

const ROLE_COLORS: Record<string, string> = {
  core: "#3b82f6",
  prerequisite: "#10b981",
  application: "#f59e0b",
  synthesis: "#ec4899",
  confusion: "#ef4444",
  gate: "#8b5cf6",
  bridge: "#06b6d4",
};

const ROLE_ACCENT: Record<string, string> = {
  core: "#60a5fa",
  prerequisite: "#34d399",
  application: "#fbbf24",
  synthesis: "#f472b6",
  confusion: "#f87171",
  gate: "#a78bfa",
  bridge: "#22d3ee",
};

const MASTERY_OPACITY: Record<MasteryLevel, number> = {
  unknown: 0.3,
  exposed: 0.4,
  fragile: 0.5,
  developing: 0.7,
  stable: 0.9,
  mastered: 1.0,
};

export default function ConceptNode3D({
  node,
  edges,
  mastery = "unknown",
  isSelected,
  isHighlighted,
  position,
  onClick,
  onHover,
  showLabel,
  renderQuality,
}: ConceptNode3DProps) {
  const meshRef = useRef<Mesh>(null);
  const orbitalRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);


  const color = ROLE_COLORS[node.role] ?? "#6b7280";
  const accent = ROLE_ACCENT[node.role] ?? "#9ca3af";
  const opacity = MASTERY_OPACITY[mastery];
  const scale = node.is_gate ? 1.2 : node.is_synthesis_target ? 1.1 : 0.8;
  const segments = renderQuality === "high" ? 32 : renderQuality === "medium" ? 16 : 8;
  const isHighQuality = renderQuality !== "low";

  // Pulse animation for gates and selected nodes
  useFrame(({ clock }, delta) => {
    if (!meshRef.current) return;
    if (isSelected || node.is_gate) {
      meshRef.current.rotation.y += delta * 0.5;
    }
    if (hovered) {
      const s = scale * (1 + Math.sin(clock.getElapsedTime() * 5) * 0.05);
      meshRef.current.scale.setScalar(s);
    } else {
      meshRef.current.scale.setScalar(scale);
    }

    // Orbital ring rotation
    if (orbitalRef.current) {
      orbitalRef.current.rotation.z += delta * 0.8;
      orbitalRef.current.rotation.x += delta * 0.3;
    }
  });

  const emissiveIntensity = useMemo(() => {
    if (isSelected) return 0.8;
    if (isHighlighted) return 0.5;
    if (hovered) return 0.4;
    if (mastery === "mastered") return 0.3;
    return 0.1;
  }, [isSelected, isHighlighted, hovered, mastery]);

  const showOrbital = isHighQuality && (isSelected || isHighlighted || hovered || node.is_gate);

  return (
    <group position={position}>
      {/* Ambient glow sphere (soft halo behind the node) */}
      {isHighQuality && emissiveIntensity > 0.2 && (
        <mesh>
          <sphereGeometry args={[scale * 1.5, 12, 12]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={emissiveIntensity * 0.06}
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Main node mesh — Fresnel glow for high quality, standard for low */}
      {isHighQuality ? (
        <group
          ref={meshRef as any}
          onClick={(e: any) => {
            e.stopPropagation();
            onClick(node.id);
          }}
          onPointerEnter={(e: any) => {
            e.stopPropagation();
            setHovered(true);
            onHover(node.id);
            document.body.style.cursor = "pointer";
          }}
          onPointerLeave={() => {
            setHovered(false);
            onHover(null);
            document.body.style.cursor = "auto";
          }}
        >
          <FresnelMesh
            color={color}
            glowColor={accent}
            fresnelPower={node.is_gate ? 1.5 : 2.5}
            glowIntensity={emissiveIntensity + 0.3}
            opacity={opacity}
            pulse={isSelected || hovered ? 1 : 0}
          >
            {node.is_gate ? (
              <octahedronGeometry args={[0.5, 1]} />
            ) : node.is_synthesis_target ? (
              <icosahedronGeometry args={[0.5, 1]} />
            ) : (
              <sphereGeometry args={[0.4, segments, segments]} />
            )}
          </FresnelMesh>
        </group>
      ) : (
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onClick(node.id);
          }}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHovered(true);
            onHover(node.id);
            document.body.style.cursor = "pointer";
          }}
          onPointerLeave={() => {
            setHovered(false);
            onHover(null);
            document.body.style.cursor = "auto";
          }}
          castShadow
        >
          {node.is_gate ? (
            <octahedronGeometry args={[0.5, 0]} />
          ) : node.is_synthesis_target ? (
            <icosahedronGeometry args={[0.5, 0]} />
          ) : (
            <sphereGeometry args={[0.4, segments, segments]} />
          )}
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={emissiveIntensity}
            metalness={0.5}
            roughness={0.2}
            transparent={opacity < 1}
            opacity={opacity}
          />
        </mesh>
      )}

      {/* Orbital particles — replace static torus rings */}
      {showOrbital && isHighQuality && (
        <OrbitalParticles
          count={node.is_gate ? 16 : 10}
          radius={scale * 0.9}
          color={accent}
          speed={isSelected ? 1.5 : 0.8}
        />
      )}
      {showOrbital && !isHighQuality && (
        <mesh ref={orbitalRef}>
          <torusGeometry args={[scale * 0.9, 0.015, 8, 48]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.5}
            transparent
            opacity={0.4}
            metalness={0.7}
            roughness={0.1}
          />
        </mesh>
      )}

      {/* Second orbital layer (selected, high quality) */}
      {isSelected && isHighQuality && (
        <OrbitalParticles
          count={8}
          radius={scale * 1.1}
          color={color}
          speed={0.5}
        />
      )}

      {/* Reveal burst effect when node becomes available */}
      <RevealBurst
        position={[0, 0, 0]}
        color={accent}
        active={justRevealed}
        particleCount={24}
      />

      {/* Mastery ring — enhanced with gradient effect */}
      {mastery !== "unknown" && (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <mesh>
            <ringGeometry args={[scale * 0.5, scale * 0.6, segments]} />
            <meshBasicMaterial
              color={mastery === "mastered" ? "#22c55e" : mastery === "stable" ? "#3b82f6" : "#f59e0b"}
              transparent
              opacity={0.35}
            />
          </mesh>
          {/* Outer mastery glow */}
          {(mastery === "mastered" || mastery === "stable") && (
            <mesh>
              <ringGeometry args={[scale * 0.6, scale * 0.8, segments]} />
              <meshBasicMaterial
                color={mastery === "mastered" ? "#22c55e" : "#3b82f6"}
                transparent
                opacity={0.08}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
      )}

      {/* Point light for selected/hovered nodes */}
      {(isSelected || hovered) && isHighQuality && (
        <pointLight
          intensity={isSelected ? 0.4 : 0.2}
          color={color}
          distance={3}
          decay={2}
        />
      )}

      {/* Sparkle particles for mastered nodes */}
      {mastery === "mastered" && isHighQuality && (
        <MasterySparkles color="#22c55e" scale={scale} />
      )}

      {/* Label */}
      {(showLabel || hovered || isSelected) && (
        <Text
          position={[0, scale * 0.8, 0]}
          fontSize={0.12}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          maxWidth={2.5}
          outlineWidth={0.015}
          outlineColor="#000000"
        >
          {node.label.length > 30 ? node.label.slice(0, 30) + "\u2026" : node.label}
        </Text>
      )}

      {/* Inspect panel (HTML overlay) — premium glass design */}
      {isSelected && (
        <Html
          position={[scale + 0.5, 0, 0]}
          distanceFactor={8}
          style={{ pointerEvents: "none" }}
        >
          <div className="glass-card-elevated p-3 shadow-xl w-56 pointer-events-auto">
            <p className="text-xs font-semibold text-primary mb-1">{node.label}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {node.definition.length > 120 ? node.definition.slice(0, 120) + "\u2026" : node.definition}
            </p>
            <div className="mt-2 flex items-center gap-2 text-[9px]">
              <span className="px-1.5 py-0.5 rounded-md bg-primary/15 text-primary font-medium">{node.role}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-accent/30 text-accent-foreground">{node.bloom_target}</span>
              {node.is_gate && <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-medium">Gate</span>}
            </div>
          </div>
        </Html>
      )}

      {/* Criticality indicator — pulsing orb */}
      {node.criticality > 0.7 && (
        <CriticalityOrb scale={scale} />
      )}
    </group>
  );
}

// ---------- Mastery Sparkles ----------

function MasterySparkles({ color, scale }: { color: string; scale: number }) {
  const pointsRef = useRef<PointsType>(null);
  const count = 8;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = scale * 0.7;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * scale;
      pos[i * 3 + 2] = Math.sin(angle) * r;
    }
    return pos;
  }, [count, scale]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.getElapsedTime() * 0.5;
    const arr = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] = Math.sin(t * 1.5 + i * 0.8) * scale * 0.4;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={color}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ---------- Criticality Orb ----------

function CriticalityOrb({ scale }: { scale: number }) {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const pulse = 0.8 + Math.sin(clock.getElapsedTime() * 3) * 0.2;
    meshRef.current.scale.setScalar(pulse);
  });

  return (
    <group position={[scale * 0.6, scale * 0.3, 0]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.8}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial
          color="#ef4444"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
