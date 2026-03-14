// ============================================================
// QAChecklistPanel — Detailed QA checklist results
// ============================================================

import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert } from "lucide-react";
import type { QAReport } from "@/domain/cognitio/qa.types";
import { QABadge } from "./QABadge";

interface QAChecklistPanelProps {
  report: QAReport;
}

export function QAChecklistPanel({ report }: QAChecklistPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Contrôle qualité (M7)</h3>
        <QABadge status={report.qa_status} score={report.qa_score} />
      </div>

      {/* Checks */}
      <div className="space-y-1.5">
        {report.checklist_results.map((check) => (
          <div
            key={check.key}
            className="flex items-center gap-2 text-xs"
          >
            {check.status === "pass" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
            ) : check.status === "warn" ? (
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            )}
            <span className={`flex-1 ${check.status === "fail" ? "text-red-700 font-medium" : "text-muted-foreground"}`}>
              {check.label}
            </span>
            {check.details && (
              <span className="text-[10px] text-muted-foreground/70 truncate max-w-[200px]">
                {check.details}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Violations */}
      {report.violations.length > 0 && (
        <div className="space-y-2 mt-3">
          <h4 className="text-xs font-semibold flex items-center gap-1.5 text-red-700">
            <ShieldAlert className="w-3.5 h-3.5" /> Violations
          </h4>
          {report.violations.map((v, i) => (
            <div
              key={i}
              className={`text-xs p-2 rounded border ${
                v.severity === "blocking" ? "bg-red-50 border-red-200 text-red-700" : "bg-yellow-50 border-yellow-200 text-yellow-700"
              }`}
            >
              <span className="font-medium">[{v.type}]</span> {v.message}
              {v.severity === "blocking" && <span className="ml-1 text-[10px] font-bold">(BLOQUANT)</span>}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
