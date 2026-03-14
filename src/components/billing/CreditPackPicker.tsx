// ============================================================
// CreditPackPicker — Select and purchase credit packs
// ============================================================

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import type { FeatureKey } from "@/domain/billing/pricing.types";
import type { CreditPack } from "@/domain/billing/pricing.types";
import { getPacksForFeature } from "@/services/billing/topUp.service";
import i18next from "i18next";

const localeMap: Record<string, string> = {
  fr: "fr-FR", en: "en-US", de: "de-DE", es: "es-ES",
  ar: "ar-SA", zh: "zh-CN", hi: "hi-IN",
};

interface CreditPackPickerProps {
  feature: FeatureKey;
  onSelect: (pack: CreditPack) => void;
  loading?: boolean;
}

export function CreditPackPicker({ feature, onSelect, loading }: CreditPackPickerProps) {
  const { t } = useTranslation();
  const packs = getPacksForFeature(feature);
  const lang = i18next.language?.substring(0, 2) || "fr";

  if (packs.length === 0) return null;

  function formatPrice(price: number, currency: string): string {
    try {
      return new Intl.NumberFormat(localeMap[lang] || "fr-FR", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }).format(price);
    } catch {
      return `${price.toFixed(2)} ${currency}`;
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground">{t("credits.pick_pack")}</h4>
      {packs.map((pack) => (
        <button
          key={pack.pack_key}
          onClick={() => onSelect(pack)}
          disabled={loading}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-border/30 hover:border-primary/40 hover:bg-muted/20 transition-all text-left"
        >
          <div>
            <p className="font-medium text-sm">{pack.label}</p>
          </div>
          <span className="font-bold text-sm whitespace-nowrap ml-3">
            {formatPrice(pack.price, pack.currency)}
          </span>
        </button>
      ))}
    </div>
  );
}
