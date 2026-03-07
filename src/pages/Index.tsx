import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Upload, Music, Headphones, Zap, BookOpen, Star } from "lucide-react";
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
  { icon: Upload, title: "Upload ton cours", desc: "Texte, PDF ou photo — on gère tout", color: "from-primary to-secondary" },
  { icon: Music, title: "Choisis ton style", desc: "Rap, Lo-Fi, Pop, Jazz et plus encore", color: "from-secondary to-primary" },
  { icon: Headphones, title: "Écoute & mémorise", desc: "Ton cours transformé en hit musical", color: "from-primary to-secondary" },
];

const stats = [
  { value: "10K+", label: "Étudiants actifs" },
  { value: "50K+", label: "Chansons créées" },
  { value: "94%", label: "Taux de mémorisation" },
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
              <span className="text-sm text-primary">Powered by AI + Suno</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Transforme tes cours<br />
              <span className="gradient-text">en hits musicaux</span> 🎧
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Upload ton cours, choisis un style, et laisse l'IA créer une chanson que tu n'oublieras jamais. La révision n'a jamais été aussi fun.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="gradient-bg text-lg px-8 h-14 glow" onClick={() => navigate("/signup")}>
                Commencer gratuitement
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
            className="font-display text-3xl md:text-4xl font-bold text-center mb-16">
            Comment ça marche ?
          </motion.h2>
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

      {/* Stats */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="glass-card p-12 glow">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              {stats.map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <div className="font-display text-4xl md:text-5xl font-bold gradient-text mb-2">{stat.value}</div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Ce qu'en disent les étudiants</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { name: "Sarah M.", field: "Médecine", quote: "J'ai retenu 3 chapitres d'anatomie en une semaine grâce à StudyBeats. Les chansons Lo-Fi sont parfaites !" },
              { name: "Thomas K.", field: "Droit", quote: "Le rap juridique, c'est le futur. Mes potes sont jaloux de ma méthode de révision." },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                className="glass-card p-6">
                <div className="flex gap-1 mb-4">{Array(5).fill(0).map((_, j) => <Star key={j} className="w-4 h-4 fill-primary text-primary" />)}</div>
                <p className="text-foreground/90 mb-4">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-sm font-bold text-primary-foreground">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1"><BookOpen className="w-3 h-3" /> {t.field}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            <span className="font-display font-bold gradient-text">StudyBeats</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 StudyBeats. Apprends en musique.</p>
        </div>
      </footer>
    </div>
  );
}
