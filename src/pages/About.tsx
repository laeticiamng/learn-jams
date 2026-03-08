import { Link } from "react-router-dom";
import { ParallaxOrbs } from "@/components/ParallaxOrbs";
import { useTranslation } from "react-i18next";
import { Music, Target, Heart, Lightbulb, Users, Brain, Repeat, Timer, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageSEO } from "@/hooks/usePageSEO";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

export default function About() {
  const { t } = useTranslation();
  usePageSEO({ title: t("about.title"), description: t("about.subtitle"), canonical: "/about" });

  const scienceItems = [
    { icon: Brain, key: 1 }, { icon: Repeat, key: 2 }, { icon: Timer, key: 3 }, { icon: Dumbbell, key: 4 },
  ];
  const valueItems = [
    { icon: Target, key: 1 }, { icon: Heart, key: 2 }, { icon: Lightbulb, key: 3 }, { icon: Users, key: 4 },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-mesh)" }} />
      <div className="fixed top-20 right-1/4 w-[500px] h-[400px] pointer-events-none ambient-orb" style={{ background: "hsl(265, 90%, 60%)", opacity: 0.06 }} />

      <Navbar />
      <main className="container mx-auto px-4 pt-28 pb-16 max-w-3xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease }}
          className="flex items-center gap-4 mb-12"
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: -3 }}
            className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <Music className="w-6 h-6 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{t("about.title")}</h1>
            <p className="text-muted-foreground text-lg">{t("about.subtitle")}</p>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease }}
          className="glass-card-elevated p-9 mb-8"
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">{t("about.summary_title")}</h2>
          <p className="text-foreground/75 leading-relaxed" dangerouslySetInnerHTML={{ __html: t("about.summary_text") }} />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease }}
          className="glass-card-elevated p-9 mb-8"
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">{t("about.science_title")}</h2>
          <div className="space-y-6 text-foreground/75 leading-relaxed">
            {scienceItems.map(({ icon: Icon, key }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08, ease }}
                className="flex gap-4 items-start"
              >
                <div className="w-10 h-10 rounded-xl gradient-bg-premium flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-primary/15">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{t(`about.science${key}_title`)}</h3>
                  <p className="text-sm">{t(`about.science${key}_desc`)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease }}
          className="glass-card-elevated p-9 mb-8"
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">{t("about.mission_title")}</h2>
          <p className="text-foreground/75 leading-relaxed">{t("about.mission_text")}</p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease }}
          className="glass-card-elevated p-9 mb-8"
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">{t("about.how_title")}</h2>
          <ol className="space-y-3 text-foreground/75 leading-relaxed list-decimal pl-6 text-sm">
            {[1, 2, 3, 4, 5].map(n => <li key={n} dangerouslySetInnerHTML={{ __html: t(`about.how_step${n}`) }} />)}
          </ol>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease }}
          className="mb-8"
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-7">{t("about.values_title")}</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {valueItems.map(({ icon: Icon, key }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.08, ease }}
                className="glass-card-elevated p-7 gradient-border"
              >
                <div className="w-10 h-10 rounded-xl gradient-bg-premium flex items-center justify-center mb-4 shadow-lg shadow-primary/15">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold mb-1.5">{t(`about.value${key}_title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`about.value${key}_desc`)}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6, ease }}
          className="glass-card-elevated p-10 text-center mb-8 glow-intense"
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">{t("about.contact_title")}</h2>
          <p className="text-muted-foreground mb-6">{t("about.contact_text")}</p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button asChild className="gradient-bg-premium gap-2 rounded-xl shadow-lg shadow-primary/20 px-8">
              <Link to="/contact">{t("about.contact_button")}</Link>
            </Button>
          </motion.div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}
