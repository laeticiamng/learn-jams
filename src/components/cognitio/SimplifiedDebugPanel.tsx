// ============================================================
// SimplifiedDebugPanel — Dual-mode debug panel (user/dev)
// User mode: clean summary of pipeline results.
// Dev mode: full diagnostic trace with all counters.
// ============================================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug,
  Eye,
  Code2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Shield,
  Brain,
  Layers,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PipelineDebugCounters } from "@/domain/cognitio/contracts";

interface SimplifiedDebugPanelProps {
  counters: PipelineDebugCounters;
}

type DebugMode = "user" | "dev";

export function SimplifiedDebugPanel({ counters }: SimplifiedDebugPanelProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<DebugMode>("user");
  const [expanded, setExpanded] = useState(false);

  const isSuccess = counters.final_generation_status === "success";
  const isError = counters.final_generation_status === "error" || counters.final_generation_status === "empty_generation";

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">
            {t("debug_panel.title", "Diagnostic pipeline")}
          </span>
          {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
          {isError && <XCircle className="w-3.5 h-3.5 text-red-500" />}
        </div>
        <div className="flex items-center gap-2">
          {expanded && (
            <div className="flex bg-muted/30 rounded-md p-0.5 gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMode("user")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  mode === "user" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="w-3 h-3" /> {t("debug_panel.mode_user", "Résumé")}
              </button>
              <button
                onClick={() => setMode("dev")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  mode === "dev" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code2 className="w-3 h-3" /> {t("debug_panel.mode_dev", "Détails")}
              </button>
            </div>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {mode === "user" ? (
                <UserModeView counters={counters} />
              ) : (
                <DevModeView counters={counters} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- User Mode ----------

function UserModeView({ counters }: { counters: PipelineDebugCounters }) {
  const { t } = useTranslation();

  const steps = [
    {
      icon: <Layers className="w-3.5 h-3.5" />,
      label: t("debug_panel.step_import", "Import"),
      detail: `${counters.detected_sections_count} sections, ${counters.raw_text_length.toLocaleString()} car.`,
      ok: counters.detected_sections_count > 0,
    },
    {
      icon: <Brain className="w-3.5 h-3.5" />,
      label: t("debug_panel.step_analysis", "Analyse"),
      detail: `${counters.extracted_concepts_after_filter_count} concepts (${counters.extracted_concepts_raw_count} bruts)`,
      ok: counters.extracted_concepts_after_filter_count > 0,
      warning: counters.extracted_concepts_after_filter_count === 0 && counters.cleaned_text_length > 50
        ? t("debug_panel.no_concepts_warning", "Aucun concept extrait")
        : undefined,
    },
    {
      icon: <Shield className="w-3.5 h-3.5" />,
      label: t("debug_panel.step_gate", "Validation"),
      detail: counters.semantic_gate_passed
        ? t("debug_panel.gate_passed", "Gate sémantique passée")
        : counters.semantic_gate_status ?? "—",
      ok: counters.semantic_gate_passed === true,
      warning: !counters.semantic_gate_passed && counters.semantic_gate_block_reasons
        ? counters.semantic_gate_block_reasons.join(", ")
        : undefined,
    },
    {
      icon: <Sparkles className="w-3.5 h-3.5" />,
      label: t("debug_panel.step_generation", "Génération"),
      detail: counters.final_format_decision || "—",
      ok: counters.generation_success === true,
      warning: counters.generation_error || undefined,
    },
  ];

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div
          key={i}
          className={`flex items-start gap-2.5 p-2.5 rounded-lg text-xs ${
            step.warning ? "bg-red-50 dark:bg-red-950/20" : step.ok ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/20"
          }`}
        >
          <span className={step.ok ? "text-green-600" : step.warning ? "text-red-500" : "text-muted-foreground"}>
            {step.icon}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{step.label}</span>
              {step.ok && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              {step.warning && <AlertTriangle className="w-3 h-3 text-red-500" />}
            </div>
            <p className="text-muted-foreground mt-0.5">{step.detail}</p>
            {step.warning && (
              <p className="text-red-600 dark:text-red-400 mt-0.5 text-[10px]">{step.warning}</p>
            )}
          </div>
        </div>
      ))}

      {/* Safeguards summary */}
      {(counters.front_matter_detected || counters.body_only_second_pass_triggered || counters.llm_fallback_triggered) && (
        <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-xs">
          <div className="flex items-center gap-1.5 mb-1">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-medium text-blue-800 dark:text-blue-300">
              {t("debug_panel.safeguards", "Mécanismes de sécurité activés")}
            </span>
          </div>
          <div className="space-y-0.5 text-muted-foreground pl-5">
            {counters.front_matter_detected && <p>Front matter détecté et isolé</p>}
            {counters.segment_0_quarantined && <p>Segment 0 mis en quarantaine</p>}
            {counters.body_only_second_pass_triggered && (
              <p>Second pass corps : {counters.body_only_second_pass_concepts_count ?? 0} concepts</p>
            )}
            {counters.llm_fallback_triggered && (
              <p>Fallback compréhension : {counters.llm_fallback_concepts_count ?? 0} concepts</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Dev Mode ----------

function DevModeView({ counters }: { counters: PipelineDebugCounters }) {
  return (
    <div className="space-y-3">
      {/* Raw counters */}
      <div className="bg-muted/10 rounded-lg p-3 text-[10px] font-mono space-y-0.5 max-h-60 overflow-y-auto">
        <DevLine label="raw_text_length" value={counters.raw_text_length} />
        <DevLine label="cleaned_text_length" value={counters.cleaned_text_length} />
        <DevLine label="canonical_text_preview" value={counters.canonical_text_preview?.slice(0, 100)} />
        <DevLine label="detected_sections" value={counters.detected_sections_count} />
        <DevLine label="raw_topic" value={counters.raw_topic} />
        <DevLine label="cleaned_topic" value={counters.cleaned_topic} />
        <DevLine label="m2_input_text_length" value={counters.m2_input_text_length} />
        <DevLine label="concepts_raw" value={counters.extracted_concepts_raw_count} />
        <DevLine label="concepts_filtered" value={counters.extracted_concepts_after_filter_count} />
        <DevLine label="concepts_rejected" value={counters.rejected_concepts_count} />
        <DevLine label="concepts_from_seg0" value={counters.concepts_from_segment_0_count} />
        <DevLine label="concepts_from_body" value={counters.concepts_from_body_count} />
        <DevLine label="valid_body_concepts" value={counters.valid_body_concepts_count} />
        <DevLine label="uncertain_body_concepts" value={counters.uncertain_body_concepts_count} />
        <DevLine label="editorial_body_concepts" value={counters.editorial_body_concepts_count} />
        <DevLine label="front_matter_detected" value={counters.front_matter_detected} />
        <DevLine label="segment_0_quarantined" value={counters.segment_0_quarantined} />
        <DevLine label="body_pass_triggered" value={counters.body_only_second_pass_triggered} />
        <DevLine label="body_pass_concepts" value={counters.body_only_second_pass_concepts_count} />
        <DevLine label="domain_before" value={counters.domain_before_body_pass} />
        <DevLine label="domain_after" value={counters.domain_after_body_pass} />
        <DevLine label="llm_fallback" value={counters.llm_fallback_triggered} />
        <DevLine label="llm_fallback_concepts" value={counters.llm_fallback_concepts_count} />
        <DevLine label="semantic_gate" value={counters.semantic_gate_status} />
        <DevLine label="semantic_gate_passed" value={counters.semantic_gate_passed} />
        <DevLine label="valid_concepts" value={counters.valid_concepts_count} />
        <DevLine label="uncertain_concepts" value={counters.uncertain_concepts_count} />
        <DevLine label="artifact_ratio" value={counters.editorial_artifact_ratio} />
        <DevLine label="format" value={counters.final_format_decision} />
        <DevLine label="generator" value={counters.generator_called} />
        <DevLine label="status" value={counters.final_generation_status} />
        <DevLine label="gate_reason" value={counters.success_gate_reason} />
        {counters.generation_error && <DevLine label="error" value={counters.generation_error} warn />}
      </div>

      {/* Reject reasons */}
      {counters.reject_reasons.length > 0 && (
        <div className="bg-muted/10 rounded-lg p-3">
          <p className="text-[10px] font-mono font-semibold text-muted-foreground mb-1">reject_reasons:</p>
          {counters.reject_reasons.map((r, i) => (
            <p key={i} className="text-[10px] font-mono text-muted-foreground pl-2">
              {r.reason}: {r.count}
            </p>
          ))}
        </div>
      )}

      {/* Pipeline trace */}
      {counters.pipeline_trace.length > 0 && (
        <div className="bg-muted/10 rounded-lg p-3">
          <p className="text-[10px] font-mono font-semibold text-muted-foreground mb-1">
            pipeline_trace ({counters.pipeline_trace.length} steps):
          </p>
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {counters.pipeline_trace.map((t, i) => (
              <div key={i} className={`text-[10px] font-mono ${t.warning ? "text-red-500" : "text-muted-foreground"}`}>
                [{t.step}] {t.input_length != null && `in=${t.input_length}`} {t.output_length != null && `out=${t.output_length}`} {t.detail && `| ${t.detail}`}
                {t.warning && ` | WARN: ${t.warning}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DevLine({
  label,
  value,
  warn,
}: {
  label: string;
  value?: string | number | boolean | null;
  warn?: boolean;
}) {
  if (value === undefined || value === null) return null;
  const displayValue = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
  return (
    <div className={`flex gap-1 ${warn ? "text-red-500" : "text-muted-foreground"}`}>
      <span className="opacity-70 shrink-0">{label}:</span>
      <span className="font-medium truncate">{displayValue}</span>
    </div>
  );
}
