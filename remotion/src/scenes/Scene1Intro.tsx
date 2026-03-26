import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily: headingFont } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });

export const Scene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo mark animation
  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const logoRotate = interpolate(logoScale, [0, 1], [-15, 0]);

  // Title reveal
  const titleSpring = spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 200 } });
  const titleY = interpolate(titleSpring, [0, 1], [60, 0]);
  const titleOp = interpolate(titleSpring, [0, 1], [0, 1]);

  // Subtitle
  const subSpring = spring({ frame: frame - 40, fps, config: { damping: 20 } });
  const subY = interpolate(subSpring, [0, 1], [40, 0]);
  const subOp = interpolate(subSpring, [0, 1], [0, 1]);

  // Glowing line
  const lineWidth = interpolate(frame, [50, 90], [0, 600], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Logo mark */}
      <div
        style={{
          transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
          marginBottom: 30,
          width: 90,
          height: 90,
          borderRadius: 22,
          background: "linear-gradient(135deg, #7C3AED, #3B82F6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 60px rgba(124,58,237,0.4)",
        }}
      >
        <span style={{ fontSize: 48, fontWeight: 800, color: "white", fontFamily: headingFont }}>C</span>
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: headingFont,
          fontSize: 96,
          fontWeight: 700,
          color: "white",
          transform: `translateY(${titleY}px)`,
          opacity: titleOp,
          letterSpacing: "-0.04em",
        }}
      >
        COGNITIO
      </div>

      {/* Glowing line */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          background: "linear-gradient(90deg, transparent, #7C3AED, #3B82F6, transparent)",
          borderRadius: 2,
          marginTop: 16,
          marginBottom: 24,
        }}
      />

      {/* Subtitle */}
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 32,
          color: "rgba(255,255,255,0.7)",
          transform: `translateY(${subY}px)`,
          opacity: subOp,
          fontWeight: 400,
          letterSpacing: "0.02em",
        }}
      >
        Transforme tes cours en expériences d'apprentissage
      </div>
    </AbsoluteFill>
  );
};
