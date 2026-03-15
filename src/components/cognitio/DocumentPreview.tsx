// ============================================================
// DocumentPreview — Shows raw vs cleaned text, segments, noise
// Displayed after M1 ingestion to let users see what the
// pipeline understood from their document before analysis.
// ============================================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  FileText,
  Eye,
  Layers,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { M1_Output } from "@/domain/cognitio/contracts";

type PreviewTab = "cleaned" | "segments" | "issues";

interface DocumentPreviewProps {
  m1Output: M1_Output;
  /** Optional raw text estimate (from segments concatenation) */
  rawTextEstimate?: number;
}

export function DocumentPreview({ m1Output, rawTextEstimate }: DocumentPreviewProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PreviewTab>("cleaned");
  const [expanded, setExpanded] = useState(true);

  const noiseChars = rawTextEstimate
    ? Math.max(0, rawTextEstimate - m1Output.clean_text.length)
    : 0;
  const noisePct = rawTextEstimate && rawTextEstimate > 0
    ? ((noiseChars / rawTextEstimate) * 100).toFixed(1)
    : "0";

  const issueCount = m1Output.issues.length;
  const warningCount = m1Output.issues.filter(i => i.severity === "warning").length;
  const blockingCount = m1Output.issues.filter(i => i.severity === "blocking").length;

  const tabs: { key: PreviewTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      key: "cleaned",
      label: t("doc_preview.tab_cleaned", "Texte nettoyé"),
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
    {
      key: "segments",
      label: t("doc_preview.tab_segments", "Sections"),
      icon: <Layers className="w-3.5 h-3.5" />,
      badge: m1Output.segments.length,
    },
    {
      key: "issues",
      label: t("doc_preview.tab_issues", "Alertes"),
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      badge: issueCount > 0 ? issueCount : undefined,
    },
  ];

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Eye className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">
            {t("doc_preview.title", "Aperçu du document")}
          </span>
          <span className="text-xs text-muted-foreground">
            {m1Output.word_count} {t("doc_preview.words", "mots")} &middot; {m1Output.segments.length} {t("doc_preview.sections", "sections")}
            {noiseChars > 0 && (
              <> &middot; {noisePct}% {t("doc_preview.noise", "bruit retiré")}</>
            )}
          </span>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {/* Stats bar */}
          <div className="px-4 pb-3 flex flex-wrap gap-3 text-xs">
            <StatBadge
              label={t("doc_preview.stat_words", "Mots")}
              value={m1Output.word_count.toLocaleString()}
            />
            <StatBadge
              label={t("doc_preview.stat_chars", "Caractères")}
              value={m1Output.clean_text.length.toLocaleString()}
            />
            <StatBadge
              label={t("doc_preview.stat_confidence", "Confiance")}
              value={`${Math.round(m1Output.confidence_level * 100)}%`}
              variant={m1Output.confidence_level >= 0.7 ? "success" : m1Output.confidence_level >= 0.4 ? "warning" : "error"}
            />
            <StatBadge
              label={t("doc_preview.stat_language", "Langue")}
              value={m1Output.language.toUpperCase()}
            />
            {noiseChars > 0 && (
              <StatBadge
                label={t("doc_preview.stat_noise", "Bruit")}
                value={`${noisePct}%`}
                variant="warning"
              />
            )}
            {blockingCount > 0 && (
              <StatBadge
                label={t("doc_preview.stat_blocking", "Blocages")}
                value={String(blockingCount)}
                variant="error"
              />
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border/30 px-4 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.key
                    ? "bg-muted/40 text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge != null && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    tab.key === "issues" && tab.badge > 0
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      : "bg-muted/50 text-muted-foreground"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === "cleaned" && (
              <CleanedTextView text={m1Output.clean_text} />
            )}
            {activeTab === "segments" && (
              <SegmentsView segments={m1Output.segments} />
            )}
            {activeTab === "issues" && (
              <IssuesView issues={m1Output.issues} />
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ---------- Sub-components ----------

function StatBadge({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "success" | "warning" | "error";
}) {
  const colors = {
    default: "bg-muted/30 text-muted-foreground",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${colors[variant]}`}>
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function CleanedTextView({ text }: { text: string }) {
  const { t } = useTranslation();
  const [showFull, setShowFull] = useState(false);
  const previewLength = 1500;
  const isLong = text.length > previewLength;
  const displayText = showFull ? text : text.slice(0, previewLength);

  return (
    <div>
      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-80 overflow-y-auto bg-muted/10 rounded-lg p-3">
        {displayText}
        {isLong && !showFull && "..."}
      </pre>
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-xs"
          onClick={() => setShowFull(!showFull)}
        >
          {showFull
            ? t("doc_preview.show_less", "Réduire")
            : t("doc_preview.show_more", "Voir tout le texte")}
        </Button>
      )}
    </div>
  );
}

function SegmentsView({ segments }: { segments: M1_Output["segments"] }) {
  const { t } = useTranslation();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (segments.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("doc_preview.no_segments", "Aucune section détectée.")}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {segments.map((seg) => (
        <div
          key={seg.segment_index}
          className="rounded-lg border border-border/20 overflow-hidden"
        >
          <button
            onClick={() => setExpandedIdx(expandedIdx === seg.segment_index ? null : seg.segment_index)}
            className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/20 transition-colors"
          >
            <Hash className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium flex-1 truncate">
              {seg.title || t("doc_preview.untitled_segment", "Section sans titre")}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              L{seg.hierarchy_level} &middot; {seg.content.length} car.
              &middot; {Math.round(seg.confidence_score * 100)}%
            </span>
            {expandedIdx === seg.segment_index ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
          </button>
          {expandedIdx === seg.segment_index && (
            <div className="px-3 pb-3">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto bg-muted/10 rounded p-2">
                {seg.content.slice(0, 800)}
                {seg.content.length > 800 && "..."}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function IssuesView({ issues }: { issues: M1_Output["issues"] }) {
  const { t } = useTranslation();

  if (issues.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          {t("doc_preview.no_issues", "Aucune alerte détectée.")}
        </p>
      </div>
    );
  }

  const severityColors = {
    info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
    warning: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300",
    blocking: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300",
  };

  const severityIcons = {
    info: <FileText className="w-3.5 h-3.5 shrink-0" />,
    warning: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
    blocking: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
  };

  return (
    <div className="space-y-2">
      {issues.map((issue, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${severityColors[issue.severity]}`}
        >
          {severityIcons[issue.severity]}
          <div className="flex-1">
            <span className="font-medium">[{issue.code}]</span> {issue.message}
          </div>
        </div>
      ))}
    </div>
  );
}
