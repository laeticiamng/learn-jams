// ============================================================
// GuardianDashboard — Parent/guardian view of minor's activity
// ============================================================

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Users, Bell, Clock, BookOpen, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { GuardianWithLink } from "@/domain/guardian/guardian.types";
import type { GuardianNotification } from "@/domain/guardian/notification.types";
import { getGuardiansForUser, revokeGuardianLink } from "@/services/guardian/guardianManagement.service";
import { getNotificationsForUser } from "@/services/guardian/notificationService";

interface GuardianDashboardProps {
  userId: string;
}

const RELATIONSHIP_KEYS: Record<string, string> = {
  parent: "guardian.relation_parent",
  legal_guardian: "guardian.relation_legal_guardian",
  teacher: "guardian.relation_teacher",
  institution_admin: "guardian.relation_institution_admin",
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  active: CheckCircle,
  pending: Clock,
  revoked: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-600",
  pending: "text-amber-500",
  revoked: "text-red-500",
};

export function GuardianDashboard({ userId }: GuardianDashboardProps) {
  const [guardians, setGuardians] = useState<GuardianWithLink[]>([]);
  const [notifications, setNotifications] = useState<GuardianNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [g, n] = await Promise.all([
          getGuardiansForUser(userId),
          getNotificationsForUser(userId),
        ]);
        setGuardians(g);
        setNotifications(n);
      } catch {
        // Silent fail — empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  const handleRevoke = async (guardianId: string) => {
    try {
      await revokeGuardianLink(userId, guardianId);
      setGuardians(prev => prev.map(g =>
        g.id === guardianId ? { ...g, link: { ...g.link, status: "revoked" } } : g
      ));
      toast.success(t("guardian.revoke_success"));
    } catch {
      toast.error(t("guardian.revoke_error"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Guardian list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border rounded-xl bg-card/60 backdrop-blur-sm space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold">{t("guardian.guardians_title")}</h3>
            <p className="text-sm text-muted-foreground">
              {guardians.length === 0 ? t("guardian.no_guardians") : t("guardian.guardian_count", { count: guardians.length })}
            </p>
          </div>
        </div>

        {guardians.map((g) => {
          const StatusIcon = STATUS_ICONS[g.link.status] ?? Clock;
          return (
            <div
              key={g.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                  {(g.display_name ?? g.email)[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{g.display_name ?? g.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(RELATIONSHIP_KEYS[g.link.relationship] ?? g.link.relationship)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-4 h-4 ${STATUS_COLORS[g.link.status]}`} />
                <span className="text-xs">{g.link.status}</span>
                {g.link.status === "active" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-500 hover:text-red-700"
                    onClick={() => handleRevoke(g.id)}
                  >
                    {t("guardian.revoke")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Recent notifications */}
      {notifications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 border rounded-xl bg-card/60 backdrop-blur-sm space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold">{t("guardian.notifications_recent")}</h3>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notifications.slice(0, 10).map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 text-sm">
                <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-xs">{n.subject ?? n.notification_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.status} — {new Date(n.created_at).toLocaleDateString(i18n.language)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
