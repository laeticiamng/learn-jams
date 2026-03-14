// ============================================================
// PedagogicalSegmentBlock — Block type "pedagogical"
// ============================================================

import { BookOpen, Eye, AlertTriangle, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContentBlock } from "@/domain/cognitio/generation.types";
import { ContrastBox } from "./ContrastBox";
import { VisualAnchorCard } from "./VisualAnchorCard";

interface Props {
  block: ContentBlock;
}

export function PedagogicalSegmentBlock({ block }: Props) {
  return (
    <div className="border rounded-lg p-5 space-y-4">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        {block.title}
      </h2>

      {/* Concept badges */}
      {block.concepts_covered.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {block.concepts_covered.map(key => (
            <Badge key={key} variant="secondary" className="text-xs">
              {key}
            </Badge>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="text-sm leading-relaxed whitespace-pre-line prose prose-sm max-w-none">
        {block.content}
      </div>

      {/* Visual anchor */}
      {block.visual_anchor && (
        <VisualAnchorCard anchor={block.visual_anchor} />
      )}

      {/* Contrast box */}
      {block.contrast_box && (
        <ContrastBox contrast={block.contrast_box} />
      )}

      {/* Mnemonic */}
      {block.mnemonic && (
        <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
          <Lightbulb className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-purple-800 uppercase">{block.mnemonic.type}</p>
            <p className="text-sm font-mono text-purple-900">{block.mnemonic.content}</p>
          </div>
        </div>
      )}
    </div>
  );
}
