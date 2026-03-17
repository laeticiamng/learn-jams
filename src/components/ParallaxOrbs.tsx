import { motion, useScroll, useTransform } from "framer-motion";

interface OrbConfig {
  className: string;
  style: React.CSSProperties;
}

interface ParallaxOrbsProps {
  orbs?: OrbConfig[];
  mesh?: boolean;
  glow?: boolean;
  noise?: boolean;
}

export const ParallaxOrbs = ({ orbs = [], mesh = true, glow = false, noise = false }: ParallaxOrbsProps) => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 800], [0, -120]);
  const y2 = useTransform(scrollY, [0, 800], [0, -180]);
  const y3 = useTransform(scrollY, [0, 800], [0, -90]);
  const scale1 = useTransform(scrollY, [0, 600], [1, 1.15]);
  const scale2 = useTransform(scrollY, [0, 600], [1, 0.9]);
  const scale3 = useTransform(scrollY, [0, 600], [1, 1.05]);
  const opacity = useTransform(scrollY, [0, 700], [1, 0.3]);

  const transforms = [
    { y: y1, scale: scale1 },
    { y: y2, scale: scale2 },
    { y: y3, scale: scale3 },
  ];

  return (
    <>
      {glow && (
        <motion.div
          className="fixed inset-0 pointer-events-none"
          style={{ background: "var(--gradient-glow)", opacity }}
        />
      )}
      {mesh && (
        <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-mesh)" }} />
      )}
      {noise && (
        <div className="fixed inset-0 pointer-events-none noise-overlay" />
      )}
      {orbs.map((orb, i) => {
        const t = transforms[i % transforms.length];
        return (
          <motion.div
            key={i}
            className={orb.className}
            style={{ ...orb.style, y: t.y, scale: t.scale, opacity }}
          />
        );
      })}
    </>
  );
};
