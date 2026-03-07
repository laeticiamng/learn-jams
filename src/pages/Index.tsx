import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Upload, Music, Headphones, BookOpen, Brain, Shield, HelpCircle, ChevronDown, RefreshCw, Timer, Dumbbell, Repeat } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const AudioWave = () => (
  <div className="flex items-end gap-1 h-16" aria-hidden="true">
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="w-1.5 rounded-full gradient-bg"
        animate={{ height: [8, 32 + Math.random() * 32, 8] }}
        transition={{ duration: 0.8 + Math.random() * 0.8, repeat: Infinity, delay: i * 0.05 }}
      />
    ))}
  </div>
);

const steps = [
  { icon: Upload, title: "Upload ton cours", desc: "Colle ton texte, importe un PDF ou prends en photo tes notes manuscrites. L'IA extrait automatiquement le contenu.", color: "from-primary to-secondary" },
  { icon: Music, title: "Choisis ton style", desc: "30 styles musicaux disponibles : Rap, Lo-Fi, Pop, Jazz, Rock, EDM, Afrobeat, K-Pop, et bien d'autres.", color: "from-secondary to-primary" },
  { icon: Headphones, title: "Écoute & mémorise", desc: "L'IA génère des paroles pédagogiques basées sur ton cours. Écoute en boucle, n'importe où, n'importe quand — puis teste-toi avec un quiz automatique.", color: "from-primary to-secondary" },
];

const features = [
  { icon: Brain, title: "Quiz interactif", desc: "QCM générés automatiquement à partir de ton cours et des paroles. Feedback immédiat avec explications pédagogiques." },
  { icon: BookOpen, title: "Import intelligent", desc: "PDF, photos de notes manuscrites, texte brut — l'IA extrait et structure le contenu pour la génération musicale." },
  { icon: Shield, title: "Données sécurisées", desc: "Tes cours restent privés. Chiffrement des données, aucun partage ni revente. Conforme RGPD." },
];

const sciencePoints = [
  {
    icon: Brain,
    title: "Neurosciences & mémoire musicale",
    desc: "Des études en neurosciences (Université McGill, 2014 ; Journal of Neuroscience) montrent que la musique active simultanément l'hippocampe, le cortex préfrontal et les zones auditives — les mêmes régions impliquées dans la consolidation de la mémoire à long terme. En associant un contenu scolaire à une mélodie, le cerveau encode l'information via plusieurs canaux sensoriels simultanément.",
  },
  {
    icon: Repeat,
    title: "La répétition sans effort",
    desc: "Tu as déjà retenu les paroles d'une chanson sans le vouloir, simplement parce que tu l'as entendue plusieurs fois. C'est le principe de la répétition espacée passive : la musique crée naturellement des boucles de réexposition au contenu, sans que tu aies besoin de te forcer à relire tes notes. Plus tu écoutes, plus tu retiens — sans même t'en rendre compte.",
  },
  {
    icon: Timer,
    title: "Maximise ton temps de révision",
    desc: "Dans les transports, en marchant, en faisant du sport, en cuisinant — la musique t'accompagne partout. Contrairement à la lecture ou aux fiches, l'écoute ne nécessite ni concentration visuelle ni position assise. Tu transformes chaque moment libre en temps de révision actif, sans effort supplémentaire.",
  },
  {
    icon: Dumbbell,
    title: "Un complément, pas un substitut",
    desc: "StudyBeats ne remplace pas le travail — il l'amplifie. C'est un outil complémentaire qui renforce ce que tu as déjà appris. La musique vient consolider les connexions neuronales créées lors de tes premières lectures, en ajoutant une couche d'encodage émotionnel et rythmique que la relecture seule ne peut pas offrir.",
  },
];

