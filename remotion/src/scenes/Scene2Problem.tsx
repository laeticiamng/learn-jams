import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: headingFont } = loadFont("normal", { weights: ["600"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadInter("normal", { weights: ["400"], subsets: ["latin"] });

const problems = [
  { icon: "📄", text: "Relire 10 fois le même PDF" },
  { icon: "😴", text: "S'endormir sur ses fiches" },
  { icon: "❌", text: "Échouer malgré les heures" },
];

export const Scene2Problem = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });
  const titleOp = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleX = interpolate(titleSpring, [0, 1], [-80, 0]);

  // Cross-out line animation
  const crossOut = interpolate(frame, [70, 100], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "80px 140px", justifyContent: "center" }}>
      {/* Left side - Problem statement */}
      <div style={{ display: "flex", gap: 100, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: headingFont,
              fontSize: 56,
              fontWeight: 600,
              color: "white",
              opacity: titleOp,
              transform: `translateX(${titleX}px)`,
              lineHeight: 1.15,
              marginBottom: 50,
            }}
          >
            Apprendre ne devrait pas{"\n"}être aussi{" "}
            <span style={{ position: "relative", display: "inline-block" }}>
              <span style={{ color: "#ef4444" }}>pénible</span>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "55%",
                  width: `${crossOut}%`,
                  height: 4,
                  background: "#ef4444",
                  borderRadius: 2,
                }}
              />
            </span>
          </div>
        </div>

        {/* Right side - Problem list */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 30 }}>
          {problems.map((p, i) => {
            const s = spring({ frame: frame - 20 - i * 15, fps, config: { damping: 15 } });
            const x = interpolate(s, [0, 1], [100, 0]);
            const op = interpolate(s, [0, 1], [0, 1]);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  opacity: op,
                  transform: `translateX(${x}px)`,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  borderRadius: 16,
                  padding: "24px 32px",
                }}
              >
                <span style={{ fontSize: 40 }}>{p.icon}</span>
                <span style={{ fontFamily: bodyFont, fontSize: 28, color: "rgba(255,255,255,0.85)" }}>{p.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
