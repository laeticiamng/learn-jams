import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily: headingFont } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });

export const Scene5CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Big title
  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 100 } });
  const titleScale = interpolate(titleSpring, [0, 1], [0.8, 1]);
  const titleOp = interpolate(titleSpring, [0, 1], [0, 1]);

  // Subtitle
  const subSpring = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const subOp = interpolate(subSpring, [0, 1], [0, 1]);
  const subY = interpolate(subSpring, [0, 1], [30, 0]);

  // Stats
  const stats = [
    { value: "3x", label: "plus rapide" },
    { value: "92%", label: "de rétention" },
    { value: "∞", label: "formats" },
  ];

  // Glow pulse
  const glowIntensity = Math.sin(frame * 0.05) * 20 + 60;

  // Gradient text shimmer
  const shimmerX = interpolate(frame, [0, 145], [-100, 200]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(124,58,237,0.12), transparent 70%)`,
          filter: `blur(${glowIntensity}px)`,
        }}
      />

      {/* Stats row */}
      <div style={{ display: "flex", gap: 80, marginBottom: 60, zIndex: 1 }}>
        {stats.map((s, i) => {
          const sp = spring({ frame: frame - 5 - i * 10, fps, config: { damping: 15 } });
          const op = interpolate(sp, [0, 1], [0, 1]);
          const y = interpolate(sp, [0, 1], [40, 0]);
          return (
            <div key={i} style={{ textAlign: "center", opacity: op, transform: `translateY(${y}px)` }}>
              <div
                style={{
                  fontFamily: headingFont,
                  fontSize: 72,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #7C3AED, #3B82F6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main CTA title */}
      <div
        style={{
          fontFamily: headingFont,
          fontSize: 80,
          fontWeight: 700,
          color: "white",
          transform: `scale(${titleScale})`,
          opacity: titleOp,
          textAlign: "center",
          lineHeight: 1.1,
          zIndex: 1,
          position: "relative",
        }}
      >
        Apprends{" "}
        <span
          style={{
            background: `linear-gradient(90deg, #7C3AED, #3B82F6, #7C3AED)`,
            backgroundSize: "200% 100%",
            backgroundPosition: `${shimmerX}% 0`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          intelligemment
        </span>
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 30,
          color: "rgba(255,255,255,0.6)",
          opacity: subOp,
          transform: `translateY(${subY}px)`,
          marginTop: 24,
          zIndex: 1,
        }}
      >
        cognitio.app — Gratuit pour commencer
      </div>

      {/* Logo mark */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          right: 80,
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: subOp,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "linear-gradient(135deg, #7C3AED, #3B82F6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 800, color: "white", fontFamily: headingFont }}>C</span>
        </div>
        <span style={{ fontFamily: headingFont, fontSize: 22, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>COGNITIO</span>
      </div>
    </AbsoluteFill>
  );
};
