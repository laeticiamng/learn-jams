// ============================================================
// NotificationPreferences — Guardian notification settings
// ============================================================

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Mail, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { GuardianNotificationPreferences as Prefs, NotificationChannel } from "@/domain/guardian/notification.types";
import { upsertNotificationPreferences } from "@/services/guardian/notificationService";

interface NotificationPreferencesProps {
  guardianId: string;
  initialPreferences: Omit<Prefs, "id" | "guardian_id" | "created_at" | "updated_at"> | null;
}

export function NotificationPreferences({ guardianId, initialPreferences }: NotificationPreferencesProps) {
  const [prefs, setPrefs] = useState({
    weekly_summary_enabled: initialPreferences?.weekly_summary_enabled ?? true,
    alert_on_content_flag: initialPreferences?.alert_on_content_flag ?? true,
    alert_on_usage_spike: initialPreferences?.alert_on_usage_spike ?? false,
    alert_on_new_subject: initialPreferences?.alert_on_new_subject ?? false,
    preferred_channel: initialPreferences?.preferred_channel ?? "email" as NotificationChannel,
    preferred_locale: initialPreferences?.preferred_locale ?? "fr",
    quiet_hours_start: initialPreferences?.quiet_hours_start ?? 22,
    quiet_hours_end: initialPreferences?.quiet_hours_end ?? 7,
  });
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertNotificationPreferences(guardianId, prefs);
      toast.success(t("guardian.prefs_saved"));
    } catch {
      toast.error(t("guardian.prefs_error"));
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 p-6 border rounded-xl bg-card/60 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <Bell className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-semibold">{t("guardian.notification_prefs")}</h3>
          <p className="text-sm text-muted-foreground">{t("guardian.notification_prefs_desc")}</p>
        </div>
      </div>

      {/* Channel */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Mail className="w-4 h-4" /> {t("guardian.notification_channel")}
        </Label>
        <Select value={prefs.preferred_channel} onValueChange={(v) => update("preferred_channel", v as NotificationChannel)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">{t("guardian.channel_email")}</SelectItem>
            <SelectItem value="sms">{t("guardian.channel_sms")}</SelectItem>
            <SelectItem value="push">{t("guardian.channel_push")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t("guardian.weekly_summary")}</Label>
          <Switch checked={prefs.weekly_summary_enabled} onCheckedChange={(v) => update("weekly_summary_enabled", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t("guardian.alert_content_flag")}</Label>
          <Switch checked={prefs.alert_on_content_flag} onCheckedChange={(v) => update("alert_on_content_flag", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t("guardian.alert_usage_spike")}</Label>
          <Switch checked={prefs.alert_on_usage_spike} onCheckedChange={(v) => update("alert_on_usage_spike", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t("guardian.alert_new_subject")}</Label>
          <Switch checked={prefs.alert_on_new_subject} onCheckedChange={(v) => update("alert_on_new_subject", v)} />
        </div>
      </div>

      {/* Quiet hours */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> {t("guardian.quiet_hours")}
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("guardian.quiet_start")}</Label>
            <Input
              type="number"
              value={prefs.quiet_hours_start}
              onChange={(e) => update("quiet_hours_start", parseInt(e.target.value, 10) || 22)}
              min={0}
              max={23}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("guardian.quiet_end")}</Label>
            <Input
              type="number"
              value={prefs.quiet_hours_end}
              onChange={(e) => update("quiet_hours_end", parseInt(e.target.value, 10) || 7)}
              min={0}
              max={23}
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {t("guardian.save")}
      </Button>
    </motion.div>
  );
}
