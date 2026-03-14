// ============================================================
// Format Chooser Section — Multimodal format showcase
// ============================================================

import { motion } from "framer-motion";
import {
  Target, Music, HelpCircle, Video, FileText, BookOpen,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const ICON_MAP: Record<string, React.ElementType> = {
  Target,
  Music,
  HelpCircle,
  Video,
  FileText,
  BookOpen,
};

const FORMAT_ITEMS = [
  { key: "mission", icon: "Target" },
  { key: "song", icon: "Music" },
  { key: "quiz", icon: "HelpCircle" },
  { key: "video", icon: "Video" },
  { key: "sheet", icon: "FileText" },
  { key: "story", icon: "BookOpen" },
] as const;

export default function FormatChooserSection() {
  const { t } = useTranslation();

  return (
    <section className="py-16 sm:py-20 md:py-28 lg:py-32 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4"
        >
          {t("home.formats_label")}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-5 tracking-tight"
        >
          {t("home.formats_title")}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-muted-foreground mb-10 sm:mb-16 md:mb-20 text-lg max-w-2xl mx-auto"
        >
          {t("home.formats_subtitle")}
        </motion.p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {FORMAT_ITEMS.map((item, i) => {
            const Icon = ICON_MAP[item.icon] ?? Target;
            return (
              <motion.article
                key={item.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6, ease }}
                className="glass-card-elevated p-6 sm:p-8 gradient-border group"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: -3 }}
                  className="w-14 h-14 rounded-2xl gradient-bg-premium flex items-center justify-center mb-6 shadow-lg shadow-primary/20"
                >
                  <Icon className="w-7 h-7 text-primary-foreground" />
                </motion.div>
                <h3 className="font-display text-lg font-semibold mb-3">{t(`home.format_${item.key}_title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`home.format_${item.key}_desc`)}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
