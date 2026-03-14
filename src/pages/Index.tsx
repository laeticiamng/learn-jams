import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  FileUp, Brain, BookOpen, ArrowRight, ShieldCheck, Lock,
  Zap, Target, RefreshCw, BarChart3, GraduationCap,
  Accessibility, AlertTriangle, Quote, Eye,
} from "lucide-react";
import testimonialMarie from "@/assets/testimonial-marie.jpg";
import testimonialKarim from "@/assets/testimonial-karim.jpg";
import testimonialChloe from "@/assets/testimonial-chloe.jpg";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { useProductTracking } from "@/hooks/useProductTracking";
import { useSeedLibrary } from "@/hooks/useSeedLibrary";
import { SeedLibraryGrid } from "@/components/product/SeedLibraryGrid";
import { FeatureFlagGuard } from "@/components/product/FeatureFlagGuard";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const BrainWave = () => {
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

const STEPS = [
  { icon: FileUp, title: "Importez votre cours", desc: "PDF, DOCX ou texte. L'analyse commence instantanément." },
  { icon: Brain, title: "L'IA analyse et structure", desc: "Concepts, hiérarchie, pièges, plan mémoire — tout est détecté." },
  { icon: Target, title: "Jouez votre mission", desc: "Une expérience interactive adaptée à votre contenu." },
  { icon: RefreshCw, title: "Révisez et retenez", desc: "Débrief, rappel actif J+1, J+7. Mémoire durable." },
];

const SCIENCE = [
  { icon: Zap, title: "Rappel actif", desc: "Chaque mission intègre des tests inline pour ancrer les connaissances en profondeur." },
  { icon: Target, title: "Répétition espacée", desc: "Re-tests J+1 et J+7 pour combattre l'oubli naturel." },
  { icon: Brain, title: "Calibration confiance", desc: "Détection des zones de surconfiance pour éviter l'illusion de maîtrise." },
  { icon: Eye, title: "Fidélité source absolue", desc: "Aucun concept inventé. Chaque notion est tracée jusqu'à votre document." },
];

const PLATFORM_FEATURES = [
  { icon: BarChart3, title: "Score composite", desc: "Précision, calibration confiance, couverture Bloom, détection de pièges." },
  { icon: AlertTriangle, title: "Fallback transparent", desc: "Si le contenu est limité, vous savez pourquoi et ce qui a été adapté." },
  { icon: BookOpen, title: "Mémoire longitudinale", desc: "Suivez vos concepts maîtrisés, fragiles et vieillissants dans le temps." },
  { icon: GraduationCap, title: "Débrief actionnable", desc: "Arbre d'erreurs, plan de révision, zones de surconfiance identifiées." },
  { icon: Accessibility, title: "Accessible", desc: "Navigation clavier, contraste, mode sans timer." },
];

const FAQ = [
  { q: "Comment fonctionne l'analyse ?", a: "Votre document est parsé, segmenté et analysé par IA. Les concepts sont extraits, hiérarchisés par criticité et liés à leur source. Aucune notion n'est inventée." },
  { q: "Quels formats sont supportés ?", a: "PDF texte, DOCX et texte brut (copier-coller). Les fichiers scannés (image) ne sont pas encore supportés." },
  { q: "L'IA invente-t-elle du contenu ?", a: "Non. C'est le principe fondamental de COGNITIO : chaque concept est tracé jusqu'à votre document source. Le système de QA bloque toute hallucination conceptuelle." },
  { q: "Que se passe-t-il si mon document est de mauvaise qualité ?", a: "Le système détecte la qualité et adapte automatiquement : mission réduite, simplifiée ou synthèse uniquement. Vous êtes toujours informé du pourquoi." },
  { q: "Mes documents sont-ils sécurisés ?", a: "Vos données sont isolées par utilisateur (RLS Supabase). Les fichiers bruts peuvent être supprimés. Aucun partage croisé." },
];

const testimonialAvatars = [testimonialMarie, testimonialKarim, testimonialChloe];
const TESTIMONIALS = [
  { name: "Marie L.", field: "Médecine 4e année", quote: "J'ai révisé ma cardio en mode mission. Le débrief m'a montré exactement où j'étais trop confiante." },
  { name: "Karim B.", field: "Droit des affaires", quote: "Enfin un outil qui ne me résume pas mon cours mais qui me force à le comprendre activement." },
  { name: "Chloé D.", field: "Sciences infirmières", quote: "Les re-tests J+7 ont changé ma rétention. Je retiens vraiment sur le long terme maintenant." },
];

export default function Index() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showStickyCta, setShowStickyCta] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const { track } = useProductTracking();
  const { seeds, loading: seedsLoading } = useSeedLibrary();

  usePageSEO({
    title: "COGNITIO — Transformez n'importe quel cours en mission d'apprentissage",
    description: "Importez votre cours, jouez une mission pédagogique intelligente, retenez durablement. Pas un résumé IA, un moteur de rétention.",
    canonical: "/",
  });

  const faqJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }), []);

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

      {/* Hero */}
      <header ref={heroRef} className="relative pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-20 md:pb-28 px-4">
        <ParallaxOrbs />
        <div className="container mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 40, filter: "blur(12px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, ease }}>
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-foreground/20 bg-foreground/5 mb-8 sm:mb-12 text-xs sm:text-sm text-foreground/90 font-medium backdrop-blur-sm"
            >
              Moteur de rétention pédagogique
            </motion.p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] font-bold mb-6 sm:mb-8 leading-[1.05] sm:leading-[1.02] tracking-tight">
              N'importe quel cours<br />
              <span className="gradient-text glow-text">devient une mission</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-14 leading-relaxed">
              Importez votre contenu. L'IA l'analyse, le structure et le transforme en expérience interactive. Vous ne résumez pas — vous retenez.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 px-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="gradient-bg-premium text-base sm:text-lg px-8 sm:px-10 h-13 sm:h-14 w-full sm:w-auto shimmer-btn rounded-2xl shadow-xl shadow-primary/25"
                  onClick={() => {
                    track({ event_name: user ? "upload_started" : "onboarding_started" });
                    navigate(user ? "/create" : "/signup");
                  }}
                >
                  {user ? "Importer un cours" : "Commencer gratuitement"}
                </Button>
              </motion.div>
              {user && seeds.length > 0 && (
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-base sm:text-lg px-8 h-13 sm:h-14 w-full sm:w-auto rounded-2xl"
                    onClick={() => {
                      track({ event_name: "seed_transformation_started" });
                      navigate(`/create?seed=${seeds[0].id}`);
                    }}
                  >
                    Essayer une demo
                  </Button>
                </motion.div>
              )}
            </div>
            {!user && (
              <div className="flex flex-col items-center gap-2 mb-12">
                <button
                  onClick={() => navigate("/login")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                >
                  J'ai déjà un compte
                </button>
              </div>
            )}
            <BrainWave />
          </motion.div>
        </div>
      </header>

      {/* Trust */}
      <section className="py-10 px-4">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {[
            { icon: ShieldCheck, label: "Fidélité source garantie" },
            { icon: Lock, label: "Données isolées (RLS)" },
            { icon: Brain, label: "Zéro hallucination" },
          ].map(({ icon: Icon, label }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex items-center gap-2 text-muted-foreground text-sm">
              <Icon className="w-4 h-4 text-primary" />
              <span>{label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <SectionDivider />

      {/* How it works — 4 steps */}
      <section className="py-16 sm:py-20 md:py-28 lg:py-32 px-4">
        <div className="container mx-auto">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4">
            Comment ça marche
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-10 sm:mb-16 md:mb-20 tracking-tight">
            Import &rarr; Analyse &rarr; Mission &rarr; Rétention
          </motion.h2>
          <div className="grid md:grid-cols-4 gap-5 sm:gap-6 max-w-6xl mx-auto">
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <motion.article key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.6, ease }} className="glass-card-elevated p-6 sm:p-8 text-center group gradient-border">
                <motion.div whileHover={{ scale: 1.1, rotate: -3 }} className="w-14 h-14 rounded-2xl gradient-bg-premium flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
                  <Icon className="w-7 h-7 text-primary-foreground" />
                </motion.div>
                <div className="text-xs text-muted-foreground mb-3 uppercase tracking-widest font-medium">Étape {i + 1}</div>
                <h3 className="font-display text-lg font-semibold mb-3">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Before/After */}
      <section className="py-16 sm:py-20 md:py-28 lg:py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-16 tracking-tight">
            Avant / Après COGNITIO
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease }} className="glass-card p-8 sm:p-10 relative">
              <div className="absolute top-5 left-5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">Avant</div>
              <div className="pt-10 text-sm text-muted-foreground leading-relaxed font-mono">
                Relire ses notes 3 fois.<br />
                Surligner en jaune.<br />
                Faire un résumé IA.<br />
                Oublier 80% en 48h.<br />
                Se croire prêt pour l'exam.
              </div>
            </motion.div>
            <div className="flex justify-center md:hidden -my-1 relative z-10">
              <div className="w-10 h-10 rounded-full gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/20">
                <ArrowRight className="w-5 h-5 text-primary-foreground rotate-90" />
              </div>
            </div>
            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15, duration: 0.6, ease }} className="glass-card-elevated p-8 sm:p-10 relative glow-intense">
              <div className="absolute top-5 left-5 text-[11px] font-semibold uppercase tracking-widest text-foreground/90 bg-foreground/5 border border-foreground/10 px-3 py-1 rounded-full">Avec COGNITIO</div>
              <div className="pt-10 text-sm text-foreground leading-relaxed whitespace-pre-line">
                Importer son cours (2 clics).{"\n"}
                L'IA extrait les concepts clés.{"\n"}
                Jouer une mission interactive.{"\n"}
                Débrief avec arbre d'erreurs.{"\n"}
                Re-test J+1 et J+7 automatiques.{"\n"}
                Rétention mesurable et durable.
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Science */}
      <section className="py-16 sm:py-20 md:py-28 lg:py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4">
            Fondations scientifiques
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-10 sm:mb-16 md:mb-20 tracking-tight">
            Pourquoi ça fonctionne
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-8">
            {SCIENCE.map(({ icon: Icon, title, desc }, i) => (
              <motion.article key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6, ease }} className="glass-card-elevated p-8 gradient-border">
                <div className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-3">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Testimonials */}
      <section className="py-16 sm:py-20 md:py-28 lg:py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-10 sm:mb-16 md:mb-20 tracking-tight">
            Ce qu'ils en disent
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <motion.article key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6, ease }} className="glass-card-elevated p-8 sm:p-9 flex flex-col gradient-border">
                <Quote className="w-8 h-8 text-primary/40 mb-5" />
                <p className="text-sm text-foreground/90 leading-relaxed flex-1 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3 mt-7 pt-6 border-t border-border/20">
                  <img src={testimonialAvatars[i]} alt={t.name} className="w-10 h-10 rounded-full object-cover bg-muted ring-2 ring-border/20" loading="lazy" />
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.field}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Platform features */}
      <section className="py-16 sm:py-20 md:py-28 lg:py-32 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4">
            Plateforme
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-20 tracking-tight">
            Conçu pour la rétention, pas le spectacle
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORM_FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.article key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.6, ease }} className="glass-card-elevated p-8 flex flex-col gradient-border">
                <motion.div whileHover={{ scale: 1.1, rotate: -3 }} className="w-14 h-14 rounded-2xl gradient-bg-premium flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                  <Icon className="w-7 h-7 text-primary-foreground" />
                </motion.div>
                <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Seed Library */}
      <FeatureFlagGuard flag="ff_seed_library_enabled">
        <section className="py-16 sm:py-20 md:py-28 px-4">
          <div className="container mx-auto max-w-3xl">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-5 tracking-tight">
              Essayez sans importer
            </motion.h2>
            <p className="text-center text-muted-foreground mb-10 text-lg">Testez le moteur avec des missions pretes a l'emploi</p>
            <SeedLibraryGrid
              seeds={seeds}
              loading={seedsLoading}
              onStartSeed={(id) => {
                track({ event_name: "seed_transformation_started", metadata: { seed_id: id } });
                navigate(user ? `/create?seed=${id}` : "/signup");
              }}
            />
          </div>
        </section>

        <SectionDivider />
      </FeatureFlagGuard>

      {/* FAQ */}
      <section className="py-16 sm:py-20 md:py-28 lg:py-32 px-4">
        <div className="container mx-auto max-w-2xl">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-5 tracking-tight">
            Questions fréquentes
          </motion.h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">Tout ce que vous devez savoir</p>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQ.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="glass-card-elevated px-6 border-none">
                <AccordionTrigger className="text-left font-medium hover:no-underline py-5 text-[15px]">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed text-sm">{faq.a}</AccordionContent>
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
              Prêt à transformer vos cours ?
            </h2>
            <p className="text-muted-foreground mb-12 text-lg relative z-10">
              Importez votre premier cours et découvrez la puissance du rappel actif. Gratuit pour commencer.
            </p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="relative z-10">
              <Button size="lg" className="gradient-bg-premium text-lg px-10 h-14 shimmer-btn rounded-2xl shadow-xl shadow-primary/25" onClick={() => navigate(user ? "/create" : "/signup")}>
                {user ? "Importer un cours" : "Commencer gratuitement"}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Sticky CTA mobile */}
      <AnimatePresence>
        {showStickyCta && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 right-0 z-40 md:hidden p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-background/85 backdrop-blur-2xl border-t border-border/20">
            <Button className="w-full gradient-bg-premium h-12 text-base font-semibold shimmer-btn rounded-xl shadow-lg shadow-primary/20" onClick={() => navigate(user ? "/create" : "/signup")}>
              {user ? "Importer un cours" : "Commencer"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disclaimer */}
      <div className="container mx-auto px-4 pb-4">
        <p className="text-[10px] text-muted-foreground/50 text-center">
          Usage strictement pédagogique. COGNITIO ne fournit aucun conseil médical, juridique ou professionnel.
          Les contenus générés respectent la fidélité au document source.
        </p>
      </div>

      <Footer />
    </div>
  );
}
