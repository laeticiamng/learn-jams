import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Upload, Music, Headphones, BookOpen, Brain, Shield, Repeat, Timer, Dumbbell, ChevronRight, Quote, Lock, ShieldCheck, CreditCard, ArrowRight, Play, Pause, Volume2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useMemo, useEffect, useState, useRef, useCallback } from "react";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const AudioWave = () => {
  const heights = useMemo(() => Array.from({ length: 24 }, () => 24 + Math.random() * 40), []);
  return (
    <div className="flex items-end gap-[3px] h-16 justify-center" aria-hidden="true">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full gradient-bg-premium"
          animate={{ height: [6, h, 6] }}
          transition={{ duration: 0.8 + (h - 24) / 40 * 0.8, repeat: Infinity, delay: i * 0.04 }}
          style={{ opacity: 0.5 + (i / heights.length) * 0.5 }}
        />
      ))}
    </div>
  );
};

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
    <div className="mt-10 max-w-sm mx-auto">
      <audio ref={audioRef} src="/demo.mp3" preload="none" />
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={togglePlay}
        className="w-full glass-card-elevated p-4 flex items-center gap-4 group cursor-pointer"
        role="button"
        aria-label={playing ? "Pause" : "Play"}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePlay(); } }}
      >
        <div className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
          {playing ? <Pause className="w-5 h-5 text-primary-foreground" /> : <Play className="w-5 h-5 text-primary-foreground ml-0.5" />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{listenLabel}</p>
          <p className="text-sm font-semibold truncate">{titleLabel}</p>
          <div
            className="mt-2 h-1 rounded-full bg-muted/30 overflow-hidden cursor-pointer"
            role="slider"
            aria-label="Progress"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              const audio = audioRef.current;
              if (!audio || !audio.duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              audio.currentTime = ratio * audio.duration;
              setProgress(ratio * 100);
              if (!playing) { audio.play().catch(() => {}); setPlaying(true); }
            }}
          >
            <div className="h-full gradient-bg-premium rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <Volume2 className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
      </motion.div>
    </div>
  );
};

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
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{ background: "var(--gradient-glow)", y: y1, opacity }}
      />
      <motion.div
        className="absolute top-20 left-1/4 w-[400px] h-[400px] pointer-events-none ambient-orb"
        style={{ background: "hsl(265, 90%, 60%)", y: y1, scale: scale1, opacity }}
      />
      <motion.div
        className="absolute top-40 right-1/4 w-[300px] h-[300px] pointer-events-none ambient-orb"
        style={{ background: "hsl(300, 70%, 50%)", animationDelay: "3s", y: y2, scale: scale2, opacity }}
      />
    </>
  );
};

