// ============================================================
// Guardian Notification Service
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { GuardianNotification, GuardianNotificationPreferences } from "@/domain/guardian/notification.types";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/domain/guardian/notification.types";

// ── Notification Preferences ───────────────────────────────

export async function getNotificationPreferences(
  guardianId: string,
): Promise<GuardianNotificationPreferences | null> {
  const { data, error } = await supabase
    .from("guardian_notification_preferences")
    .select("*")
    .eq("guardian_id", guardianId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as GuardianNotificationPreferences;
}

export async function upsertNotificationPreferences(
  guardianId: string,
  updates: Partial<Omit<GuardianNotificationPreferences, "id" | "guardian_id" | "created_at" | "updated_at">>,
): Promise<GuardianNotificationPreferences> {
  const { data, error } = await supabase
    .from("guardian_notification_preferences")
    .upsert(
      {
        guardian_id: guardianId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "guardian_id" },
    )
    .select("*")
    .single();

  if (error) throw new Error(`Failed to upsert notification prefs: ${error.message}`);
  return data as unknown as GuardianNotificationPreferences;
}

// ── Notification History ───────────────────────────────────

export async function getNotificationsForGuardian(
  guardianId: string,
  limit = 20,
): Promise<GuardianNotification[]> {
  const { data, error } = await supabase
    .from("guardian_notifications")
    .select("*")
    .eq("guardian_id", guardianId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[notificationService] getNotificationsForGuardian failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as GuardianNotification[];
}

export async function getNotificationsForUser(
  userId: string,
  limit = 20,
): Promise<GuardianNotification[]> {
  const { data, error } = await supabase
    .from("guardian_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[notificationService] getNotificationsForUser failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as GuardianNotification[];
}

// ── Trigger Notifications (via edge functions) ─────────────

export async function triggerWeeklySummary(guardianId: string, userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("guardian-send-weekly-summary", {
    body: { guardian_id: guardianId, user_id: userId },
  });
  if (error) throw new Error(`Failed to trigger weekly summary: ${error.message}`);
}

export async function triggerServiceAlert(
  guardianId: string,
  userId: string,
  alertType: string,
  message: string,
  severity: "info" | "warning" | "critical" = "info",
): Promise<void> {
  const { error } = await supabase.functions.invoke("guardian-send-service-alert", {
    body: { guardian_id: guardianId, user_id: userId, alert_type: alertType, message, severity },
  });
  if (error) throw new Error(`Failed to trigger service alert: ${error.message}`);
}
