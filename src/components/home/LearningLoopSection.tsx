// ============================================================
// Learning Loop Section — 4-step process visualization
// ============================================================

import { motion } from "framer-motion";
import { FileUp, Brain, LayoutGrid, RefreshCw } from "lucide-react";
import { HOME_COPY } from "@/lib/home-copy";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const ICON_MAP: Record<string, React.ElementType> = {
  FileUp,
  Brain,
  LayoutGrid,
  RefreshCw,
};

export default function LearningLoopSection() {
  const { label, title, steps } = HOME_COPY.loop;

  return (
    <section className="py-16 sm:py-20 md:py-28 lg:py-32 px-4">
      <div className="container mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4"
        >
          {label}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-10 sm:mb-16 md:mb-20 tracking-tight"
        >
          {title}
        </motion.h2>

        <div className="grid md:grid-cols-4 gap-5 sm:gap-6 max-w-6xl mx-auto">
          {steps.map((step, i) => {
            const Icon = ICON_MAP[step.icon] ?? FileUp;
            return (
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.6, ease }}
                className="glass-card-elevated p-6 sm:p-8 text-center group gradient-border"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: -3 }}
                  className="w-14 h-14 rounded-2xl gradient-bg-premium flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20"
                >
                  <Icon className="w-7 h-7 text-primary-foreground" />
                </motion.div>
                <div className="text-xs text-muted-foreground mb-3 uppercase tracking-widest font-medium">
                  Étape {i + 1}
                </div>
                <h3 className="font-display text-lg font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
