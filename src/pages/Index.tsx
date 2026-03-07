import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Upload, Music, Headphones, BookOpen, Brain, Shield, Repeat, Timer, Dumbbell, ChevronRight, Quote, Lock, ShieldCheck, CreditCard, ArrowRight, Play, Pause, Volume2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useMemo, useEffect, useState, useRef, useCallback } from "react";

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

// Animated counter component – count up on scroll
const CountUp = ({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, hasAnimated]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

// Mini demo player
const DemoPlayer = ({ listenLabel, titleLabel }: { listenLabel: string; titleLabel: string }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); } else { audio.play().catch(() => {}); }
    setPlaying(!playing);
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => { if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100); };
    const onEnd = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener("timeupdate", update);
    audio.addEventListener("ended", onEnd);
    return () => { audio.removeEventListener("timeupdate", update); audio.removeEventListener("ended", onEnd); };
  }, []);

  return (
    <div className="mt-6 max-w-sm mx-auto">
      <audio ref={audioRef} src="/demo.mp3" preload="none" />
      <button onClick={togglePlay} className="w-full glass-card p-3 flex items-center gap-3 hover:border-primary/30 transition-all group">
        <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center shrink-0">
          {playing ? <Pause className="w-4 h-4 text-primary-foreground" /> : <Play className="w-4 h-4 text-primary-foreground ml-0.5" />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs text-muted-foreground">{listenLabel}</p>
          <p className="text-sm font-medium truncate">{titleLabel}</p>
          <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full gradient-bg rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <Volume2 className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
      </button>
    </div>
  );
};

const stepIcons = [Upload, Music, Headphones];
const stepColors = ["from-primary to-secondary", "from-secondary to-primary", "from-primary to-secondary"];
const scienceIcons = [Brain, Repeat, Timer, Dumbbell];
const featureIcons = [Brain, BookOpen, Shield];

const testimonialAvatars = [
  "https://api.dicebear.com/9.x/notionists/svg?seed=Marie&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/notionists/svg?seed=Karim&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/notionists/svg?seed=Chloe&backgroundColor=ffd5dc",
];

export default function Index() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showStickyCta, setShowStickyCta] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(faqJsonLd);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [faqJsonLd]);

  // Sticky CTA visibility logic
  const handleScroll = useCallback(() => {
    const heroBottom = heroRef.current?.getBoundingClientRect().bottom ?? 0;
    const ctaTop = ctaRef.current?.getBoundingClientRect().top ?? Infinity;
    const windowHeight = window.innerHeight;
    setShowStickyCta(heroBottom < 0 && ctaTop > windowHeight);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />

      {/* Hero */}
      <header ref={heroRef} className="relative pt-32 pb-20 px-4">
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
              <Button size="lg" className="gradient-bg text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 glow w-full sm:w-auto shimmer-btn" onClick={() => navigate("/signup")}>
                {t("home.cta_signup")}
              </Button>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline mb-8 inline-block"
            >
              {t("home.cta_login")}
            </button>

            {/* Social proof — animated counters */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-8 text-xs sm:text-sm text-muted-foreground px-2">
              <span className="flex items-center gap-1.5">🎵 <strong className="text-foreground tabular-nums"><CountUp target={1200} suffix="+" /></strong> {t("home.social_songs_label")}</span>
              <span className="flex items-center gap-1.5">🎓 <strong className="text-foreground tabular-nums"><CountUp target={500} suffix="+" /></strong> {t("home.social_students_label")}</span>
              <span className="flex items-center gap-1.5">🎶 <strong className="text-foreground tabular-nums"><CountUp target={30} /></strong> {t("home.social_styles_label")}</span>
            </div>

            <AudioWave />

            <DemoPlayer listenLabel={t("home.demo_listen")} titleLabel={t("home.demo_title")} />
          </motion.div>
        </div>
      </header>

      {/* Trust badges */}
      <section className="py-6 px-4">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {[
            { icon: ShieldCheck, key: "trust_gdpr" },
            { icon: Lock, key: "trust_encrypted" },
            { icon: CreditCard, key: "trust_cancel" },
          ].map(({ icon: Icon, key }) => (
            <div key={key} className="flex items-center gap-2 text-muted-foreground text-sm">
              <Icon className="w-4 h-4 text-primary/70" />
              <span>{t(`home.${key}`)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-4">
            {t("home.how_title")}
          </motion.h2>
          <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto">{t("home.how_subtitle")}</p>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
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

      {/* Before → After */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-4">
            {t("home.before_after_title")}
          </motion.h2>
          <p className="text-center text-muted-foreground mb-12">{t("home.before_after_subtitle")}</p>
          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="glass-card p-6 sm:p-8 relative">
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 text-xs font-medium uppercase tracking-wider text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {t("home.before_label")}
              </div>
              <div className="pt-8 text-sm sm:text-base text-muted-foreground leading-relaxed font-mono">
                {t("home.before_text")}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 sm:p-8 relative border-primary/30 glow">
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 text-xs font-medium uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                {t("home.after_label")}
              </div>
              <div className="pt-8 text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-line">
                {t("home.after_text")}
              </div>
            </motion.div>
          </div>
          {/* Arrow between cards on mobile */}
          <div className="flex justify-center md:hidden -my-3 relative z-10">
            <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-primary-foreground rotate-90" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
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

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-12">
            {t("home.testimonials_title")}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n, i) => (
              <motion.article key={n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="glass-card p-6 sm:p-8 flex flex-col">
                <Quote className="w-8 h-8 text-primary/30 mb-4" />
                <p className="text-sm text-foreground leading-relaxed flex-1 italic">
                  "{t(`home.testimonial${n}_quote`)}"
                </p>
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border/30">
                  <img
                    src={testimonialAvatars[i]}
                    alt={t(`home.testimonial${n}_name`)}
                    className="w-10 h-10 rounded-full bg-muted"
                    loading="lazy"
                  />
                  <div>
                    <p className="text-sm font-semibold">{t(`home.testimonial${n}_name`)}</p>
                    <p className="text-xs text-muted-foreground">{t(`home.testimonial${n}_field`)}</p>
                  </div>
                </div>
              </motion.article>
            ))}
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
      <section ref={ctaRef} className="py-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="glass-card p-12 text-center glow">
            <h2 className="font-display text-3xl font-bold mb-4">{t("home.cta_title")}</h2>
            <p className="text-muted-foreground mb-8">{t("home.cta_text")}</p>
            <Button size="lg" className="gradient-bg text-lg px-8 h-14 shimmer-btn" onClick={() => navigate("/signup")}>
              {t("home.cta_button")}
            </Button>
          </div>
        </div>
      </section>

      {/* Sticky CTA mobile */}
      <AnimatePresence>
        {showStickyCta && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-40 md:hidden p-3 bg-background/80 backdrop-blur-xl border-t border-border/30"
          >
            <Button className="w-full gradient-bg h-12 text-base font-semibold shimmer-btn" onClick={() => navigate("/signup")}>
              {t("home.sticky_cta")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
