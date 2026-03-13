// ============================================================
// DocumentQualityPanel — Full quality/reliability/confidence view
// Shows what the engine understood and what's uncertain
// ============================================================

import { Shield, FileText, Globe, Layers, BarChart3, AlertCircle, Info, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { M1_Output, M2_Output, SourceIssue, AnalysisConfidence } from "@/domain/cognitio/contracts";
import { formatSourceType, formatStructureType, formatReasoningType, formatWordCount, formatLanguage, formatConfidence, getConfidenceColor, formatAnalysisConfidence } from "@/lib/cognitio-formatters";
import { getQualityBandLabel, getQualityBandBg } from "@/lib/cognitio-ui";
import { getQualityBand } from "@/domain/cognitio/validators";

interface DocumentQualityPanelProps {
  m1Output: M1_Output;
  m2Output?: M2_Output | null;
}

export function DocumentQualityPanel({ m1Output, m2Output }: DocumentQualityPanelProps) {
  const qualityBand = getQualityBand(m1Output.confidence_level);

  return (
    <div className="space-y-4">
      {/* Quality badge */}
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${getQualityBandBg(qualityBand)}`}>
        <Shield className="h-5 w-5" />
        <div>
          <p className="text-sm font-semibold">Qualité source : {getQualityBandLabel(qualityBand)}</p>
          <p className="text-xs text-muted-foreground">
            Confiance : {Math.round(m1Output.confidence_level * 100)}%
          </p>
        </div>
      </div>

      {/* Document info grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Type de source</p>
            <p className="font-medium">{formatSourceType(m1Output.source_type)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Langue</p>
            <p className="font-medium">{formatLanguage(m1Output.language)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Structure</p>
            <p className="font-medium">{formatStructureType(m1Output.detected_structure)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Volume</p>
            <p className="font-medium">{formatWordCount(m1Output.word_count)} &middot; {m1Output.segments.length} segments</p>
          </div>
        </div>
      </div>

      {/* M2 confidence axes */}
      {m2Output && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Axes de confiance</h4>
          <div className="grid grid-cols-2 gap-2">
            {formatAnalysisConfidence(m2Output.confidence).map((axis) => (
              <div key={axis.label} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span className="text-xs">{axis.label}</span>
                <span className={`text-xs font-mono font-semibold ${axis.color}`}>{axis.description}</span>
              </div>
            ))}
          </div>

          {m2Output.reasoning_type && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs">Logique dominante :</span>
              <Badge variant="secondary" className="text-xs">{formatReasoningType(m2Output.reasoning_type)}</Badge>
            </div>
          )}

          {m2Output.main_topic && (
            <div className="text-sm">
              <span className="text-muted-foreground text-xs">Sujet principal : </span>
              <span className="font-medium">{m2Output.main_topic}</span>
            </div>
          )}
        </div>
      )}

      {/* Issues */}
      {m1Output.issues.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alertes</h4>
          {m1Output.issues.map((issue, i) => (
            <IssueRow key={i} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: SourceIssue }) {
  const icon = issue.severity === "blocking"
    ? <Ban className="h-3 w-3 text-red-500" />
    : issue.severity === "warning"
      ? <AlertCircle className="h-3 w-3 text-yellow-500" />
      : <Info className="h-3 w-3 text-blue-400" />;

  const bg = issue.severity === "blocking"
    ? "bg-red-50 border-red-200"
    : issue.severity === "warning"
      ? "bg-yellow-50 border-yellow-200"
      : "bg-blue-50 border-blue-200";

  return (
    <div className={`flex items-start gap-2 p-2 rounded border text-xs ${bg}`}>
      {icon}
      <div>
        <span className="font-medium">{issue.code}</span>
        <span className="text-muted-foreground ml-1">— {issue.message}</span>
      </div>
    </div>
  );
}
