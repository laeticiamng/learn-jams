import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { getConsent, setConsent } from "@/lib/cookieConsent";

export default function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    setConsent("accepted");
    setVisible(false);
  };

  const decline = () => {
    setConsent("declined");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:max-w-md z-50"
        >
          <div className="glass-card-elevated p-5 shadow-2xl border border-border/30">
            <p className="text-sm text-foreground/85 leading-relaxed mb-4">
              {t("cookies.text")}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={accept}
                size="sm"
                className="gradient-bg-premium text-primary-foreground rounded-xl flex-1"
              >
                {t("cookies.accept")}
              </Button>
              <Button
                onClick={decline}
                variant="outline"
                size="sm"
                className="rounded-xl flex-1 border-border/30"
              >
                {t("cookies.decline")}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
