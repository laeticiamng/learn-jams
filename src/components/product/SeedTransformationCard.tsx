// ============================================================
// SeedTransformationCard — Single seed mission card
// ============================================================

import { motion } from "framer-motion";
import { BookOpen, Play, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SeedTransformationSummary } from "@/domain/product/seed.types";

interface SeedTransformationCardProps {
  seed: SeedTransformationSummary;
  onStart: (id: string) => void;
}

const FORMAT_LABELS: Record<string, string> = {
  fiche_dynamique: "Fiche dynamique",
  histoire_animee: "Histoire interactive",
  music: "Musique",
};

const LEVEL_LABELS: Record<string, string> = {
  college: "College",
  lycee: "Lycee",
  universite: "Universite",
  professionnel: "Professionnel",
};

const LEVEL_COLORS: Record<string, string> = {
  college: "bg-green-100 text-green-700",
  lycee: "bg-blue-100 text-blue-700",
  universite: "bg-purple-100 text-purple-700",
  professionnel: "bg-orange-100 text-orange-700",
};

export function SeedTransformationCard({ seed, onStart }: SeedTransformationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
      className="border rounded-xl p-5 space-y-3 bg-card/60 backdrop-blur-sm transition-colors hover:border-primary/30"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">{seed.title}</h3>
            <p className="text-xs text-muted-foreground">{seed.subject}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${LEVEL_COLORS[seed.audience_level] ?? "bg-gray-100 text-gray-700"}`}>
          <GraduationCap className="w-3 h-3 inline mr-0.5" />
          {LEVEL_LABELS[seed.audience_level] ?? seed.audience_level}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {FORMAT_LABELS[seed.format] ?? seed.format}
        </span>
      </div>

      <Button
        size="sm"
        className="w-full gap-2 h-8 text-xs"
        onClick={() => onStart(seed.id)}
      >
        <Play className="w-3 h-3" /> Essayer cette mission
      </Button>
    </motion.div>
  );
}
