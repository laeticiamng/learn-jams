// ============================================================
// Paywall — Shown when user hits a quota limit
// ============================================================

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, ShoppingCart } from "lucide-react";
import type { FeatureKey, PlanKey } from "@/domain/billing/pricing.types";
import { getPacksForFeature } from "@/services/billing/topUp.service";

interface PaywallProps {
  feature: FeatureKey;
  currentPlan: PlanKey;
  upgradeTo?: PlanKey;
  reason: "quota_exceeded" | "feature_disabled";
  onBuyCredits?: () => void;
}

export function Paywall({ feature, currentPlan, upgradeTo, reason, onBuyCredits }: PaywallProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const packs = getPacksForFeature(feature);
  const hasTopUps = packs.length > 0 && reason === "quota_exceeded";

  return (
    <div className="glass-card-elevated p-6 sm:p-8 text-center max-w-md mx-auto">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-muted-foreground" />
      </div>

      <h3 className="font-display text-lg font-bold mb-2">
        {reason === "feature_disabled"
          ? t("paywall.feature_locked")
          : t("paywall.quota_reached")}
      </h3>

      <p className="text-sm text-muted-foreground mb-6">
        {reason === "feature_disabled"
          ? t("paywall.feature_locked_desc", { feature: t(`pricing.feature_${feature}`) })
          : t("paywall.quota_reached_desc", { feature: t(`pricing.feature_${feature}`) })}
      </p>

      <div className="space-y-3">
        {upgradeTo && (
          <Button
            onClick={() => navigate("/pricing")}
            className="w-full gradient-bg-premium text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25"
          >
            {t("paywall.upgrade_to", { plan: t(`pricing.plan_${upgradeTo}`) })}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {hasTopUps && onBuyCredits && (
          <Button
            variant="outline"
            onClick={onBuyCredits}
            className="w-full rounded-xl"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {t("paywall.buy_credits")}
          </Button>
        )}
      </div>
    </div>
  );
}
