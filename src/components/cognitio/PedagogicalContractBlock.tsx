// ============================================================
// PedagogicalContractBlock — Block type "contract"
// ============================================================

import { FileText } from "lucide-react";
import type { ContentBlock } from "@/domain/cognitio/generation.types";

interface Props {
  block: ContentBlock;
}

export function PedagogicalContractBlock({ block }: Props) {
  return (
    <div className="border-l-4 border-primary bg-primary/5 rounded-r-lg p-4 space-y-2">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        {block.title}
      </h2>
      <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
        {block.content}
      </div>
    </div>
  );
}
