// ============================================================
// CreateProgressHeader — Visual progress indicator for create flow
// Shows which steps are completed in the progressive flow.
// ============================================================

import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import type { CreateFormat } from "@/lib/create-format-config";

interface CreateProgressHeaderProps {
  selectedFormat: CreateFormat | null;
  hasSource: boolean;
}

export function CreateProgressHeader({ selectedFormat, hasSource }: CreateProgressHeaderProps) {
  const { t } = useTranslation();

  const steps = [
    {
      label: t("create_flow.step_format", { defaultValue: "Format" }),
      done: !!selectedFormat,
      active: !selectedFormat,
    },
    {
      label: t("create_flow.step_source", { defaultValue: "Contenu" }),
      done: hasSource,
      active: !!selectedFormat && !hasSource,
    },
    {
      label: t("create_flow.step_create", { defaultValue: "Création" }),
      done: false,
      active: !!selectedFormat && hasSource,
    },
  ];

  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          {i > 0 && (
            <div className={`w-8 h-px ${step.done || step.active ? "bg-primary/40" : "bg-border/30"}`} />
          )}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-all ${
                step.done
                  ? "bg-primary text-primary-foreground"
                  : step.active
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground border border-border/30"
              }`}
            >
              {step.done ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                step.done || step.active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
