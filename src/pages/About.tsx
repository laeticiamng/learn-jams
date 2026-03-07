import { Link } from "react-router-dom";
import { Music, Target, Heart, Lightbulb, Users, Brain, Repeat, Timer, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageSEO } from "@/hooks/usePageSEO";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function About() {
  usePageSEO({
    title: "À propos de StudyBeats — Neurosciences, musique et mémorisation",
    description: "StudyBeats transforme les cours en chansons pédagogiques grâce à l'IA et les neurosciences. Mémoire musicale, répétition passive, apprentissage complémentaire.",
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
            <p className="text-muted-foreground">Neurosciences, musique et mémorisation</p>
          </div>
        </div>

        {/* En bref */}
        <section className="glass-card p-8 mb-8" aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="font-display text-xl font-semibold text-foreground mb-3">En bref</h2>
          <p className="text-foreground/80 leading-relaxed">
            <strong>StudyBeats</strong> est une plateforme en ligne qui transforme les contenus de cours en chansons pédagogiques grâce à l'intelligence artificielle. Elle s'appuie sur un principe validé par les neurosciences : la musique active les zones du cerveau liées à la mémoire à long terme, et la répétition naturelle d'une chanson crée un effet de révision espacée — sans effort conscient. StudyBeats est un <strong>outil complémentaire</strong>, conçu pour amplifier tes révisions, pas les remplacer.
          </p>
        </section>

        {/* Le fondement scientifique */}
        <section className="glass-card p-8 mb-8" aria-labelledby="science-heading">
          <h2 id="science-heading" className="font-display text-xl font-semibold text-foreground mb-3">Le fondement scientifique</h2>
          <div className="space-y-5 text-foreground/80 leading-relaxed">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center shrink-0 mt-0.5">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Mémoire musicale et neurosciences</h3>
                <p>Des recherches en neurosciences (Université McGill, 2014 ; Pereira et al., Journal of Neuroscience) démontrent que la musique active simultanément l'hippocampe, le cortex préfrontal et les cortex auditifs — les mêmes régions impliquées dans la consolidation de la mémoire à long terme. En associant un contenu scolaire à une structure musicale (mélodie, rythme, assonances), le cerveau encode l'information via plusieurs canaux sensoriels en parallèle, ce qui renforce significativement la rétention.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center shrink-0 mt-0.5">
                <Repeat className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">La répétition passive : mémoriser sans s'en rendre compte</h3>
                <p>Tout le monde a déjà retenu les paroles d'une chanson sans le vouloir, simplement à force de l'entendre. C'est le mécanisme central de StudyBeats : la musique crée naturellement des boucles de réexposition au contenu. Chaque écoute renforce les traces mnésiques, sans que tu aies besoin de te forcer à relire tes notes. C'est l'équivalent d'une répétition espacée, mais qui se fait automatiquement par le plaisir de l'écoute.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center shrink-0 mt-0.5">
                <Timer className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Transformer les temps morts en temps de révision</h3>
                <p>Contrairement à la lecture ou aux fiches, l'écoute ne nécessite ni concentration visuelle ni position assise. Tu peux écouter tes chansons pédagogiques en marchant, dans les transports, en faisant du sport, en cuisinant — tous ces moments perdus deviennent des temps de révision actifs. Un étudiant passe en moyenne 1h30 par jour en déplacements : c'est autant de temps récupéré pour mémoriser.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center shrink-0 mt-0.5">
                <Dumbbell className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Un complément, pas un substitut</h3>
                <p>StudyBeats ne prétend pas remplacer la lecture approfondie, les exercices ou les cours magistraux. Son rôle est de venir <em>après</em> le premier contact avec le cours, pour consolider les connexions neuronales par la répétition musicale. La musique ajoute une couche d'encodage émotionnel et rythmique que la relecture seule ne peut pas offrir. C'est un accélérateur de mémorisation, pas un raccourci.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="glass-card p-8 mb-8" aria-labelledby="mission-heading">
          <h2 id="mission-heading" className="font-display text-xl font-semibold text-foreground mb-3">Notre mission</h2>
          <p className="text-foreground/80 leading-relaxed">
            Donner à chaque étudiant un outil de révision complémentaire, fondé sur les sciences cognitives et la recherche en neurosciences musicales, qui transforme n'importe quel contenu de cours en expérience musicale mémorisable. StudyBeats ne remplace pas le travail — il le rend plus engageant, plus mobile et plus efficace en exploitant des mécanismes de mémorisation naturels que la musique active sans effort.
          </p>
        </section>

        {/* Comment ça marche */}
        <section className="glass-card p-8 mb-8" aria-labelledby="how-heading">
          <h2 id="how-heading" className="font-display text-xl font-semibold text-foreground mb-3">Comment ça marche</h2>
          <ol className="space-y-3 text-foreground/80 leading-relaxed list-decimal pl-6">
            <li><strong>Upload ton cours</strong> — Colle du texte, importe un PDF, ou prends en photo tes notes manuscrites. L'IA extrait automatiquement le contenu.</li>
            <li><strong>Choisis un style musical</strong> — 30 genres disponibles : rap, lo-fi, pop, jazz, rock, EDM, afrobeat, K-pop, et bien d'autres.</li>
            <li><strong>L'IA génère les paroles</strong> — Des paroles pédagogiques structurées autour des notions clés de ton cours, avec des assonances et répétitions conçues pour la mémorisation.</li>
            <li><strong>Écoute partout, tout le temps</strong> — Dans les transports, en marchant, en faisant du sport. Chaque écoute renforce ta mémorisation par la répétition passive.</li>
            <li><strong>Teste-toi avec le quiz</strong> — Un QCM de 10 questions est généré automatiquement pour vérifier ta compréhension.</li>
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
