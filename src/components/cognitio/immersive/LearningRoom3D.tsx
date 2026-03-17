// ============================================================
// LearningRoom3D — A single escape game room rendered in 3D.
// Contains floor, walls, ambient lighting, fog, and slots
// for pedagogical objects. Room appearance adapts to the
// universe theme and room purpose.
// ============================================================

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, MeshReflectorMaterial, Float } from "@react-three/drei";
import type { Group, Mesh } from "three";
import type {
  RoomTemplate,
  LightingConfig,
  FogConfig,
  PedagogicalObject,
  RenderMode,
} from "@/domain/cognitio/immersiveEngine.types";

interface LearningRoom3DProps {
  roomIndex: number;
  roomTitle: string;
  roomPurpose: string;
  template: RoomTemplate;
  lighting: LightingConfig;
  fog: FogConfig;
  objects: PedagogicalObject[];
  colorPrimary: string;
  colorAccent: string;
  isCurrent: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  renderMode: RenderMode;
  onObjectClick?: (objectId: string) => void;
}

export default function LearningRoom3D({
  roomIndex,
  roomTitle,
  roomPurpose,
  template,
  lighting,
  objects,
  colorPrimary,
  colorAccent,
  isCurrent,
  isCompleted,
  isLocked,
  renderMode,
  onObjectClick,
}: LearningRoom3DProps) {
  const groupRef = useRef<Group>(null);

  // Room dimensions based on size
  const dimensions = useMemo(() => {
    switch (template.size) {
      case "small": return { w: 8, h: 4, d: 8 };
      case "large": return { w: 16, h: 6, d: 16 };
      default: return { w: 12, h: 5, d: 12 };
    }
  }, [template.size]);

  // Room offset in world space (rooms laid out along Z axis)
  const zOffset = roomIndex * -(dimensions.d + 4);

  // Locked room opacity
  const opacity = isLocked ? 0.3 : 1;

  // Lite mode: simplified geometry
  const isLite = renderMode === "lite_3d" || renderMode === "pseudo_3d";

  return (
    <group ref={groupRef} position={[0, 0, zOffset]}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[dimensions.w, dimensions.d]} />
        {isLite ? (
          <meshStandardMaterial
            color={isCompleted ? "#1a3a2a" : "#1a1a2e"}
            opacity={opacity}
            transparent={isLocked}
          />
        ) : (
          <MeshReflectorMaterial
            mirror={0.15}
            resolution={256}
            mixBlur={0.8}
            color={isCompleted ? "#1a3a2a" : "#1a1a2e"}
            opacity={opacity}
            transparent={isLocked}
          />
        )}
      </mesh>

      {/* Walls (back, left, right) — simplified boxes */}
      <mesh position={[0, dimensions.h / 2, -dimensions.d / 2]}>
        <boxGeometry args={[dimensions.w, dimensions.h, 0.2]} />
        <meshStandardMaterial color="#16213e" opacity={opacity * 0.8} transparent />
      </mesh>
      <mesh position={[-dimensions.w / 2, dimensions.h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[dimensions.d, dimensions.h, 0.2]} />
        <meshStandardMaterial color="#16213e" opacity={opacity * 0.8} transparent />
      </mesh>
      <mesh position={[dimensions.w / 2, dimensions.h / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[dimensions.d, dimensions.h, 0.2]} />
        <meshStandardMaterial color="#16213e" opacity={opacity * 0.8} transparent />
      </mesh>

      {/* Room title */}
      <Text
        position={[0, dimensions.h - 0.5, -dimensions.d / 2 + 0.2]}
        fontSize={0.4}
        color={colorPrimary}
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-medium.woff"
        maxWidth={dimensions.w - 2}
      >
        {roomTitle}
      </Text>

      {/* Room purpose subtitle */}
      <Text
        position={[0, dimensions.h - 1.1, -dimensions.d / 2 + 0.2]}
        fontSize={0.2}
        color="#888888"
        anchorX="center"
        anchorY="middle"
        maxWidth={dimensions.w - 2}
      >
        {roomPurpose}
      </Text>

      {/* Ambient light for this room */}
      <pointLight
        position={[0, dimensions.h - 0.5, 0]}
        intensity={lighting.point_light_count > 0 ? lighting.ambient_intensity * 2 : 0}
        color={
          lighting.color_temperature === "warm" ? "#ffcc88"
          : lighting.color_temperature === "cool" ? "#88aaff"
          : lighting.color_temperature === "clinical" ? "#eeffff"
          : "#ffffff"
        }
        distance={dimensions.w * 1.5}
        castShadow={!isLite}
      />

      {/* Current room indicator — pulsing ring */}
      {isCurrent && (
        <Float speed={2} rotationIntensity={0} floatIntensity={0.3}>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[dimensions.w / 2 - 0.5, dimensions.w / 2, 64]} />
            <meshBasicMaterial color={colorAccent} transparent opacity={0.4} />
          </mesh>
        </Float>
      )}

      {/* Locked overlay */}
      {isLocked && (
        <mesh position={[0, dimensions.h / 2, dimensions.d / 4]}>
          <boxGeometry args={[dimensions.w * 0.8, dimensions.h * 0.8, 0.1]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Completed checkmark glow */}
      {isCompleted && (
        <pointLight
          position={[0, 1, 0]}
          intensity={0.5}
          color="#22c55e"
          distance={dimensions.w}
        />
      )}

      {/* Pedagogical objects */}
      {objects.map((obj) => (
        <PedagogicalObject3DSlot
          key={obj.id}
          object={obj}
          isLite={isLite}
          onClick={() => onObjectClick?.(obj.id)}
        />
      ))}
    </group>
  );
}

// ---------- Object Slot ----------

interface PedagogicalObject3DSlotProps {
  object: PedagogicalObject;
  isLite: boolean;
  onClick: () => void;
}

function PedagogicalObject3DSlot({
  object,
  isLite,
  onClick,
}: PedagogicalObject3DSlotProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isInteractable = object.state === "available" || object.state === "discovered";

  // Subtle hover animation
  useFrame((_, delta) => {
    if (meshRef.current && isInteractable) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  const color = useMemo(() => {
    switch (object.type) {
      case "concept_node": return "#3b82f6";
      case "clue_object": return "#f59e0b";
      case "relation_bridge": return "#8b5cf6";
      case "knowledge_key": return "#10b981";
      case "protocol_assembler": return "#ec4899";
      case "diagnostic_console": return "#06b6d4";
      case "gate_lock": return "#ef4444";
      case "memory_totem": return "#a855f7";
      case "evidence_board": return "#f97316";
      case "timeline_fragment": return "#14b8a6";
      default: return "#6b7280";
    }
  }, [object.type]);

  const geometry = useMemo(() => {
    switch (object.type) {
      case "concept_node": return "sphere";
      case "gate_lock": return "box";
      case "relation_bridge": return "torus";
      case "timeline_fragment": return "cylinder";
      default: return "dodecahedron";
    }
  }, [object.type]);

  const scale = object.scale * (isInteractable ? 1 : 0.7);
  const opacity = object.state === "locked" ? 0.3 : object.state === "used" ? 0.5 : 1;

  return (
    <group position={[object.position.x, object.position.y, object.position.z]}>
      <Float
        speed={isInteractable ? 1.5 : 0}
        rotationIntensity={isInteractable ? 0.2 : 0}
        floatIntensity={isInteractable ? 0.3 : 0}
      >
        <mesh
          ref={meshRef}
          scale={scale}
          onClick={(e) => {
            e.stopPropagation();
            if (isInteractable) onClick();
          }}
          castShadow={!isLite}
        >
          {geometry === "sphere" && <sphereGeometry args={[0.5, isLite ? 8 : 16, isLite ? 8 : 16]} />}
          {geometry === "box" && <boxGeometry args={[0.8, 0.8, 0.8]} />}
          {geometry === "torus" && <torusGeometry args={[0.4, 0.15, isLite ? 8 : 16, isLite ? 24 : 48]} />}
          {geometry === "cylinder" && <cylinderGeometry args={[0.3, 0.3, 0.8, isLite ? 8 : 16]} />}
          {geometry === "dodecahedron" && <dodecahedronGeometry args={[0.4, isLite ? 0 : 1]} />}
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isInteractable ? 0.3 : 0.1}
            transparent={opacity < 1}
            opacity={opacity}
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>
      </Float>

      {/* Object label */}
      {isInteractable && (
        <Text
          position={[0, scale + 0.5, 0]}
          fontSize={0.15}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          maxWidth={3}
        >
          {object.label}
        </Text>
      )}

      {/* Glow ring for discoverable objects */}
      {object.state === "available" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[scale * 0.8, scale * 1, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} />
        </mesh>
      )}
    </group>
  );
}
