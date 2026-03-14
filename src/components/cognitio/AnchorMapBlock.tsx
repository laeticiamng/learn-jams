// ============================================================
// AnchorMapBlock — Block type "anchor_map"
// ============================================================

import { Map } from "lucide-react";
import type { ContentBlock } from "@/domain/cognitio/generation.types";

interface Props {
  block: ContentBlock;
}

export function AnchorMapBlock({ block }: Props) {
  return (
    <div className="border rounded-lg p-4 bg-blue-50/50 space-y-2">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <Map className="h-4 w-4 text-blue-600" />
        {block.title}
      </h2>
      <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed font-mono">
        {block.content}
      </div>
    </div>
  );
}
