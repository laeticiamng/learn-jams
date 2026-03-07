import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Check, Zap, Shield, Music, Brain } from "lucide-react";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";
import i18next from "i18next";

function formatPrice(lang: string) {
  // Use dot for EN/ZH/HI, comma for FR/DE/ES/AR
  const dotLocales = ["en", "zh", "hi"];
  return dotLocales.includes(lang) ? "14.90" : "14,90";
}

export default function Pricing() {
  const { t } = useTranslation();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const lang = i18next.language?.substring(0, 2) || "fr";

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
    if (!user) {
      navigate("/signup");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { returnUrl: window.location.origin },
      });

      if (error) throw error;
      if (data?.error === "already_subscribed") {
        toast.info(t("pricing.already_subscribed"));
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              {t("pricing.title")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("pricing.subtitle")}
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free Plan */}
            <div className="glass-card p-8 relative">
              <div className="text-center mb-6">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-muted text-muted-foreground mb-4">
                  {t("pricing.free_plan")}
                </span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-display font-bold">{t("pricing.free_price")}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {["free_feature1", "free_feature2", "free_feature3"].map((key) => (
                  <li key={key} className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                    <span>{t(`pricing.${key}`)}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full py-6 text-lg"
                size="lg"
                onClick={() => navigate(user ? "/create" : "/signup")}
              >
                {user ? t("home.cta_signup").replace("now", "").trim() || t("nav.create") : t("nav.signup")}
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="glass-card p-8 relative overflow-hidden ring-2 ring-primary/30">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 pointer-events-none" />

              <div className="relative z-10">
                <div className="text-center mb-6">
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-primary mb-4">
                    {t("pricing.plan_name")}
                  </span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-display font-bold">{formatPrice(lang)}</span>
                    <span className="text-2xl font-display font-bold">€</span>
                    <span className="text-muted-foreground ml-1">/ {t("pricing.month")}</span>
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {t("pricing.cancel_anytime")}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {features.map(({ key, icon: Icon }) => (
                    <li key={key} className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                      <div>
                        <span className="font-medium">{t(`pricing.feature_${key}`)}</span>
                        <p className="text-sm text-muted-foreground">{t(`pricing.feature_${key}_desc`)}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isActive ? (
                  <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="font-medium text-primary">{t("pricing.active")}</p>
                  </div>
                ) : (
                  <Button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full gradient-bg text-primary-foreground font-semibold py-6 text-lg"
                    size="lg"
                  >
                    {loading ? t("pricing.redirecting") : user ? t("pricing.subscribe") : t("pricing.signup_first")}
                  </Button>
                )}

                {/* Guarantee */}
                <p className="text-center text-xs text-muted-foreground mt-4">
                  {t("pricing.guarantee")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
