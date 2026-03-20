// ============================================================
// DepthCard — Card with 3D hover tilt + parallax glow edge.
// Pure CSS transforms — no WebGL. Disables on touch devices.
// Drop-in wrapper: <DepthCard>...children...</DepthCard>
// ============================================================

import { useRef, useState, useCallback, type ReactNode } from "react";

interface DepthCardProps {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees (default 8) */
  maxTilt?: number;
  /** Glow color for edge highlight */
  glowColor?: string;
  /** Disable tilt effect */
  disabled?: boolean;
}

export function DepthCard({
  children,
  className = "",
  maxTilt = 8,
  glowColor = "hsl(265, 90%, 60%)",
  disabled = false,
}: DepthCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [glowStyle, setGlowStyle] = useState<React.CSSProperties>({ opacity: 0 });

  // Detect touch device — disable tilt
  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || isTouchDevice) return;
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const tiltX = (0.5 - y) * maxTilt;
      const tiltY = (x - 0.5) * maxTilt;

      setStyle({
        transform: `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`,
        transition: "transform 0.1s ease-out",
      });

      setGlowStyle({
        opacity: 0.15,
        background: `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${glowColor}, transparent 60%)`,
        transition: "opacity 0.2s ease-out",
      });
    },
    [disabled, isTouchDevice, maxTilt, glowColor],
  );

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.5s ease-out",
    });
    setGlowStyle({
      opacity: 0,
      transition: "opacity 0.5s ease-out",
    });
  }, []);

  return (
    <div
      ref={cardRef}
      className={`relative ${className}`}
      style={{ ...style, willChange: "transform" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {/* Glow overlay — follows mouse */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={glowStyle}
      />
    </div>
  );
}
