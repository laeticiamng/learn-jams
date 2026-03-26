import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { Scene1Intro } from "./scenes/Scene1Intro";
import { Scene2Problem } from "./scenes/Scene2Problem";
import { Scene3Upload } from "./scenes/Scene3Upload";
import { Scene4Transform } from "./scenes/Scene4Transform";
import { Scene5CTA } from "./scenes/Scene5CTA";

const BG_PURPLE = "#7C3AED";
const BG_BLUE = "#3B82F6";

const PersistentBackground = () => {
  const frame = useCurrentFrame();
  const gradAngle = interpolate(frame, [0, 600], [135, 200]);
  const purpleOpacity = interpolate(frame, [0, 600], [0.15, 0.08]);
  const blueOpacity = interpolate(frame, [0, 600], [0.08, 0.15]);

  return (
    <AbsoluteFill>
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(124,58,237,${purpleOpacity}), transparent 60%),
            radial-gradient(ellipse at 70% 80%, rgba(59,130,246,${blueOpacity}), transparent 60%),
            linear-gradient(${gradAngle}deg, #09090f, #0c0a18, #09090f)
          `,
        }}
      />
    </AbsoluteFill>
  );
};

const FloatingOrbs = () => {
  const frame = useCurrentFrame();
  const orbs = [
    { x: 15, y: 20, size: 300, color: BG_PURPLE, speed: 0.8 },
    { x: 75, y: 70, size: 250, color: BG_BLUE, speed: 1.2 },
    { x: 50, y: 45, size: 200, color: "#a855f7", speed: 0.6 },
  ];

  return (
    <AbsoluteFill style={{ opacity: 0.06 }}>
      {orbs.map((orb, i) => {
        const dx = Math.sin(frame * 0.01 * orb.speed) * 40;
        const dy = Math.cos(frame * 0.008 * orb.speed + i) * 30;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${orb.x}%`,
              top: `${orb.y}%`,
              width: orb.size,
              height: orb.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
              transform: `translate(${dx}px, ${dy}px)`,
              filter: "blur(60px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const MainVideo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#09090f" }}>
      <PersistentBackground />
      <FloatingOrbs />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={140}>
          <Scene1Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene2Problem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene3Upload />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={140}>
          <Scene4Transform />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={145}>
          <Scene5CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
