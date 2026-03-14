// ============================================================
// ConsolidationBlock — Block type "consolidation"
// ============================================================

import { Shield, Lightbulb } from "lucide-react";
import type { ContentBlock } from "@/domain/cognitio/generation.types";

interface Props {
  block: ContentBlock;
}

export function ConsolidationBlock({ block }: Props) {
  return (
    <div className="border-2 border-primary/30 rounded-lg p-5 bg-primary/5 space-y-3">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        {block.title}
      </h2>
      <div className="text-sm leading-relaxed whitespace-pre-line prose prose-sm max-w-none">
        {block.content}
      </div>

      {block.mnemonic && (
        <div className="flex items-start gap-2 bg-white border rounded-lg p-3">
          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">{block.mnemonic.type}</p>
            <p className="text-sm font-mono font-bold">{block.mnemonic.content}</p>
          </div>
        </div>
      )}
    </div>
  );
}
