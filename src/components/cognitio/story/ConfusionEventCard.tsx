// ============================================================
// ConfusionEventCard — Displays a confusion event in narrative
// ============================================================

import { AlertTriangle } from "lucide-react";
import type { ConfusionEvent } from "@/domain/cognitio/story.types";

interface ConfusionEventCardProps {
  event: ConfusionEvent;
}

export function ConfusionEventCard({ event }: ConfusionEventCardProps) {
  return (
    <div className="border border-orange-200 rounded-lg p-3 bg-orange-50/50">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-medium text-orange-800">Attention — Confusion fréquente</p>
          <p className="text-sm text-orange-700">{event.error_made}</p>
          <div className="border-t border-orange-200 pt-2 mt-2">
            <p className="text-xs font-medium text-orange-800">Correction :</p>
            <p className="text-sm text-orange-700">{event.correction}</p>
          </div>
          <p className="text-xs text-orange-500 mt-1">
            Distinction clé : {event.distinction_key}
          </p>
        </div>
      </div>
    </div>
  );
}
