// ============================================================
// SeedLibraryGrid — Grid of demo seed missions
// ============================================================

import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { SeedTransformationCard } from "./SeedTransformationCard";
import type { SeedTransformationSummary } from "@/domain/product/seed.types";

interface SeedLibraryGridProps {
  seeds: SeedTransformationSummary[];
  loading: boolean;
  onStartSeed: (id: string) => void;
}

export function SeedLibraryGrid({ seeds, loading, onStartSeed }: SeedLibraryGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (seeds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">
          Aucune mission de demonstration disponible pour le moment.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Missions de demonstration</h2>
        <span className="text-xs text-muted-foreground">Testez sans importer de document</span>
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
