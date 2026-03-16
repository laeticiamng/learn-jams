// ============================================================
// EscapeFallbackNotice — Graceful degradation notice when
// AI/cloud services are unavailable. Keeps the escape game
// playable in offline/limited mode.
// ============================================================

import { motion } from "framer-motion";
import { WifiOff, Info, Package, Map } from "lucide-react";

interface EscapeFallbackNoticeProps {
  type: "no_ai" | "limited_credits" | "offline" | "generation_failed";
}

const NOTICE_CONFIG: Record<string, {
  icon: typeof WifiOff;
  title: string;
  message: string;
  features: string[];
}> = {
  no_ai: {
    icon: Info,
    title: "Mode sans IA",
    message: "Le service d'intelligence artificielle n'est pas disponible. L'escape game fonctionne avec les puzzles pré-générés.",
    features: [
      "Navigation entre les salles",
      "Puzzles à choix multiples",
      "Inventaire et progression",
      "Indices pré-configurés",
    ],
  },
  limited_credits: {
    icon: Info,
    title: "Crédits limités",
    message: "Vos crédits cloud sont limités. Certaines fonctionnalités avancées sont temporairement indisponibles.",
    features: [
      "Puzzles interactifs standard",
      "Progression sauvegardée",
      "Inventaire complet",
      "Indices de base disponibles",
    ],
  },
  offline: {
    icon: WifiOff,
    title: "Mode hors-ligne",
    message: "Vous êtes hors-ligne. L'escape game continue avec les données en cache.",
    features: [
      "Puzzles en cache",
      "Navigation locale",
      "Progression locale",
      "Synchronisation au retour en ligne",
    ],
  },
  generation_failed: {
    icon: Info,
    title: "Génération limitée",
    message: "La génération de puzzles avancés n'a pas fonctionné. Les puzzles de base sont disponibles.",
    features: [
      "Puzzles de base disponibles",
      "Progression standard",
      "Indices simplifiés",
      "Débrief partiel",
    ],
  },
};

export default function EscapeFallbackNotice({ type }: EscapeFallbackNoticeProps) {
  const config = NOTICE_CONFIG[type] ?? NOTICE_CONFIG.no_ai;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {config.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {config.message}
          </p>
        </div>
      </div>

      <div className="pl-7">
        <p className="text-[10px] text-muted-foreground/80 mb-1.5 font-medium">
          Fonctionnalités disponibles :
        </p>
        <ul className="space-y-1">
          {config.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
              <div className="w-1 h-1 rounded-full bg-green-500 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