const stepIcons = [Upload, Music, Headphones];
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
  const { user } = useAuth();
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
      <header ref={heroRef} className="relative pt-40 pb-28 px-4">
        <ParallaxOrbs />

        <div className="container mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 40, filter: "blur(12px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, ease }}>
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-foreground/20 bg-foreground/5 mb-12 text-sm text-foreground/90 font-medium backdrop-blur-sm"
            >
              {t("home.badge")}
            </motion.p>
            <h1 className="font-display text-5xl sm:text-7xl md:text-[5.5rem] font-bold mb-8 leading-[1.02] px-2 tracking-tight">
              {t("home.title1")}<br />
              <span className="gradient-text glow-text">{t("home.title2")}</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-14 px-2 leading-relaxed">
              {t("home.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-5 px-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" className="gradient-bg-premium text-base sm:text-lg px-8 sm:px-10 h-13 sm:h-14 w-full sm:w-auto shimmer-btn rounded-2xl shadow-xl shadow-primary/25"
                  onClick={() => navigate(user ? "/create" : "/signup")}>
                  {user ? t("home.cta_create", "Create a song") : t("home.cta_signup")}
                </Button>
              </motion.div>
            </div>
            {!user && (
              <button
                onClick={() => navigate("/login")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline mb-12 inline-block"
              >
                {t("home.cta_login")}
              </button>
            )}

            {/* Social proof */}
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-10 mb-12 text-xs sm:text-sm text-muted-foreground px-2">
              <span className="flex items-center gap-1.5">🎵 <strong className="text-foreground tabular-nums font-mono"><CountUp target={1200} suffix="+" /></strong> {t("home.social_songs_label")}</span>
              <span className="flex items-center gap-1.5">🎓 <strong className="text-foreground tabular-nums font-mono"><CountUp target={500} suffix="+" /></strong> {t("home.social_students_label")}</span>
              <span className="flex items-center gap-1.5">🎶 <strong className="text-foreground tabular-nums font-mono"><CountUp target={30} /></strong> {t("home.social_styles_label")}</span>
            </div>

            <AudioWave />
            <DemoPlayer listenLabel={t("home.demo_listen")} titleLabel={t("home.demo_title")} />
          </motion.div>
        </div>
      </header>

      {/* Trust badges */}
      <section className="py-10 px-4">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {[
            { icon: ShieldCheck, key: "trust_gdpr" },
            { icon: Lock, key: "trust_encrypted" },
            { icon: CreditCard, key: "trust_cancel" },
          ].map(({ icon: Icon, key }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2 text-muted-foreground text-sm"
            >
              <Icon className="w-4 h-4 text-primary" />
              <span>{t(`home.${key}`)}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <SectionDivider />

      {/* Steps */}
      <section className="py-28 md:py-32 px-4">
        <div className="container mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4"
          >
            {t("home.how_subtitle")}
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-20 tracking-tight">
            {t("home.how_title")}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
            <div className="hidden md:block absolute top-24 left-[33%] w-[34%] h-px bg-gradient-to-r from-primary/20 to-secondary/20" />
            <div className="hidden md:block absolute top-24 left-[66%] w-[34%] h-px bg-gradient-to-r from-secondary/20 to-primary/20" />
            {[1, 2, 3].map((n, i) => {
              const Icon = stepIcons[i];
              return (
                <motion.article key={n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6, ease }}
                  className="glass-card-elevated p-10 text-center group gradient-border">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -3 }}
                    className="w-16 h-16 rounded-2xl gradient-bg-premium flex items-center justify-center mx-auto mb-7 shadow-lg shadow-primary/20"
                  >
                    <Icon className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  <div className="text-xs text-muted-foreground mb-3 uppercase tracking-widest font-medium">{t("home.step_label", { n })}</div>
                  <h3 className="font-display text-xl font-semibold mb-4">{t(`home.step${n}_title`)}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{t(`home.step${n}_desc`)}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Before → After */}
      <section className="py-28 md:py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4"
          >
            {t("home.before_after_subtitle")}
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-16 tracking-tight">
            {t("home.before_after_title")}
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-8 items-stretch relative">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.6, ease }}
              className="glass-card p-8 sm:p-10 relative">
              <div className="absolute top-5 left-5 sm:top-6 sm:left-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                {t("home.before_label")}
              </div>
              <div className="pt-10 text-sm sm:text-base text-muted-foreground leading-relaxed font-mono">
                {t("home.before_text")}
              </div>
            </motion.div>
            {/* Arrow between cards on mobile */}
            <div className="flex justify-center md:hidden -my-1 relative z-10">
              <div className="w-10 h-10 rounded-full gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/20">
                <ArrowRight className="w-5 h-5 text-primary-foreground rotate-90" />
              </div>
            </div>
            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.6, ease }}
              className="glass-card-elevated p-8 sm:p-10 relative glow-intense">
              <div className="absolute top-5 left-5 sm:top-6 sm:left-6 text-[11px] font-semibold uppercase tracking-widest text-foreground/90 bg-foreground/5 border border-foreground/10 px-3 py-1 rounded-full">
                {t("home.after_label")}
              </div>
              <div className="pt-10 text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-line">
                {t("home.after_text")}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Testimonials — moved up for early social proof */}
      <section className="py-28 md:py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-20 tracking-tight">
            {t("home.testimonials_title")}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n, i) => (
              <motion.article key={n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6, ease }}
                className="glass-card-elevated p-8 sm:p-9 flex flex-col gradient-border">
                <Quote className="w-8 h-8 text-primary/40 mb-5" />
                <p className="text-sm text-foreground/80 leading-relaxed flex-1 italic">
                  "{t(`home.testimonial${n}_quote`)}"
                </p>
                <div className="flex items-center gap-3 mt-7 pt-6 border-t border-border/20">
                  <img src={testimonialAvatars[i]} alt={t(`home.testimonial${n}_name`)} className="w-10 h-10 rounded-full bg-muted ring-2 ring-border/20" loading="lazy" />
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

      <SectionDivider />

      {/* Science */}
      <section className="py-28 md:py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4"
          >
            {t("home.science_subtitle")}
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-20 tracking-tight">
            {t("home.science_title")}
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((n, i) => {
              const Icon = scienceIcons[i];
              return (
                <motion.article key={n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6, ease }}
                  className="glass-card-elevated p-9 group gradient-border">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -3 }}
                    className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center mb-6 shadow-lg shadow-primary/20"
                  >
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </motion.div>
                  <h3 className="font-display text-lg font-semibold mb-3">{t(`home.science${n}_title`)}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{t(`home.science${n}_desc`)}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Testimonials */}
      <section className="py-28 md:py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-20 tracking-tight">
            {t("home.testimonials_title")}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n, i) => (
              <motion.article key={n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6, ease }}
                className="glass-card-elevated p-8 sm:p-9 flex flex-col gradient-border">
                <Quote className="w-8 h-8 text-primary/40 mb-5" />
                <p className="text-sm text-foreground/80 leading-relaxed flex-1 italic">
                  "{t(`home.testimonial${n}_quote`)}"
                </p>
                <div className="flex items-center gap-3 mt-7 pt-6 border-t border-border/20">
                  <img
                    src={testimonialAvatars[i]}
                    alt={t(`home.testimonial${n}_name`)}
                    className="w-10 h-10 rounded-full bg-muted ring-2 ring-border/20"
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

      <SectionDivider />

      {/* Listen anywhere */}
      <section className="py-28 md:py-32 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-5 tracking-tight"
          >
            {t("home.listen_title")}
          </motion.h2>
          <p className="text-center text-muted-foreground mb-16 text-lg max-w-xl mx-auto">{t("home.listen_subtitle")}</p>
          <div className="grid sm:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((n, i) => (
              <motion.div key={n} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5, ease }}
                className="glass-card-elevated p-8 gradient-border">
                <div className="text-2xl mb-4">{t(`home.listen${n}_emoji`)}</div>
                <h3 className="font-display font-semibold mb-2 text-lg">{t(`home.listen${n}_label`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`home.listen${n}_desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Target */}
      <section className="py-28 md:py-32 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-16 tracking-tight"
          >
            {t("home.target_title")}
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((n, i) => (
              <motion.div key={n} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5, ease }}
                className="glass-card-elevated p-8 gradient-border">
                <div className="text-2xl mb-4">{t(`home.target${n}_emoji`)}</div>
                <h3 className="font-display font-semibold mb-2 text-lg">{t(`home.target${n}_label`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`home.target${n}_desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* FAQ */}
      <section className="py-28 md:py-32 px-4">
        <div className="container mx-auto max-w-2xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-5 tracking-tight"
          >
            {t("home.faq_title")}
          </motion.h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">{t("home.faq_subtitle")}</p>
          <Accordion type="single" collapsible className="space-y-3">
            {faqKeys.map(n => (
              <AccordionItem key={n} value={`faq-${n}`} className="glass-card-elevated px-6 border-none">
                <AccordionTrigger className="text-left font-medium hover:no-underline py-5 text-[15px]">
                  {t(`home.faq${n}_q`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed text-sm">
                  {t(`home.faq${n}_a`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <SectionDivider />

      {/* CTA */}
      <section ref={ctaRef} className="py-28 md:py-32 px-4">
        <div className="container mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
            className="glass-card-elevated p-16 text-center glow-intense relative overflow-hidden"
          >
            {/* Decorative orb */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] ambient-orb" style={{ background: "hsl(265, 90%, 60%)", opacity: 0.1 }} />
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-5 tracking-tight relative z-10">{t("home.cta_title")}</h2>
            <p className="text-muted-foreground mb-12 text-lg relative z-10">{t("home.cta_text")}</p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="relative z-10">
              <Button size="lg" className="gradient-bg-premium text-lg px-10 h-14 shimmer-btn rounded-2xl shadow-xl shadow-primary/25" onClick={() => navigate(user ? "/create" : "/signup")}>
                {user ? t("home.cta_create", "Create a song") : t("home.cta_button")}
              </Button>
            </motion.div>
          </motion.div>
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
            className="fixed bottom-0 left-0 right-0 z-40 md:hidden p-3 bg-background/85 backdrop-blur-2xl border-t border-border/20"
          >
            <Button className="w-full gradient-bg-premium h-12 text-base font-semibold shimmer-btn rounded-xl shadow-lg shadow-primary/20" onClick={() => navigate(user ? "/create" : "/signup")}>
              {user ? t("home.cta_create", "Create a song") : t("home.sticky_cta")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
