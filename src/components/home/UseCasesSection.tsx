// ============================================================
// Use Cases Section — Concrete usage scenarios
// ============================================================

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const USE_CASE_KEYS = ["exam", "teaching", "training"] as const;

export default function UseCasesSection() {
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
          {t("home.usecases_label")}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-10 sm:mb-16 md:mb-20 tracking-tight"
        >
          {t("home.usecases_title")}
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {USE_CASE_KEYS.map((key, i) => (
            <motion.article
              key={key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6, ease }}
              className="glass-card-elevated p-8 gradient-border"
            >
              <div className="text-[11px] font-semibold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full inline-block mb-5">
                {t(`home.usecase_${key}_audience`)}
              </div>
              <h3 className="font-display text-lg font-semibold mb-3">{t(`home.usecase_${key}_title`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`home.usecase_${key}_desc`)}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
