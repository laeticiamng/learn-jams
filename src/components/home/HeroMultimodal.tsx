// ============================================================
// Hero Section — Multimodal platform positioning
// ============================================================

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProductTracking } from "@/hooks/useProductTracking";
import { useTranslation } from "react-i18next";
import { resolveCTARoute } from "@/lib/home-cta-map";
import { useSeedLibrary } from "@/hooks/useSeedLibrary";
import { useMemo } from "react";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const BrainWave = () => {
  const heights = useMemo(() => Array.from({ length: 24 }, () => 24 + Math.random() * 40), []);
  return (
    <div className="flex items-end gap-[3px] h-16 justify-center" aria-hidden="true">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full gradient-bg-premium"
          animate={{ height: [6, h, 6] }}
          transition={{ duration: 0.8 + (h - 24) / 40 * 0.8, repeat: Infinity, delay: i * 0.04 }}
          style={{ opacity: 0.5 + (i / heights.length) * 0.5 }}
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

  return (
    <header className="relative pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-20 md:pb-28 px-4">
      <div className="container mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease }}
        >
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-foreground/20 bg-foreground/5 mb-8 sm:mb-12 text-xs sm:text-sm text-foreground/90 font-medium backdrop-blur-sm"
          >
            {t("home.hero_badge")}
          </motion.p>

          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] font-bold mb-6 sm:mb-8 leading-[1.05] sm:leading-[1.02] tracking-tight">
            {t("home.hero_title_line1")}
            <br />
            <span className="gradient-text glow-text">{t("home.hero_title_highlight")}</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-14 leading-relaxed">
            {t("home.hero_subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 px-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                className="gradient-bg-premium text-base sm:text-lg px-8 sm:px-10 h-13 sm:h-14 w-full sm:w-auto shimmer-btn rounded-2xl shadow-xl shadow-primary/25"
                onClick={() => {
                  track({ event_name: isAuthed ? "upload_started" : "onboarding_started" });
                  navigate(resolveCTARoute("create", isAuthed));
                }}
              >
                {isAuthed ? t("home.hero_cta_logged_in") : t("home.hero_cta_logged_out")}
              </Button>
            </motion.div>

            {isAuthed && seeds.length > 0 && (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base sm:text-lg px-8 h-13 sm:h-14 w-full sm:w-auto rounded-2xl"
                  onClick={() => {
                    track({ event_name: "seed_transformation_started" });
                    navigate(resolveCTARoute("demo", true, seeds[0].id));
                  }}
                >
                  {t("home.hero_cta_demo")}
                </Button>
              </motion.div>
            )}
          </div>

          {!isAuthed && (
            <div className="flex flex-col items-center gap-2 mb-12">
              <button
                onClick={() => navigate(resolveCTARoute("login", false))}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                {t("home.hero_already_account")}
              </button>
            </div>
          )}

          <BrainWave />
        </motion.div>
      </div>
    </header>
  );
}
