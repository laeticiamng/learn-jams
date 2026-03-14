// ============================================================
// Audience Adaptation Section — Who COGNITIO is for
// ============================================================

import { motion } from "framer-motion";
import { GraduationCap, School, Briefcase, Shield } from "lucide-react";
import { HOME_COPY } from "@/lib/home-copy";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const ICON_MAP: Record<string, React.ElementType> = {
  GraduationCap,
  School,
  Briefcase,
  Shield,
};

export default function AudienceAdaptationSection() {
  const { label, title, subtitle, profiles } = HOME_COPY.audience;

  return (
    <section className="py-16 sm:py-20 md:py-28 lg:py-32 px-4">
      <div className="container mx-auto max-w-5xl">
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
          className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-5 tracking-tight"
        >
          {title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-muted-foreground mb-10 sm:mb-16 md:mb-20 text-lg max-w-2xl mx-auto"
        >
          {subtitle}
        </motion.p>

        <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
          {profiles.map((profile, i) => {
            const Icon = ICON_MAP[profile.icon] ?? GraduationCap;
            return (
              <motion.article
                key={profile.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease }}
                className="glass-card-elevated p-8 gradient-border"
              >
                <div className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-3">{profile.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.desc}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
