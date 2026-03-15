// ============================================================
// DocumentQualityPanel — Full quality/reliability/confidence view
// Shows what the engine understood and what's uncertain.
// Includes pre-analysis scoring (quality, noise, readiness).
// ============================================================

import { Shield, FileText, Globe, Layers, BarChart3, AlertCircle, Info, Ban, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { M1_Output, M2_Output, SourceIssue, AnalysisConfidence } from "@/domain/cognitio/contracts";
import { formatSourceType, formatStructureType, formatReasoningType, formatWordCount, formatLanguage, formatConfidence, getConfidenceColor, formatAnalysisConfidence } from "@/lib/cognitio-formatters";
import { getQualityBandLabel, getQualityBandBg } from "@/lib/cognitio-ui";
import { getQualityBand } from "@/domain/cognitio/validators";

// ---------- Pre-analysis scoring (computed from M1 output only) ----------

interface PreAnalysisScores {
  /** Overall document quality: 0-1 */
  document_quality: number;
  /** Noise level: 0-1 (higher = more noise) */
  noise_score: number;
  /** Analysis readiness: 0-1 (whether the document is ready for concept extraction) */
  readiness_score: number;
}

function computePreAnalysisScores(m1: M1_Output): PreAnalysisScores {
  // --- Document quality ---
  // Based on confidence, word count adequacy, and issue severity
  let quality = m1.confidence_level;

  // Penalize very short documents
  if (m1.word_count < 50) quality *= 0.3;
  else if (m1.word_count < 150) quality *= 0.6;
  else if (m1.word_count < 300) quality *= 0.85;

  // Penalize blocking issues heavily
  const blockingCount = m1.issues.filter(i => i.severity === "blocking").length;
  const warningCount = m1.issues.filter(i => i.severity === "warning").length;
  quality *= Math.max(0, 1 - blockingCount * 0.4 - warningCount * 0.1);

  // Bonus for good structure
  if (m1.segments.length >= 2) quality = Math.min(1, quality * 1.1);

  // --- Noise score ---
  // Estimate noise from segment confidence variance and low-confidence segments
  const avgSegConfidence = m1.segments.length > 0
    ? m1.segments.reduce((s, seg) => s + seg.confidence_score, 0) / m1.segments.length
    : m1.confidence_level;
  const lowConfSegments = m1.segments.filter(s => s.confidence_score < 0.5).length;
  const lowConfRatio = m1.segments.length > 0 ? lowConfSegments / m1.segments.length : 0;
  const noise = Math.min(1, (1 - avgSegConfidence) * 0.6 + lowConfRatio * 0.4);

  // --- Readiness score ---
  // Is this document ready for concept extraction?
  let readiness = 1;
  if (blockingCount > 0) readiness = 0;
  else {
    if (m1.word_count < 50) readiness *= 0.1;
    else if (m1.word_count < 100) readiness *= 0.4;
    readiness *= Math.max(0.2, quality);
    readiness *= Math.max(0.3, 1 - noise * 0.5);
  }

  return {
    document_quality: Math.max(0, Math.min(1, quality)),
    noise_score: Math.max(0, Math.min(1, noise)),
    readiness_score: Math.max(0, Math.min(1, readiness)),
  };
}

// ---------- Component ----------

interface DocumentQualityPanelProps {
  m1Output: M1_Output;
  m2Output?: M2_Output | null;
}

export function DocumentQualityPanel({ m1Output, m2Output }: DocumentQualityPanelProps) {
  const qualityBand = getQualityBand(m1Output.confidence_level);
  const preScores = computePreAnalysisScores(m1Output);

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

      {/* Pre-analysis scores */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5" />
          Scores pré-analyse
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <ScoreBar
            label="Qualité"
            value={preScores.document_quality}
            colorFn={(v) => v >= 0.7 ? "bg-green-500" : v >= 0.4 ? "bg-yellow-500" : "bg-red-500"}
          />
          <ScoreBar
            label="Bruit"
            value={preScores.noise_score}
            colorFn={(v) => v <= 0.3 ? "bg-green-500" : v <= 0.6 ? "bg-yellow-500" : "bg-red-500"}
            inverted
          />
          <ScoreBar
            label="Prêt"
            value={preScores.readiness_score}
            colorFn={(v) => v >= 0.7 ? "bg-green-500" : v >= 0.4 ? "bg-yellow-500" : "bg-red-500"}
          />
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

function ScoreBar({
  label,
  value,
  colorFn,
  inverted,
}: {
  label: string;
  value: number;
  colorFn: (v: number) => string;
  inverted?: boolean;
}) {
  const pct = Math.round(value * 100);
  const displayLabel = inverted ? `${pct}%` : `${pct}%`;

  return (
    <div className="p-2 bg-muted/20 rounded-lg">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
        <span className="text-[10px] font-mono font-bold">{displayLabel}</span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorFn(value)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
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
