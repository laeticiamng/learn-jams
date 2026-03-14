// ============================================================
// HookBlock — Block type "hook"
// ============================================================

import { Zap } from "lucide-react";
import type { ContentBlock } from "@/domain/cognitio/generation.types";

interface Props {
  block: ContentBlock;
}

export function HookBlock({ block }: Props) {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Zap className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm font-medium text-amber-900 leading-relaxed">
          {block.content}
        </p>
      </div>
    </div>
  );
}
