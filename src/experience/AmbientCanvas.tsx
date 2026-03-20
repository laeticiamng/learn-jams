// ============================================================
// AmbientCanvas — Living ambient background layer.
// Replaces static ParallaxOrbs with a mood-reactive system.
// Pure CSS + Framer Motion — no WebGL. Works everywhere.
// ============================================================

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { useImmersion, type AmbientMood } from "./ImmersionContext";

// ---------- Mood Color Maps ----------

const MOOD_COLORS: Record<AmbientMood, { orb1: string; orb2: string; orb3: string; glow: string }> = {
  warm: {
    orb1: "hsl(265, 90%, 60%)",
    orb2: "hsl(300, 70%, 50%)",
    orb3: "hsl(35, 80%, 55%)",
    glow: "hsl(265, 90%, 60%, 0.10)",
  },
  focus: {
    orb1: "hsl(215, 80%, 55%)",
    orb2: "hsl(200, 70%, 50%)",
    orb3: "hsl(265, 60%, 45%)",
    glow: "hsl(215, 80%, 55%, 0.08)",
  },
  tension: {
    orb1: "hsl(265, 90%, 40%)",
    orb2: "hsl(300, 80%, 35%)",
    orb3: "hsl(0, 60%, 45%)",
    glow: "hsl(265, 90%, 40%, 0.12)",
  },
  celebration: {
    orb1: "hsl(45, 100%, 65%)",
    orb2: "hsl(35, 90%, 55%)",
    orb3: "hsl(265, 80%, 60%)",
    glow: "hsl(45, 100%, 65%, 0.12)",
  },
};

// ---------- Pulse Overlay ----------

function PulseOverlay({ color, intensity }: { color: string; intensity: number }) {
  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-[1]"
      initial={{ opacity: 0 }}
      animate={{ opacity: intensity * 0.3 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{
        background: `radial-gradient(ellipse at 50% 50%, ${color}, transparent 70%)`,
      }}
    />
  );
}

// ---------- Main Component ----------

export function AmbientCanvas() {
  const { level, ambientMood, activePulse, budget } = useImmersion();
  const { scrollY } = useScroll();

  // Parallax transforms
  const y1 = useTransform(scrollY, [0, 800], [0, -120]);
  const y2 = useTransform(scrollY, [0, 800], [0, -180]);
  const y3 = useTransform(scrollY, [0, 800], [0, -90]);
  const globalOpacity = useTransform(scrollY, [0, 700], [1, 0.3]);

  const colors = MOOD_COLORS[ambientMood];

  // Orb configs — reduced on mobile
  const orbs = useMemo(() => {
    const isMobile = budget.isMobile;
    const blur = isMobile ? 80 : 100;
    const opacity = isMobile ? 0.1 : 0.15;
    const size = isMobile ? 250 : 400;

    return [
      {
        style: {
          width: size,
          height: size,
          top: "10%",
          left: "15%",
          filter: `blur(${blur}px)`,
          opacity,
        } as React.CSSProperties,
        y: y1,
      },
      {
        style: {
          width: size * 0.8,
          height: size * 0.8,
          top: "50%",
          right: "10%",
          filter: `blur(${blur}px)`,
          opacity: opacity * 0.8,
        } as React.CSSProperties,
        y: y2,
      },
      {
        style: {
          width: size * 0.6,
          height: size * 0.6,
          bottom: "20%",
          left: "40%",
          filter: `blur(${blur}px)`,
          opacity: opacity * 0.7,
        } as React.CSSProperties,
        y: y3,
      },
    ];
  }, [budget.isMobile, y1, y2, y3]);

  // Level 0: static gradient only, no animations
  if (level === 0 || budget.reducedMotion) {
    return (
      <>
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ background: "var(--gradient-mesh)" }}
        />
        <AnimatePresence>
          {activePulse && (
            <PulseOverlay
              key={activePulse.id}
              color={activePulse.color}
              intensity={activePulse.intensity}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      {/* Glow layer */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        animate={{
          background: `radial-gradient(ellipse at 50% 0%, ${colors.glow}, transparent 55%)`,
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ opacity: globalOpacity }}
      />

      {/* Mesh gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "var(--gradient-mesh)" }}
      />

      {/* Ambient orbs with mood colors */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="fixed rounded-full pointer-events-none"
          animate={{
            backgroundColor: i === 0 ? colors.orb1 : i === 1 ? colors.orb2 : colors.orb3,
          }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            ...orb.style,
            y: orb.y,
            opacity: globalOpacity,
            position: "fixed",
          }}
        >
          {/* Breathing animation */}
          <motion.div
            className="w-full h-full rounded-full"
            animate={{
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: 4 + i * 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ backgroundColor: "inherit" }}
          />
        </motion.div>
      ))}

      {/* Pulse overlay for feedback events */}
      <AnimatePresence>
        {activePulse && (
          <PulseOverlay
            key={activePulse.id}
            color={activePulse.color}
            intensity={activePulse.intensity}
          />
        )}
      </AnimatePresence>
    </>
  );
}
