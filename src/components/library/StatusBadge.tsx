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
        initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`text-[11px] flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}
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
      return { label: t("library.generating_status"), icon: <Loader2 className="w-3 h-3 animate-spin" />, color: "text-amber-300", bgColor: "bg-amber-500/10" };
    case "error":
      return { label: t("library.error_status"), icon: null, color: "text-destructive", bgColor: "bg-destructive/10" };
    case "pending":
      return { label: t("library.pending_status"), icon: null, color: "text-muted-foreground", bgColor: "bg-muted/30" };
    case "ready":
      return isFinalQuality
        ? { label: t("library.final_status", "HD"), icon: <CheckCircle2 className="w-3 h-3" />, color: "text-emerald-300", bgColor: "bg-emerald-500/10" }
        : { label: t("library.streaming_status", "Streaming"), icon: <Wifi className="w-3 h-3" />, color: "text-blue-300", bgColor: "bg-blue-500/10" };
    default:
      return null;
  }
}
