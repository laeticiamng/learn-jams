import { Link } from "react-router-dom";
import { ArrowLeft, Music, Target, Heart, Lightbulb, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageSEO } from "@/hooks/usePageSEO";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function About() {
  usePageSEO({
    title: "À propos de StudyBeats — Mission, vision et équipe",
    description: "Découvre StudyBeats : la plateforme qui transforme les cours en chansons pédagogiques grâce à l'IA. Notre mission, notre vision et pourquoi nous avons créé cet outil.",
    canonical: "/about",
  });

  const values = [
    { icon: Target, title: "Efficacité", desc: "Chaque fonctionnalité est conçue pour maximiser la mémorisation. Pas de gadgets inutiles, que des outils qui servent l'apprentissage." },
    { icon: Heart, title: "Accessibilité", desc: "L'éducation doit être accessible à tous. StudyBeats est gratuit et pensé pour s'adapter à tous les niveaux et toutes les filières." },
    { icon: Lightbulb, title: "Innovation responsable", desc: "Nous utilisons l'IA comme un levier pédagogique, pas comme un raccourci. L'objectif est d'aider à comprendre et retenir, pas de remplacer l'effort." },
    { icon: Users, title: "Écoute", desc: "StudyBeats évolue grâce aux retours de ses utilisateurs. Chaque amélioration part d'un besoin réel exprimé par la communauté étudiante." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
            <Music className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">À propos de StudyBeats</h1>
            <p className="text-muted-foreground">Notre mission, notre vision et pourquoi nous existons</p>
          </div>
        </div>

        {/* En bref */}
        <section className="glass-card p-8 mb-8" aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="font-display text-xl font-semibold text-foreground mb-3">En bref</h2>
          <p className="text-foreground/80 leading-relaxed">
            <strong>StudyBeats</strong> est une plateforme en ligne qui transforme les contenus de cours en chansons pédagogiques grâce à l'intelligence artificielle. Elle s'adresse aux étudiants de tous niveaux — lycée, université, concours — qui veulent exploiter leur mémoire musicale pour réviser plus efficacement.
          </p>
        </section>

        {/* Pourquoi */}
        <section className="glass-card p-8 mb-8" aria-labelledby="why-heading">
          <h2 id="why-heading" className="font-display text-xl font-semibold text-foreground mb-3">Pourquoi StudyBeats ?</h2>
          <div className="space-y-4 text-foreground/80 leading-relaxed">
            <p>
              Tout le monde a déjà retenu les paroles d'une chanson sans effort. Des études en neurosciences montrent que la musique active des zones du cerveau liées à la mémoire à long terme, facilitant l'encodage et le rappel d'informations.
            </p>
            <p>
              Pourtant, aucun outil simple ne permettait de transformer un cours en chanson en quelques clics. C'est le problème que StudyBeats résout : rendre la révision musicale accessible à tout étudiant, sans compétence musicale ni technique.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="glass-card p-8 mb-8" aria-labelledby="mission-heading">
          <h2 id="mission-heading" className="font-display text-xl font-semibold text-foreground mb-3">Notre mission</h2>
          <p className="text-foreground/80 leading-relaxed">
            Donner à chaque étudiant un outil de révision complémentaire, fondé sur les sciences cognitives, qui transforme n'importe quel contenu de cours en expérience musicale mémorisable. StudyBeats ne remplace pas le travail — il le rend plus engageant et plus efficace.
          </p>
        </section>

        {/* Comment ça marche */}
        <section className="glass-card p-8 mb-8" aria-labelledby="how-heading">
          <h2 id="how-heading" className="font-display text-xl font-semibold text-foreground mb-3">Comment ça marche</h2>
          <ol className="space-y-3 text-foreground/80 leading-relaxed list-decimal pl-6">
            <li><strong>Upload ton cours</strong> — Colle du texte, importe un PDF, ou prends en photo tes notes manuscrites. L'IA extrait automatiquement le contenu.</li>
            <li><strong>Choisis un style musical</strong> — 8 genres disponibles : rap, lo-fi, pop, jazz, rock, spoken-word, reggaeton et classique.</li>
            <li><strong>L'IA génère les paroles</strong> — Des paroles pédagogiques structurées autour des notions clés de ton cours, adaptées au style choisi.</li>
            <li><strong>Teste-toi avec le quiz</strong> — Un QCM de 10 questions est généré automatiquement à partir de ton cours et des paroles, avec des explications pour chaque réponse.</li>
          </ol>
        </section>

        {/* Nos valeurs */}
        <section className="mb-8" aria-labelledby="values-heading">
          <h2 id="values-heading" className="font-display text-xl font-semibold text-foreground mb-6">Nos valeurs</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {values.map((v, i) => (
              <div key={i} className="glass-card p-6">
                <v.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-display font-semibold mb-1">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="glass-card p-8 text-center mb-8" aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="font-display text-xl font-semibold text-foreground mb-3">Une question ?</h2>
          <p className="text-muted-foreground mb-4">
            N'hésite pas à nous contacter pour toute question, suggestion ou partenariat.
          </p>
          <Button asChild className="gradient-bg gap-2">
            <Link to="/contact">Nous contacter</Link>
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
