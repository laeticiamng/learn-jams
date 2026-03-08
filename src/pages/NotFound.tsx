import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Music, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageSEO } from "@/hooks/usePageSEO";
import { ParallaxOrbs } from "@/components/ParallaxOrbs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();
  usePageSEO({ title: t("notfound.title"), description: t("notfound.text"), noindex: true });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <ParallaxOrbs orbs={[
        { className: "fixed top-1/4 left-1/3 w-[400px] h-[400px] pointer-events-none ambient-orb", style: { background: "hsl(265, 90%, 60%)", opacity: 0.07 } },
      ]} />
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="glass-card-elevated p-12 text-center max-w-md"
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: -3 }}
            className="w-16 h-16 rounded-2xl gradient-bg-premium flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20"
          >
            <Music className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="font-display text-5xl font-bold gradient-text mb-4">404</h1>
          <p className="text-xl text-foreground mb-2">{t("notfound.title")}</p>
          <p className="text-muted-foreground mb-8">{t("notfound.text")}</p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button asChild className="gradient-bg-premium gap-2 rounded-xl shadow-lg shadow-primary/20">
              <Link to="/"><ArrowLeft className="w-4 h-4" /> {t("common.return")}</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
