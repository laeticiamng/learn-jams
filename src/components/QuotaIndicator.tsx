// ============================================================
// QuotaIndicator — affiche la consommation d'un quota feature
// ============================================================

import { useFeatureQuota } from "@/hooks/useFeatureQuota";
import { Progress } from "@/components/ui/progress";
import { Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuotaIndicatorProps {
  featureKey: string;
  limit: number;
  label: string;
  className?: string;
  compact?: boolean;
}

export default function QuotaIndicator({ featureKey, limit, label, className, compact }: QuotaIndicatorProps) {
  const { usage, loading } = useFeatureQuota(featureKey);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>{label}</span>
      </div>
    );
  }

  const used = usage?.used ?? 0;
  const remaining = Math.max(0, limit - used);
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));

  // Colour thresholds via semantic tokens
  const tone =
    pct >= 90 ? "text-destructive" :
    pct >= 70 ? "text-amber-500" :
    "text-primary";

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-xs", className)}>
        <Zap className={cn("w-3 h-3", tone)} />
        <span className="text-muted-foreground">{label} :</span>
        <span className={cn("font-semibold", tone)}>{remaining}/{limit}</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border/30 bg-card/30 p-3 space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Zap className={cn("w-3.5 h-3.5", tone)} />
          {label}
        </span>
        <span className={cn("font-semibold tabular-nums", tone)}>
          {used} / {limit}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
      {usage?.periodEnd && (
        <p className="text-[10px] text-muted-foreground">
          Réinitialisation : {new Date(usage.periodEnd).toLocaleDateString("fr-FR")}
        </p>
      )}
    </div>
  );
}
