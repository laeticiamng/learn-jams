import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily: headingFont } = loadFont("normal", { weights: ["600"], subsets: ["latin"] });

const formats = [
  { emoji: "🎮", label: "Escape Game", color: "#7C3AED" },
  { emoji: "📖", label: "Histoire Animée", color: "#3B82F6" },
  { emoji: "🎵", label: "Chanson", color: "#ec4899" },
  { emoji: "📋", label: "Fiche Dynamique", color: "#22c55e" },
];

export const Scene4Transform = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleSpring = spring({ frame, fps, config: { damping: 20 } });
  const titleOp = interpolate(titleSpring, [0, 1], [0, 1]);

  // Center brain/AI glow
  const glowPulse = Math.sin(frame * 0.06) * 0.15 + 0.85;
  const rotation = interpolate(frame, [0, 140], [0, 360]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Step label */}
      <div
        style={{
          position: "absolute",
          top: 80,
          opacity: titleOp,
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: headingFont, fontSize: 24, color: "#3B82F6", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
          Étape 2
        </div>
        <div style={{ fontFamily: headingFont, fontSize: 52, color: "white", fontWeight: 600 }}>
          L'IA transforme tout
        </div>
      </div>

      {/* Center orb */}
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #7C3AED, #3B82F6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 ${60 * glowPulse}px rgba(124,58,237,${0.5 * glowPulse})`,
          transform: `scale(${glowPulse})`,
          position: "relative",
          zIndex: 2,
        }}
      >
        <span style={{ fontSize: 64 }}>🧠</span>
      </div>

      {/* Rotating ring */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: "1px solid rgba(124,58,237,0.2)",
          transform: `rotate(${rotation}deg)`,
        }}
      >
        <div style={{ position: "absolute", top: -4, left: "50%", width: 8, height: 8, borderRadius: "50%", background: "#7C3AED", marginLeft: -4 }} />
      </div>

      {/* Format cards */}
      {formats.map((f, i) => {
        const angle = (i / formats.length) * Math.PI * 2 - Math.PI / 2;
        const radius = 300;
        const cx = Math.cos(angle) * radius;
        const cy = Math.sin(angle) * radius;
        const s = spring({ frame: frame - 30 - i * 12, fps, config: { damping: 12 } });
        const scale = interpolate(s, [0, 1], [0.5, 1]);
        const op = interpolate(s, [0, 1], [0, 1]);

        // Connection line
        const lineOp = interpolate(frame, [40 + i * 12, 55 + i * 12], [0, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        return (
          <div key={i}>
            {/* Line from center to card */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              <line
                x1="50%"
                y1="50%"
                x2={`${50 + (cx / 1920) * 100}%`}
                y2={`${50 + (cy / 1080) * 100}%`}
                stroke={f.color}
                strokeWidth={2}
                opacity={lineOp}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                left: `calc(50% + ${cx}px - 100px)`,
                top: `calc(50% + ${cy}px - 50px)`,
                width: 200,
                height: 100,
                borderRadius: 16,
                background: `rgba(${f.color === "#7C3AED" ? "124,58,237" : f.color === "#3B82F6" ? "59,130,246" : f.color === "#ec4899" ? "236,72,153" : "34,197,94"},0.1)`,
                border: `1px solid ${f.color}33`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transform: `scale(${scale})`,
                opacity: op,
              }}
            >
              <span style={{ fontSize: 36 }}>{f.emoji}</span>
              <span style={{ fontFamily: headingFont, fontSize: 18, color: "white", fontWeight: 500 }}>{f.label}</span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
