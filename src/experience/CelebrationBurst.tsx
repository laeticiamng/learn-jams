// ============================================================
// CelebrationBurst — Particle burst animation for unlocks,
// badge reveals, level-ups. Wraps children and fires on trigger.
// Duration: 1.2s max. Pure CSS + Framer Motion.
// ============================================================

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CelebrationBurstProps {
  children: ReactNode;
  /** When this becomes true, fire the burst */
  trigger: boolean;
  /** Color of particles (default gold) */
  color?: string;
  /** Number of particles (default 12) */
  particleCount?: number;
}

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
}

export function CelebrationBurst({
  children,
  trigger,
  color = "hsl(45, 100%, 65%)",
  particleCount = 12,
}: CelebrationBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!trigger) return;

    // Check reduced-motion
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) return;

    // Generate particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        angle: (360 / particleCount) * i + (Math.random() - 0.5) * 30,
        distance: 40 + Math.random() * 60,
        size: 3 + Math.random() * 4,
        delay: Math.random() * 0.15,
      });
    }
    setParticles(newParticles);
    setFlash(true);

    const timer = setTimeout(() => {
      setParticles([]);
      setFlash(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [trigger, particleCount]);

  return (
    <div className="relative inline-flex">
      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            className="absolute inset-0 rounded-[inherit] pointer-events-none z-10"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ backgroundColor: color }}
          />
        )}
      </AnimatePresence>

      {/* Particles */}
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.distance;
        const ty = Math.sin(rad) * p.distance;

        return (
          <motion.div
            key={p.id}
            className="absolute pointer-events-none z-20"
            style={{
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: color,
              top: "50%",
              left: "50%",
              marginTop: -p.size / 2,
              marginLeft: -p.size / 2,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: tx,
              y: ty,
              opacity: 0,
              scale: 0.3,
            }}
            transition={{
              duration: 0.8,
              delay: p.delay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          />
        );
      })}

      {/* Scale-up spring on children */}
      <motion.div
        animate={
          trigger
            ? { scale: [1, 1.15, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.5, type: "spring", stiffness: 300 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
