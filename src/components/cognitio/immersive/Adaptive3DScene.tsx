// ============================================================
// Adaptive3DScene — Root 3D scene wrapper that adapts to
// device performance. Lazy-loads Three.js, provides fallback
// for non-WebGL devices, and manages render quality.
// ============================================================

import { Suspense, lazy, useMemo, useState, useEffect, useCallback } from "react";
import type { PerformanceProfile, RenderMode } from "@/domain/cognitio/immersiveEngine.types";
import { detectPerformanceProfile, shouldDowngrade } from "@/services/cognitio/scenePerformanceResolver";

// Lazy-load the Canvas to avoid bundling Three.js for 2D fallback
const ThreeCanvas = lazy(() =>
  import("@react-three/fiber").then(mod => ({ default: mod.Canvas }))
);

interface Adaptive3DSceneProps {
  children: React.ReactNode;
  fallback2D: React.ReactNode;
  onRenderModeChange?: (mode: RenderMode) => void;
  className?: string;
}

export default function Adaptive3DScene({
  children,
  fallback2D,
  onRenderModeChange,
  className,
}: Adaptive3DSceneProps) {
  const [profile, setProfile] = useState<PerformanceProfile | null>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>("fallback_2d");
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const detected = detectPerformanceProfile();
      setProfile(detected);
      setRenderMode(detected.render_mode);
      onRenderModeChange?.(detected.render_mode);
    } catch {
      setRenderMode("fallback_2d");
      setError(true);
    }
  }, [onRenderModeChange]);

  const handleWebGLError = useCallback(() => {
    setRenderMode("fallback_2d");
    setError(true);
    onRenderModeChange?.("fallback_2d");
  }, [onRenderModeChange]);

  // 2D fallback
  if (renderMode === "fallback_2d" || error) {
    return <div className={className}>{fallback2D}</div>;
  }

  const dpr = profile
    ? renderMode === "full_3d"
      ? Math.min(profile.device_pixel_ratio, 2)
      : Math.min(profile.device_pixel_ratio, 1.5)
    : 1;

  return (
    <div className={className}>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center scene-3d-backdrop">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground font-medium tracking-wide">Chargement de la scène 3D…</p>
            </div>
          </div>
        }
      >
        <ErrorBoundary3D onError={handleWebGLError} fallback={fallback2D}>
          <ThreeCanvas
            dpr={dpr}
            shadows={profile?.shadows_enabled ?? false}
            gl={{
              antialias: renderMode === "full_3d",
              alpha: true,
              powerPreference: renderMode === "full_3d" ? "high-performance" : "low-power",
            }}
            camera={{ position: [0, 5, 10], fov: 60 }}
            style={{ width: "100%", height: "100%" }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
          >
            {children}
          </ThreeCanvas>
        </ErrorBoundary3D>
      </Suspense>
    </div>
  );
}

// ---------- Error Boundary for WebGL ----------

import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface ErrorBoundary3DProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: () => void;
}

interface ErrorBoundary3DState {
  hasError: boolean;
}

class ErrorBoundary3D extends Component<ErrorBoundary3DProps, ErrorBoundary3DState> {
  constructor(props: ErrorBoundary3DProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundary3DState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
