// ============================================================
// DominantModeSelector — "What's your main usage this month?"
// ============================================================

import { useTranslation } from "react-i18next";
import { Music, Gamepad2, FileText, Video, Shuffle } from "lucide-react";
import type { DominantMode } from "@/domain/billing/adaptiveCredits.types";

interface DominantModeSelectorProps {
  currentMode: DominantMode;
  onSelect: (mode: DominantMode) => void;
}

const MODES: { key: DominantMode; icon: typeof Music; labelKey: string }[] = [
  { key: "songs", icon: Music, labelKey: "adaptive.mode_songs" },
  { key: "missions", icon: Gamepad2, labelKey: "adaptive.mode_missions" },
  { key: "sheets", icon: FileText, labelKey: "adaptive.mode_sheets" },
  { key: "video", icon: Video, labelKey: "adaptive.mode_video" },
  { key: "mixed", icon: Shuffle, labelKey: "adaptive.mode_mixed" },
];

export function DominantModeSelector({ currentMode, onSelect }: DominantModeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">
        {t("adaptive.mode_question", { defaultValue: "Quel usage te correspond le mieux ce mois-ci ?" })}
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {MODES.map(({ key, icon: Icon, labelKey }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs font-medium ${
              currentMode === key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/30 text-muted-foreground hover:border-primary/30 hover:bg-muted/20"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{t(labelKey, { defaultValue: key })}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {t("adaptive.mode_hint", { defaultValue: "Ajuste une partie de tes crédits flexibles sans impacter tes quotas fixes." })}
      </p>
    </div>
  );
}
