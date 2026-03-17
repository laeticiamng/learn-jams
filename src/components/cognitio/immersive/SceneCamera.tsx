// ============================================================
// SceneCamera — Adaptive camera controller for the immersive
// escape game scene. Provides OrbitControls with constrained
// exploration, smooth room-to-room transitions, and idle drift.
// ============================================================

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface SceneCameraProps {
  /** Target room center position (world space) */
  roomTarget: [number, number, number];
  /** Whether the camera is currently transitioning between rooms */
  isTransitioning: boolean;
  /** Enable idle drift when user is not interacting */
  enableDrift?: boolean;
  /** Render mode — restricts controls in lite/pseudo modes */
  renderMode: "full_3d" | "lite_3d" | "pseudo_3d";
}

export default function SceneCamera({
  roomTarget,
  isTransitioning,
  enableDrift = true,
  renderMode,
}: SceneCameraProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const targetVec = useRef(new THREE.Vector3(...roomTarget));
  const positionVec = useRef(new THREE.Vector3(roomTarget[0], roomTarget[1] + 6, roomTarget[2] + 10));
  const idleTimer = useRef(0);
  const isUserInteracting = useRef(false);

  // Update target when room changes
  useEffect(() => {
    targetVec.current.set(...roomTarget);
    positionVec.current.set(roomTarget[0], roomTarget[1] + 6, roomTarget[2] + 10);
    idleTimer.current = 0;
  }, [roomTarget[0], roomTarget[1], roomTarget[2]]);

  // Smooth camera transition + idle drift
  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    const lerpSpeed = isTransitioning ? 1.5 : 3;

    // Smoothly move orbit target
    controls.target.lerp(targetVec.current, delta * lerpSpeed);

    // Smoothly transition camera position on room change
    if (isTransitioning) {
      camera.position.lerp(positionVec.current, delta * 1.2);
    }

    // Idle drift — gentle orbit when user hasn't interacted
    if (enableDrift && !isUserInteracting.current && !isTransitioning && renderMode === "full_3d") {
      idleTimer.current += delta;
      if (idleTimer.current > 4) {
        const driftAngle = state.clock.getElapsedTime() * 0.08;
        const driftRadius = 0.15;
        const offsetX = Math.sin(driftAngle) * driftRadius;
        const offsetY = Math.cos(driftAngle * 0.7) * driftRadius * 0.3;
        camera.position.x += offsetX * delta;
        camera.position.y += offsetY * delta;
      }
    }

    controls.update();
  });

  const handleStart = () => {
    isUserInteracting.current = true;
    idleTimer.current = 0;
  };

  const handleEnd = () => {
    isUserInteracting.current = false;
    idleTimer.current = 0;
  };

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      enableRotate={true}
      maxPolarAngle={Math.PI / 2.2}
      minPolarAngle={Math.PI / 6}
      minDistance={4}
      maxDistance={renderMode === "full_3d" ? 18 : 14}
      dampingFactor={0.08}
      enableDamping
      rotateSpeed={0.5}
      zoomSpeed={0.6}
      onStart={handleStart}
      onEnd={handleEnd}
      makeDefault
    />
  );
}
