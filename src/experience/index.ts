// Experience Layer — barrel export

// Phase 1: Foundation (P0)
export { ImmersionProvider, useImmersion, useImmersionLevel } from "./ImmersionContext";
export type { ImmersionLevel, AmbientMood, AmbientPulse } from "./ImmersionContext";
export { AmbientCanvas } from "./AmbientCanvas";
export { PageTransition } from "./PageTransition";
export { useFeedback } from "./FeedbackPulse";
export type { PerformanceTier, PerformanceBudget } from "./performanceBudget";

// Phase 2: Key Moments (P1)
export { ScoreRevealScene } from "./ScoreRevealScene";
export { PipelineSpectacle } from "./PipelineSpectacle";
export { MissionBriefingMap } from "./MissionBriefingMap";
export { AudioProvider, useAudio } from "./AudioProvider";

// Phase 3: Polish (P2)
export { useCountUp } from "./useCountUp";
export { DepthCard } from "./DepthCard";
export { CelebrationBurst } from "./CelebrationBurst";
