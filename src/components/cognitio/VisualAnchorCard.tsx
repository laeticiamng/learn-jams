// ============================================================
// VisualAnchorCard — Visual anchor inside a block
// ============================================================

import { Eye } from "lucide-react";
import type { VisualAnchorInBlock } from "@/domain/cognitio/generation.types";

interface Props {
  anchor: VisualAnchorInBlock;
}

export function VisualAnchorCard({ anchor }: Props) {
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-indigo-600" />
        <span className="text-xs font-semibold text-indigo-800 uppercase">Ancrage visuel</span>
      </div>
      <p className="text-sm text-indigo-900 italic">{anchor.image_desc}</p>
      <p className="text-sm font-medium text-indigo-800">{anchor.verbal_formula}</p>
    </div>
  );
}
