import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function Terms() {
  const { t } = useTranslation();
  usePageSEO({ title: t("terms.title"), description: t("terms.title"), canonical: "/terms" });

  const sections = [1, 2, 3, 4, 5, 6, 7] as const;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="gap-2 mb-8">
          <Link to="/"><ArrowLeft className="w-4 h-4" /> {t("common.back")}</Link>
        </Button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center"><Music className="w-6 h-6 text-primary-foreground" /></div>
          <h1 className="font-display text-3xl font-bold">{t("terms.title")}</h1>
        </div>
        <div className="glass-card p-8 space-y-6 text-foreground/80 leading-relaxed">
          <p className="text-sm text-muted-foreground">{t("terms.last_updated")}</p>
          {sections.map(n => (
            <section key={n} className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-foreground">{t(`terms.s${n}_title`)}</h2>
              <p dangerouslySetInnerHTML={{ __html: t(`terms.s${n}_text`) }} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
