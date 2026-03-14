// ============================================================
// ClarityPeakBlock — Block type "clarity_peak"
// ============================================================

import { Sparkles } from "lucide-react";
import type { ContentBlock } from "@/domain/cognitio/generation.types";

interface Props {
  block: ContentBlock;
}

export function ClarityPeakBlock({ block }: Props) {
  return (
    <div className="border rounded-lg p-5 bg-gradient-to-br from-violet-50 to-blue-50 border-violet-200 space-y-3">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-600" />
        {block.title}
      </h2>
      <div className="text-sm text-violet-900 leading-relaxed whitespace-pre-line">
        {block.content}
      </div>
    </div>
  );
}
