// ============================================================
// ScenePerformanceResolver — Detects device capabilities and
// resolves the optimal render mode for the 3D escape game.
// Provides graceful fallback from full 3D to 2D.
// ============================================================

import type {
  PerformanceProfile,
  RenderMode,
} from "@/domain/cognitio/immersiveEngine.types";

// ---------- Detection ----------

export function detectPerformanceProfile(): PerformanceProfile {
  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

  if (!isBrowser) {
    return createFallbackProfile();
  }

  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

  const webgl_available = !!canvas.getContext("webgl");
  const webgl2_available = !!canvas.getContext("webgl2");

  let max_texture_size = 0;
  let gpu_tier: PerformanceProfile["gpu_tier"] = "unknown";

  if (gl) {
    max_texture_size = gl.getParameter(gl.MAX_TEXTURE_SIZE) ?? 0;
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "";
      gpu_tier = classifyGPU(renderer);
    }
  }

  const device_pixel_ratio = window.devicePixelRatio ?? 1;
  const is_mobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  const reduced_motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Estimate available memory
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory_mb = (nav.deviceMemory ?? 4) * 1024;

  // Estimate FPS capability
  const estimated_fps = estimateFPS(is_mobile, gpu_tier, memory_mb);

  // Determine capabilities
  const shadows_enabled = gpu_tier === "high" && !is_mobile;
  const post_processing = gpu_tier === "high" && estimated_fps >= 45;
  const max_objects = resolveMaxObjects(gpu_tier, is_mobile);
  const particle_budget = resolveParticleBudget(gpu_tier, is_mobile);

  // Clean up
  canvas.remove();

  return {
    render_mode: resolveRenderMode({
      webgl_available,
      webgl2_available,
      gpu_tier,
      is_mobile,
      reduced_motion,
      estimated_fps,
    }),
    webgl_available,
    webgl2_available,
    max_texture_size,
    device_pixel_ratio,
    estimated_fps,
    gpu_tier,
    is_mobile,
    reduced_motion,
    memory_mb,
    shadows_enabled,
    post_processing,
    max_objects,
    particle_budget,
  };
}

// ---------- Render Mode Resolution ----------

interface RenderModeInput {
  webgl_available: boolean;
  webgl2_available: boolean;
  gpu_tier: PerformanceProfile["gpu_tier"];
  is_mobile: boolean;
  reduced_motion: boolean;
  estimated_fps: number;
}

export function resolveRenderMode(input: RenderModeInput): RenderMode {
  // No WebGL → 2D fallback
  if (!input.webgl_available) {
    return "fallback_2d";
  }

  // Reduced motion preference → pseudo 3D (minimal animation)
  if (input.reduced_motion) {
    return "pseudo_3d";
  }

  // Low GPU or mobile with low FPS → lite 3D
  if (input.gpu_tier === "low" || (input.is_mobile && input.estimated_fps < 30)) {
    return "lite_3d";
  }

  // Medium GPU or mobile → lite 3D
  if (input.gpu_tier === "medium" || input.is_mobile) {
    return "lite_3d";
  }

  // High GPU desktop → full 3D
  return "full_3d";
}

// ---------- GPU Classification ----------

function classifyGPU(renderer: string): PerformanceProfile["gpu_tier"] {
  const lower = renderer.toLowerCase();

  // High-end GPUs
  if (
    /nvidia.*rtx|nvidia.*gtx\s*(1[6-9]|[2-9]\d|[3-4]\d)/i.test(lower) ||
    /radeon.*rx\s*(5[6-9]|6[0-9]|7[0-9])/i.test(lower) ||
    /apple.*m[1-4]/i.test(lower) ||
    /apple gpu/i.test(lower)
  ) {
    return "high";
  }

  // Low-end
  if (
    /intel.*hd\s*(4[0-5]|5[0-2]|6[0-1])/i.test(lower) ||
    /mali-[gt][1-5]/i.test(lower) ||
    /adreno\s*(3|4[0-2]|5[0-1])/i.test(lower) ||
    /swiftshader/i.test(lower) ||
    /mesa/i.test(lower)
  ) {
    return "low";
  }

  // Default to medium
  return "medium";
}

function estimateFPS(
  isMobile: boolean,
  gpuTier: PerformanceProfile["gpu_tier"],
  memoryMb: number,
): number {
  if (gpuTier === "high" && !isMobile) return 60;
  if (gpuTier === "high" && isMobile) return 45;
  if (gpuTier === "medium" && !isMobile) return 45;
  if (gpuTier === "medium" && isMobile) return 30;
  if (gpuTier === "low") return 20;
  if (memoryMb < 2048) return 20;
  return 30;
}

function resolveMaxObjects(
  gpuTier: PerformanceProfile["gpu_tier"],
  isMobile: boolean,
): number {
  if (gpuTier === "high" && !isMobile) return 50;
  if (gpuTier === "high" && isMobile) return 30;
  if (gpuTier === "medium") return 20;
  return 10;
}

function resolveParticleBudget(
  gpuTier: PerformanceProfile["gpu_tier"],
  isMobile: boolean,
): number {
  if (gpuTier === "high" && !isMobile) return 500;
  if (gpuTier === "high" && isMobile) return 200;
  if (gpuTier === "medium") return 100;
  return 0;
}

// ---------- Fallback Profile ----------

function createFallbackProfile(): PerformanceProfile {
  return {
    render_mode: "fallback_2d",
    webgl_available: false,
    webgl2_available: false,
    max_texture_size: 0,
    device_pixel_ratio: 1,
    estimated_fps: 0,
    gpu_tier: "unknown",
    is_mobile: false,
    reduced_motion: false,
    memory_mb: 0,
    shadows_enabled: false,
    post_processing: false,
    max_objects: 10,
    particle_budget: 0,
  };
}

// ---------- Runtime Adaptation ----------

export function shouldDowngrade(
  currentMode: RenderMode,
  measuredFps: number,
): { downgrade: boolean; suggested: RenderMode } {
  if (measuredFps >= 25) return { downgrade: false, suggested: currentMode };

  const downgradeMap: Record<RenderMode, RenderMode> = {
    full_3d: "lite_3d",
    lite_3d: "pseudo_3d",
    pseudo_3d: "fallback_2d",
    fallback_2d: "fallback_2d",
  };

  return {
    downgrade: true,
    suggested: downgradeMap[currentMode],
  };
}

// ---------- Feature Guards ----------

export function canUseShadows(profile: PerformanceProfile): boolean {
  return profile.shadows_enabled && profile.render_mode === "full_3d";
}

export function canUsePostProcessing(profile: PerformanceProfile): boolean {
  return profile.post_processing && profile.render_mode === "full_3d";
}

export function canUseParticles(profile: PerformanceProfile): boolean {
  return profile.particle_budget > 0 && profile.render_mode !== "fallback_2d";
}

export function getObjectBudget(profile: PerformanceProfile): number {
  return profile.max_objects;
}

export function getRenderQuality(profile: PerformanceProfile): number {
  switch (profile.render_mode) {
    case "full_3d": return 1.0;
    case "lite_3d": return 0.7;
    case "pseudo_3d": return 0.5;
    case "fallback_2d": return 0;
  }
}
