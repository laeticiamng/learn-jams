import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Music, Target, Heart, Lightbulb, Users, Brain, Repeat, Timer, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageSEO } from "@/hooks/usePageSEO";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function About() {
  const { t } = useTranslation();
  usePageSEO({ title: t("about.title"), description: t("about.subtitle"), canonical: "/about" });

  const scienceItems = [
    { icon: Brain, key: 1 }, { icon: Repeat, key: 2 }, { icon: Timer, key: 3 }, { icon: Dumbbell, key: 4 },
  ];
  const valueItems = [
    { icon: Target, key: 1 }, { icon: Heart, key: 2 }, { icon: Lightbulb, key: 3 }, { icon: Users, key: 4 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center"><Music className="w-6 h-6 text-primary-foreground" /></div>
          <div>
            <h1 className="font-display text-3xl font-bold">{t("about.title")}</h1>
            <p className="text-muted-foreground">{t("about.subtitle")}</p>
          </div>
        </div>

        <section className="glass-card p-8 mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">{t("about.summary_title")}</h2>
          <p className="text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: t("about.summary_text") }} />
        </section>

        <section className="glass-card p-8 mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">{t("about.science_title")}</h2>
          <div className="space-y-5 text-foreground/80 leading-relaxed">
            {scienceItems.map(({ icon: Icon, key }) => (
              <div key={key} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center shrink-0 mt-0.5"><Icon className="w-5 h-5 text-primary-foreground" /></div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{t(`about.science${key}_title`)}</h3>
                  <p>{t(`about.science${key}_desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card p-8 mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">{t("about.mission_title")}</h2>
          <p className="text-foreground/80 leading-relaxed">{t("about.mission_text")}</p>
        </section>

        <section className="glass-card p-8 mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">{t("about.how_title")}</h2>
          <ol className="space-y-3 text-foreground/80 leading-relaxed list-decimal pl-6">
            {[1, 2, 3, 4, 5].map(n => <li key={n} dangerouslySetInnerHTML={{ __html: t(`about.how_step${n}`) }} />)}
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">{t("about.values_title")}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {valueItems.map(({ icon: Icon, key }) => (
              <div key={key} className="glass-card p-6">
                <Icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-display font-semibold mb-1">{t(`about.value${key}_title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`about.value${key}_desc`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card p-8 text-center mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">{t("about.contact_title")}</h2>
          <p className="text-muted-foreground mb-4">{t("about.contact_text")}</p>
          <Button asChild className="gradient-bg gap-2"><Link to="/contact">{t("about.contact_button")}</Link></Button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
