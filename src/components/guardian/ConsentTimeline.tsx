// ============================================================
// ConsentTimeline — Immutable audit trail of consent events
// ============================================================

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ScrollText, Shield, UserPlus, UserMinus, FileText, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ConsentEvent } from "@/domain/guardian/consent.types";
import { getConsentHistory } from "@/services/guardian/consentLog.service";

interface ConsentTimelineProps {
  userId: string;
}

const EVENT_LABEL_KEYS: Record<string, string> = {
  minor_declared: "guardian.event_minor_declared",
  guardian_invited: "guardian.event_guardian_invited",
  guardian_accepted: "guardian.event_guardian_accepted",
  guardian_revoked: "guardian.event_guardian_revoked",
  consent_granted: "guardian.event_consent_granted",
  consent_withdrawn: "guardian.event_consent_withdrawn",
  data_export_requested: "guardian.event_data_export",
  data_deletion_requested: "guardian.event_data_deletion",
  minor_mode_enabled: "guardian.event_mode_enabled",
  minor_mode_disabled: "guardian.event_mode_disabled",
};

const EVENT_ICONS: Record<string, typeof Shield> = {
  minor_declared: Shield,
  guardian_invited: UserPlus,
  guardian_accepted: UserPlus,
  guardian_revoked: UserMinus,
  consent_granted: Shield,
  consent_withdrawn: Shield,
  data_export_requested: FileText,
  data_deletion_requested: Trash2,
  minor_mode_enabled: Shield,
  minor_mode_disabled: Shield,
};

const EVENT_COLORS: Record<string, string> = {
  minor_declared: "bg-blue-100 text-blue-600",
  guardian_invited: "bg-green-100 text-green-600",
  guardian_accepted: "bg-green-100 text-green-600",
  guardian_revoked: "bg-red-100 text-red-600",
  consent_granted: "bg-emerald-100 text-emerald-600",
  consent_withdrawn: "bg-amber-100 text-amber-600",
  data_export_requested: "bg-purple-100 text-purple-600",
  data_deletion_requested: "bg-red-100 text-red-600",
  minor_mode_enabled: "bg-blue-100 text-blue-600",
  minor_mode_disabled: "bg-gray-100 text-gray-600",
};

export function ConsentTimeline({ userId }: ConsentTimelineProps) {
  const [events, setEvents] = useState<ConsentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getConsentHistory(userId);
      setEvents(data);
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 border rounded-xl bg-card/60 backdrop-blur-sm space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <ScrollText className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h3 className="font-semibold">{t("guardian.consent_timeline")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("guardian.consent_rgpd", { count: events.length })}
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("guardian.consent_empty")}
        </p>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />

          {events.map((event, index) => {
            const Icon = EVENT_ICONS[event.event_type] ?? Shield;
            const color = EVENT_COLORS[event.event_type] ?? "bg-gray-100 text-gray-600";
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative flex items-start gap-3 py-2 pl-2"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${color}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {t(EVENT_LABEL_KEYS[event.event_type] ?? event.event_type)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString(i18n.language, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