const faqItems = [
  {
    q: "Qu'est-ce que StudyBeats ?",
    a: "StudyBeats est une plateforme en ligne qui transforme tes contenus de cours en chansons pédagogiques grâce à l'intelligence artificielle. Tu uploades ton cours (texte, PDF ou photo), tu choisis un style musical parmi 30 options, et l'IA génère des paroles conçues pour faciliter la mémorisation par la répétition musicale."
  },
  {
    q: "Est-ce que ça marche vraiment pour mémoriser ?",
    a: "Oui. Le principe repose sur des mécanismes prouvés par les neurosciences : la musique active les zones du cerveau liées à la mémoire à long terme, et la répétition naturelle d'une chanson crée un effet de révision espacée passive. Tu retiens les paroles comme tu retiens le refrain d'une chanson que tu écoutes souvent — sans effort conscient."
  },
  {
    q: "StudyBeats remplace-t-il les révisions classiques ?",
    a: "Non, et c'est volontaire. StudyBeats est un outil complémentaire. Il vient renforcer ce que tu as déjà appris en ajoutant une couche de mémorisation par la musique. L'idéal : lire ton cours une première fois, générer la chanson, puis l'écouter en boucle dans tes temps morts (transports, sport, marche)."
  },
  {
    q: "À qui s'adresse StudyBeats ?",
    a: "StudyBeats s'adresse aux étudiants de tous niveaux (lycée, université, concours, formation professionnelle) qui veulent une méthode de révision complémentaire. Particulièrement efficace pour les profils qui retiennent mieux en écoutant, et pour tous ceux qui veulent optimiser leurs temps de trajet ou d'activité physique."
  },
  {
    q: "Comment fonctionne la génération de chansons ?",
    a: "Tu uploades ton cours sous forme de texte, PDF ou photo. L'IA analyse le contenu, identifie les notions clés, et génère des paroles pédagogiques adaptées au style musical que tu as choisi parmi 30 genres. Les paroles sont structurées pour couvrir l'ensemble des notions importantes, avec des assonances et des répétitions qui facilitent la mémorisation."
  },
  {
    q: "Est-ce que mes données sont protégées ?",
    a: "Oui. Tes cours et tes données personnelles sont chiffrés et restent strictement privés. Rien n'est partagé ni vendu à des tiers. StudyBeats est conforme au RGPD. Tu peux supprimer ton compte et toutes tes données à tout moment."
  },
  {
    q: "Combien ça coûte ?",
    a: "StudyBeats est actuellement gratuit. Tu peux créer un compte et commencer à générer des chansons pédagogiques sans frais."
  },
  {
    q: "Le quiz est-il généré automatiquement ?",
    a: "Oui. Après la génération de ta chanson, tu peux lancer un quiz de 10 questions à choix multiples. Les questions sont générées par l'IA à partir de ton cours original et des paroles, avec des explications pédagogiques pour chaque réponse."
  },
];

