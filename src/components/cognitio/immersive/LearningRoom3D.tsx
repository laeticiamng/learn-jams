// ============================================================
// LearningRoom3D — A single escape game room rendered in 3D.
// Contains floor, walls, ambient lighting, fog, and slots
// for pedagogical objects. Room appearance adapts to the
// universe theme and room purpose.
// ============================================================

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, MeshReflectorMaterial, Float } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Mesh, Points as PointsType } from "three";
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

  const lightColor = useMemo(() => {
    if (lighting.color_temperature === "warm") return "#ffcc88";
    if (lighting.color_temperature === "cool") return "#88aaff";
    if (lighting.color_temperature === "clinical") return "#eeffff";
    return "#ffffff";
  }, [lighting.color_temperature]);

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
            mirror={0.2}
            resolution={256}
            mixBlur={0.7}
            color={isCompleted ? "#1a3a2a" : "#1a1a2e"}
            opacity={opacity}
            transparent={isLocked}
            metalness={0.3}
            roughness={0.7}
          />
        )}
      </mesh>

      {/* Floor grid overlay */}
      {!isLite && <RoomFloorGrid width={dimensions.w} depth={dimensions.d} color={colorPrimary} />}

      {/* Walls with premium finish */}
      <RoomWalls dimensions={dimensions} opacity={opacity} isLite={isLite} isCompleted={isCompleted} />

      {/* Neon edge trims along wall bases */}
      {!isLite && !isLocked && (
        <NeonEdgeTrims dimensions={dimensions} color={colorPrimary} accentColor={colorAccent} isCurrent={isCurrent} />
      )}

      {/* Ceiling light with volumetric cone */}
      {!isLite && (
        <CeilingLight dimensions={dimensions} lightColor={lightColor} intensity={lighting.ambient_intensity} />
      )}

      {/* Room title */}
      <Text
        position={[0, dimensions.h - 0.5, -dimensions.d / 2 + 0.2]}
        fontSize={0.4}
        color={colorPrimary}
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-medium.woff"
        maxWidth={dimensions.w - 2}
        outlineWidth={0.005}
        outlineColor="#000000"
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

      {/* Multi-point ambient lighting */}
      <pointLight
        position={[0, dimensions.h - 0.5, 0]}
        intensity={lighting.point_light_count > 0 ? lighting.ambient_intensity * 2 : 0}
        color={lightColor}
        distance={dimensions.w * 1.5}
        castShadow={!isLite}
        decay={2}
      />
      {/* Secondary fill lights for softer shadows */}
      {!isLite && (
        <>
          <pointLight
            position={[-dimensions.w / 3, 2, dimensions.d / 4]}
            intensity={lighting.ambient_intensity * 0.5}
            color={colorAccent}
            distance={dimensions.w}
            decay={2}
          />
          <pointLight
            position={[dimensions.w / 3, 2, -dimensions.d / 4]}
            intensity={lighting.ambient_intensity * 0.5}
            color={colorPrimary}
            distance={dimensions.w}
            decay={2}
          />
        </>
      )}

      {/* Floating dust particles */}
      {!isLite && !isLocked && (
        <RoomDustParticles dimensions={dimensions} color={colorAccent} />
      )}

      {/* Current room indicator — pulsing ring with glow */}
      {isCurrent && (
        <Float speed={2} rotationIntensity={0} floatIntensity={0.3}>
          <group position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <ringGeometry args={[dimensions.w / 2 - 0.5, dimensions.w / 2, 64]} />
              <meshBasicMaterial color={colorAccent} transparent opacity={0.4} />
            </mesh>
            {/* Outer glow ring */}
            <mesh>
              <ringGeometry args={[dimensions.w / 2, dimensions.w / 2 + 0.3, 64]} />
              <meshBasicMaterial color={colorPrimary} transparent opacity={0.08} depthWrite={false} />
            </mesh>
          </group>
        </Float>
      )}

      {/* Locked overlay with frosted effect */}
      {isLocked && (
        <group>
          <mesh position={[0, dimensions.h / 2, dimensions.d / 4]}>
            <boxGeometry args={[dimensions.w * 0.8, dimensions.h * 0.8, 0.1]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.6} />
          </mesh>
          {/* Lock icon ring */}
          <mesh position={[0, dimensions.h / 2, dimensions.d / 4 + 0.1]}>
            <ringGeometry args={[0.3, 0.5, 24]} />
            <meshBasicMaterial color="#555555" transparent opacity={0.5} />
          </mesh>
        </group>
      )}

      {/* Completed room — green glow + radial ground light */}
      {isCompleted && (
        <>
          <pointLight
            position={[0, 1, 0]}
            intensity={0.5}
            color="#22c55e"
            distance={dimensions.w}
            decay={2}
          />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <circleGeometry args={[dimensions.w / 3, 32]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.04} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* Decorative corner pillars */}
      {!isLite && <CornerPillars dimensions={dimensions} color={colorPrimary} opacity={opacity} />}

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

// ---------- Room Walls ----------

function RoomWalls({
  dimensions,
  opacity,
  isLite,
  isCompleted,
}: {
  dimensions: { w: number; h: number; d: number };
  opacity: number;
  isLite: boolean;
  isCompleted: boolean;
}) {
  const wallColor = isCompleted ? "#1a2e24" : "#16213e";
  return (
    <>
      {/* Back wall */}
      <mesh position={[0, dimensions.h / 2, -dimensions.d / 2]}>
        <boxGeometry args={[dimensions.w, dimensions.h, 0.2]} />
        <meshStandardMaterial
          color={wallColor}
          opacity={opacity * 0.85}
          transparent
          metalness={isLite ? 0 : 0.15}
          roughness={isLite ? 1 : 0.8}
        />
      </mesh>
      {/* Left wall */}
      <mesh position={[-dimensions.w / 2, dimensions.h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[dimensions.d, dimensions.h, 0.2]} />
        <meshStandardMaterial
          color={wallColor}
          opacity={opacity * 0.8}
          transparent
          metalness={isLite ? 0 : 0.15}
          roughness={isLite ? 1 : 0.8}
        />
      </mesh>
      {/* Right wall */}
      <mesh position={[dimensions.w / 2, dimensions.h / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[dimensions.d, dimensions.h, 0.2]} />
        <meshStandardMaterial
          color={wallColor}
          opacity={opacity * 0.8}
          transparent
          metalness={isLite ? 0 : 0.15}
          roughness={isLite ? 1 : 0.8}
        />
      </mesh>
    </>
  );
}

// ---------- Neon Edge Trims ----------

function NeonEdgeTrims({
  dimensions,
  color,
  accentColor,
  isCurrent,
}: {
  dimensions: { w: number; h: number; d: number };
  color: string;
  accentColor: string;
  isCurrent: boolean;
}) {
  const intensity = isCurrent ? 0.8 : 0.3;
  const trimOpacity = isCurrent ? 0.6 : 0.25;

  return (
    <>
      {/* Back wall base trim */}
      <mesh position={[0, 0.05, -dimensions.d / 2 + 0.12]}>
        <boxGeometry args={[dimensions.w - 0.4, 0.04, 0.04]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={intensity}
          transparent
          opacity={trimOpacity}
        />
      </mesh>
      {/* Left wall base trim */}
      <mesh position={[-dimensions.w / 2 + 0.12, 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[dimensions.d - 0.4, 0.04, 0.04]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={intensity * 0.7}
          transparent
          opacity={trimOpacity * 0.8}
        />
      </mesh>
      {/* Right wall base trim */}
      <mesh position={[dimensions.w / 2 - 0.12, 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[dimensions.d - 0.4, 0.04, 0.04]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={intensity * 0.7}
          transparent
          opacity={trimOpacity * 0.8}
        />
      </mesh>
      {/* Top trim on back wall */}
      <mesh position={[0, dimensions.h - 0.05, -dimensions.d / 2 + 0.12]}>
        <boxGeometry args={[dimensions.w - 0.4, 0.02, 0.02]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={intensity * 0.5}
          transparent
          opacity={trimOpacity * 0.5}
        />
      </mesh>
    </>
  );
}

// ---------- Ceiling Light ----------

function CeilingLight({
  dimensions,
  lightColor,
  intensity,
}: {
  dimensions: { w: number; h: number; d: number };
  lightColor: string;
  intensity: number;
}) {
  return (
    <group position={[0, dimensions.h, 0]}>
      {/* Light fixture */}
      <mesh>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
        <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Light bulb glow */}
      <mesh position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial
          color={lightColor}
          emissive={lightColor}
          emissiveIntensity={intensity * 2}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Volumetric cone */}
      <mesh position={[0, -dimensions.h / 2, 0]}>
        <coneGeometry args={[dimensions.w / 3, dimensions.h, 32, 1, true]} />
        <meshBasicMaterial
          color={lightColor}
          transparent
          opacity={0.01}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ---------- Corner Pillars ----------

function CornerPillars({
  dimensions,
  color,
  opacity,
}: {
  dimensions: { w: number; h: number; d: number };
  color: string;
  opacity: number;
}) {
  const corners = useMemo(() => [
    [-dimensions.w / 2 + 0.15, -dimensions.d / 2 + 0.15],
    [dimensions.w / 2 - 0.15, -dimensions.d / 2 + 0.15],
  ], [dimensions]);

  return (
    <>
      {corners.map(([x, z], i) => (
        <group key={`pillar-${i}`} position={[x, dimensions.h / 2, z]}>
          <mesh>
            <boxGeometry args={[0.15, dimensions.h, 0.15]} />
            <meshStandardMaterial
              color="#1a1a2e"
              metalness={0.4}
              roughness={0.5}
              opacity={opacity * 0.9}
              transparent
            />
          </mesh>
          {/* Pillar accent light */}
          <mesh position={[0, -dimensions.h / 2 + 0.3, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.5}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ---------- Floor Grid ----------

function RoomFloorGrid({ width, depth, color }: { width: number; depth: number; color: string }) {
  const lines = useMemo(() => {
    const result: THREE.Vector3[][] = [];
    const step = 2;
    const hw = width / 2;
    const hd = depth / 2;
    for (let x = -hw; x <= hw; x += step) {
      result.push([new THREE.Vector3(x, 0, -hd), new THREE.Vector3(x, 0, hd)]);
    }
    for (let z = -hd; z <= hd; z += step) {
      result.push([new THREE.Vector3(-hw, 0, z), new THREE.Vector3(hw, 0, z)]);
    }
    return result;
  }, [width, depth]);

  return (
    <group position={[0, 0.01, 0]}>
      {lines.map((pts, i) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <line key={i} geometry={geometry}>
            <lineBasicMaterial color={color} transparent opacity={0.03} />
          </line>
        );
      })}
    </group>
  );
}

// ---------- Dust Particles ----------

function RoomDustParticles({
  dimensions,
  color,
}: {
  dimensions: { w: number; h: number; d: number };
  color: string;
}) {
  const pointsRef = useRef<PointsType>(null);
  const count = 30;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * dimensions.w * 0.8;
      pos[i * 3 + 1] = Math.random() * dimensions.h * 0.9;
      pos[i * 3 + 2] = (Math.random() - 0.5) * dimensions.d * 0.8;
    }
    return pos;
  }, [dimensions, count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const arr = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.2 + i * 0.8) * 0.001;
      arr[i * 3] += Math.cos(t * 0.15 + i * 0.6) * 0.0008;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color={color}
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
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
  const meshRef = useRef<Mesh>(null);
  const isInteractable = object.state === "available" || object.state === "discovered";

  // Subtle hover animation
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    if (isInteractable) {
      meshRef.current.rotation.y += delta * 0.3;
      // Gentle breathing scale
      const breath = 1 + Math.sin(state.clock.getElapsedTime() * 1.5) * 0.03;
      meshRef.current.scale.setScalar(object.scale * breath);
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
  const objOpacity = object.state === "locked" ? 0.3 : object.state === "used" ? 0.5 : 1;

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
          {geometry === "sphere" && <sphereGeometry args={[0.5, isLite ? 8 : 20, isLite ? 8 : 20]} />}
          {geometry === "box" && <boxGeometry args={[0.8, 0.8, 0.8]} />}
          {geometry === "torus" && <torusGeometry args={[0.4, 0.15, isLite ? 8 : 16, isLite ? 24 : 48]} />}
          {geometry === "cylinder" && <cylinderGeometry args={[0.3, 0.3, 0.8, isLite ? 8 : 16]} />}
          {geometry === "dodecahedron" && <dodecahedronGeometry args={[0.4, isLite ? 0 : 1]} />}
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isInteractable ? 0.4 : 0.1}
            transparent={objOpacity < 1}
            opacity={objOpacity}
            metalness={0.5}
            roughness={0.25}
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
          outlineWidth={0.008}
          outlineColor="#000000"
        >
          {object.label}
        </Text>
      )}

      {/* Glow ring for discoverable objects — enhanced */}
      {object.state === "available" && (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <mesh>
            <ringGeometry args={[scale * 0.8, scale * 1, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} />
          </mesh>
          {/* Outer glow ring */}
          <mesh>
            <ringGeometry args={[scale * 1, scale * 1.3, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.06} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* Ground light spot under interactable objects */}
      {isInteractable && !isLite && (
        <pointLight
          position={[0, 0.1, 0]}
          intensity={0.15}
          color={color}
          distance={2}
          decay={2}
        />
      )}
    </group>
  );
}
