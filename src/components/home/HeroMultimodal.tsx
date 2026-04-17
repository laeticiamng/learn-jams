// ============================================================
// Hero Section — Cinematic establishing shot
// Intent: Create immediate presence, depth, and desire.
// Structure: Layered depth (background particles → orb focus →
// text hierarchy → CTA payoff → neural visualization)
// ============================================================

import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProductTracking } from "@/hooks/useProductTracking";
import { useTranslation } from "react-i18next";
import { resolveCTARoute } from "@/lib/home-cta-map";
import { useSeedLibrary } from "@/hooks/useSeedLibrary";
import { useMemo, useCallback, useEffect, useRef } from "react";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];
const cinematic = [0.16, 1, 0.3, 1] as [number, number, number, number];

// Neural constellation — abstract visualization of knowledge connections
// Replaces the flat BrainWave bars with a living, spatial visualization
const NeuralConstellation = () => {
  const nodes = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      x: 50 + Math.cos(i * 0.35 + Math.random() * 0.5) * (20 + Math.random() * 25),
      y: 50 + Math.sin(i * 0.35 + Math.random() * 0.5) * (15 + Math.random() * 20),
      size: 2 + Math.random() * 3,
      delay: i * 0.08,
      pulse: 2 + Math.random() * 3,
    })),
    []
  );

  const edges = useMemo(() => {
    const result: { x1: number; y1: number; x2: number; y2: number; delay: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 22) {
          result.push({
            x1: nodes[i].x,
            y1: nodes[i].y,
            x2: nodes[j].x,
            y2: nodes[j].y,
            delay: (i + j) * 0.04,
          });
        }
      }
    }
    return result;
  }, [nodes]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.35 }}
      >
        <defs>
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(265, 90%, 70%)" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(265, 90%, 60%)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(265, 90%, 60%)" stopOpacity="0.3" />
            <stop offset="50%" stopColor="hsl(215, 80%, 55%)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(265, 90%, 60%)" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Edges — knowledge connections */}
        {edges.map((edge, i) => (
          <motion.line
            key={`e-${i}`}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke="url(#edge-gradient)"
            strokeWidth="0.15"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{ delay: 1.2 + edge.delay, duration: 0.8, ease }}
          />
        ))}

        {/* Nodes — knowledge points */}
        {nodes.map((node, i) => (
          <motion.circle
            key={`n-${i}`}
            cx={node.x}
            cy={node.y}
            r={node.size * 0.4}
            fill="url(#node-glow)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{
              delay: 0.8 + node.delay,
              duration: node.pulse,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>
    </div>
  );
};

// Cinematic depth layers — floating particles at different speeds
const DepthParticles = () => {
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      duration: 6 + Math.random() * 8,
      delay: Math.random() * 4,
      layer: i < 15 ? "far" : i < 30 ? "mid" : "near",
    })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.layer === "near"
              ? "hsl(265, 90%, 70%)"
              : p.layer === "mid"
                ? "hsl(215, 80%, 65%)"
                : "hsl(240, 20%, 50%)",
            opacity: p.layer === "near" ? 0.5 : p.layer === "mid" ? 0.3 : 0.15,
          }}
          animate={{
            y: [0, -20 - Math.random() * 30, 0],
            x: [0, (Math.random() - 0.5) * 15, 0],
            opacity: p.layer === "near"
              ? [0.3, 0.6, 0.3]
              : p.layer === "mid"
                ? [0.15, 0.35, 0.15]
                : [0.08, 0.2, 0.08],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default function HeroMultimodal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { track } = useProductTracking();
  const { seeds } = useSeedLibrary();
  const { t } = useTranslation();
  const isAuthed = !!user;

  // Parallax mouse tracking for depth
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 30 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 30 });
  const bgX = useTransform(smoothX, [-1, 1], [8, -8]);
  const bgY = useTransform(smoothY, [-1, 1], [5, -5]);
  const fgX = useTransform(smoothX, [-1, 1], [-4, 4]);
  const fgY = useTransform(smoothY, [-1, 1], [-3, 3]);
  const containerRef = useRef<HTMLElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set((e.clientX - rect.left) / rect.width * 2 - 1);
      mouseY.set((e.clientY - rect.top) / rect.height * 2 - 1);
    },
    [mouseX, mouseY]
  );

  return (
    <header
      ref={containerRef}
      className="relative pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-20 md:pb-28 px-4 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Layer 1: Deep background — neural constellation */}
      <motion.div style={{ x: bgX, y: bgY }} className="absolute inset-0">
        <NeuralConstellation />
      </motion.div>

      {/* Layer 2: Mid-depth particles */}
      <DepthParticles />

      {/* Layer 3: Central focus orb — intentional light source */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.8, ease: cinematic }}
          className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[600px] md:h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(265 90% 60% / 0.08), hsl(215 80% 55% / 0.04), transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Layer 4: Content — cinematic text reveal */}
      <motion.div style={{ x: fgX, y: fgY }} className="container mx-auto text-center relative z-10">
        {/* Badge — appears first, anchors the eye */}
        <motion.p
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.3, duration: 0.7, ease: cinematic }}
          className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-primary/20 bg-primary/5 mb-8 sm:mb-12 text-xs sm:text-sm text-foreground/90 font-medium backdrop-blur-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {t("home.hero_badge")}
        </motion.p>

        {/* Title — staggered reveal, line by line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1, delay: 0.4 }}
        >
          <motion.h1
            className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] font-bold mb-6 sm:mb-8 leading-[1.05] sm:leading-[1.02] tracking-tight"
          >
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.5, duration: 0.8, ease: cinematic }}
            >
              {t("home.hero_title_line1")}
            </motion.span>
            <motion.span
              className="block gradient-text glow-text"
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.7, duration: 0.8, ease: cinematic }}
            >
              {t("home.hero_title_highlight")}
            </motion.span>
          </motion.h1>
        </motion.div>

        {/* Subtitle — delayed for dramatic spacing */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.7, ease }}
          className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-14 leading-relaxed"
        >
          {t("home.hero_subtitle")}
        </motion.p>

        {/* Micro-benefits — trust anchors */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.6, ease }}
          className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-8 sm:mb-12 text-xs sm:text-sm text-muted-foreground/80 font-medium"
        >
          <span>{t("home.hero_benefit_1")}</span>
          <span className="text-primary/30">·</span>
          <span>{t("home.hero_benefit_2")}</span>
          <span className="text-primary/30">·</span>
          <span>{t("home.hero_benefit_3")}</span>
        </motion.div>

        {/* CTA — the payoff moment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6, ease }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 px-4"
        >
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              className="gradient-bg-premium text-base sm:text-lg px-8 sm:px-10 h-13 sm:h-14 w-full sm:w-auto shimmer-btn rounded-2xl shadow-xl shadow-primary/25 group"
              onClick={() => {
                track({ event_name: isAuthed ? "upload_started" : "onboarding_started" });
                navigate(resolveCTARoute("create", isAuthed));
              }}
            >
              {isAuthed ? t("home.hero_cta_logged_in") : t("home.hero_cta_logged_out")}
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              variant="outline"
              className="text-base sm:text-lg px-8 h-13 sm:h-14 w-full sm:w-auto rounded-2xl border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
              onClick={() => {
                track({ event_name: "seed_transformation_started" });
                if (isAuthed && seeds.length > 0) {
                  navigate(resolveCTARoute("demo", true, seeds[0].id));
                } else {
                  document.getElementById("exemples")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              {t("home.hero_cta_see_example")}
            </Button>
          </motion.div>
        </motion.div>

        {/* Login link — subtle, doesn't compete */}
        {!isAuthed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.5 }}
            className="flex flex-col items-center gap-2 mb-12"
          >
            <button
              onClick={() => navigate(resolveCTARoute("login", false))}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              {t("home.hero_already_account")}
            </button>
          </motion.div>
        )}

        {/* Bottom edge — visual breathing room + subtle gradient fade */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0.3 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 1.5, duration: 1, ease }}
          className="w-32 h-px mx-auto bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        />
      </motion.div>
    </header>
  );
}
