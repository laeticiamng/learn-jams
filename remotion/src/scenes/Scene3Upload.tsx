import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily: headingFont } = loadFont("normal", { weights: ["600"], subsets: ["latin"] });

export const Scene3Upload = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Step 1 indicator
  const stepSpring = spring({ frame, fps, config: { damping: 20 } });
  const stepOp = interpolate(stepSpring, [0, 1], [0, 1]);

  // Upload zone animation
  const uploadSpring = spring({ frame: frame - 15, fps, config: { damping: 12 } });
  const uploadScale = interpolate(uploadSpring, [0, 1], [0.85, 1]);
  const uploadOp = interpolate(uploadSpring, [0, 1], [0, 1]);

  // File drop animation
  const fileY = interpolate(frame, [40, 70], [-200, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fileOp = interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fileBounce = frame > 70 ? Math.sin((frame - 70) * 0.3) * Math.max(0, 8 - (frame - 70) * 0.3) : 0;

  // Checkmark
  const checkSpring = spring({ frame: frame - 80, fps, config: { damping: 10, stiffness: 300 } });
  const checkScale = interpolate(checkSpring, [0, 1], [0, 1]);

  // Pulse ring
  const pulseOp = frame > 80 ? interpolate(frame, [80, 110], [0.6, 0], { extrapolateRight: "clamp" }) : 0;
  const pulseScale = frame > 80 ? interpolate(frame, [80, 110], [1, 1.8], { extrapolateRight: "clamp" }) : 1;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Step label */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 140,
          opacity: stepOp,
          fontFamily: headingFont,
          fontSize: 24,
          color: "#7C3AED",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Étape 1
      </div>
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 140,
          opacity: stepOp,
          fontFamily: headingFont,
          fontSize: 52,
          color: "white",
          fontWeight: 600,
        }}
      >
        Dépose ton cours
      </div>

      {/* Upload zone */}
      <div
        style={{
          width: 500,
          height: 350,
          borderRadius: 24,
          border: "2px dashed rgba(124,58,237,0.4)",
          background: "rgba(124,58,237,0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${uploadScale})`,
          opacity: uploadOp,
          position: "relative",
          marginTop: 60,
        }}
      >
        {/* File icon dropping in */}
        <div
          style={{
            opacity: fileOp,
            transform: `translateY(${fileY + fileBounce}px)`,
          }}
        >
          <div
            style={{
              width: 80,
              height: 100,
              background: "linear-gradient(135deg, #7C3AED, #3B82F6)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 40px rgba(124,58,237,0.3)",
              position: "relative",
            }}
          >
            <span style={{ fontSize: 36, color: "white", fontWeight: 700 }}>PDF</span>
          </div>
        </div>

        {/* Pulse ring */}
        {frame > 80 && (
          <div
            style={{
              position: "absolute",
              width: 120,
              height: 120,
              borderRadius: "50%",
              border: "3px solid #7C3AED",
              opacity: pulseOp,
              transform: `scale(${pulseScale})`,
              top: "calc(50% - 60px)",
            }}
          />
        )}

        {/* Checkmark */}
        <div
          style={{
            marginTop: 30,
            width: 50,
            height: 50,
            borderRadius: "50%",
            background: "#22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${checkScale})`,
            boxShadow: "0 0 30px rgba(34,197,94,0.4)",
          }}
        >
          <span style={{ color: "white", fontSize: 28, fontWeight: 700 }}>✓</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
