// ============================================================
// CameraSystem — Manages camera modes, transitions, and
// waypoints for the 3D escape game scene.
// ============================================================

import type {
  CameraMode,
  CameraState,
  CameraWaypoint,
  PedagogicalObject,
} from "@/domain/cognitio/immersiveEngine.types";

// ---------- Constants ----------

const DEFAULT_FOV = 60;
const INSPECT_FOV = 40;
const OVERVIEW_FOV = 75;

const DEFAULT_POSITION = { x: 0, y: 5, z: 10 };
const DEFAULT_TARGET = { x: 0, y: 0, z: 0 };

// ---------- Camera State Factory ----------

export function createDefaultCameraState(): CameraState {
  return {
    mode: "guided",
    position: { ...DEFAULT_POSITION },
    target: { ...DEFAULT_TARGET },
    fov: DEFAULT_FOV,
    zoom: 1,
    transition_duration: 1.0,
    locked: false,
  };
}

// ---------- Mode Transitions ----------

export function transitionToMode(
  current: CameraState,
  mode: CameraMode,
  focusTarget?: { x: number; y: number; z: number },
): CameraState {
  switch (mode) {
    case "guided":
      return {
        ...current,
        mode: "guided",
        fov: DEFAULT_FOV,
        zoom: 1,
        transition_duration: 1.2,
        locked: false,
      };

    case "exploration":
      return {
        ...current,
        mode: "exploration",
        fov: DEFAULT_FOV,
        zoom: 1,
        transition_duration: 0.8,
        locked: false,
      };

    case "inspect":
      return {
        ...current,
        mode: "inspect",
        target: focusTarget ?? current.target,
        position: focusTarget
          ? {
              x: focusTarget.x + 1.5,
              y: focusTarget.y + 1,
              z: focusTarget.z + 2,
            }
          : current.position,
        fov: INSPECT_FOV,
        zoom: 1.5,
        transition_duration: 0.6,
        locked: true,
      };

    case "focus":
      return {
        ...current,
        mode: "focus",
        target: focusTarget ?? current.target,
        position: focusTarget
          ? {
              x: focusTarget.x,
              y: focusTarget.y + 3,
              z: focusTarget.z + 5,
            }
          : current.position,
        fov: DEFAULT_FOV - 10,
        zoom: 1.2,
        transition_duration: 1.0,
        locked: true,
      };

    case "overview":
      return {
        ...current,
        mode: "overview",
        position: { x: 0, y: 12, z: 15 },
        target: { x: 0, y: 0, z: 0 },
        fov: OVERVIEW_FOV,
        zoom: 0.8,
        transition_duration: 1.5,
        locked: false,
      };

    case "transition":
      return {
        ...current,
        mode: "transition",
        transition_duration: 2.0,
        locked: true,
      };

    default:
      return current;
  }
}

// ---------- Object Inspection ----------

export function focusOnObject(
  current: CameraState,
  object: PedagogicalObject,
): CameraState {
  const offset = object.scale * 2;
  return {
    ...current,
    mode: "inspect",
    target: { ...object.position },
    position: {
      x: object.position.x + offset,
      y: object.position.y + offset * 0.7,
      z: object.position.z + offset * 1.2,
    },
    fov: INSPECT_FOV,
    zoom: 1.5,
    transition_duration: 0.6,
    locked: true,
  };
}

// ---------- Room Transitions ----------

export function createRoomEntryWaypoint(
  roomIndex: number,
  roomCenter: { x: number; y: number; z: number },
): CameraWaypoint {
  return {
    id: `room-entry-${roomIndex}`,
    position: {
      x: roomCenter.x,
      y: roomCenter.y + 8,
      z: roomCenter.z + 12,
    },
    target: roomCenter,
    fov: DEFAULT_FOV,
    duration: 2.0,
    easing: "ease_in_out",
    trigger: `room_enter_${roomIndex}`,
  };
}

export function createRoomOverviewWaypoint(
  roomIndex: number,
  roomCenter: { x: number; y: number; z: number },
): CameraWaypoint {
  return {
    id: `room-overview-${roomIndex}`,
    position: {
      x: roomCenter.x,
      y: roomCenter.y + 5,
      z: roomCenter.z + 8,
    },
    target: roomCenter,
    fov: DEFAULT_FOV,
    duration: 1.5,
    easing: "ease_out",
  };
}

// ---------- Guided Tour ----------

export function createGuidedTourWaypoints(
  objects: PedagogicalObject[],
): CameraWaypoint[] {
  return objects
    .filter(obj => obj.state === "available")
    .map((obj, index) => ({
      id: `tour-${obj.id}`,
      position: {
        x: obj.position.x + 2,
        y: obj.position.y + 1.5,
        z: obj.position.z + 3,
      },
      target: obj.position,
      fov: DEFAULT_FOV - 5,
      duration: 1.2,
      easing: "ease_in_out" as const,
      trigger: `tour_step_${index}`,
    }));
}

// ---------- Animation Helpers ----------

export function interpolatePosition(
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  t: number, // 0-1
  easing: CameraWaypoint["easing"] = "linear",
): { x: number; y: number; z: number } {
  const easedT = applyEasing(t, easing);
  return {
    x: from.x + (to.x - from.x) * easedT,
    y: from.y + (to.y - from.y) * easedT,
    z: from.z + (to.z - from.z) * easedT,
  };
}

function applyEasing(t: number, easing: CameraWaypoint["easing"]): number {
  switch (easing) {
    case "ease_in":
      return t * t;
    case "ease_out":
      return 1 - (1 - t) * (1 - t);
    case "ease_in_out":
      return t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case "linear":
    default:
      return t;
  }
}

// ---------- Accessibility ----------

export function getReducedMotionCamera(mode: CameraMode): CameraState {
  // Instant transitions, no animation
  const state = createDefaultCameraState();
  state.mode = mode;
  state.transition_duration = 0;
  state.locked = mode === "inspect" || mode === "focus";
  return state;
}

export function shouldReduceMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
