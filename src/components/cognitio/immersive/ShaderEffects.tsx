// ============================================================
// ShaderEffects — Reusable custom shader materials for the
// immersive 3D escape game. All shaders are conditional on
// renderMode and fall back to meshStandardMaterial for lite/pseudo.
// ============================================================

import { useRef, useMemo } from "react";
import { useFrame, extend } from "@react-three/fiber";
import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";

// ==================== HOLOGRAPHIC GRID ====================

const HolographicGridMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color("#3b82f6"),
    uAccentColor: new THREE.Color("#8b5cf6"),
    uOpacity: 0.15,
    uGridSize: 1.0,
    uScanSpeed: 0.5,
  },
  // Vertex
  `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  // Fragment
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uAccentColor;
    uniform float uOpacity;
    uniform float uGridSize;
    uniform float uScanSpeed;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    float grid(vec2 p, float size) {
      vec2 g = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
      return 1.0 - min(min(g.x, g.y), 1.0);
    }

    void main() {
      // Main grid
      float g1 = grid(vWorldPos.xz, uGridSize) * 0.6;
      // Sub-grid
      float g2 = grid(vWorldPos.xz, uGridSize * 0.25) * 0.15;
      float gridVal = g1 + g2;

      // Scan line moving along Z
      float scanLine = smoothstep(0.0, 0.3, 
        1.0 - abs(fract(vWorldPos.z * 0.05 - uTime * uScanSpeed) - 0.5) * 2.0
      ) * 0.4;

      // Radial fade from center
      float dist = length(vWorldPos.xz) * 0.08;
      float radialFade = 1.0 - smoothstep(0.0, 1.0, dist);

      // Mix colors
      vec3 col = mix(uColor, uAccentColor, scanLine);
      float alpha = (gridVal + scanLine) * radialFade * uOpacity;

      gl_FragColor = vec4(col, alpha);
    }
  `
);

extend({ HolographicGridMaterial: HolographicGridMaterialImpl });

declare module "@react-three/fiber" {
  interface ThreeElements {
    holographicGridMaterial: JSX.IntrinsicElements["shaderMaterial"] & {
      uTime?: number;
      uColor?: THREE.Color;
      uAccentColor?: THREE.Color;
      uOpacity?: number;
      uGridSize?: number;
      uScanSpeed?: number;
    };
  }
}

interface HolographicGridProps {
  width: number;
  depth: number;
  color?: string;
  accentColor?: string;
  opacity?: number;
  gridSize?: number;
}

export function HolographicGrid({
  width,
  depth,
  color = "#3b82f6",
  accentColor = "#8b5cf6",
  opacity = 0.15,
  gridSize = 1.0,
}: HolographicGridProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (matRef.current) {
      (matRef.current as any).uTime = clock.getElapsedTime();
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <planeGeometry args={[width, depth]} />
      <holographicGridMaterial
        ref={matRef as any}
        uColor={new THREE.Color(color)}
        uAccentColor={new THREE.Color(accentColor)}
        uOpacity={opacity}
        uGridSize={gridSize}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ==================== FRESNEL GLOW MATERIAL ====================

const FresnelGlowMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color("#3b82f6"),
    uGlowColor: new THREE.Color("#60a5fa"),
    uFresnelPower: 2.0,
    uGlowIntensity: 0.6,
    uOpacity: 1.0,
    uPulse: 0.0,
  },
  // Vertex
  `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPos.xyz);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  // Fragment
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uGlowColor;
    uniform float uFresnelPower;
    uniform float uGlowIntensity;
    uniform float uOpacity;
    uniform float uPulse;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec2 vUv;

    void main() {
      float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), uFresnelPower);
      float pulse = 1.0 + sin(uTime * 2.0) * uPulse * 0.15;
      
      vec3 baseColor = uColor;
      vec3 rimColor = uGlowColor * fresnel * uGlowIntensity * pulse;
      
      vec3 finalColor = baseColor + rimColor;
      float alpha = uOpacity + fresnel * 0.3;
      
      gl_FragColor = vec4(finalColor, min(alpha, 1.0));
    }
  `
);

extend({ FresnelGlowMaterial: FresnelGlowMaterialImpl });

declare module "@react-three/fiber" {
  interface ThreeElements {
    fresnelGlowMaterial: JSX.IntrinsicElements["shaderMaterial"] & {
      uTime?: number;
      uColor?: THREE.Color;
      uGlowColor?: THREE.Color;
      uFresnelPower?: number;
      uGlowIntensity?: number;
      uOpacity?: number;
      uPulse?: number;
    };
  }
}

interface FresnelMeshProps {
  color: string;
  glowColor: string;
  fresnelPower?: number;
  glowIntensity?: number;
  opacity?: number;
  pulse?: number;
  children: React.ReactNode;
}

