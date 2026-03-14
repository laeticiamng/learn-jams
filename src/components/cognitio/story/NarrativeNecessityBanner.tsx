// ============================================================
// NarrativeNecessityBanner — Warn when narrative is a revert candidate
// ============================================================

import { AlertTriangle } from "lucide-react";
import type { NarrativeNecessityCheck } from "@/domain/cognitio/story.types";

interface NarrativeNecessityBannerProps {
  necessity: NarrativeNecessityCheck;
}

export function NarrativeNecessityBanner({ necessity }: NarrativeNecessityBannerProps) {
  if (!necessity.revert_candidate) return null;

  return (
    <div className="border border-orange-200 bg-orange-50 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-orange-800">
            Format narratif non indispensable
          </p>
          <p className="text-xs text-orange-600 mt-0.5">
            Le moteur a estimé qu'une fiche dynamique serait plus adaptée pour ce contenu.
            L'histoire a été générée mais pourrait être moins efficace qu'une fiche structurée.
          </p>
          <p className="text-xs text-orange-500 mt-1 italic">
            {necessity.reason}
          </p>
        </div>
      </div>
    </div>
  );
}
