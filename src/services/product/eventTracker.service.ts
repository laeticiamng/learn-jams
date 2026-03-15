// ============================================================
// Event Tracker Service — Structured product event logging
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { TrackEventInput, ProductEventName } from "@/domain/product/events.types";
import { isValidEventName } from "@/domain/product/validators";

let anonymousId: string | null = null;

function getAnonymousId(): string {
  if (anonymousId) return anonymousId;
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem("cognitio_anon_id") : null;
  if (stored) {
    anonymousId = stored;
    return stored;
  }
  const id = crypto.randomUUID();
  anonymousId = id;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("cognitio_anon_id", id);
  }
  return id;
}

export async function trackEvent(
  input: TrackEventInput,
  userId?: string | null,
): Promise<void> {
  if (!isValidEventName(input.event_name)) return;

  try {
    await supabase.from("product_events").insert({
      user_id: userId ?? null,
      anonymous_id: userId ? null : getAnonymousId(),
      transformation_id: input.transformation_id ?? null,
      event_name: input.event_name,
      audience_level: input.audience_level ?? null,
      format: input.format ?? null,
      metadata_json: (input.metadata ?? {}) as unknown as Json,
    });
  } catch {
    // Event tracking must never break the app
  }
}

export async function trackEventBatch(
  events: TrackEventInput[],
  userId?: string | null,
): Promise<void> {
  const valid = events.filter((e) => isValidEventName(e.event_name));
  if (valid.length === 0) return;

  try {
    const rows = valid.map((e) => ({
      user_id: userId ?? null,
      anonymous_id: userId ? null : getAnonymousId(),
      transformation_id: e.transformation_id ?? null,
      event_name: e.event_name,
      audience_level: e.audience_level ?? null,
      format: e.format ?? null,
      metadata_json: (e.metadata ?? {}) as unknown as Json,
    }));
    await supabase.from("product_events").insert(rows);
  } catch {
    // Non-blocking
  }
}

// ---------- Aggregation queries for dashboards ----------

export interface EventCount {
  event_name: ProductEventName;
  count: number;
}

export async function getEventCounts(
  since: string,
  eventNames?: ProductEventName[],
): Promise<EventCount[]> {
  let query = supabase
    .from("product_events")
    .select("event_name")
    .gte("created_at", since);

  if (eventNames && eventNames.length > 0) {
    query = query.in("event_name", eventNames);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const counts = new Map<string, number>();
  for (const row of data) {
    const name = (row as Record<string, unknown>).event_name as string;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts.entries()].map(([event_name, count]) => ({
    event_name: event_name as ProductEventName,
    count,
  }));
}
