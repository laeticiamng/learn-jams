import { Brain, BookOpen, AlertTriangle, Zap } from "lucide-react";
import type { AnalyzeOutput } from "@/domain/cognitio/contracts";
import SourceReliabilityBadge from "./SourceReliabilityBadge";
import AmbiguityWarning from "./AmbiguityWarning";
import { getQualityBand } from "@/domain/cognitio/validators";

interface AnalysisPreviewCardProps {
  analysis: AnalyzeOutput;
  qualityScore: number;
}

export default function AnalysisPreviewCard({ analysis, qualityScore }: AnalysisPreviewCardProps) {
  const band = getQualityBand(qualityScore);

  return (
    <div className="space-y-4">
      <div className="glass-card-elevated p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> Analyse du contenu
          </h3>
          <SourceReliabilityBadge score={qualityScore} qualityBand={band} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Concepts"
            value={analysis.total_concepts}
            icon={<BookOpen className="w-3.5 h-3.5" />}
          />
          <MetricCard
            label="Critiques"
            value={analysis.critical_count}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            accent
          />
          <MetricCard
            label="Paires confusion"
            value={analysis.confusion_pairs.length}
            icon={<Zap className="w-3.5 h-3.5" />}
          />
          <MetricCard
            label="Complexité"
            value={`${analysis.estimated_complexity}/10`}
            icon={<Brain className="w-3.5 h-3.5" />}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {analysis.knowledge_type}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted/20 text-muted-foreground">
            {analysis.structure_type}
          </span>
        </div>

        {/* Top concepts preview */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Concepts principaux :</p>
          {analysis.concepts.slice(0, 5).map((c) => (
            <div key={c.stable_key} className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${
                c.criticality === 1
                  ? "bg-red-500"
                  : c.criticality === 2
                    ? "bg-orange-500"
                    : "bg-blue-500"
              }`} />
              <span className="font-medium">{c.label}</span>
              <span className="text-xs text-muted-foreground">
                ({c.bloom_target})
              </span>
            </div>
          ))}
          {analysis.concepts.length > 5 && (
            <p className="text-xs text-muted-foreground">
              +{analysis.concepts.length - 5} autres concepts
            </p>
          )}
        </div>
      </div>

      <AmbiguityWarning zones={analysis.ambiguous_zones} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg bg-card/50 border border-border/10">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-lg font-bold tabular-nums ${accent ? "text-orange-500" : ""}`}>
        {value}
      </p>
    </div>
  );
}
