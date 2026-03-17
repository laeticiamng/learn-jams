// ============================================================
// PostProcessingEffects — Bloom, Vignette, ChromaticAberration
// Only rendered in full_3d mode with capable GPU.
// ============================================================

import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

export function PostProcessingEffects() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={0.8}
        luminanceThreshold={0.3}
        luminanceSmoothing={0.7}
        mipmapBlur
      />
      <Vignette
        offset={0.25}
        darkness={0.5}
        blendFunction={BlendFunction.NORMAL}
      />
      <ChromaticAberration
        offset={new THREE.Vector2(0.0003, 0.0003)}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={true}
        modulationOffset={0.5}
      />
    </EffectComposer>
  );
}
