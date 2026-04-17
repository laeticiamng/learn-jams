import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const ExplainerVideoSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 sm:py-20 md:py-28 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.h2
          initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 tracking-tight"
        >
          {t("home.explainer_title")}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center text-muted-foreground/70 mb-10 text-lg max-w-xl mx-auto"
        >
          {t("home.explainer_subtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.6, ease }}
          className="relative rounded-2xl overflow-hidden glass-card-elevated border border-primary/10"
        >
          {/* Glow effect behind video */}
          <div className="absolute inset-0 -z-10 blur-3xl opacity-20">
            <div className="w-full h-full bg-gradient-to-br from-primary/40 via-secondary/20 to-primary/10" />
          </div>

          <video
            className="w-full aspect-video rounded-2xl"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src="/cognitio-explainer.mp4" type="video/mp4" />
          </video>
        </motion.div>
      </div>
    </section>
  );
};

export default ExplainerVideoSection;
