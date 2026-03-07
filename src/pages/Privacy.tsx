import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function Privacy() {
  const { t } = useTranslation();
  usePageSEO({ title: t("privacy.title"), canonical: "/privacy" });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="gap-2 mb-8">
          <Link to="/"><ArrowLeft className="w-4 h-4" /> {t("common.back")}</Link>
        </Button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center"><Music className="w-6 h-6 text-primary-foreground" /></div>
          <h1 className="font-display text-3xl font-bold">{t("privacy.title")}</h1>
        </div>
        <div className="glass-card p-8 space-y-6 text-foreground/80 leading-relaxed">
          <p className="text-sm text-muted-foreground">{t("privacy.last_updated")}</p>
          <section className="space-y-3"><h2 className="font-display text-xl font-semibold text-foreground">1. Données collectées</h2><p>StudyBeats collecte : email, prénom, filière d'études, contenus uploadés, données d'usage.</p></section>
          <section className="space-y-3"><h2 className="font-display text-xl font-semibold text-foreground">2. Finalité</h2><p>Vos données sont utilisées exclusivement pour fournir le service, personnaliser l'expérience, et améliorer la qualité.</p></section>
          <section className="space-y-3"><h2 className="font-display text-xl font-semibold text-foreground">3. Partage</h2><p>Vos données ne sont jamais vendues. Elles peuvent être partagées avec nos sous-traitants techniques dans le strict cadre du service.</p></section>
          <section className="space-y-3"><h2 className="font-display text-xl font-semibold text-foreground">4. Conservation</h2><p>Vos données sont conservées tant que votre compte est actif. En cas de suppression, effacement sous 30 jours.</p></section>
          <section className="space-y-3"><h2 className="font-display text-xl font-semibold text-foreground">5. Vos droits (RGPD)</h2><p>Accès, rectification, suppression, portabilité, opposition. Contactez-nous via la <Link to="/contact" className="text-primary hover:underline">page de contact</Link>.</p></section>
          <section className="space-y-3"><h2 className="font-display text-xl font-semibold text-foreground">6. Sécurité</h2><p>Chiffrement, contrôle d'accès, authentification sécurisée.</p></section>
        </div>
      </div>
    </div>
  );
}
