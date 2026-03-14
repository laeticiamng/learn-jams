// ============================================================
// Guardian Notification Types
// ============================================================

export const NOTIFICATION_TYPES = [
  "weekly_summary",
  "content_alert",
  "usage_alert",
  "service_alert",
  "consent_request",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ["email", "sms", "push"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ["pending", "sent", "delivered", "failed", "bounced"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface GuardianNotificationPreferences {
  id: string;
  guardian_id: string;
  weekly_summary_enabled: boolean;
  alert_on_content_flag: boolean;
  alert_on_usage_spike: boolean;
  alert_on_new_subject: boolean;
  preferred_channel: NotificationChannel;
  preferred_locale: string;
  quiet_hours_start: number;
  quiet_hours_end: number;
  created_at: string;
  updated_at: string;
}

export interface GuardianNotification {
  id: string;
  guardian_id: string;
  user_id: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
  subject: string | null;
  body_json: Record<string, unknown> | null;
  status: NotificationStatus;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  GuardianNotificationPreferences,
  "id" | "guardian_id" | "created_at" | "updated_at"
> = {
  weekly_summary_enabled: true,
  alert_on_content_flag: true,
  alert_on_usage_spike: false,
  alert_on_new_subject: false,
  preferred_channel: "email",
  preferred_locale: "fr",
  quiet_hours_start: 22,
  quiet_hours_end: 7,
};

export interface WeeklySummaryPayload {
  minor_display_name: string;
  period_start: string;
  period_end: string;
  sessions_count: number;
  total_minutes: number;
  subjects_studied: string[];
  mastery_progress: number;
  content_flags: string[];
}

export interface ServiceAlertPayload {
  alert_type: "content_flag" | "usage_spike" | "new_subject" | "system";
  message: string;
  severity: "info" | "warning" | "critical";
  details_json?: Record<string, unknown>;
}
