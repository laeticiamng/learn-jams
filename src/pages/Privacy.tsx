import { Link } from "react-router-dom";
import { ArrowLeft, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function Privacy() {
  usePageSEO({
    title: "Politique de Confidentialité",
    description: "Politique de confidentialité de StudyBeats. Découvre comment tes données sont collectées, utilisées et protégées. Conforme RGPD.",
    canonical: "/privacy",
  });

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
          <h1 className="font-display text-3xl font-bold">Politique de Confidentialité</h1>
        </div>

        <div className="glass-card p-8 space-y-6 text-foreground/80 leading-relaxed">
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 7 mars 2026</p>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">1. Données collectées</h2>
            <p>StudyBeats collecte les données suivantes :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Données d'inscription</strong> : email, prénom, filière d'études</li>
              <li><strong>Contenus uploadés</strong> : textes de cours, documents PDF/images pour extraction</li>
              <li><strong>Données d'usage</strong> : chansons générées, favoris, interactions avec les quiz</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">2. Finalité du traitement</h2>
            <p>Vos données sont utilisées exclusivement pour :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fournir le service de génération de chansons pédagogiques</li>
              <li>Personnaliser votre expérience</li>
              <li>Améliorer la qualité du service</li>
              <li>Assurer la sécurité du service</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">3. Partage des données</h2>
            <p>Vos données ne sont jamais vendues. Elles peuvent être partagées avec :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nos sous-traitants techniques (hébergement, IA) dans le strict cadre du service</li>
              <li>Les autorités compétentes si requis par la loi</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">4. Conservation</h2>
            <p>Vos données sont conservées tant que votre compte est actif. En cas de suppression de compte, vos données sont effacées sous 30 jours.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">5. Vos droits (RGPD)</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Accès</strong> : consulter vos données personnelles</li>
              <li><strong>Rectification</strong> : corriger vos informations</li>
              <li><strong>Suppression</strong> : demander l'effacement de vos données</li>
              <li><strong>Portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong>Opposition</strong> : vous opposer au traitement de vos données</li>
            </ul>
            <p>Pour exercer vos droits, contactez-nous via la <Link to="/contact" className="text-primary hover:underline">page de contact</Link>.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">6. Sécurité</h2>
            <p>Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données : chiffrement, contrôle d'accès, authentification sécurisée.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
