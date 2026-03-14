import { useTranslation } from "react-i18next";
import { Lock, Zap, ArrowUpCircle, RefreshCw, X } from "lucide-react";
import type { PaywallContext, PaywallTrigger } from "@/domain/billing/entitlement.types";

interface IntelligentPaywallProps {
  context: PaywallContext;
  onUpgrade?: (plan: string) => void;
  onTopup?: (packId: string) => void;
  onReallocate?: () => void;
  onDismiss?: () => void;
}

const TRIGGER_CONFIG: Record<PaywallTrigger, { icon: typeof Lock; colorClass: string; titleKey: string }> = {
  format_locked: { icon: Lock, colorClass: "text-red-500 bg-red-500/10 border-red-500/20", titleKey: "paywall.format_locked" },
  quota_exhausted: { icon: Zap, colorClass: "text-amber-500 bg-amber-500/10 border-amber-500/20", titleKey: "paywall.quota_exhausted" },
  feature_upgrade: { icon: ArrowUpCircle, colorClass: "text-blue-500 bg-blue-500/10 border-blue-500/20", titleKey: "paywall.feature_upgrade" },
  adaptive_reallocation: { icon: RefreshCw, colorClass: "text-green-500 bg-green-500/10 border-green-500/20", titleKey: "paywall.adaptive_reallocation" },
};

export function IntelligentPaywall({ context, onUpgrade, onTopup, onReallocate, onDismiss }: IntelligentPaywallProps) {
  const { t } = useTranslation();
  const config = TRIGGER_CONFIG[context.trigger];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border-2 p-5 space-y-4 ${config.colorClass}`}>
      {onDismiss && (
        <button onClick={onDismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-background/50">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">
            {t(config.titleKey, { defaultValue: getTitleDefault(context.trigger) })}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(context.message_key, { defaultValue: getMessageDefault(context.trigger) })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {context.suggested_plan && onUpgrade && (
          <button
            onClick={() => onUpgrade(context.suggested_plan!)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            {t("paywall.upgrade_cta", { defaultValue: "Passer au plan {{plan}}", plan: context.suggested_plan })}
          </button>
        )}

        {context.suggested_topup && onTopup && (
          <button
            onClick={() => onTopup(context.suggested_topup!)}
            className="px-4 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-medium hover:bg-muted/20 transition-colors"
          >
            {t("paywall.topup_cta", { defaultValue: "Acheter des crédits" })}
          </button>
        )}

        {context.can_use_flex && onReallocate && (
          <button
            onClick={onReallocate}
            className="px-4 py-2 rounded-lg border border-green-500/30 text-green-600 text-xs font-medium hover:bg-green-500/10 transition-colors"
          >
            {t("paywall.reallocate_cta", { defaultValue: "Réallouer mes crédits flex" })}
          </button>
        )}
      </div>
    </div>
  );
}

function getTitleDefault(trigger: PaywallTrigger): string {
  switch (trigger) {
    case "format_locked": return "Format verrouillé";
    case "quota_exhausted": return "Quota épuisé";
    case "feature_upgrade": return "Fonctionnalité premium";
    case "adaptive_reallocation": return "Réallocation disponible";
  }
}

function getMessageDefault(trigger: PaywallTrigger): string {
  switch (trigger) {
    case "format_locked": return "Ce format n'est pas disponible avec ton plan actuel.";
    case "quota_exhausted": return "Tu as utilisé tous tes crédits pour ce format ce mois-ci.";
    case "feature_upgrade": return "Passe au plan supérieur pour débloquer cette fonctionnalité.";
    case "adaptive_reallocation": return "Tu peux réallouer tes crédits inutilisés vers ce format.";
  }
}
