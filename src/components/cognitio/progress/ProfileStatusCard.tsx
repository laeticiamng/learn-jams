// ============================================================
// ProfileStatusCard — Learner profile status & key indicators
// ============================================================

import { motion } from "framer-motion";
import { User, TrendingUp, Shield, Gauge } from "lucide-react";
import type { LearnerProfile, LearnerProfileStatus } from "@/domain/cognitio/types";

interface ProfileStatusCardProps {
  profile: LearnerProfile;
  bestFormat?: string | null;
  guidanceNeed?: string | null;
  calibrationQuality?: string | null;
}

const STATUS_CONFIG: Record<LearnerProfileStatus, { label: string; color: string; description: string }> = {
  estimated: {
    label: "Profil estimé",
    color: "text-yellow-600",
    description: "Le moteur apprend encore votre style. Continuez à utiliser la plateforme.",
  },
  calibrated: {
    label: "Profil calibré",
    color: "text-blue-600",
    description: "Vos tendances commencent à se stabiliser. Les recommandations s'affinent.",
  },
  stable: {
    label: "Profil stable",
    color: "text-green-600",
    description: "Le moteur connaît bien votre profil. Les recommandations sont personnalisées.",
  },
};

const FORMAT_LABELS: Record<string, string> = {
  fiche_dynamique: "Fiche dynamique",
  histoire_animee: "Histoire interactive",
  music: "Musique",
  unknown: "En cours d'analyse",
};

export function ProfileStatusCard({ profile, bestFormat, guidanceNeed, calibrationQuality }: ProfileStatusCardProps) {
  const statusConfig = STATUS_CONFIG[profile.profile_status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-5 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className={`text-sm font-semibold ${statusConfig.color}`}>{statusConfig.label}</h3>
          <p className="text-xs text-muted-foreground">{statusConfig.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 p-2 rounded bg-muted/20">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <div>
            <p className="text-muted-foreground">Meilleur format</p>
            <p className="font-medium">{FORMAT_LABELS[bestFormat ?? "unknown"] ?? "En cours"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded bg-muted/20">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <div>
            <p className="text-muted-foreground">Calibration</p>
            <p className="font-medium capitalize">{calibrationQuality ?? "En cours"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded bg-muted/20">
          <Gauge className="w-3.5 h-3.5 text-primary" />
          <div>
            <p className="text-muted-foreground">Guidage</p>
            <p className="font-medium capitalize">{guidanceNeed ?? "En cours"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded bg-muted/20">
          <User className="w-3.5 h-3.5 text-primary" />
          <div>
            <p className="text-muted-foreground">Sessions</p>
            <p className="font-medium">{profile.session_count}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
