import { Link } from "react-router-dom";
import { ArrowLeft, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="gap-2 mb-8">
          <Link to="/"><ArrowLeft className="w-4 h-4" /> Retour</Link>
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
            <Music className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">Conditions Générales d'Utilisation</h1>
        </div>

        <div className="glass-card p-8 space-y-6 text-foreground/80 leading-relaxed">
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 7 mars 2026</p>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">1. Objet</h2>
            <p>Les présentes CGU régissent l'utilisation de la plateforme StudyBeats, un service en ligne permettant de transformer des contenus de cours en chansons pédagogiques à l'aide de l'intelligence artificielle.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">2. Inscription</h2>
            <p>L'accès aux fonctionnalités principales nécessite la création d'un compte. L'utilisateur s'engage à fournir des informations exactes et à maintenir la confidentialité de ses identifiants.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">3. Utilisation du service</h2>
            <p>L'utilisateur s'engage à utiliser StudyBeats conformément à sa finalité pédagogique. Il est interdit de :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Uploader du contenu illicite, diffamatoire ou portant atteinte aux droits de tiers</li>
              <li>Utiliser le service à des fins commerciales sans autorisation</li>
              <li>Tenter de contourner les mesures de sécurité</li>
              <li>Générer du contenu en masse de manière automatisée</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">4. Propriété intellectuelle</h2>
            <p>Les contenus uploadés par l'utilisateur restent sa propriété. Les chansons générées par l'IA sont mises à disposition de l'utilisateur pour un usage personnel et pédagogique. StudyBeats conserve le droit d'utiliser les données anonymisées pour améliorer le service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">5. Limitation de responsabilité</h2>
            <p>StudyBeats fournit un outil d'aide à la mémorisation. Les chansons générées ne garantissent pas de résultats académiques spécifiques. Le service est fourni "en l'état" sans garantie d'exactitude pédagogique absolue.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">6. Résiliation</h2>
            <p>L'utilisateur peut supprimer son compte à tout moment. StudyBeats se réserve le droit de suspendre ou supprimer un compte en cas de violation des présentes CGU.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">7. Contact</h2>
            <p>Pour toute question relative aux présentes CGU, contactez-nous via la <Link to="/contact" className="text-primary hover:underline">page de contact</Link>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
