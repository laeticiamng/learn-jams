// ============================================================
// QuotaDashboard — Shows user's current usage vs quotas
// ============================================================

import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import type { FeatureKey } from "@/domain/billing/pricing.types";

interface QuotaEntry {
  used: number;
  limit: number;
  credits: number;
}

interface QuotaDashboardProps {
  usage: Record<string, QuotaEntry> | null;
  loading: boolean;
}

const VISIBLE_FEATURES: FeatureKey[] = [
  "dynamic_sheet_generation",
  "animated_story_generation",
  "escape_game_generation",
  "music_generation",
  "video_generation_ai_seconds",
  "video_template_render",
  "guardian_sms",
  "guardian_email",
];

export function QuotaDashboard({ usage, loading }: QuotaDashboardProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!usage) return null;

  const entries = VISIBLE_FEATURES
    .filter((f) => usage[f] && (usage[f].limit !== 0 || usage[f].credits > 0))
    .map((f) => ({ feature: f, ...usage[f] }));

  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-bold">{t("quota.title")}</h3>
      {entries.map(({ feature, used, limit, credits }) => {
        const isUnlimited = limit === -1;
        const total = isUnlimited ? used : limit;
        const pct = isUnlimited ? 0 : total > 0 ? Math.min((used / total) * 100, 100) : 0;
        const isNearLimit = !isUnlimited && pct >= 80;

        return (
          <div key={feature} className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t(`pricing.feature_${feature}`)}</span>
              <span className={`text-xs font-mono ${isNearLimit ? "text-destructive" : "text-muted-foreground"}`}>
                {isUnlimited
                  ? t("quota.unlimited_used", { used })
                  : `${used} / ${limit}`}
                {credits > 0 && (
                  <span className="ml-1 text-primary">+{credits}</span>
                )}
              </span>
            </div>
            {!isUnlimited && (
              <Progress
                value={pct}
                className={`h-2 ${isNearLimit ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
