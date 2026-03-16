// ============================================================
// ConceptNode3D — 3D representation of a concept node in the
// dependency graph. Supports inspect, hover, and connection
// visualization. Each node's appearance reflects its role
// and mastery level.
// ============================================================

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import type { Mesh } from "three";
import type {
  DependencyNode,
  DependencyEdge,
  MasteryLevel,
} from "@/domain/cognitio/immersiveEngine.types";

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
  const [hovered, setHovered] = useState(false);

  const color = ROLE_COLORS[node.role] ?? "#6b7280";
  const opacity = MASTERY_OPACITY[mastery];
  const scale = node.is_gate ? 1.2 : node.is_synthesis_target ? 1.1 : 0.8;
  const segments = renderQuality === "high" ? 32 : renderQuality === "medium" ? 16 : 8;

  // Pulse animation for gates and selected nodes
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (isSelected || node.is_gate) {
      meshRef.current.rotation.y += delta * 0.5;
    }
    if (hovered) {
      const s = scale * (1 + Math.sin(Date.now() * 0.005) * 0.05);
      meshRef.current.scale.setScalar(s);
    } else {
      meshRef.current.scale.setScalar(scale);
    }
  });

  const emissiveIntensity = useMemo(() => {
    if (isSelected) return 0.6;
    if (isHighlighted) return 0.4;
    if (hovered) return 0.3;
    if (mastery === "mastered") return 0.2;
    return 0.1;
  }, [isSelected, isHighlighted, hovered, mastery]);

  return (
    <group position={position}>
      {/* Main node mesh */}
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
          <octahedronGeometry args={[0.5, renderQuality === "low" ? 0 : 1]} />
        ) : node.is_synthesis_target ? (
          <icosahedronGeometry args={[0.5, renderQuality === "low" ? 0 : 1]} />
        ) : (
          <sphereGeometry args={[0.4, segments, segments]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          metalness={0.4}
          roughness={0.3}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Mastery ring */}
      {mastery !== "unknown" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <ringGeometry args={[scale * 0.5, scale * 0.6, segments]} />
          <meshBasicMaterial
            color={mastery === "mastered" ? "#22c55e" : mastery === "stable" ? "#3b82f6" : "#f59e0b"}
            transparent
            opacity={0.3}
          />
        </mesh>
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
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {node.label.length > 30 ? node.label.slice(0, 30) + "…" : node.label}
        </Text>
      )}

      {/* Inspect panel (HTML overlay) */}
      {isSelected && (
        <Html
          position={[scale + 0.5, 0, 0]}
          distanceFactor={8}
          style={{ pointerEvents: "none" }}
        >
          <div className="bg-background/95 backdrop-blur-md border border-border/20 rounded-xl p-3 shadow-xl w-56 pointer-events-auto">
            <p className="text-xs font-semibold text-primary mb-1">{node.label}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {node.definition.length > 120 ? node.definition.slice(0, 120) + "…" : node.definition}
            </p>
            <div className="mt-2 flex items-center gap-2 text-[9px]">
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{node.role}</span>
              <span className="px-1.5 py-0.5 rounded bg-accent/30">{node.bloom_target}</span>
              {node.is_gate && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">Gate</span>}
            </div>
          </div>
        </Html>
      )}

      {/* Criticality indicator — small orb */}
      {node.criticality > 0.7 && (
        <mesh position={[scale * 0.6, scale * 0.3, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}
    </group>
  );
}
