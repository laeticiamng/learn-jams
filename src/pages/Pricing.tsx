import { useTranslation } from "react-i18next";
import { ParallaxOrbs } from "@/components/ParallaxOrbs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Check, Zap, Shield, Music, Brain, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";
import { motion, useInView } from "framer-motion";
import i18next from "i18next";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const localeMap: Record<string, string> = {
  fr: "fr-FR", en: "en-US", de: "de-DE", es: "es-ES",
  ar: "ar-SA", zh: "zh-CN", hi: "hi-IN",
};

function formatPrice(lang: string) {
  try {
    return new Intl.NumberFormat(localeMap[lang] || "fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(14.90);
  } catch {
    return "14,90 €";
  }
}

export default function Pricing() {
  const { t } = useTranslation();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const lang = i18next.language?.substring(0, 2) || "fr";
  const footerRef = useRef<HTMLDivElement>(null);
  const footerInView = useInView(footerRef, { margin: "0px 0px 80px 0px" });

  usePageSEO({
    title: "StudyBeats — " + t("pricing.title"),
    description: t("pricing.subtitle"),
  });

  useEffect(() => {
    if (user) {
      supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => setSubscription(data));
    }
  }, [user]);

  const handleCheckout = async () => {
    if (!user) { navigate("/signup"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { returnUrl: window.location.origin },
      });
      if (error) throw error;
      if (data?.error === "already_subscribed") { toast.info(t("pricing.already_subscribed")); return; }
      if (data?.url) { window.location.href = data.url; }
    } catch (err: any) {
      console.error(err);
      toast.error(t("pricing.error"));
    } finally {
      setLoading(false);
    }
  };

  const isActive = subscription?.status === "active";

  const features = [
    { key: "unlimited_songs", icon: Music },
    { key: "all_styles", icon: Zap },
    { key: "quiz", icon: Brain },
    { key: "secure", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient */}
      <ParallaxOrbs orbs={[
        { className: "fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none ambient-orb", style: { background: "hsl(265, 90%, 60%)", opacity: 0.08 } },
      ]} />

      <Navbar />
      <main className="pt-28 pb-20 relative z-10">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-5 tracking-tight">
              {t("pricing.title")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t("pricing.subtitle")}
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease }}
              className="glass-card-elevated p-9 relative gradient-border"
            >
              <div className="text-center mb-8">
                <span className="inline-block px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-muted/50 text-muted-foreground mb-5">
                  {t("pricing.free_plan")}
                </span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-display font-bold">{t("pricing.free_price")}</span>
                </div>
              </div>
              <ul className="space-y-4 mb-9">
                {["free_feature1", "free_feature2", "free_feature3"].map((key) => (
                  <li key={key} className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-muted-foreground/60" />
                    </div>
                    <span className="text-sm">{t(`pricing.${key}`)}</span>
                  </li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full py-6 text-base rounded-xl border-border/30 hover:bg-muted/30 transition-all duration-300"
                  size="lg"
                  onClick={() => navigate(user ? "/create" : "/signup")}
                >
                  {user ? t("nav.create") : t("nav.signup")}
                </Button>
              </motion.div>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease }}
              className="glass-card-elevated p-9 relative overflow-hidden glow-intense"
            >
              {/* Premium glow overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-secondary/8 pointer-events-none" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[150px] ambient-orb" style={{ background: "hsl(265, 90%, 60%)", opacity: 0.08 }} />

              <div className="relative z-10">
                <div className="text-center mb-8">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-primary/15 text-primary mb-5">
                    <Sparkles className="w-3 h-3" />
                    {t("pricing.plan_name")}
                  </span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-display font-bold gradient-text">{formatPrice(lang)}</span>
                    <span className="text-muted-foreground ml-1">/ {t("pricing.month")}</span>
                  </div>
                  <p className="text-muted-foreground mt-3 text-sm">
                    {t("pricing.cancel_anytime")}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-9">
                  {features.map(({ key, icon: Icon }, i) => (
                    <motion.li
                      key={key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.08, ease }}
                      className="flex items-start gap-3"
                    >
                      <div className="mt-0.5 w-6 h-6 rounded-full gradient-bg-premium flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm">{t(`pricing.feature_${key}`)}</span>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(`pricing.feature_${key}_desc`)}</p>
                      </div>
                    </motion.li>
                  ))}
                </ul>

                {/* CTA */}
                {isActive ? (
                  <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="font-semibold text-primary">{t("pricing.active")}</p>
                  </div>
                ) : (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleCheckout}
                      disabled={loading}
                      className="w-full gradient-bg-premium text-primary-foreground font-semibold py-6 text-base rounded-xl shadow-xl shadow-primary/25 shimmer-btn"
                      size="lg"
                    >
                      {loading ? t("pricing.redirecting") : user ? t("pricing.subscribe") : t("pricing.signup_first")}
                    </Button>
                  </motion.div>
                )}

                {/* Guarantee */}
                <p className="text-center text-[11px] text-muted-foreground mt-5">
                  {t("pricing.guarantee")}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
