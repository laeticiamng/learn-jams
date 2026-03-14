import { useTranslation } from "react-i18next";
import { ParallaxOrbs } from "@/components/ParallaxOrbs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Crown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";
import { motion, useInView } from "framer-motion";
import i18next from "i18next";
import type { PlanKey, BillingInterval } from "@/domain/billing/pricing.types";
import { getVisiblePlans, getPlanPrice, getEffectiveMonthlyPrice, getAnnualDiscount, getPlanQuota, isFeatureEnabled, isUnlimited } from "@/services/billing/planResolver.service";
import { resolveZone, getLocalCurrency, getZoneMultiplier } from "@/services/billing/zoneResolver.service";
import type { ZoneKey, FeatureKey } from "@/domain/billing/pricing.types";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const localeMap: Record<string, string> = {
  fr: "fr-FR", en: "en-US", de: "de-DE", es: "es-ES",
  ar: "ar-SA", zh: "zh-CN", hi: "hi-IN",
};

function formatAmount(amount: number, currency: string, lang: string): string {
  try {
    return new Intl.NumberFormat(localeMap[lang] || "fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

const PLAN_ICONS: Record<string, typeof Sparkles> = {
  core: Sparkles,
  plus: Crown,
  premium_family: Crown,
};

const HIGHLIGHTED_PLAN: PlanKey = "plus";

const COMPARISON_FEATURES: FeatureKey[] = [
  "dynamic_sheet_generation",
  "animated_story_generation",
  "escape_game_generation",
  "music_generation",
  "video_generation_ai_seconds",
  "video_template_render",
  "guardian_sms",
  "guardian_email",
  "premium_export",
];

export default function Pricing() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [zone, setZone] = useState<ZoneKey>("zone_a");
  const lang = i18next.language?.substring(0, 2) || "fr";
  const footerRef = useRef<HTMLDivElement>(null);
  const footerInView = useInView(footerRef, { margin: "0px 0px 80px 0px" });
  const currency = "EUR";

  usePageSEO({
    title: "COGNITIO — " + t("pricing.title"),
    description: t("pricing.subtitle"),
    canonical: "/pricing",
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

  const handleCheckout = async (planKey: PlanKey) => {
    if (planKey === "free") {
      navigate(user ? "/create" : "/signup");
      return;
    }
    if (!user) { navigate("/signup"); return; }
    setLoading(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { returnUrl: window.location.origin, plan_key: planKey, interval, zone },
      });
      if (error) throw error;
      if (data?.error === "already_subscribed") { toast.info(t("pricing.already_subscribed")); return; }
      if (data?.url) {
        try {
          const checkoutUrl = new URL(data.url);
          if (!checkoutUrl.hostname.endsWith("stripe.com")) throw new Error("Invalid checkout URL");
          window.location.href = data.url;
        } catch {
          toast.error(t("pricing.error"));
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(t("pricing.error"));
    } finally {
      setLoading(null);
    }
  };

  const isActive = subscription?.status === "active";
  const visiblePlans = getVisiblePlans();

  function renderQuotaValue(plan: PlanKey, feature: FeatureKey): React.ReactNode {
    if (!isFeatureEnabled(plan, feature)) {
      return <X className="w-4 h-4 text-muted-foreground/40" />;
    }
    if (isUnlimited(plan, feature)) {
      return <span className="text-sm font-medium text-primary">{t("pricing.unlimited")}</span>;
    }
    const quota = getPlanQuota(plan, feature);
    return <span className="text-sm font-medium">{quota}</span>;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParallaxOrbs orbs={[
        { className: "fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none ambient-orb", style: { background: "hsl(265, 90%, 60%)", opacity: 0.08 } },
      ]} />

      <Navbar />
      <main className="pt-24 sm:pt-28 pb-20 relative z-10">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease }}
            className="text-center mb-10 sm:mb-14"
          >
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold mb-4 sm:mb-5 tracking-tight">
              {t("pricing.title")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t("pricing.subtitle")}
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease }}
            className="flex items-center justify-center gap-3 mb-10"
          >
            <button
              onClick={() => setInterval("monthly")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${interval === "monthly" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("pricing.monthly")}
            </button>
            <button
              onClick={() => setInterval("annual")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${interval === "annual" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("pricing.annual")}
              {interval !== "annual" && (
                <span className="ml-1.5 text-[10px] font-bold text-primary">
                  -{getAnnualDiscount("core", zone)}%
                </span>
              )}
            </button>
          </motion.div>

          {/* Plan Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {visiblePlans.map((planKey, i) => {
              const isHighlighted = planKey === HIGHLIGHTED_PLAN;
              const isFree = planKey === "free";
              const monthlyPrice = getEffectiveMonthlyPrice(planKey, zone, interval);
              const PlanIcon = PLAN_ICONS[planKey];

              return (
                <motion.div
                  key={planKey}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.6, ease }}
                  className={`glass-card-elevated p-5 sm:p-6 relative ${isHighlighted ? "overflow-hidden glow-intense ring-2 ring-primary/30" : "gradient-border"}`}
                >
                  {isHighlighted && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-secondary/8 pointer-events-none" />
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-b-lg bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest">
                        {t("pricing.popular")}
                      </div>
                    </>
                  )}

                  <div className="relative z-10">
                    <div className="text-center mb-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 ${isHighlighted ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"}`}>
                        {PlanIcon && <PlanIcon className="w-3 h-3" />}
                        {t(`pricing.plan_${planKey}`)}
                      </span>
                      <div className="flex items-baseline justify-center gap-1">
                        {isFree ? (
                          <span className="text-4xl font-display font-bold">{t("pricing.free_price")}</span>
                        ) : (
                          <>
                            <span className={`text-4xl font-display font-bold ${isHighlighted ? "gradient-text" : ""}`}>
                              {formatAmount(monthlyPrice, currency, lang)}
                            </span>
                            <span className="text-muted-foreground text-sm">/ {t("pricing.month")}</span>
                          </>
                        )}
                      </div>
                      {!isFree && interval === "annual" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("pricing.billed_annually", { total: formatAmount(getPlanPrice(planKey, zone, "annual"), currency, lang) })}
                        </p>
                      )}
                    </div>

                    {/* Key features */}
                    <ul className="space-y-2.5 mb-6">
                      {(["dynamic_sheet_generation", "music_generation", "escape_game_generation", "video_generation_ai_seconds"] as FeatureKey[]).map((feature) => {
                        const enabled = isFeatureEnabled(planKey, feature);
                        return (
                          <li key={feature} className={`flex items-center gap-2.5 text-sm ${enabled ? "" : "text-muted-foreground/50"}`}>
                            {enabled ? (
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${isHighlighted ? "bg-primary/20" : "bg-muted/50"}`}>
                                <Check className="w-2.5 h-2.5 text-primary" />
                              </div>
                            ) : (
                              <X className="w-4 h-4 flex-shrink-0" />
                            )}
                            <span>{t(`pricing.feature_${feature}`)}</span>
                          </li>
                        );
                      })}
                    </ul>

                    {/* CTA */}
                    {isActive && !isFree ? (
                      <div className="text-center p-3 rounded-xl bg-primary/10 border border-primary/20">
                        <p className="font-semibold text-primary text-sm">{t("pricing.active")}</p>
                      </div>
                    ) : (
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={() => handleCheckout(planKey)}
                          disabled={loading !== null}
                          variant={isHighlighted ? "default" : "outline"}
                          className={`w-full py-5 text-sm rounded-xl ${isHighlighted ? "gradient-bg-premium text-primary-foreground font-semibold shadow-xl shadow-primary/25 shimmer-btn" : ""}`}
                          size="lg"
                        >
                          {loading === planKey
                            ? t("pricing.redirecting")
                            : isFree
                              ? (user ? t("nav.create") : t("pricing.free_cta"))
                              : (user ? t("pricing.subscribe") : t("pricing.signup_first"))}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Feature Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.6, ease }}
            className="mt-16 max-w-5xl mx-auto overflow-x-auto"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8 tracking-tight">
              {t("pricing.compare_title")}
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">{t("pricing.feature_label")}</th>
                  {visiblePlans.map((plan) => (
                    <th key={plan} className={`text-center py-3 px-3 font-semibold ${plan === HIGHLIGHTED_PLAN ? "text-primary" : ""}`}>
                      {t(`pricing.plan_${plan}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((feature) => (
                  <tr key={feature} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-3 text-muted-foreground">{t(`pricing.feature_${feature}`)}</td>
                    {visiblePlans.map((plan) => (
                      <td key={plan} className="text-center py-3 px-3">
                        {renderQuotaValue(plan, feature)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.6, ease }}
            className="mt-20 max-w-2xl mx-auto"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-10 tracking-tight">
              {t("pricing.faq_title")}
            </h2>
            <Accordion type="single" collapsible className="space-y-3">
              {[1, 2, 3, 4].map(n => (
                <AccordionItem key={n} value={`faq-${n}`} className="glass-card-elevated px-6 border-none">
                  <AccordionTrigger className="text-left font-medium hover:no-underline py-5 text-[15px]">
                    {t(`pricing.faq${n}_q`)}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 leading-relaxed text-sm">
                    {t(`pricing.faq${n}_a`)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          {/* Guarantee */}
          <p className="text-center text-[11px] text-muted-foreground mt-10">
            {t("pricing.guarantee")}
          </p>
        </div>
      </main>

      {/* Sticky mobile CTA */}
      {!isActive && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-background/80 backdrop-blur-xl border-t border-border/20 md:hidden"
          initial={false}
          animate={{ y: footerInView ? 80 : 0, opacity: footerInView ? 0 : 1 }}
          transition={{ duration: 0.25 }}
        >
          <Button
            onClick={() => handleCheckout(HIGHLIGHTED_PLAN)}
            disabled={loading !== null}
            className="w-full gradient-bg-premium text-primary-foreground font-semibold py-5 text-base rounded-xl shadow-xl shadow-primary/25"
            size="lg"
          >
            {loading ? t("pricing.redirecting") : user ? t("pricing.subscribe") : t("pricing.signup_first")}
          </Button>
        </motion.div>
      )}

      <div ref={footerRef}>
        <Footer />
      </div>
    </div>
  );
}
