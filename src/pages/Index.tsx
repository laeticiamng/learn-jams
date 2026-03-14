// ============================================================
// Homepage — COGNITIO Landing Page
// ============================================================

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Quote } from "lucide-react";
import testimonialMarie from "@/assets/testimonial-marie.jpg";
import testimonialKarim from "@/assets/testimonial-karim.jpg";
import testimonialChloe from "@/assets/testimonial-chloe.jpg";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { useProductTracking } from "@/hooks/useProductTracking";
import { resolveCTARoute } from "@/lib/home-cta-map";
import { useTranslation } from "react-i18next";

// Section components
import HeroMultimodal from "@/components/home/HeroMultimodal";
import FormatChooserSection from "@/components/home/FormatChooserSection";
import AudienceAdaptationSection from "@/components/home/AudienceAdaptationSection";
import LearningLoopSection from "@/components/home/LearningLoopSection";
import UseCasesSection from "@/components/home/UseCasesSection";
import TrustSection from "@/components/home/TrustSection";
import SeedDemoSection from "@/components/home/SeedDemoSection";
import ScienceSection from "@/components/home/ScienceSection";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const SectionDivider = () => (
  <div className="container mx-auto px-4">
    <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
  </div>
);

const ParallaxOrbs = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 800], [0, -120]);
  const y2 = useTransform(scrollY, [0, 800], [0, -180]);
  const scale1 = useTransform(scrollY, [0, 600], [1, 1.15]);
  const scale2 = useTransform(scrollY, [0, 600], [1, 0.9]);
  const opacity = useTransform(scrollY, [0, 700], [1, 0.3]);

  return (
    <>
      <motion.div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(900px,100vw)] h-[300px] sm:h-[400px] md:h-[500px] pointer-events-none" style={{ background: "var(--gradient-glow)", y: y1, opacity }} />
      <motion.div className="absolute top-20 left-1/4 w-[200px] sm:w-[300px] md:w-[400px] h-[200px] sm:h-[300px] md:h-[400px] pointer-events-none ambient-orb" style={{ background: "hsl(265, 90%, 60%)", y: y1, scale: scale1, opacity }} />
      <motion.div className="absolute top-40 right-1/4 w-[150px] sm:w-[200px] md:w-[300px] h-[150px] sm:h-[200px] md:h-[300px] pointer-events-none ambient-orb" style={{ background: "hsl(300, 70%, 50%)", animationDelay: "3s", y: y2, scale: scale2, opacity }} />
    </>
  );
};

const BEFORE_KEYS = [1, 2, 3, 4, 5] as const;
const AFTER_KEYS = [1, 2, 3, 4, 5, 6] as const;

const testimonialAvatars = [testimonialMarie, testimonialKarim, testimonialChloe];
const TESTIMONIAL_KEYS = [1, 2, 3] as const;

