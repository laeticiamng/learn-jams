import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ShieldCheck, Database, Lock, Cookie, UserX, AlertTriangle } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { usePageSEO } from "@/hooks/usePageSEO";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SECTIONS = [
  { key: "data", icon: Database },
  { key: "storage", icon: Lock },
  { key: "cookies", icon: Cookie },
  { key: "deletion", icon: UserX },
  { key: "ai_limits", icon: AlertTriangle },
] as const;

export default function Security() {
  const { t } = useTranslation();
  usePageSEO({
    title: t("security.title"),
    description: t("security.subtitle"),
    canonical: "/security",
  });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        className="fixed top-1/4 right-1/4 w-[400px] h-[300px] pointer-events-none ambient-orb"
        style={{ background: "hsl(160, 70%, 50%)", opacity: 0.05 }}
      />
      <Navbar />
      <div className="container mx-auto px-4 pt-24 sm:pt-28 pb-16 max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-2 mb-8 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <Link to="/">
            <ArrowLeft className="w-4 h-4" /> {t("common.back")}
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/15">
            <ShieldCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">{t("security.title")}</h1>
        </div>
        <p className="text-muted-foreground mb-8 leading-relaxed">{t("security.subtitle")}</p>

        <div className="glass-card-elevated p-5 sm:p-8 space-y-8 text-foreground/90 leading-relaxed">
          <p className="text-sm text-muted-foreground">{t("security.last_updated")}</p>

          {SECTIONS.map(({ key, icon: Icon }) => (
            <section key={key} className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                {t(`security.${key}_title`)}
              </h2>
              <div
                className="prose prose-sm max-w-none text-foreground/90 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(t(`security.${key}_text`)) }}
              />
            </section>
          ))}

          <section className="space-y-3 border-t border-border/30 pt-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {t("security.contact_title")}
            </h2>
            <p>
              {t("security.contact_text")}{" "}
              <Link to="/contact" className="text-primary hover:underline">
                {t("security.contact_link")}
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
