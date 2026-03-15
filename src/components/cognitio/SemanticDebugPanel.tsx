// ============================================================
// SemanticDebugPanel — Displays extraction pipeline debug data
// showing what was kept, rejected, cleaned, reformulated
// ============================================================

import { motion } from "framer-motion";
import {
  Bug,
  FileText,
  Layers,
  Table2,
  Tag,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { SemanticDebugPanel as DebugPanelData } from "@/services/cognitio/semanticQualityEngine";
import type { SemanticQAScores } from "@/services/cognitio/semanticQualityEngine";

interface SemanticDebugPanelProps {
  debugPanel: DebugPanelData;
  qaScores?: SemanticQAScores;
}

export default function SemanticDebugPanelView({
  debugPanel,
  qaScores,
}: SemanticDebugPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bug className="w-4 h-4 text-purple-500" />
        <h3 className="text-sm font-bold">Debug — Pipeline d'extraction sémantique</h3>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            debugPanel.overall_quality_band === "excellent"
              ? "bg-green-500/10 text-green-600"
              : debugPanel.overall_quality_band === "good"
                ? "bg-blue-500/10 text-blue-600"
                : debugPanel.overall_quality_band === "medium"
                  ? "bg-yellow-500/10 text-yellow-600"
                  : "bg-red-500/10 text-red-600"
          }`}
        >
          {debugPanel.overall_quality_band}
        </span>
      </div>

      {/* Text metrics */}
      <Section icon={FileText} title="Texte">
        <Metric label="raw_text_length" value={debugPanel.raw_text_length} />
        <Metric label="cleaned_text_length" value={debugPanel.cleaned_text_length} />
        <Metric
          label="noise_removal_ratio"
          value={`${Math.round(debugPanel.noise_removal_ratio * 100)}%`}
        />
      </Section>

      {/* Structure */}
      <Section icon={Layers} title="Structure">
        <Metric label="detected_headers_count" value={debugPanel.detected_headers_count} />
        <Metric label="detected_sections_count" value={debugPanel.detected_sections_count} />
        <Metric label="max_hierarchy_depth" value={debugPanel.max_hierarchy_depth} />
      </Section>

      {/* Concepts */}
      <Section icon={Tag} title="Concepts">
        <Metric label="raw_concepts_count" value={debugPanel.raw_concepts_count} />
        <Metric
          label="normalized_concepts_count"
          value={debugPanel.normalized_concepts_count}
          good={debugPanel.normalized_concepts_count > 0}
        />
        <Metric
          label="rejected_concepts_count"
          value={debugPanel.rejected_concepts_count}
          warn={debugPanel.rejected_concepts_count > debugPanel.normalized_concepts_count}
        />
        <Metric
          label="concept_quality_score"
          value={`${Math.round(debugPanel.concept_quality_score * 100)}%`}
        />
        {debugPanel.reject_reasons.length > 0 && (
          <div className="mt-1">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">
              reject_reasons:
            </p>
            {debugPanel.reject_reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground ml-2">
                <XCircle className="w-3 h-3 text-red-400" />
                {r.reason}: {r.count}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Tables */}
      <Section icon={Table2} title="Tableaux">
        <Metric label="detected_tables_count" value={debugPanel.detected_tables_count} />
        <Metric label="extracted_table_blocks_count" value={debugPanel.extracted_table_blocks_count} />
      </Section>

      {/* Topic */}
      <Section icon={Sparkles} title="Sujet principal">
        <Metric label="main_topic_raw" value={`"${debugPanel.main_topic_raw}"`} />
        <Metric
          label="main_topic_clean"
          value={`"${debugPanel.main_topic_clean}"`}
          good
        />
        <Metric label="topic_source" value={debugPanel.topic_source} />
        <Metric
          label="rejected_candidates"
          value={debugPanel.topic_rejected_candidates_count}
        />
        <Metric
          label="semantic_confidence"
          value={`${Math.round(debugPanel.semantic_confidence * 100)}%`}
        />
      </Section>

      {/* QA Scores */}
      {qaScores && (
        <Section icon={CheckCircle} title="Scores QA sémantique">
          <QAScore label="topic_cleanliness" value={qaScores.topic_cleanliness_score} />
          <QAScore label="section_coverage" value={qaScores.section_coverage_score} />
          <QAScore label="table_extraction" value={qaScores.table_extraction_score} />
          <QAScore label="concept_normalization" value={qaScores.concept_normalization_score} />
          <QAScore label="semantic_relevance" value={qaScores.semantic_relevance_score} />
          <QAScore label="pedagogical_compression" value={qaScores.pedagogical_compression_score} />
          <div className="pt-1 mt-1 border-t">
            <QAScore label="overall_semantic_score" value={qaScores.overall_semantic_score} bold />
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FileText;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card p-3 rounded-lg space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <div className="space-y-0.5 pl-5">{children}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  good,
  warn,
}: {
  label: string;
  value: string | number;
  good?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-muted-foreground font-mono">{label}:</span>
      <span
        className={`font-medium ${
          warn ? "text-orange-500" : good ? "text-green-600" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function QAScore({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  const percent = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={`text-muted-foreground font-mono ${bold ? "font-bold" : ""}`}>
        {label}:
      </span>
      <div className="flex-1 h-1.5 bg-border/30 rounded-full overflow-hidden max-w-[80px]">
        <div
          className={`h-full rounded-full ${
            percent >= 70 ? "bg-green-500" : percent >= 50 ? "bg-yellow-500" : "bg-red-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`font-medium tabular-nums ${bold ? "font-bold" : ""}`}>
        {percent}%
      </span>
    </div>
  );
}
