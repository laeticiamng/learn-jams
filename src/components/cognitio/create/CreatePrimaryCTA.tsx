// ============================================================
// CreatePrimaryCTA — Dynamic contextual CTA button
// Label adapts based on the selected format.
// ============================================================

import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CreateFormat } from "@/lib/create-format-config";

interface CreatePrimaryCTAProps {
  selectedFormat: CreateFormat | null;
  hasSource: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

const CTA_LABELS: Record<CreateFormat, string> = {
  escape_game: "Créer une mission",
  music: "Créer une chanson",
  dynamic_sheet: "Créer une fiche",
  animated_story: "Créer une histoire",
  video: "Créer une vidéo",
};

export function CreatePrimaryCTA({
  selectedFormat,
  hasSource,
  disabled,
  loading,
  onClick,
}: CreatePrimaryCTAProps) {
  const { t } = useTranslation();

  const label = selectedFormat
    ? t(`create_flow.cta_${selectedFormat}`, { defaultValue: CTA_LABELS[selectedFormat] })
    : t("create_flow.cta_default", { defaultValue: "Créer" });

  const canSubmit = !disabled && !loading && selectedFormat && hasSource;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Button
        onClick={onClick}
        disabled={!canSubmit}
        size="lg"
        className="w-full gradient-bg-premium rounded-xl h-12 text-base shadow-lg shadow-primary/20 disabled:opacity-40 disabled:shadow-none"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4 mr-2" />
        )}
        {label}
      </Button>
    </motion.div>
  );
}
