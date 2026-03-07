import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Wifi, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StatusBadgeProps {
  status: string;
  isFinalQuality?: boolean;
}

export function StatusBadge({ status, isFinalQuality }: StatusBadgeProps) {
  const { t } = useTranslation();

  const config = getConfig(status, isFinalQuality, t);
  if (!config) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={config.label}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`text-xs flex items-center gap-1 font-medium ${config.color}`}
      >
        {config.icon}
        {config.label}
      </motion.span>
    </AnimatePresence>
  );
}

function getConfig(status: string, isFinalQuality: boolean | undefined, t: ReturnType<typeof useTranslation>["t"]) {
  switch (status) {
    case "generating":
      return { label: t("library.generating_status"), icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-amber-400" };
    case "error":
      return { label: t("library.error_status"), icon: null, color: "text-destructive" };
    case "pending":
      return { label: t("library.pending_status"), icon: null, color: "text-muted-foreground" };
    case "ready":
      return isFinalQuality
        ? { label: t("library.final_status", "HD"), icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-emerald-400" }
        : { label: t("library.streaming_status", "Streaming"), icon: <Wifi className="w-3.5 h-3.5" />, color: "text-blue-400" };
    default:
      return null;
  }
}
