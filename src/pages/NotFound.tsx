import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Music, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageSEO } from "@/hooks/usePageSEO";
import Navbar from "@/components/Navbar";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();
  usePageSEO({ title: t("notfound.title"), description: t("notfound.text"), noindex: true });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" style={{ background: "var(--gradient-glow)" }}>
      <div className="glass-card p-12 text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6"><Music className="w-8 h-8 text-primary-foreground" /></div>
        <h1 className="font-display text-5xl font-bold gradient-text mb-4">404</h1>
        <p className="text-xl text-foreground mb-2">{t("notfound.title")}</p>
        <p className="text-muted-foreground mb-8">{t("notfound.text")}</p>
        <Button asChild className="gradient-bg gap-2"><Link to="/"><ArrowLeft className="w-4 h-4" /> {t("common.return")}</Link></Button>
      </div>
    </div>
  );
};

export default NotFound;