const FAQ_KEYS = [1, 2, 3, 4, 5, 6, 7] as const;

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showStickyCta, setShowStickyCta] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const { track } = useProductTracking();
  const { t } = useTranslation();
  const isAuthed = !!user;

  usePageSEO({
    title: t("home.seo_title"),
    description: t("home.seo_description"),
    canonical: "/",
  });

  const faqJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_KEYS.map(i => ({
      "@type": "Question",
      name: t(`home.faq${i}_q`),
      acceptedAnswer: { "@type": "Answer", text: t(`home.faq${i}_a`) },
    })),
  }), [t]);

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(faqJsonLd);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [faqJsonLd]);

  const handleScroll = useCallback(() => {
    const heroBottom = heroRef.current?.getBoundingClientRect().bottom ?? 0;
    const ctaTop = ctaRef.current?.getBoundingClientRect().top ?? Infinity;
    setShowStickyCta(heroBottom < 0 && ctaTop > window.innerHeight);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    track({ event_name: "landing_viewed" });
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />

      {/* Hero with parallax orbs */}
      <div ref={heroRef} className="relative">
        <ParallaxOrbs />
        <HeroMultimodal />
      </div>

      {/* Trust badges */}
      <TrustSection />

      <SectionDivider />

      {/* Format chooser — multimodal showcase */}
      <FormatChooserSection />

      <SectionDivider />

      {/* Audience adaptation */}
      <AudienceAdaptationSection />

      <SectionDivider />

      {/* Learning loop — 4 steps */}
      <LearningLoopSection />

      <SectionDivider />

      {/* Before/After */}
      <section className="py-16 sm:py-20 md:py-28 lg:py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-16 tracking-tight">
            {t("home.before_after_title")}
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease }} className="glass-card p-8 sm:p-10 relative">
              <div className="absolute top-5 left-5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">{t("home.before_label")}</div>
              <div className="pt-10 text-sm text-muted-foreground leading-relaxed font-mono">
                {BEFORE_KEYS.map((i) => <span key={i}>{t(`home.before_${i}`)}<br /></span>)}
              </div>
            </motion.div>
            <div className="flex justify-center md:hidden -my-1 relative z-10">
              <div className="w-10 h-10 rounded-full gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/20">
                <ArrowRight className="w-5 h-5 text-primary-foreground rotate-90" />
              </div>
            </div>
            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15, duration: 0.6, ease }} className="glass-card-elevated p-8 sm:p-10 relative glow-intense">
              <div className="absolute top-5 left-5 text-[11px] font-semibold uppercase tracking-widest text-foreground/90 bg-foreground/5 border border-foreground/10 px-3 py-1 rounded-full">{t("home.after_label")}</div>
              <div className="pt-10 text-sm text-foreground leading-relaxed whitespace-pre-line">
                {AFTER_KEYS.map(i => t(`home.after_${i}`)).join("\n")}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Science */}
      <ScienceSection />

      <SectionDivider />

      {/* Use cases */}
      <UseCasesSection />

      <SectionDivider />

      {/* Testimonials */}
      <section className="py-16 sm:py-20 md:py-28 lg:py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-10 sm:mb-16 md:mb-20 tracking-tight">
            {t("home.testimonials_title")}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIAL_KEYS.map((idx, i) => (
              <motion.article key={idx} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6, ease }} className="glass-card-elevated p-8 sm:p-9 flex flex-col gradient-border">
                <Quote className="w-8 h-8 text-primary/40 mb-5" />
                <p className="text-sm text-foreground/90 leading-relaxed flex-1 italic">"{t(`home.testimonial${idx}_quote`)}"</p>
                <div className="flex items-center gap-3 mt-7 pt-6 border-t border-border/20">
                  <img src={testimonialAvatars[i]} alt={t(`home.testimonial${idx}_name`)} className="w-10 h-10 rounded-full object-cover bg-muted ring-2 ring-border/20" loading="lazy" />
                  <div>
                    <p className="text-sm font-semibold">{t(`home.testimonial${idx}_name`)}</p>
                    <p className="text-xs text-muted-foreground">{t(`home.testimonial${idx}_field`)}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Seed Library */}
      <SeedDemoSection />

      <SectionDivider />

      {/* FAQ */}
      <section className="py-16 sm:py-20 md:py-28 lg:py-32 px-4">
        <div className="container mx-auto max-w-2xl">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-5 tracking-tight">
            {t("home.faq_title")}
          </motion.h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">{t("home.faq_subtitle")}</p>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQ_KEYS.map((idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`} className="glass-card-elevated px-6 border-none">
                <AccordionTrigger className="text-left font-medium hover:no-underline py-5 text-[15px]">{t(`home.faq${idx}_q`)}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed text-sm">{t(`home.faq${idx}_a`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <SectionDivider />

      {/* CTA */}
      <section ref={ctaRef} className="py-28 md:py-32 px-4">
        <div className="container mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }} className="glass-card-elevated p-8 sm:p-12 md:p-16 text-center glow-intense relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] ambient-orb" style={{ background: "hsl(265, 90%, 60%)", opacity: 0.1 }} />
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-5 tracking-tight relative z-10">
              {t("home.cta_title")}
            </h2>
            <p className="text-muted-foreground mb-12 text-lg relative z-10">
              {t("home.cta_subtitle")}
            </p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="relative z-10">
              <Button
                size="lg"
                className="gradient-bg-premium text-lg px-10 h-14 shimmer-btn rounded-2xl shadow-xl shadow-primary/25"
                onClick={() => navigate(resolveCTARoute("create", isAuthed))}
              >
                {isAuthed ? t("home.hero_cta_logged_in") : t("home.hero_cta_logged_out")}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Sticky CTA mobile */}
      <AnimatePresence>
        {showStickyCta && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 right-0 z-40 md:hidden p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-background/85 backdrop-blur-2xl border-t border-border/20">
            <Button
              className="w-full gradient-bg-premium h-12 text-base font-semibold shimmer-btn rounded-xl shadow-lg shadow-primary/20"
              onClick={() => navigate(resolveCTARoute("create", isAuthed))}
            >
              {isAuthed ? t("home.hero_cta_logged_in") : t("home.sticky_cta_start")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disclaimer */}
      <div className="container mx-auto px-4 pb-4">
        <p className="text-[10px] text-muted-foreground/50 text-center">
          {t("home.disclaimer")}
        </p>
      </div>

      <Footer />
    </div>
  );
}
