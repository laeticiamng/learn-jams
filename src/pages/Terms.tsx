import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Music } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { usePageSEO } from "@/hooks/usePageSEO";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Terms() {
  const { t } = useTranslation();
  usePageSEO({ title: t("terms.title"), description: t("terms.title"), canonical: "/terms" });

  const sections = [1, 2, 3, 4, 5, 6, 7] as const;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed top-1/4 left-1/3 w-[400px] h-[300px] pointer-events-none ambient-orb" style={{ background: "hsl(265, 90%, 60%)", opacity: 0.05 }} />
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-16 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="gap-2 mb-8 rounded-xl text-muted-foreground hover:text-foreground">
          <Link to="/"><ArrowLeft className="w-4 h-4" /> {t("common.back")}</Link>
        </Button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/15"><Music className="w-6 h-6 text-primary-foreground" /></div>
          <h1 className="font-display text-3xl font-bold">{t("terms.title")}</h1>
        </div>
        <div className="glass-card-elevated p-8 space-y-6 text-foreground/90 leading-relaxed">
          <p className="text-sm text-muted-foreground">{t("terms.last_updated")}</p>
          {sections.map(n => (
            <section key={n} className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-foreground">{t(`terms.s${n}_title`)}</h2>
              <p dangerouslySetInnerHTML={{ __html: sanitizeHtml(t(`terms.s${n}_text`)) }} />
            </section>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
