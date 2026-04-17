// ============================================================
// Consent Log Service — Immutable audit trail
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { ConsentEvent, ConsentEventInput } from "@/domain/guardian/consent.types";

export async function recordConsentEvent(input: ConsentEventInput): Promise<ConsentEvent> {
  // RGPD: never send raw IP from the client. Server-side trigger hashes any
  // ip_address into ip_hash and nulls out the raw value automatically.
  const { data, error } = await supabase
    .from("consent_events")
    .insert([{
      user_id: input.user_id,
      guardian_id: input.guardian_id ?? null,
      event_type: input.event_type,
      consent_type: input.event_type,
      metadata_json: (input.metadata_json ?? {}) as Json,
      user_agent: input.user_agent ?? null,
    }])
    .select("*")
    .single();

  if (error) throw new Error(`Failed to record consent event: ${error.message}`);
  return data as unknown as ConsentEvent;
}

export async function getConsentHistory(userId: string): Promise<ConsentEvent[]> {
  const { data, error } = await supabase
    .from("consent_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[consentLog] getConsentHistory failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as ConsentEvent[];
}

export async function getConsentHistoryForGuardian(guardianId: string): Promise<ConsentEvent[]> {
  const { data, error } = await supabase
    .from("consent_events")
    .select("*")
    .eq("guardian_id", guardianId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[consentLog] getConsentHistoryForGuardian failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as ConsentEvent[];
}

/**
 * Record a consent event with browser context (IP from header, user agent).
 * This is a convenience wrapper for frontend use.
 */
export async function recordConsentEventWithContext(
  userId: string,
  eventType: ConsentEventInput["event_type"],
  metadata?: Record<string, unknown>,
  guardianId?: string,
): Promise<ConsentEvent> {
  return recordConsentEvent({
    user_id: userId,
    guardian_id: guardianId,
    event_type: eventType,
    metadata_json: metadata,
    user_agent: navigator.userAgent,
  });
}