export function FresnelMesh({
  color,
  glowColor,
  fresnelPower = 2.0,
  glowIntensity = 0.6,
  opacity = 1.0,
  pulse = 0,
  children,
}: FresnelMeshProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (matRef.current) {
      (matRef.current as any).uTime = clock.getElapsedTime();
    }
  });

  return (
    <mesh>
      {children}
      <fresnelGlowMaterial
        ref={matRef as any}
        uColor={new THREE.Color(color)}
        uGlowColor={new THREE.Color(glowColor)}
        uFresnelPower={fresnelPower}
        uGlowIntensity={glowIntensity}
        uOpacity={opacity}
        uPulse={pulse}
        transparent
      />
    </mesh>
  );
}

// ==================== WALL SCAN-LINE EFFECT ====================

const ScanLineMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color("#16213e"),
    uScanColor: new THREE.Color("#3b82f6"),
    uScanWidth: 0.05,
    uScanSpeed: 0.3,
    uOpacity: 0.85,
  },
  // Vertex
  `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  // Fragment
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uScanColor;
    uniform float uScanWidth;
    uniform float uScanSpeed;
    uniform float uOpacity;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      // Scan band moving vertically
      float scanPos = fract(uTime * uScanSpeed);
      float scanDist = abs(vUv.y - scanPos);
      float scan = smoothstep(uScanWidth, 0.0, scanDist) * 0.35;
      
      // Subtle horizontal lines
      float hLines = smoothstep(0.48, 0.5, abs(fract(vUv.y * 40.0) - 0.5)) * 0.04;
      
      vec3 col = mix(uColor, uScanColor, scan + hLines);
      gl_FragColor = vec4(col, uOpacity);
    }
  `
);

extend({ ScanLineMaterial: ScanLineMaterialImpl });

declare module "@react-three/fiber" {
  interface ThreeElements {
    scanLineMaterial: JSX.IntrinsicElements["shaderMaterial"] & {
      uTime?: number;
      uColor?: THREE.Color;
      uScanColor?: THREE.Color;
      uScanWidth?: number;
      uScanSpeed?: number;
      uOpacity?: number;
    };
  }
}

interface ScanLineWallProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  args: [number, number, number];
  wallColor?: string;
  scanColor?: string;
  opacity?: number;
}

export function ScanLineWall({
  position,
  rotation = [0, 0, 0],
  args,
  wallColor = "#16213e",
  scanColor = "#3b82f6",
  opacity = 0.85,
}: ScanLineWallProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (matRef.current) {
      (matRef.current as any).uTime = clock.getElapsedTime();
    }
  });

  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={args} />
      <scanLineMaterial
        ref={matRef as any}
        uColor={new THREE.Color(wallColor)}
        uScanColor={new THREE.Color(scanColor)}
        uOpacity={opacity}
        transparent
      />
    </mesh>
  );
}

// ==================== PORTAL RING ====================

const PortalRingMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color("#8b5cf6"),
    uSpeed: 1.0,
  },
  // Vertex
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uSpeed;
    varying vec2 vUv;

    void main() {
      float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
      float dist = length(vUv - 0.5);
      
      // Rotating energy pattern
      float pattern = sin(angle * 6.0 + uTime * uSpeed * 3.0) * 0.5 + 0.5;
      pattern *= sin(angle * 3.0 - uTime * uSpeed * 2.0) * 0.5 + 0.5;
      
      // Radial glow
      float glow = smoothstep(0.5, 0.3, dist) * smoothstep(0.1, 0.25, dist);
      
      float alpha = pattern * glow * 0.7;
      vec3 col = uColor * (1.0 + pattern * 0.5);
      
      gl_FragColor = vec4(col, alpha);
    }
  `
);

extend({ PortalRingMaterial: PortalRingMaterialImpl });

declare module "@react-three/fiber" {
  interface ThreeElements {
    portalRingMaterial: JSX.IntrinsicElements["shaderMaterial"] & {
      uTime?: number;
      uColor?: THREE.Color;
      uSpeed?: number;
    };
  }
}

interface PortalEffectProps {
  position: [number, number, number];
  color?: string;
  radius?: number;
  active?: boolean;
}

export function PortalEffect({
  position,
  color = "#8b5cf6",
  radius = 1.5,
  active = true,
}: PortalEffectProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (matRef.current) {
      (matRef.current as any).uTime = clock.getElapsedTime();
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.005;
    }
  });

  if (!active) return null;

  return (
    <group position={position}>
      {/* Outer energy ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[radius, 0.04, 16, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
          transparent
          opacity={0.6}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>
      {/* Inner glow disc */}
      <mesh rotation={[0, 0, 0]}>
        <circleGeometry args={[radius * 0.95, 64]} />
        <portalRingMaterial
          ref={matRef as any}
          uColor={new THREE.Color(color)}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Portal point light */}
      <pointLight color={color} intensity={0.5} distance={radius * 3} decay={2} />
    </group>
  );
}

// ==================== FIREFLY PARTICLES ====================

interface FireflyParticlesProps {
  count: number;
  bounds: { w: number; h: number; d: number };
  color?: string;
  speed?: number;
}

export function FireflyParticles({
  count,
  bounds,
  color = "#f59e0b",
  speed = 1,
}: FireflyParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * bounds.w * 0.8;
      pos[i * 3 + 1] = Math.random() * bounds.h * 0.9 + 0.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * bounds.d * 0.8;
      vel[i * 3] = (Math.random() - 0.5) * 0.003 * speed;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.002 * speed;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.003 * speed;
    }
    return { positions: pos, velocities: vel };
  }, [count, bounds.w, bounds.h, bounds.d, speed]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const arr = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();
    const hw = bounds.w * 0.4;
    const hd = bounds.d * 0.4;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Organic movement with sine modulation
      arr[i3] += velocities[i3] + Math.sin(t * 0.7 + i * 1.3) * 0.001;
      arr[i3 + 1] += velocities[i3 + 1] + Math.cos(t * 0.5 + i * 0.9) * 0.0008;
      arr[i3 + 2] += velocities[i3 + 2] + Math.sin(t * 0.6 + i * 1.7) * 0.001;

      // Soft boundary wrapping
      if (arr[i3] > hw) arr[i3] = -hw;
      if (arr[i3] < -hw) arr[i3] = hw;
      if (arr[i3 + 1] > bounds.h) arr[i3 + 1] = 0.2;
      if (arr[i3 + 1] < 0.2) arr[i3 + 1] = bounds.h;
      if (arr[i3 + 2] > hd) arr[i3 + 2] = -hd;
      if (arr[i3 + 2] < -hd) arr[i3 + 2] = hd;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={color}
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ==================== ORBITAL PARTICLES ====================

interface OrbitalParticlesProps {
  count?: number;
  radius: number;
  color: string;
  speed?: number;
}

export function OrbitalParticles({
  count = 12,
  radius,
  color,
  speed = 1,
}: OrbitalParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      ph[i] = (i / count) * Math.PI * 2;
      const angle = ph[i];
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = (Math.random() - 0.5) * radius * 0.5;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return { positions: pos, phases: ph };
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const arr = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime() * speed;

    for (let i = 0; i < count; i++) {
      const angle = phases[i] + t;
      const r = radius + Math.sin(t * 2 + i) * radius * 0.15;
      arr[i * 3] = Math.cos(angle) * r;
      arr[i * 3 + 1] = Math.sin(t * 1.5 + i * 0.7) * radius * 0.3;
      arr[i * 3 + 2] = Math.sin(angle) * r;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={color}
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ==================== ANIMATED DASH CONNECTION ====================

interface AnimatedConnectionProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
  dashSize?: number;
  speed?: number;
}

export function AnimatedConnection({
  start,
  end,
  color,
  dashSize = 0.15,
  speed = 1,
}: AnimatedConnectionProps) {
  const lineRef = useRef<THREE.Line>(null);

  const { geometry, material } = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
    geom.computeLineDistances();
    const mat = new THREE.LineDashedMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      dashSize,
      gapSize: dashSize * 0.8,
      linewidth: 1,
    });
    return { geometry: geom, material: mat };
  }, [start, end, color, dashSize]);

  useFrame(({ clock }) => {
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineDashedMaterial;
      mat.dashSize = dashSize + Math.sin(clock.getElapsedTime() * speed) * dashSize * 0.3;
    }
  });

  return <primitive ref={lineRef} object={new THREE.Line(geometry, material)} />;
}

// ==================== REVEAL BURST PARTICLES ====================

interface RevealBurstProps {
  position: [number, number, number];
  color: string;
  active: boolean;
  particleCount?: number;
}

export function RevealBurst({
  position,
  color,
  active,
  particleCount = 20,
}: RevealBurstProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const startTimeRef = useRef<number | null>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      pos[i * 3] = Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = Math.cos(phi);
    }
    return pos;
  }, [particleCount]);

  useFrame(({ clock }) => {
    if (!pointsRef.current || !active) return;
    if (startTimeRef.current === null) {
      startTimeRef.current = clock.getElapsedTime();
    }
    const elapsed = clock.getElapsedTime() - startTimeRef.current;
    const expansion = Math.min(elapsed * 3, 2);
    const fade = Math.max(1 - elapsed * 0.8, 0);

    pointsRef.current.scale.setScalar(expansion);
    (pointsRef.current.material as THREE.PointsMaterial).opacity = fade * 0.8;

    if (fade <= 0) {
      startTimeRef.current = null;
    }
  });

  if (!active) return null;

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={color}
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
