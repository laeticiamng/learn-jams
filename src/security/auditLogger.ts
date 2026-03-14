// ============================================================
// Audit Logger — Security event logging
// ============================================================

import { redactObject } from "./secretRedaction";

export type AuditSeverity = "info" | "warning" | "critical";

export type AuditEventType =
  // Auth
  | "auth_failure"
  | "auth_success"
  | "permission_denied"
  | "session_expired"
  // Guardian
  | "guardian_invite_created"
  | "guardian_link_accepted"
  | "guardian_link_revoked"
  | "guardian_access_attempt"
  // Billing
  | "billing_plan_changed"
  | "billing_topup_purchased"
  | "billing_checkout_created"
  | "billing_webhook_invalid"
  // Quota / Abuse
  | "rate_limit_triggered"
  | "quota_exceeded"
  | "cost_anomaly_detected"
  | "suspicious_generation_burst"
  // Webhook
  | "webhook_signature_invalid"
  | "webhook_replay_detected"
  | "webhook_processing_error"
  // Admin
  | "admin_page_accessed"
  | "admin_action_performed"
  // System
  | "secret_health_failure"
  | "storage_policy_violation"
  | "csp_violation"
  | "edge_function_error";

export interface AuditEvent {
  event_type: AuditEventType;
  severity: AuditSeverity;
  user_id: string | null;
  ip_hash: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Hash an IP address for privacy-preserving logging.
 */
export async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "_audit_salt_v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Log a security audit event to the database.
 */
export async function logAuditEvent(
  supabase: any,
  event: AuditEvent,
): Promise<void> {
  try {
    const safeMetadata = redactObject(event.metadata);
    await supabase.from("security_audit_events").insert({
      event_type: event.event_type,
      severity: event.severity,
      user_id: event.user_id,
      ip_hash: event.ip_hash,
      metadata_json: safeMetadata,
    });
  } catch (err) {
    // Audit logging should never crash the main flow
    console.error("[audit] Failed to log event:", event.event_type, err);
  }
}

/**
 * Log and also flag suspicious activity.
 */
export async function flagSuspiciousActivity(
  supabase: any,
  userId: string | null,
  flagType: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("suspicious_activity_flags").insert({
      user_id: userId,
      flag_type: flagType,
      status: "open",
      details_json: redactObject(details),
    });

    await logAuditEvent(supabase, {
      event_type: "cost_anomaly_detected",
      severity: "warning",
      user_id: userId,
      ip_hash: null,
      metadata: { flag_type: flagType, ...details },
    });
  } catch (err) {
    console.error("[audit] Failed to flag activity:", flagType, err);
  }
}

/**
 * Structured log helper for edge functions (stdout JSON).
 */
export function securityLog(
  fn: string,
  level: "info" | "warn" | "error",
  step: string,
  data?: Record<string, unknown>,
): void {
  const safeData = data ? redactObject(data) : {};
  console.log(JSON.stringify({
    fn,
    level,
    step,
    ts: new Date().toISOString(),
    security: true,
    ...safeData,
  }));
}
