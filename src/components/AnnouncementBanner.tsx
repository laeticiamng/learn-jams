import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const BANNER_DISMISSED_KEY = "sb_banner_dismissed_v1";

export default function AnnouncementBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(BANNER_DISMISSED_KEY) === "true"
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative z-[60] overflow-hidden"
        >
          <div className="gradient-bg-premium py-2.5 px-4">
            <div className="container mx-auto flex items-center justify-center gap-3 text-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground/80 shrink-0" />
              <span className="text-primary-foreground/90 font-medium truncate">
                {t("banner.text", "🎵 Transforme tes cours en chansons — essaie gratuitement")}
              </span>
              <button
                onClick={() => navigate("/signup")}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-primary-foreground text-xs font-semibold transition-all duration-300 shrink-0 backdrop-blur-sm"
              >
                {t("banner.cta", "Commencer")}
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={handleDismiss}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-primary-foreground/50 hover:text-primary-foreground hover:bg-white/10 transition-all duration-200"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
