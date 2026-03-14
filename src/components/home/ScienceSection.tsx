// ============================================================
// Science Section — Why it works
// ============================================================

import { motion } from "framer-motion";
import { Zap, Target, Brain, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const SCIENCE_ITEMS = [
  { key: "recall", icon: Zap },
  { key: "spaced", icon: Target },
  { key: "calibration", icon: Brain },
  { key: "fidelity", icon: Eye },
] as const;

export default function ScienceSection() {
  const { t } = useTranslation();

  return (
    <section className="py-16 sm:py-20 md:py-28 lg:py-32 px-4">
      <div className="container mx-auto max-w-5xl">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4"
        >
          {t("home.science_label")}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-10 sm:mb-16 md:mb-20 tracking-tight"
        >
          {t("home.science_title")}
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-8">
          {SCIENCE_ITEMS.map(({ key, icon: Icon }, i) => (
            <motion.article
              key={key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6, ease }}
              className="glass-card-elevated p-8 gradient-border"
            >
              <div className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                <Icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-3">{t(`home.science_${key}_title`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`home.science_${key}_desc`)}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
