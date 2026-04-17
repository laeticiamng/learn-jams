// ============================================================
// Shared security audit log helper for edge functions
// Writes to public.security_audit_events (service_role only).
// ============================================================

export type AuditSeverity = "info" | "warning" | "error" | "critical";

export interface AuditEvent {
  eventType: string;                    // e.g. "rate_limit_hit", "auth_failure", "quota_exceeded"
  userId?: string | null;
  severity?: AuditSeverity;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Hash an IP address (SHA-256, first 16 hex chars) for privacy.
 */
async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Extract client IP from common headers. Returns null if unavailable.
 */
export function getClientIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

/**
 * Log a security/audit event. Never throws — failures are logged to console.
 */
export async function logAuditEvent(
  supabaseAdmin: any,
  event: AuditEvent,
): Promise<void> {
  try {
    const ipHash = event.ipAddress ? await hashIp(event.ipAddress) : null;

    const { error } = await supabaseAdmin.from("security_audit_events").insert([{
      event_type: event.eventType,
      user_id: event.userId ?? null,
      severity: event.severity ?? "info",
      details_json: event.details ?? {},
      metadata_json: event.metadata ?? {},
      ip_hash: ipHash,
    }]);

    if (error) {
      console.warn(`[audit:${event.eventType}] insert error:`, error.message);
    }
  } catch (err) {
    console.warn(`[audit:${event.eventType}] exception:`, err);
  }
}
