import { Info, AlertTriangle } from "lucide-react";
import type { FallbackMode, QualityBand } from "@/domain/cognitio/types";
import { getFallbackModeLabel, getQualityBandLabel, getQualityBandBg } from "@/lib/cognitio-ui";

interface FallbackNoticeProps {
  fallbackMode: FallbackMode;
  qualityBand: QualityBand;
  qualityScore: number;
}

export default function FallbackNotice({
  fallbackMode,
  qualityBand,
  qualityScore,
}: FallbackNoticeProps) {
  if (fallbackMode === "full") return null;

  const isWarning = fallbackMode === "synthesis_only" || fallbackMode === "minimal";

  return (
    <div
      className={`p-4 rounded-xl border-l-4 ${
        isWarning
          ? "bg-orange-500/5 border-orange-500/50"
          : "bg-blue-500/5 border-blue-500/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {isWarning ? (
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
        ) : (
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="text-sm font-medium">
            {getFallbackModeLabel(fallbackMode)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {getFallbackExplanation(fallbackMode, qualityScore)}
          </p>
          <div className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-xs border ${getQualityBandBg(qualityBand)}`}>
            Qualité source: {getQualityBandLabel(qualityBand)} ({Math.round(qualityScore * 100)}%)
          </div>
        </div>
      </div>
    </div>
  );
}

function getFallbackExplanation(mode: FallbackMode, score: number): string {
  switch (mode) {
    case "full_with_alerts":
      return "La mission est complète mais certains éléments du contenu source nécessitent votre attention.";
    case "reduced":
      return "La qualité du contenu source est moyenne. La mission a été réduite à 3 salles sans boss pour garantir la fiabilité.";
    case "minimal":
      return "Le contenu source est limité. Seules 2 salles basiques ont été générées. Envisagez d'enrichir votre document.";
    case "synthesis_only":
      return "Le contenu source est insuffisant pour générer une mission interactive. Une synthèse des concepts identifiés est proposée à la place.";
    default:
      return "";
  }
}