export default function Index() {
  const navigate = useNavigate();

  usePageSEO({
    title: "StudyBeats — Transforme tes cours en chansons avec l'IA",
    description: "StudyBeats transforme tes cours en chansons pédagogiques grâce à l'IA et les neurosciences. Mémorise en écoutant dans les transports, en marchant ou en faisant du sport. 30 styles musicaux. Quiz interactif. Gratuit.",
    canonical: "/",
  });

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />

      {/* Hero */}
      <header className="relative pt-32 pb-20 px-4">
        <div className="absolute inset-0" style={{ background: "var(--gradient-glow)" }} />
        <div className="container mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8 text-sm text-primary">
              Mémorisation musicale fondée sur les neurosciences — gratuit
            </p>
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Transforme tes cours<br />
              <span className="gradient-text">en chansons</span> 🎧
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Upload ton cours, choisis parmi 30 styles musicaux, et l'IA crée une chanson pédagogique que tu peux écouter partout — en marchant, dans les transports, en faisant du sport. Tu mémorises sans t'en rendre compte, grâce à la répétition naturelle de la musique.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="gradient-bg text-lg px-8 h-14 glow" onClick={() => navigate("/signup")}>
                Créer mon compte gratuitement
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 h-14 border-border/50" onClick={() => navigate("/login")}>
                J'ai déjà un compte
              </Button>
            </div>
            <AudioWave />
          </motion.div>
        </div>
      </header>

      {/* En bref */}
      <section className="py-16 px-4" aria-labelledby="en-bref-heading">
        <div className="container mx-auto max-w-3xl">
          <div className="glass-card p-8 text-center">
            <h2 id="en-bref-heading" className="font-display text-2xl font-bold mb-4">En bref</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">StudyBeats</strong> exploite un principe prouvé par les neurosciences : la musique active les zones du cerveau liées à la mémoire à long terme. En transformant tes cours en chansons, tu bénéficies d'une mémorisation passive par la répétition — comme quand tu retiens le refrain d'une chanson sans le vouloir. Ce n'est pas un remplacement de tes révisions, c'est un <strong className="text-foreground">accélérateur</strong> qui transforme chaque moment libre en temps de révision.
            </p>
          </div>
        </div>
      </section>

      {/* Pourquoi ça marche — Science */}
      <section className="py-24 px-4" aria-labelledby="science-heading">
        <div className="container mx-auto max-w-4xl">
          <motion.h2 id="science-heading" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-4">
            Pourquoi ça marche ? 🧠
          </motion.h2>
          <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto">
            Ce n'est pas de la magie — c'est de la science cognitive appliquée à la musique
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {sciencePoints.map((point, i) => (
              <motion.article key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card p-8 group hover:border-primary/30 transition-all">
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <point.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-3">{point.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{point.desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-24 px-4" aria-labelledby="how-it-works-heading">
        <div className="container mx-auto">
          <motion.h2 id="how-it-works-heading" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-4">
            Comment ça marche ?
          </motion.h2>
          <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto">
            3 étapes pour transformer n'importe quel cours en chanson mémorisable
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <motion.article key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="glass-card p-8 text-center group hover:border-primary/30 transition-all">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                  <step.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="text-sm text-muted-foreground mb-2">Étape {i + 1}</div>
                <h3 className="font-display text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Quand utiliser StudyBeats */}
      <section className="py-20 px-4" aria-labelledby="when-heading">
        <div className="container mx-auto max-w-3xl">
          <h2 id="when-heading" className="font-display text-3xl font-bold text-center mb-4">Écoute partout, mémorise tout le temps</h2>
          <p className="text-center text-muted-foreground mb-10">StudyBeats transforme tes temps morts en temps de révision</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { emoji: "🚇", label: "Dans les transports", desc: "Métro, bus, train — au lieu de scroller, tu révises en écoutant ta chanson sur le trajet." },
              { emoji: "🏃", label: "En faisant du sport", desc: "Course, salle de sport, marche — la musique t'accompagne et le contenu s'ancre sans effort." },
              { emoji: "🍳", label: "En faisant autre chose", desc: "Cuisine, ménage, douche — la répétition passive fonctionne même quand tu ne te concentres pas." },
              { emoji: "😴", label: "Avant de dormir", desc: "La consolidation mnésique se fait pendant le sommeil. Écouter avant de dormir renforce la rétention." },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card p-6">
                <div className="text-2xl mb-2">{item.emoji}</div>
                <h3 className="font-display font-semibold mb-1">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* À qui s'adresse StudyBeats */}
      <section className="py-20 px-4" aria-labelledby="target-heading">
        <div className="container mx-auto max-w-3xl">
          <h2 id="target-heading" className="font-display text-3xl font-bold text-center mb-8">À qui s'adresse StudyBeats ?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { emoji: "🎓", label: "Étudiants en université", desc: "Médecine, droit, sciences, lettres — tout cours à forte charge de mémorisation." },
              { emoji: "📚", label: "Lycéens en révision", desc: "Bac, contrôles, oraux — transforme tes fiches en chansons pour réviser dans les transports." },
              { emoji: "🏋️", label: "Candidats aux concours", desc: "Prépas, concours de la fonction publique — mémorise des volumes importants en marchant ou en faisant du sport." },
              { emoji: "🎧", label: "Apprenants auditifs", desc: "Tu retiens mieux en écoutant qu'en lisant ? StudyBeats exploite ta mémoire auditive et la répétition naturelle de la musique." },
            ].map((item, i) => (
              <div key={i} className="glass-card p-6">
                <div className="text-2xl mb-2">{item.emoji}</div>
                <h3 className="font-display font-semibold mb-1">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="py-20 px-4" aria-labelledby="features-heading">
        <div className="container mx-auto max-w-4xl">
          <h2 id="features-heading" className="font-display text-3xl font-bold text-center mb-12">Ce que tu obtiens</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <motion.article key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 text-center">
                <feat.icon className="w-8 h-8 text-primary mx-auto mb-4" />
                <h3 className="font-display font-semibold mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground">{feat.desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4" aria-labelledby="faq-heading">
        <div className="container mx-auto max-w-2xl">
          <h2 id="faq-heading" className="font-display text-3xl font-bold text-center mb-4">Questions fréquentes</h2>
          <p className="text-center text-muted-foreground mb-10">Tout ce que tu dois savoir avant de commencer</p>
          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="glass-card px-6 border-none">
                <AccordionTrigger className="text-left font-medium hover:no-underline py-5">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" aria-labelledby="cta-heading">
        <div className="container mx-auto max-w-2xl">
          <div className="glass-card p-12 text-center glow">
            <h2 id="cta-heading" className="font-display text-3xl font-bold mb-4">Prêt à réviser autrement ?</h2>
            <p className="text-muted-foreground mb-8">Crée ta première chanson pédagogique en moins de 2 minutes. Écoute-la dans les transports, en marchant, en faisant du sport — et mémorise sans effort. C'est gratuit.</p>
            <Button size="lg" className="gradient-bg text-lg px-8 h-14" onClick={() => navigate("/signup")}>
              Créer mon compte gratuitement
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </div>
  );
}
