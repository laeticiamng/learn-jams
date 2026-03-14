// ============================================================
// Security Audit Service — Query audit events and flags
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { AuditSeverity, AuditEventType } from "@/security/auditLogger";

export interface AuditEventRecord {
  id: string;
  event_type: AuditEventType;
  severity: AuditSeverity;
  user_id: string | null;
  ip_hash: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface SuspiciousFlag {
  id: string;
  user_id: string | null;
  flag_type: string;
  status: string;
  details_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Get recent audit events (admin only).
 */
export async function getRecentAuditEvents(
  limit: number = 50,
  severity?: AuditSeverity,
): Promise<AuditEventRecord[]> {
  let query = supabase
    .from("security_audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (severity) {
    query = query.eq("severity", severity);
  }

  const { data } = await query;
  return (data ?? []) as AuditEventRecord[];
}

/**
 * Get open suspicious activity flags.
 */
export async function getOpenFlags(): Promise<SuspiciousFlag[]> {
  const { data } = await supabase
    .from("suspicious_activity_flags")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []) as SuspiciousFlag[];
}

/**
 * Resolve a suspicious activity flag.
 */
export async function resolveFlag(flagId: string, resolution: string): Promise<void> {
  await supabase
    .from("suspicious_activity_flags")
    .update({
      status: "resolved",
      details_json: { resolution },
      updated_at: new Date().toISOString(),
    })
    .eq("id", flagId);
}

/**
 * Count security events in a time window (for alerting).
 */
export async function countEventsInWindow(
  eventType: AuditEventType,
  windowMinutes: number,
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count } = await supabase
    .from("security_audit_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", eventType)
    .gte("created_at", since);

  return count ?? 0;
}

/**
 * Check if security alerts should be triggered.
 */
export async function checkSecurityAlerts(): Promise<string[]> {
  const alerts: string[] = [];

  // Check for repeated webhook signature failures
  const webhookFailures = await countEventsInWindow("webhook_signature_invalid", 60);
  if (webhookFailures > 10) {
    alerts.push(`${webhookFailures} webhook signature failures in the last hour`);
  }

  // Check for rate limit triggers
  const rateLimitTriggers = await countEventsInWindow("rate_limit_triggered", 60);
  if (rateLimitTriggers > 50) {
    alerts.push(`${rateLimitTriggers} rate limit triggers in the last hour`);
  }

  // Check for auth failures
  const authFailures = await countEventsInWindow("auth_failure", 30);
  if (authFailures > 20) {
    alerts.push(`${authFailures} auth failures in the last 30 minutes`);
  }

  return alerts;
}
