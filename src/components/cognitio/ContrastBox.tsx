// ============================================================
// ContrastBox — X ≠ Y distinction display
// ============================================================

import { AlertTriangle } from "lucide-react";
import type { ContrastBox as ContrastBoxType } from "@/domain/cognitio/generation.types";

interface Props {
  contrast: ContrastBoxType;
}

export function ContrastBox({ contrast }: Props) {
  return (
    <div className="border-2 border-orange-300 bg-orange-50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <span className="text-xs font-semibold text-orange-800 uppercase">Attention : ne pas confondre</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="font-semibold text-orange-900">{contrast.concept_a}</span>
        <span className="text-orange-500 font-bold text-lg">≠</span>
        <span className="font-semibold text-orange-900">{contrast.concept_b}</span>
      </div>
      <p className="text-xs text-orange-700 mt-1">
        Distinction : {contrast.distinction_key}
      </p>
    </div>
  );
}
