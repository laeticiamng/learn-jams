// ============================================================
// PerformanceBudgetManager — Detects device capabilities and
// provides an immersion performance budget. Enriches the
// existing scenePerformanceResolver with immersion-specific
// constraints (animation limits, particle counts, audio).
// ============================================================

export type PerformanceTier = "high" | "mid" | "low";

export interface PerformanceBudget {
  tier: PerformanceTier;
  maxConcurrentAnimations: number;
  allow3D: boolean;
  allowPostProcessing: boolean;
  allowAudio: boolean;
  maxParticleCount: number;
  targetFPS: number;
  reducedMotion: boolean;
  isMobile: boolean;
}

export function detectPerformanceBudget(): PerformanceBudget {
  const isBrowser = typeof window !== "undefined";

  if (!isBrowser) {
    return createLowBudget(false, false);
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

  if (reducedMotion) {
    return createLowBudget(isMobile, true);
  }

  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  const memory = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  const dpr = window.devicePixelRatio ?? 1;

  // Detect WebGL capability
  let hasWebGL = false;
  try {
    const canvas = document.createElement("canvas");
    hasWebGL = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    canvas.remove();
  } catch {
    hasWebGL = false;
  }

  // Classify tier
  if (!isMobile && memory >= 8 && cores >= 4 && dpr <= 2 && hasWebGL) {
    return {
      tier: "high",
      maxConcurrentAnimations: 8,
      allow3D: true,
      allowPostProcessing: true,
      allowAudio: true,
      maxParticleCount: 200,
      targetFPS: 60,
      reducedMotion: false,
      isMobile: false,
    };
  }

  if (memory >= 4 && cores >= 2 && hasWebGL) {
    return {
      tier: "mid",
      maxConcurrentAnimations: 4,
      allow3D: !isMobile,
      allowPostProcessing: false,
      allowAudio: true,
      maxParticleCount: 50,
      targetFPS: 30,
      reducedMotion: false,
      isMobile,
    };
  }

  return createLowBudget(isMobile, false);
}

function createLowBudget(isMobile: boolean, reducedMotion: boolean): PerformanceBudget {
  return {
    tier: "low",
    maxConcurrentAnimations: 2,
    allow3D: false,
    allowPostProcessing: false,
    allowAudio: !reducedMotion,
    maxParticleCount: 0,
    targetFPS: 30,
    reducedMotion,
    isMobile,
  };
}
