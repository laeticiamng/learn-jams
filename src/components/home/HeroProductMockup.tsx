// ============================================================
// Hero Product Mockup — Visual proof that the product exists.
// Pure SVG/HTML illustration (no images), themed via tokens.
// ============================================================

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FileText, Music2, Gamepad2, Brain, Check } from "lucide-react";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

export default function HeroProductMockup() {
  const { t } = useTranslation();

  return (
    <section className="relative px-4 -mt-8 sm:-mt-12 md:-mt-16 mb-8 md:mb-12 z-10">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease }}
          className="relative rounded-3xl overflow-hidden border border-border/30 bg-card/40 backdrop-blur-xl shadow-2xl shadow-primary/15"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 h-9 border-b border-border/20 bg-muted/20">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-primary/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-primary/60" />
            </div>
            <div className="flex-1 text-center text-[11px] text-muted-foreground/60 font-mono">
              cognitio.app/mission
            </div>
          </div>

          {/* Body : 3 columns illustration */}
          <div className="grid grid-cols-12 gap-0 min-h-[280px] md:min-h-[360px]">
            {/* Col 1 — source */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6, ease }}
              className="col-span-12 md:col-span-3 p-5 border-b md:border-b-0 md:border-r border-border/20"
            >
              <div className="flex items-center gap-2 mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                {t("home.mockup_source", "Ton cours")}
              </div>
              <div className="space-y-1.5">
                {[100, 85, 92, 70, 96, 60, 88].map((w, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 text-[10px] text-muted-foreground">
                cours-bio.pdf · 24 p.
              </div>
            </motion.div>

            {/* Col 2 — engine */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.7, ease }}
              className="col-span-12 md:col-span-3 p-5 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border/20 bg-primary/5"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="w-14 h-14 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center mb-3"
              >
                <Brain className="w-6 h-6 text-primary" />
              </motion.div>
              <div className="text-[11px] font-mono text-primary/80 text-center">
                {t("home.mockup_engine", "Analyse cognitive")}
              </div>
              <div className="mt-2 flex flex-wrap gap-1 justify-center">
                {[t("home.mockup_chip_concepts", "Concepts"), t("home.mockup_chip_traps", "Pièges"), t("home.mockup_chip_objectives", "Objectifs")].map((k) => (
                  <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary/90">{k}</span>
                ))}
              </div>
            </motion.div>

            {/* Col 3 — outputs */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.6, ease }}
              className="col-span-12 md:col-span-6 p-5"
            >
              <div className="flex items-center gap-2 mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("home.mockup_outputs", "Généré pour toi")}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Mission card */}
                <div className="rounded-xl p-3 bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
                  <Gamepad2 className="w-4 h-4 text-primary mb-2" />
                  <div className="text-xs font-semibold mb-0.5">{t("home.mockup_card_mission", "Mission Escape")}</div>
                  <div className="text-[10px] text-muted-foreground">5 salles · 12 min</div>
                </div>
                {/* Quiz card */}
                <div className="rounded-xl p-3 bg-card/60 border border-border/30">
                  <Check className="w-4 h-4 text-primary mb-2" />
                  <div className="text-xs font-semibold mb-0.5">{t("home.mockup_card_quiz", "Quiz adaptatif")}</div>
                  <div className="text-[10px] text-muted-foreground">20 questions</div>
                </div>
                {/* Song card */}
                <div className="rounded-xl p-3 bg-card/60 border border-border/30">
                  <Music2 className="w-4 h-4 text-accent mb-2" />
                  <div className="text-xs font-semibold mb-0.5">{t("home.mockup_card_song", "Chanson mémo")}</div>
                  <div className="text-[10px] text-muted-foreground">3 min · refrain</div>
                </div>
                {/* Review card */}
                <div className="rounded-xl p-3 bg-card/60 border border-border/30">
                  <Brain className="w-4 h-4 text-secondary-foreground mb-2" />
                  <div className="text-xs font-semibold mb-0.5">{t("home.mockup_card_review", "Rappels J+1, J+7")}</div>
                  <div className="text-[10px] text-muted-foreground">{t("home.mockup_card_review_sub", "Auto programmés")}</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Subtle ambient glow */}
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full" style={{ background: "radial-gradient(ellipse, hsl(265 90% 60% / 0.18), transparent 70%)" }} />
        </motion.div>

        <p className="text-center text-xs text-muted-foreground/60 mt-3">
          {t("home.mockup_caption", "Aperçu — généré à partir d'un PDF de cours")}
        </p>
      </div>
    </section>
  );
}
