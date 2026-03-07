import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Upload, Music, Headphones, Zap, BookOpen, Brain, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";

const AudioWave = () => (
  <div className="flex items-end gap-1 h-16">
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
  { icon: Upload, title: "Upload ton cours", desc: "Colle ton texte ou importe un PDF / une photo de tes notes", color: "from-primary to-secondary" },
  { icon: Music, title: "Choisis ton style", desc: "Rap, Lo-Fi, Pop, Jazz, Rock et 3 autres styles disponibles", color: "from-secondary to-primary" },
  { icon: Headphones, title: "Écoute & mémorise", desc: "L'IA transforme ton cours en chanson avec des paroles pédagogiques", color: "from-primary to-secondary" },
];

const features = [
  { icon: Brain, title: "Quiz interactif", desc: "Teste tes connaissances avec des QCM générés automatiquement à partir de ton cours et des paroles" },
  { icon: BookOpen, title: "Extraction intelligente", desc: "Importe un PDF ou une photo — l'IA extrait le texte automatiquement" },
  { icon: Shield, title: "Données sécurisées", desc: "Tes cours restent privés. Rien n'est partagé ni vendu." },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="absolute inset-0" style={{ background: "var(--gradient-glow)" }} />
        <div className="container mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary">Nouveau — Génération par IA</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Transforme tes cours<br />
              <span className="gradient-text">en chansons</span> 🎧
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Upload ton cours, choisis un style musical, et l'IA crée des paroles pédagogiques conçues pour la mémorisation. Teste-toi ensuite avec un quiz automatique.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="gradient-bg text-lg px-8 h-14 glow" onClick={() => navigate("/signup")}>
                Essayer gratuitement
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 h-14 border-border/50" onClick={() => navigate("/login")}>
                J'ai déjà un compte
              </Button>
            </div>
            <AudioWave />
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-4">
            Comment ça marche ?
          </motion.h2>
          <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto">
            3 étapes simples pour transformer n'importe quel cours en chanson mémorisable
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="glass-card p-8 text-center group hover:border-primary/30 transition-all">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                  <step.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="text-sm text-muted-foreground mb-2">Étape {i + 1}</div>
                <h3 className="font-display text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Ce que tu obtiens</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 text-center">
                <feat.icon className="w-8 h-8 text-primary mx-auto mb-4" />
                <h3 className="font-display font-semibold mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="glass-card p-12 text-center glow">
            <h2 className="font-display text-3xl font-bold mb-4">Prêt à réviser autrement ?</h2>
            <p className="text-muted-foreground mb-8">Crée ton premier cours en chanson en moins de 2 minutes. C'est gratuit.</p>
            <Button size="lg" className="gradient-bg text-lg px-8 h-14" onClick={() => navigate("/signup")}>
              Créer mon compte gratuitement
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              <span className="font-display font-bold gradient-text">StudyBeats</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground transition-colors">CGU</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Confidentialité</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 StudyBeats</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
