import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Upload, Music, Headphones, BookOpen, Brain, Shield, Repeat, Timer, Dumbbell, ChevronRight, Quote, Lock, ShieldCheck, CreditCard, ArrowRight, Play, Pause, Volume2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
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
    <div className="mt-8 max-w-sm mx-auto">
      <audio ref={audioRef} src="/demo.mp3" preload="none" />
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={togglePlay}
        className="w-full glass-card-elevated p-4 flex items-center gap-4 group"
      >
        <div className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
          {playing ? <Pause className="w-5 h-5 text-primary-foreground" /> : <Play className="w-5 h-5 text-primary-foreground ml-0.5" />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{listenLabel}</p>
          <p className="text-sm font-semibold truncate">{titleLabel}</p>
          <div
            className="mt-2 h-1 rounded-full bg-muted/30 overflow-hidden cursor-pointer"
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
      </motion.button>
    </div>
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
      <AnnouncementBanner />
      <Navbar />

      {/* Hero */}
      <header ref={heroRef} className="relative pt-36 pb-24 px-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
        <div className="absolute top-20 left-1/4 w-[400px] h-[400px] pointer-events-none ambient-orb" style={{ background: "hsl(265, 90%, 60%)" }} />
        <div className="absolute top-40 right-1/4 w-[300px] h-[300px] pointer-events-none ambient-orb" style={{ background: "hsl(300, 70%, 50%)", animationDelay: "3s" }} />

        <div className="container mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 40, filter: "blur(12px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, ease }}>
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-10 text-sm text-primary font-medium"
            >
              {t("home.badge")}
            </motion.p>
            <h1 className="font-display text-5xl sm:text-6xl md:text-8xl font-bold mb-8 leading-[1.05] px-2 tracking-tight">
              {t("home.title1")}<br />
              <span className="gradient-text glow-text">{t("home.title2")}</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 px-2 leading-relaxed">
              {t("home.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-5 px-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" className="gradient-bg-premium text-base sm:text-lg px-8 sm:px-10 h-13 sm:h-14 w-full sm:w-auto shimmer-btn rounded-2xl shadow-xl shadow-primary/25"
                  onClick={() => navigate("/signup")}>
                  {t("home.cta_signup")}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  variant="outline-premium"
                  size="lg"
                  className="text-base sm:text-lg px-8 sm:px-10 h-13 sm:h-14 w-full sm:w-auto rounded-2xl"
                  onClick={() => navigate("/pricing")}
                >
                  {t("home.cta_pricing", "Voir les plans")}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline mb-10 inline-block"
            >
              {t("home.cta_login")}
            </button>

            {/* Social proof */}
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-10 mb-10 text-xs sm:text-sm text-muted-foreground px-2">
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
      <section className="py-8 px-4">
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
              <Icon className="w-4 h-4 text-primary/60" />
              <span>{t(`home.${key}`)}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl font-bold text-center mb-4 tracking-tight">
            {t("home.how_title")}
          </motion.h2>
          <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto text-lg">{t("home.how_subtitle")}</p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto relative">
            <div className="hidden md:block absolute top-24 left-[33%] w-[34%] h-px bg-gradient-to-r from-primary/20 to-secondary/20" />
            <div className="hidden md:block absolute top-24 left-[66%] w-[34%] h-px bg-gradient-to-r from-secondary/20 to-primary/20" />
            {[1, 2, 3].map((n, i) => {
              const Icon = stepIcons[i];
              return (
                <motion.article key={n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6, ease }}
                  className="glass-card-elevated p-8 text-center group gradient-border">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -3 }}
                    className="w-16 h-16 rounded-2xl gradient-bg-premium flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20"
                  >
                    <Icon className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  <div className="text-xs text-muted-foreground mb-2 uppercase tracking-widest font-medium">{t("home.step_label", { n })}</div>
                  <h3 className="font-display text-xl font-semibold mb-3">{t(`home.step${n}_title`)}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{t(`home.step${n}_desc`)}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Before → After */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl font-bold text-center mb-4 tracking-tight">
            {t("home.before_after_title")}
          </motion.h2>
          <p className="text-center text-muted-foreground mb-14 text-lg">{t("home.before_after_subtitle")}</p>
          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.6, ease }}
              className="glass-card p-7 sm:p-9 relative">
              <div className="absolute top-5 left-5 sm:top-6 sm:left-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                {t("home.before_label")}
              </div>
              <div className="pt-10 text-sm sm:text-base text-muted-foreground leading-relaxed font-mono">
                {t("home.before_text")}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.6, ease }}
              className="glass-card-elevated p-7 sm:p-9 relative glow-intense">
              <div className="absolute top-5 left-5 sm:top-6 sm:left-6 text-[11px] font-semibold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                {t("home.after_label")}
              </div>
              <div className="pt-10 text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-line">
                {t("home.after_text")}
              </div>
            </motion.div>
          </div>
          <div className="flex justify-center md:hidden -my-3 relative z-10">
            <div className="w-10 h-10 rounded-full gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/20">
              <ArrowRight className="w-5 h-5 text-primary-foreground rotate-90" />
            </div>
          </div>
        </div>
      </section>

      {/* Bento Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-center mb-4 tracking-tight">{t("home.features_title")}</h2>
          <p className="text-center text-muted-foreground mb-14 max-w-xl mx-auto text-lg">{t("home.how_subtitle")}</p>
          
          {/* Bento grid — asymmetric layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
            {/* Large card — spans 7 columns */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease }}
              className="md:col-span-7 glass-card-elevated p-8 md:p-10 gradient-border group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[200px] h-[200px] ambient-orb" style={{ background: "hsl(265, 90%, 60%)", opacity: 0.06 }} />
              <div className="relative z-10">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: -3 }}
                  className="w-14 h-14 rounded-2xl gradient-bg-premium flex items-center justify-center mb-6 shadow-lg shadow-primary/20"
                >
                  <Brain className="w-7 h-7 text-primary-foreground" />
                </motion.div>
                <h3 className="font-display text-2xl font-semibold mb-3">{t("home.feature1_title")}</h3>
                <p className="text-muted-foreground leading-relaxed max-w-md">{t("home.feature1_desc")}</p>
              </div>
            </motion.article>

            {/* Tall card — spans 5 columns */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6, ease }}
              className="md:col-span-5 glass-card-elevated p-8 gradient-border group flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute bottom-0 left-0 w-[150px] h-[150px] ambient-orb" style={{ background: "hsl(215, 80%, 55%)", opacity: 0.06 }} />
              <div className="relative z-10">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: -3 }}
                  className="w-14 h-14 rounded-2xl gradient-bg-premium flex items-center justify-center mb-6 shadow-lg shadow-primary/20"
                >
                  <BookOpen className="w-7 h-7 text-primary-foreground" />
                </motion.div>
                <h3 className="font-display text-xl font-semibold mb-3">{t("home.feature2_title")}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t("home.feature2_desc")}</p>
              </div>
            </motion.article>

            {/* Bottom row — 3 equal cards spanning 4 columns each */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.6, ease }}
              className="md:col-span-4 glass-card-elevated p-7 gradient-border group"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: -3 }}
                className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center mb-5 shadow-lg shadow-primary/20"
              >
                <Shield className="w-6 h-6 text-primary-foreground" />
              </motion.div>
              <h3 className="font-display font-semibold mb-2">{t("home.feature3_title")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("home.feature3_desc")}</p>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6, ease }}
              className="md:col-span-4 glass-card-elevated p-7 gradient-border group"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: -3 }}
                className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center mb-5 shadow-lg shadow-primary/20"
              >
                <Music className="w-6 h-6 text-primary-foreground" />
              </motion.div>
              <h3 className="font-display font-semibold mb-2">{t("home.bento_styles_title", "30+ styles musicaux")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("home.bento_styles_desc", "Pop, rap, lo-fi, jazz, techno… adapte le style à ta matière")}</p>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25, duration: 0.6, ease }}
              className="md:col-span-4 glass-card-elevated p-7 gradient-border group"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: -3 }}
                className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center mb-5 shadow-lg shadow-primary/20"
              >
                <Headphones className="w-6 h-6 text-primary-foreground" />
              </motion.div>
              <h3 className="font-display font-semibold mb-2">{t("home.bento_listen_title", "Écoute partout")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("home.bento_listen_desc", "Révise en marchant, en transport ou à la salle de sport")}</p>
            </motion.article>
          </div>
        </div>
      </section>

      {/* Science — Bento 2x2 asymmetric */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl font-bold text-center mb-4 tracking-tight">
            {t("home.science_title")}
          </motion.h2>
          <p className="text-center text-muted-foreground mb-14 max-w-xl mx-auto text-lg">{t("home.science_subtitle")}</p>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
            {/* Top row: 5+7 */}
            {[1, 2].map((n, i) => {
              const Icon = scienceIcons[i];
              const span = i === 0 ? "md:col-span-5" : "md:col-span-7";
              return (
                <motion.article key={n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6, ease }}
                  className={`${span} glass-card-elevated p-8 group gradient-border relative overflow-hidden`}>
                  {i === 1 && <div className="absolute top-0 right-0 w-[180px] h-[180px] ambient-orb" style={{ background: "hsl(300, 70%, 50%)", opacity: 0.05 }} />}
                  <div className="relative z-10">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: -3 }}
                      className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center mb-5 shadow-lg shadow-primary/20"
                    >
                      <Icon className="w-6 h-6 text-primary-foreground" />
                    </motion.div>
                    <h3 className="font-display text-lg font-semibold mb-3">{t(`home.science${n}_title`)}</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">{t(`home.science${n}_desc`)}</p>
                  </div>
                </motion.article>
              );
            })}
            {/* Bottom row: 7+5 */}
            {[3, 4].map((n, i) => {
              const Icon = scienceIcons[n - 1];
              const span = i === 0 ? "md:col-span-7" : "md:col-span-5";
              return (
                <motion.article key={n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: (i + 2) * 0.1, duration: 0.6, ease }}
                  className={`${span} glass-card-elevated p-8 group gradient-border`}>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -3 }}
                    className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center mb-5 shadow-lg shadow-primary/20"
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

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl font-bold text-center mb-14 tracking-tight">
            {t("home.testimonials_title")}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n, i) => (
              <motion.article key={n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6, ease }}
                className="glass-card-elevated p-7 sm:p-8 flex flex-col gradient-border">
                <Quote className="w-8 h-8 text-primary/20 mb-4" />
                <p className="text-sm text-foreground/80 leading-relaxed flex-1 italic">
                  "{t(`home.testimonial${n}_quote`)}"
                </p>
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-border/20">
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

      {/* Listen + Target — Combined bento */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight">{t("home.listen_title")}</h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">{t("home.listen_subtitle")}</p>
          <div className="grid grid-cols-2 md:grid-cols-12 gap-4 md:gap-5">
            {[1, 2, 3, 4].map((n, i) => {
              const spans = ["md:col-span-7", "md:col-span-5", "md:col-span-5", "md:col-span-7"];
              return (
                <motion.div key={n} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5, ease }}
                  className={`col-span-1 ${spans[i]} glass-card-elevated p-7 gradient-border`}>
                  <div className="text-2xl mb-3">{t(`home.listen${n}_emoji`)}</div>
                  <h3 className="font-display font-semibold mb-1">{t(`home.listen${n}_label`)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`home.listen${n}_desc`)}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Target */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-10 tracking-tight">{t("home.target_title")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-12 gap-4 md:gap-5">
            {[1, 2, 3, 4].map((n, i) => {
              const spans = ["md:col-span-6", "md:col-span-6", "md:col-span-4", "md:col-span-8"];
              return (
                <motion.div key={n} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5, ease }}
                  className={`col-span-1 ${spans[i]} glass-card-elevated p-7 gradient-border`}>
                  <div className="text-2xl mb-3">{t(`home.target${n}_emoji`)}</div>
                  <h3 className="font-display font-semibold mb-1">{t(`home.target${n}_label`)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`home.target${n}_desc`)}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight">{t("home.faq_title")}</h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">{t("home.faq_subtitle")}</p>
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

      {/* CTA */}
      <section ref={ctaRef} className="py-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
            className="glass-card-elevated p-14 text-center glow-intense relative overflow-hidden"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] ambient-orb" style={{ background: "hsl(265, 90%, 60%)", opacity: 0.1 }} />
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 tracking-tight relative z-10">{t("home.cta_title")}</h2>
            <p className="text-muted-foreground mb-10 text-lg relative z-10">{t("home.cta_text")}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" className="gradient-bg-premium text-lg px-10 h-14 shimmer-btn rounded-2xl shadow-xl shadow-primary/25" onClick={() => navigate("/signup")}>
                  {t("home.cta_button")}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button variant="outline-premium" size="lg" className="text-lg px-10 h-14 rounded-2xl" onClick={() => navigate("/pricing")}>
                  {t("home.cta_pricing", "Voir les plans")}
                </Button>
              </motion.div>
            </div>
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
            <Button className="w-full gradient-bg-premium h-12 text-base font-semibold shimmer-btn rounded-xl shadow-lg shadow-primary/20" onClick={() => navigate("/signup")}>
              {t("home.sticky_cta")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
