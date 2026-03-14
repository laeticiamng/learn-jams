import { useTranslation } from "react-i18next";
import { FORMAT_CONFIGS, type CreateFormat } from "@/lib/create-format-config";
import { FormatCard } from "./FormatCard";
import type { EntitlementEntry } from "@/domain/billing/entitlement.types";

interface FormatSelectorProps {
  selectedFormat: CreateFormat | null;
  onSelectFormat: (format: CreateFormat) => void;
  entitlements?: EntitlementEntry[];   // from entitlement snapshot
  lockedFormats?: CreateFormat[];       // formats locked for current plan
  onLockedClick?: (format: CreateFormat) => void; // trigger paywall
}

export function FormatSelector({
  selectedFormat,
  onSelectFormat,
  entitlements = [],
  lockedFormats = [],
  onLockedClick,
}: FormatSelectorProps) {
  const { t } = useTranslation();

  const getQuotaRemaining = (featureKey: string): number | undefined => {
    const entry = entitlements.find((e) => e.feature_key === featureKey);
    if (!entry) return undefined;
    return entry.effective_remaining;
  };

  const formats = Object.values(FORMAT_CONFIGS);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">
        {t("create.choose_format", { defaultValue: "Que veux-tu créer ?" })}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {formats.map((config) => (
          <FormatCard
            key={config.key}
            format={config.key}
            labelKey={config.labelKey}
            descriptionKey={config.descriptionKey}
            icon={config.icon}
            color={config.color}
            tags={config.tags}
            selected={selectedFormat === config.key}
            locked={lockedFormats.includes(config.key)}
            quotaRemaining={getQuotaRemaining(config.featureKey)}
            onSelect={() => onSelectFormat(config.key)}
            onLockedClick={() => onLockedClick?.(config.key)}
          />
        ))}
      </div>
    </div>
  );
}
