// ============================================================
// DynamicSheetLayout — Main layout for fiche_dynamique
// ============================================================

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { M5_Output } from "@/domain/cognitio/generation.contracts";
import { PedagogicalContractBlock } from "./PedagogicalContractBlock";
import { HookBlock } from "./HookBlock";
import { AnchorMapBlock } from "./AnchorMapBlock";
import { PedagogicalSegmentBlock } from "./PedagogicalSegmentBlock";
import { InlineRecallCard } from "./InlineRecallCard";
import { ClarityPeakBlock } from "./ClarityPeakBlock";
import { ConsolidationBlock } from "./ConsolidationBlock";
import { FinalTestBlock } from "./FinalTestBlock";
import { SourceDisclaimerBlock } from "./SourceDisclaimerBlock";
import { CoverageBadge } from "./CoverageBadge";

interface DynamicSheetLayoutProps {
  output: M5_Output;
}

export function DynamicSheetLayout({ output }: DynamicSheetLayoutProps) {
  const { content_blocks, final_test, source_disclaimer, metadata } = output;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleBlock = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Progress indicator
  const totalBlocks = content_blocks.length;

  return (
    <div className="space-y-6">
      {/* Coverage badge */}
      <CoverageBadge coverage={metadata.coverage} qualityFlags={metadata.quality_flags} />

      {/* Render blocks in order */}
      {content_blocks.map((block, index) => {
        const isCollapsed = collapsed.has(block.block_id);
        const progress = Math.round(((index + 1) / totalBlocks) * 100);

        return (
          <motion.div
            key={block.block_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {/* Progress bar */}
            <div className="h-0.5 bg-muted/30 mb-4">
              <div className="h-0.5 bg-primary/20 transition-all" style={{ width: `${progress}%` }} />
            </div>

            {/* Collapsible header */}
            <button
              className="flex items-center gap-2 w-full text-left mb-2 group"
              onClick={() => toggleBlock(block.block_id)}
            >
              {isCollapsed
                ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {blockTypeLabel(block.type)}
              </span>
            </button>

            {!isCollapsed && (
              <>
                {block.type === "contract" && <PedagogicalContractBlock block={block} />}
                {block.type === "hook" && <HookBlock block={block} />}
                {block.type === "anchor_map" && <AnchorMapBlock block={block} />}
                {block.type === "pedagogical" && <PedagogicalSegmentBlock block={block} />}
                {block.type === "reactivation" && <InlineRecallCard block={block} />}
                {block.type === "clarity_peak" && <ClarityPeakBlock block={block} />}
                {block.type === "consolidation" && <ConsolidationBlock block={block} />}
                {block.type === "final_test" && <FinalTestBlock items={final_test} block={block} />}
                {block.type === "disclaimer" && <SourceDisclaimerBlock disclaimer={source_disclaimer} />}
              </>
            )}
          </motion.div>
        );
      })}

      {/* Bottom disclaimer if not already rendered as block */}
      {!content_blocks.some(b => b.type === "disclaimer") &&
        (source_disclaimer.uncertain_concepts.length > 0 || source_disclaimer.ambiguities.length > 0) && (
          <SourceDisclaimerBlock disclaimer={source_disclaimer} />
        )}
    </div>
  );
}

function blockTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    contract: "Contrat pédagogique",
    hook: "Accroche",
    anchor_map: "Carte mentale",
    pedagogical: "Bloc pédagogique",
    reactivation: "Rappel actif",
    clarity_peak: "Pic de clarté",
    consolidation: "Consolidation",
    final_test: "Test final",
    disclaimer: "Avertissement",
  };
  return labels[type] ?? type;
}
