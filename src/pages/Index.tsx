import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Upload, Music, Headphones, BookOpen, Brain, Shield, Repeat, Timer, Dumbbell, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useMemo, useEffect } from "react";

const AudioWave = () => {
  const heights = useMemo(() => Array.from({ length: 20 }, () => 32 + Math.random() * 32), []);
  return (
    <div className="flex items-end gap-1 h-16 justify-center" aria-hidden="true">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full gradient-bg"
          animate={{ height: [8, h, 8] }}
          transition={{ duration: 0.8 + (h - 32) / 32 * 0.8, repeat: Infinity, delay: i * 0.05 }}
        />
      ))}
    </div>
  );
};

const stepIcons = [Upload, Music, Headphones];
const stepColors = ["from-primary to-secondary", "from-secondary to-primary", "from-primary to-secondary"];
const scienceIcons = [Brain, Repeat, Timer, Dumbbell];
const featureIcons = [Brain, BookOpen, Shield];

export default function Index() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  usePageSEO({
    title: "StudyBeats — " + t("home.title1") + " " + t("home.title2"),
    description: t("home.subtitle"),
    canonical: "/",
  });

  const faqKeys = [1, 2, 3, 4, 5];

  const faqJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqKeys.map(n => ({
      "@type": "Question",
      "name": t(`home.faq${n}_q`),
      "acceptedAnswer": { "@type": "Answer", "text": t(`home.faq${n}_a`) },
    })),
  }), [t]);

  // Inject JSON-LD into head
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(faqJsonLd);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [faqJsonLd]);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />

      {/* Hero */}
      <header className="relative pt-32 pb-20 px-4">
        <div className="absolute inset-0" style={{ background: "var(--gradient-glow)" }} />
        <div className="container mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8 text-sm text-primary">
              {t("home.badge")}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight px-2">
              {t("home.title1")}<br />
              <span className="gradient-text">{t("home.title2")}</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 px-2">
              {t("home.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4 px-4">
              <Button size="lg" className="gradient-bg text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 glow w-full sm:w-auto" onClick={() => navigate("/signup")}>
                {t("home.cta_signup")}
              </Button>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline mb-8 inline-block"
            >
              {t("home.cta_login")}
            </button>

            {/* Social proof */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-8 text-xs sm:text-sm text-muted-foreground px-2">
              <span>🎵 <strong className="text-foreground">{t("home.social_songs")}</strong></span>
              <span>🎓 <strong className="text-foreground">{t("home.social_students")}</strong></span>
              <span>🎶 <strong className="text-foreground">{t("home.social_styles")}</strong></span>
            </div>

            <AudioWave />
          </motion.div>
        </div>
      </header>

      {/* Steps */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-4">
            {t("home.how_title")}
          </motion.h2>
          <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto">{t("home.how_subtitle")}</p>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
            {/* Connectors (desktop only) */}
            <div className="hidden md:block absolute top-20 left-[33%] w-[34%] h-0.5 bg-gradient-to-r from-primary/30 to-secondary/30" />
            <div className="hidden md:block absolute top-20 left-[66%] w-[34%] h-0.5 bg-gradient-to-r from-secondary/30 to-primary/30" />
            {[1, 2, 3].map((n, i) => {
              const Icon = stepIcons[i];
              return (
                <motion.article key={n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                  className="glass-card p-8 text-center group hover:border-primary/30 transition-all">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stepColors[i]} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">{t("home.step_label", { n })}</div>
                  <h3 className="font-display text-xl font-semibold mb-3">{t(`home.step${n}_title`)}</h3>
                  <p className="text-muted-foreground">{t(`home.step${n}_desc`)}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features (moved up) */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-3xl font-bold text-center mb-12">{t("home.features_title")}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n, i) => {
              const Icon = featureIcons[i];
              return (
                <motion.article key={n} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 text-center">
                  <Icon className="w-8 h-8 text-primary mx-auto mb-4" />
                  <h3 className="font-display font-semibold mb-2">{t(`home.feature${n}_title`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`home.feature${n}_desc`)}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Science */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-4">
            {t("home.science_title")}
          </motion.h2>
          <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">{t("home.science_subtitle")}</p>
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((n, i) => {
              const Icon = scienceIcons[i];
              return (
                <motion.article key={n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="glass-card p-8 group hover:border-primary/30 transition-all">
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-3">{t(`home.science${n}_title`)}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{t(`home.science${n}_desc`)}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Listen anywhere */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-center mb-4">{t("home.listen_title")}</h2>
          <p className="text-center text-muted-foreground mb-10">{t("home.listen_subtitle")}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n, i) => (
              <motion.div key={n} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card p-6">
                <div className="text-2xl mb-2">{t(`home.listen${n}_emoji`)}</div>
                <h3 className="font-display font-semibold mb-1">{t(`home.listen${n}_label`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`home.listen${n}_desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Target */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-center mb-8">{t("home.target_title")}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n, i) => (
              <motion.div key={n} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card p-6">
                <div className="text-2xl mb-2">{t(`home.target${n}_emoji`)}</div>
                <h3 className="font-display font-semibold mb-1">{t(`home.target${n}_label`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`home.target${n}_desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-center mb-4">{t("home.faq_title")}</h2>
          <p className="text-center text-muted-foreground mb-10">{t("home.faq_subtitle")}</p>
          <Accordion type="single" collapsible className="space-y-3">
            {faqKeys.map(n => (
              <AccordionItem key={n} value={`faq-${n}`} className="glass-card px-6 border-none">
                <AccordionTrigger className="text-left font-medium hover:no-underline py-5">
                  {t(`home.faq${n}_q`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {t(`home.faq${n}_a`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="glass-card p-12 text-center glow">
            <h2 className="font-display text-3xl font-bold mb-4">{t("home.cta_title")}</h2>
            <p className="text-muted-foreground mb-8">{t("home.cta_text")}</p>
            <Button size="lg" className="gradient-bg text-lg px-8 h-14" onClick={() => navigate("/signup")}>
              {t("home.cta_button")}
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
