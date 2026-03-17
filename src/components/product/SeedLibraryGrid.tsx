// ============================================================
// SeedLibraryGrid — Grid of demo seed missions
// ============================================================

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { SeedTransformationCard } from "./SeedTransformationCard";
import { useTranslation } from "react-i18next";
import type { SeedTransformationSummary } from "@/domain/product/seed.types";

interface SeedLibraryGridProps {
  seeds: SeedTransformationSummary[];
  loading: boolean;
  onStartSeed: (id: string) => void;
}

export const SeedLibraryGrid = forwardRef<HTMLDivElement, SeedLibraryGridProps>(
  ({ seeds, loading, onStartSeed }, ref) => {
    const { t } = useTranslation();

    if (loading) {
      return (
        <div ref={ref} className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (seeds.length === 0) {
      return (
        <div ref={ref} className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            {t("product.no_demo_missions")}
          </p>
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">{t("product.demo_missions_title")}</h2>
          <span className="text-xs text-muted-foreground">{t("product.demo_missions_desc")}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {seeds.map((seed) => (
            <SeedTransformationCard
              key={seed.id}
              seed={seed}
              onStart={onStartSeed}
            />
          ))}
        </div>
      </motion.div>
    );
  }
);

SeedLibraryGrid.displayName = "SeedLibraryGrid";
