import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { QualityBand } from "@/domain/cognitio/types";
import { getQualityBandLabel, getQualityBandBg } from "@/lib/cognitio-ui";

interface SourceReliabilityBadgeProps {
  score: number;
  qualityBand: QualityBand;
  showLabel?: boolean;
}

export default function SourceReliabilityBadge({
  score,
  qualityBand,
  showLabel = true,
}: SourceReliabilityBadgeProps) {
  const Icon = getIcon(qualityBand);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getQualityBandBg(qualityBand)}`}
      title={`Score de fiabilité source: ${Math.round(score * 100)}%`}
    >
      <Icon className="w-3.5 h-3.5" />
      {showLabel && (
        <span>{getQualityBandLabel(qualityBand)} ({Math.round(score * 100)}%)</span>
      )}
    </div>
  );
}

function getIcon(band: QualityBand) {
  switch (band) {
    case "excellent":
    case "good":
      return ShieldCheck;
    case "medium":
      return Shield;
    case "poor":
      return ShieldQuestion;
    case "unusable":
      return ShieldAlert;
  }
}
